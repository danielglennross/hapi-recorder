'use strict';

const Path = require('path');

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

        const context = { data };
        context.state = `window.state = ${JSON.stringify(context)};`;

        reply.view('index', context);

        // reply.view('index', { data });
      });
    }
  },
  {
    method: 'GET',
    path: '/assets/client.js',
    handler: {
      file: Path.join(__dirname, './templates/assets/client.js')
    }
  },
  {
    method: 'GET',
    path: '/{filename*}',
    config: {
      tags: ['recorder'],
      auth: false,
      plugins: {
        disableSiteCodeCheck: true,
        disableRecorder: true
      }
    },
    handler: {
      directory: {
        path: `${__dirname}/templates`,
        listing: false,
        index: false
      }
    }
  }
];
