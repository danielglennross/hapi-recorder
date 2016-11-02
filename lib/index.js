'use strict';

const Cls = require('continuation-local-storage');
const ns = Cls.createNamespace('hapi-recorder');
const routes = require('./routes');
const events = require('./events');
const service = require('./service');

const internals = {
  provider: {},
  logger: {
    logInfo: () => {},
    logError: () => {}
  }
};

exports.register = (server, options, next) => {

  server.register(require('vision'), (err) => {
    if (err) {
      throw err;
    }
    server.views({
      engines: { html: require('handlebars') },
      path: `${__dirname}/templates`,
      helpersPath: `${__dirname}/templates/helpers`
    });
  });

  // required provider
  if (!options.provider) {
    // throw new Error('A message broker must be provided');
  }
  const Memory = require('./providers/memory');
  internals.provider = options.provider || new Memory();

  // optional logger
  if (options.logger) {
    ['logInfo', 'logError'].forEach((logMethod) => {
      if (options.logger[logMethod]) {
        Object.assign(internals.logger, options.logger[logMethod]);
      }
    });
  }

  server.route(routes(internals));

  server.ext('onRequest', events.onRequest(ns));
  server.ext('onPreAuth', events.onPreAuth(ns));
  server.ext('onPreResponse', events.onPreResponse(ns, internals));

  server.expose({
    record: service.record(ns),
    recordExp: service.recordExp(ns),
    recordAll: service.recordAll(ns)
  });

  next();
};

exports.register.attributes = {
  name: 'recorder',
  version: '0.1.0'
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
