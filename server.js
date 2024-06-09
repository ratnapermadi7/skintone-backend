'use strict';

const Hapi = require('@hapi/hapi');
const { Firestore } = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const HapiJwt = require('hapi-auth-jwt2');

require('dotenv').config();

// Initialize Firebase Admin SDK with appropriate credentials
const firestore = new Firestore({
  projectId: 'skintone-be-424507',
  keyFilename: './serviceaccountkey.json' // Path to the service account key JSON file
});

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  });

  // Register JWT authentication plugin
  await server.register(HapiJwt);

  // Define JWT authentication strategy
  server.auth.strategy('jwt', 'jwt', {
    key: process.env.JWT_SECRET,
    validate: async (decoded, request, h) => {
      // Implement validation logic here, e.g., check if user exists in Firestore
      return { isValid: true, credentials: decoded };
    }
  });

  // Add routes
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
