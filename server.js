'use strict';

const Hapi = require('@hapi/hapi');
const { Firestore } = require('@google-cloud/firestore');
require('dotenv').config();

const firestore = new Firestore();

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  });

  // Register routes
  await server.register([
    {
      plugin: require('./routes/shades'),
      options: { firestore }
    }
  ]);

  // Add CORS support if needed
  server.ext('onPreResponse', (request, h) => {
    if (request.response.isBoom) {
      request.response.output.headers['Access-Control-Allow-Origin'] = '*';
    } else {
      request.response.headers['Access-Control-Allow-Origin'] = '*';
    }
    return h.continue;
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
