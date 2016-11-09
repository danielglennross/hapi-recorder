'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: 3000 });

server.register({
  register: require('./index')
}, (err) => {
  if (err) {
    throw err;
  }
});

server.route({
  method: 'GET',
  path: '/data',
  handler: (request, reply) => {
    let res = server.plugins.recorder.record(
      () => {
        for (let i = 0; i < 100000; i++) { }
        return 'hello';
      }, (timer, err, response) => ({
        message: 'getProfileById',
        timeElaspsed: timer,
        error: err,
        response
      })
    );
    // res = server.plugins.recorder.record(
    //   () => {
    //     for (let i = 0; i < 100000; i++) { }
    //     return 'hello';
    //   }, (timer, err, response) => ({
    //     message: 'getProfileById2',
    //     timeElaspsed: timer,
    //     error: err,
    //     response
    //   })
    // );
    res = server.plugins.recorder.record(
      () => {
        for (let i = 0; i < 100000; i++) { }
        return 'hello';
      }, (timer, err, response) => ({
        message: 'getProfileById3',
        timeElaspsed: timer,
        error: err,
        response
      })
    );
    reply(res);
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }
});
