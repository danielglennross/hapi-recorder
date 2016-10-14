'use strict';

const internals = {
  identifier: 'hapi-recorder-req-id',
  tracker: new Map(),
  provider: {}
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

  const Memory = require('../providers/memory');
  internals.provider = options.provider || new Memory();

  server.route(routes);

  server.ext('onPreAuth', (req, reply) => {
    if (req.route.settings.plugins.disableRecorder) {
      return reply.continue();
    }
    
    req[internals.identifier] = Date.now();
    internals.tracker.set(req[internals.identifier], []);
    return reply.continue();
  });

  server.ext('onPreResponse', (req, reply) => {
    if (req.route.settings.plugins.disableRecorder) {
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
    });
  });

  server.expose({
    record(fn, messageFactory, req) {
      if (req.route.settings.plugins.disableRecorder) {
        throw new Error('recorder is not enabled for this route');
      }

      const start = Date.now();
      const res = fn();
      const end = Date.now();

      const messageTask = () => {
        const factory = messageFactory.bind(null, end-start);
        return res.then(val => factory(null, val), err => factory(err, null));
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