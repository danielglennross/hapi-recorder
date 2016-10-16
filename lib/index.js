'use strict';

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}

const internals = {
  identifier: `hapi-recorder-${uuid()}`,
  tracker: new Map(),
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
      return internals.provider.get().then(res => {
        if (!res) {
          return reply('no data');
        }
        return reply(res);

        // const output = res.reduce((kv, obj) => {
        //   Object.assign(obj, { [res.key]: res.value });
        //   return obj;
        // }, {});
        // return reply(output);
      });
    }
  }
];

exports.register = (server, options, next) => {

  const isRecDisabled = req => req.route.settings.plugins.disableRecorder;

  // required provider
  if (!options.provider) {
    throw new Error('A message broker must be provided');
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

  server.ext('onPreAuth', (req, reply) => {
    if (isRecDisabled(req)) {
      return reply.continue();
    }

    const request = req;

    request[internals.identifier] = uuid();
    internals.tracker.set(request[internals.identifier], []);
    return reply.continue();
  });

  server.ext('onPreResponse', (req, reply) => {
    if (isRecDisabled(req)) {
      return reply.continue();
    }

    const track = internals.tracker.get(req[internals.identifier]);
    if (!track.length) {
      return reply.continue();
    }

    return Promise.all(track.map(x => x()))
      .then(msgs => {
        internals.logger.logInfo('publish', 'attempting to publish track', track);
        return internals.provider.publish(req[internals.identifier], msgs);
      })
      .catch(err => {
        internals.logger.logError('publish', 'failed to publish track', err, track);
      })
      .finally(() => {
        internals.tracker.delete(req[internals.identifier]);
        return reply.continue();
      });
  });

  server.expose({
    record(fn, messageFactory, req) {
      if (isRecDisabled(req)) {
        throw new Error('recorder is not enabled for this route');
      }

      const start = Date.now();
      let res = fn();
      const end = Date.now();

      const messageTask = () => {
        const factory = messageFactory.bind(null, {
          started: start,
          offset: start.getTimezoneOffset(),
          elapsed: end - start
        });
        if (!(res instanceof Promise)) {
          res = Promise.resolve(res);
        }
        return res.then(val => factory(null, val), err => factory(err, null));
      };

      const track = internals.tracker.get(req[internals.identifier]);
      track.push(messageTask);
      internals.tracker.set(req[internals.identifier], track);

      return res;
    },

    recordAll(obj, fnToWrap, messageFactory) {
      const prototype = Object.getPrototypeOf(obj);
      const op = Object.getOwnPropertyNames(prototype);
      const wrap = op.filter(x => Object.keys(fnToWrap).indexOf(x) > -1);
      wrap.forEach(x => {
        const fn = fnToWrap[x];
        const fnArgs = [].slice.call(fn.arguments);
        const ff = fnArgs.reduce((y, res) => {
          res.bind(y);
          return res;
        }, x.bind(null));
        const req = ff();

        const start = Date.now();
        let res = fn();
        const end = Date.now();

        const messageTask = () => {
          const factory = messageFactory.bind(null, x.toString(), {
            started: start,
            offset: start.getTimezoneOffset(),
            elapsed: end - start
          });
          if (!(res instanceof Promise)) {
            res = Promise.resolve(res);
          }
          return res.then(val => factory(null, val), err => factory(err, null));
        };

        const track = internals.tracker.get(req[internals.identifier]);
        track.push(messageTask);
        internals.tracker.set(req[internals.identifier], track);

        return res;

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

// return request.server.plugins.recorder.record(
//   () => Profiles.getProfileById(playerId, context), (timer, err, response) => ({
//     messageName: 'getProfileById',
//     timeStarted: timer.start,
//     timeElaspsed: timer.elapsed,
//     timeOffset: timer.offset
//     error: err,
//     result: response
//   }), request
// );



request.server.plugins.recorder.recordAll(
  Class, [{ method1: (arg1, arg2) => arg1.request }, { 'method2': 'request' }], (category, timer, err, response) => ({

  })
);
