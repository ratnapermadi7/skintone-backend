'use strict';

const Hapi = require('@hapi/hapi');
const { Firestore } = require('@google-cloud/firestore');
require('dotenv').config();

const firestore = new Firestore();

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: '0.0.0.0'
  });

  // Endpoint untuk mendapatkan semua foundation shades
  server.route({
    method: 'GET',
    path: '/api/shades',
    handler: async (request, h) => {
      const shadesRef = firestore.collection('shades');
      const snapshot = await shadesRef.get();
      const shades = snapshot.docs.map(doc => doc.data());
      return h.response(shades).code(200);
    }
  });

  // Endpoint untuk mendapatkan satu foundation shade berdasarkan ID
  server.route({
    method: 'GET',
    path: '/api/shades/{shadeId}',
    handler: async (request, h) => {
      const shadeId = request.params.shadeId;
      const shadeRef = firestore.collection('shades').doc(shadeId);
      const doc = await shadeRef.get();
      if (!doc.exists) {
        return h.response({ message: 'Shade not found' }).code(404);
      }
      return h.response(doc.data()).code(200);
    }
  });

  // Endpoint untuk menambahkan foundation shade baru
  server.route({
    method: 'POST',
    path: '/api/shades',
    handler: async (request, h) => {
      const { shade_id, description, image_url, recommended_brands } = request.payload;
      
      // Validasi input data
      if (!shade_id || !description || !image_url || !recommended_brands) {
        return h.response({ message: 'Missing required fields' }).code(400);
      }
      
      const newShade = {
        shade_id,
        description,
        image_url,
        recommended_brands
      };

      await firestore.collection('shades').doc(shade_id).set(newShade);
      return h.response(newShade).code(201);
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
