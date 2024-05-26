'use strict';

const Joi = require('@hapi/joi');

exports.plugin = {
  name: 'shadesRoutes',
  version: '1.0.0',
  register: async function (server, options) {
    const firestore = options.firestore;

    // Endpoint to get all foundation shades
    server.route({
      method: 'GET',
      path: '/api/shades',
      handler: async (request, h) => {
        try {
          const shadesRef = firestore.collection('shades');
          const snapshot = await shadesRef.get();
          const shades = snapshot.docs.map(doc => doc.data());
          return h.response(shades).code(200);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });

    // Endpoint to get a single foundation shade by ID
    server.route({
      method: 'GET',
      path: '/api/shades/{shadeId}',
      handler: async (request, h) => {
        try {
          const shadeId = request.params.shadeId;
          const shadeRef = firestore.collection('shades').doc(shadeId);
          const doc = await shadeRef.get();
          if (!doc.exists) {
            return h.response({ message: 'Shade not found' }).code(404);
          }
          return h.response(doc.data()).code(200);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });

    // Endpoint to add a new foundation shade
    server.route({
      method: 'POST',
      path: '/api/shades',
      options: {
        validate: {
          payload: Joi.object({
            shade_id: Joi.string().required(),
            description: Joi.string().required(),
            image_url: Joi.string().uri().allow(''),
            skintone: Joi.string().required(),
            source: Joi.string().allow(''),
            recommended_brands: Joi.array().items(Joi.string()).required()
          })
        }
      },
      handler: async (request, h) => {
        try {
          const { shade_id, description, image_url, skintone, source, recommended_brands } = request.payload;

          const newShade = {
            shade_id,
            description,
            image_url,
            skintone,
            source,
            recommended_brands
          };

          await firestore.collection('shades').doc(shade_id).set(newShade);
          return h.response(newShade).code(201);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });
  }
};
