'use strict';

const Hoek = require('hoek');
const Cls = require('continuation-local-storage');
const ns = Cls.createNamespace('hapi-recorder');

const internals = {
  provider: {},
  logger: {
    logInfo: () => {},
    logError: () => {}
  }
};

const routes = [
  {
    method: 'GET',
    path: '/recorder',
    config: {
      tags: ['recorder'],
      auth: false,
      plugins: {
        disableSiteCodeCheck: true,
        disableRecorder: true
      }
    },
    handler: (req, reply) => {
      internals.provider.get().then(data => {
        reply.view('index', data);
        
        // if (!res) {
        //   return reply('no data');
        // }
        // return reply(res);

        // const output = res.reduce((kv, obj) => {
        //   Object.assign(obj, { [res.key]: res.value });
        //   return obj;
        // }, {});
        // return reply(output);
      });
    }
  }
];


const isRecDisabled = req => req.route.settings.plugins.disableRecorder;

const record = (fn, messageFactory) => {
  // TODO track in ns disabling response
  //if (isRecDisabled(req)) {
  //  throw new Error('recorder is not enabled for this route');
  //}

  const start = (new Date).getTime();
  const res = fn();

  let endStamp;
  let resCopy;
  if (!(res instanceof Promise)) {
    endStamp = (new Date).getTime();
    resCopy = Promise.resolve(Hoek.clone(res));
  } else {
    resCopy = res;
  }

  resCopy.then(
    () => {
      return endStamp || (new Date).getTime();
    },
    () => (new Date).getTime())
    .then(end => {
      const messageTask = () => {
        const factory = messageFactory.bind(null, {
          start,
          end,
          elapsed: end - start
        });
        return resCopy.then(val => factory(null, val), err => factory(err, null));
      };

      const track = ns.get('track');
      track.push(messageTask);
      ns.set('track', track);
    });

  return res;
};

exports.register = (server, options, next) => {

  server.register(require('vision'), (err) => {
    if (err) {
      throw err;
    }
    server.views({
      engines: { html: require('handlebars') },
      path: `${__dirname}/../templates`,
      helpersPath: `${__dirname}/../templates/helpers`
    });
  });

  // required provider
  if (!options.provider) {
    //throw new Error('A message broker must be provided');
  }
  const Memory = require('../providers/memory');
  internals.provider = options.provider || new Memory();

  // optional logger
  if (options.logger) {
    ['logInfo', 'logError'].forEach((logMethod) => {
      if (options.logger[logMethod]) {
        Object.assign(internals.logger, options.logger[logMethod]);
      }
    });
  }

  server.route(routes);

  server.ext('onRequest', (request, reply) => {
    ns.bindEmitter(request.raw.req);
    ns.bindEmitter(request.raw.res);
    ns.run(() => reply.continue());
  });

  server.ext('onPreAuth', (req, reply) => {
    if (isRecDisabled(req)) {
      return reply.continue();
    }
    ns.set('track', []);
    return reply.continue();
  });

  server.ext('onPreResponse', (req, reply) => {
    if (isRecDisabled(req)) {
      return reply.continue();
    }

    const track = ns.get('track');
    if (!track || !track.length) {
      return reply.continue();
    }

    return Promise.all(track.map(x => x()))
      .then(msgs => {
        internals.logger.logInfo('publish', 'attempting to publish track', track);
        return internals.provider.publish({
          id: Date.now(),
          request: {
            method: req.method,
            headers: req.headers,
            path: req.path,
            payload: req.payload
          }
        }, msgs);
      })
      .then(() => {
        return reply.continue();
      })
      .catch(err => {
        internals.logger.logError('publish', 'failed to publish track', err, track);
        return reply.continue();
      });
  });

  server.expose({
    record(fn, messageFactory) {
      return record(fn, messageFactory);
    },

    recordExp(obj, fnStr, messageFactory) {
      const orig = obj[fnStr];
      // eslint-disable-next-line no-param-reassign
      obj[fnStr] = function wrapped() {
        return record(() => orig.apply(this, arguments), messageFactory);
      };
    },

    recordAll(obj, fnToWrap, messageFactory) {
      const prototype = Object.getPrototypeOf(obj);
      const op = Object.getOwnPropertyNames(prototype);

      // ['method1', {method2: () => {}}]
      const accFn = fnToWrap.reduce((fn, acc) => {
        const prop = typeof fn !== Object
          ? { [fn]: messageFactory.bind(null, fn) } // bind fn as category
          : fn;
        return (Object.assign(prop, acc), acc);
      }, {});

      const wrap = op.filter(x => Object.keys(accFn).indexOf(x) > -1);
      wrap.forEach(x => {
        const orig = prototype[x];
        prototype[x] = function wrapped() {
          const msgFactory = accFn[x];
          return record(() => orig.apply(this, arguments), msgFactory);
        };
      });
    }
  });

  next();
};

exports.register.attributes = {
  // override default plugin name
  name: 'recorder',
  version: '0.0.1'
};

// example use

// server.register({
//   register: require('hapi-recorder'),
//   options: {
//     provider: new Memory()
//     logger: {
//       logInfo: (category, message, target) => Winston.logInfo(category, message, target),
//       logError: (category, message, err, target) => Winston.logError(category, message, err, target)
//     }
//   }
// }, err => {
//   // handle error
// });

// request.server.plugins.recorder.record(
//   () => Profiles.getProfileById(playerId, context), (timer, err, response) => ({
//     messageName: 'getProfileById',
//     timeStarted: timer.start,
//     timeElaspsed: timer.elapsed,
//     timeOffset: timer.offset
//     error: err,
//     result: response
//   })
// );

// request.server.plugins.recorder.recordExp(
//   Profiles, 'getProfileById', (timer, err, response) => ({
//     category,
//     error: err,
//     result: response
//   }));

// request.server.plugins.recorder.recordAll(
//   Class, ['getProfileById', { getProfileById2: (t, e, r) => {} }], (category, timer, err, response) => ({
//   })
// );
