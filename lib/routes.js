'use strict';

module.exports = (internals) => [
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
      });
    }
  }
];
