'use strict';

const internals = {
  identifier: 'hapi-recorder-req-id',
  tracker: new Map(),
  provider: {},
  logger: { debug: () => {}, info: () => {}, error: () => {}},
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

  // providers
  const Memory = require('../providers/memory');
  internals.provider = options.provider || new Memory();

  // logger
  internals.logger = options.logger;

  server.route(routes);

  server.ext('onPreAuth', (req, reply) => {
    if (isRecDisabled(req)) {
      return reply.continue();
    }
    
    req[internals.identifier] = Date.now();
    internals.tracker.set(req[internals.identifier], []);
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

    Promise.all(track.map(x => x()))
    .then(msgs => {
      return internals.provider.publish(req[internals.identifier], msgs);
    })
    .then(() => {
      return reply.continue();
    })
    .catch(err => {
      logger.error(err);
      return reply.continue();
    });
  });

  server.expose({
    record(fn, messageFactory, req) {
      if (isRecDisabled(req)) {
        throw new Error('recorder is not enabled for this route');
      }

      const start = Date.now();
      const res = fn();
      const end = Date.now();

      const messageTask = () => {
        const factory = messageFactory.bind(null, end-start);
        return Promise.resolve(res) // ensure res is a promise
          .then(val => factory(null, val), err => factory(err, null));
      };
      
      const track = internals.tracker.get(req[internals.identifier]);
      track.push(messageTask);
      internals.tracker.set(req[internals.identifier], track);

      return res;
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

// return request.server.plugins.recorder.record(
//   () => Profiles.getProfileById(playerId, context), (time, err, response) => ({
//     messageName: 'getProfileById'
//     timeElaspsed: time,
//     error: err,
//     result: response
//   }), request
// );