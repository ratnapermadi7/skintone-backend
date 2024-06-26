'use strict';

const Joi = require('@hapi/joi');

exports.plugin = {
  name: 'shadesRoutes',
  version: '1.0.0',
  register: async function (server, options) {
    const firestore = options.firestore;

    // Mapping function for numbers to skintone
   

    // Endpoint to get all foundation shades
    server.route({
      method: 'GET',
      path: '/',
      handler: (request, h) => {
        return h.response('Welcome to Skintone API').code(200);
      }
    });

    server.route({
      method: 'GET',
      path: '/api/shades',
      handler: async (request, h) => {
        try {
          const skintone = request.query.skintone ? request.query.skintone.toUpperCase() : null;
          const shadesRef = firestore.collection('shades');

          let querySnapshot;
          if (skintone) {
            // If skintone query parameter is provided, fetch data based on skintone
            querySnapshot = await shadesRef.where('skintone', '==', skintone).get();
          } else {
            // If no skintone query parameter, fetch all data
            querySnapshot = await shadesRef.get();
          }

          if (querySnapshot.empty) {
            return h.response({ message: 'No shades found' }).code(404);
          }

          const shades = [];
          querySnapshot.forEach(doc => {
            shades.push(doc.data());
          });

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

    const writeBatches = async (shades) => {
      const BATCH_SIZE = 500;
      let batch = firestore.batch();
      let batchCounter = 0;

      for (let i = 0; i < shades.length; i++) {
        const shade = shades[i];
        const shadeRef = firestore.collection('shades').doc(shade.shade_id);
        batch.set(shadeRef, shade);

        batchCounter++;
        if (batchCounter === BATCH_SIZE || i === shades.length - 1) {
          await batch.commit();
          batch = firestore.batch();
          batchCounter = 0;
        }
      }
    };

    // Endpoint to add a new foundation shade
    server.route({
      method: 'POST',
      path: '/api/shades',
      options: {
        auth: 'jwt',
        validate: {
          payload: Joi.array().items(
            Joi.object({
              shade_id: Joi.string().required(),
              description: Joi.string().required(),
              image_url: Joi.string().uri().allow(''),
              skintone: Joi.string().required(),
              source: Joi.string().allow(''),
              recommended_brands: Joi.array().items(Joi.string()).required()
            })
          ).required()
        }
      },
      handler: async (request, h) => {
        const shades = request.payload;

        try {
          await writeBatches(shades);
          return h.response({ message: 'Shades added successfully' }).code(201);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });

    // Endpoint to update an existing foundation shade
    server.route({
      method: 'PUT',
      path: '/api/shades/{shadeId}',
      options: {
        auth: 'jwt',
        validate: {
          payload: Joi.object({
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
          const shadeId = request.params.shadeId;
          const { description, image_url, skintone, source, recommended_brands } = request.payload;

          const shadeRef = firestore.collection('shades').doc(shadeId);
          const doc = await shadeRef.get();
          if (!doc.exists) {
            return h.response({ message: 'Shade not found' }).code(404);
          }

          const updatedShade = {
            shade_id: shadeId,
            description,
            image_url,
            skintone,
            source,
            recommended_brands
          };

          await shadeRef.update(updatedShade);
          return h.response(updatedShade).code(200);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });

    // Endpoint to delete an existing foundation shade
    server.route({
      method: 'DELETE',
      path: '/api/shades/{shadeId}',
      options: {
        auth: 'jwt',
      },
      handler: async (request, h) => {
        try {
          const shadeId = request.params.shadeId;
          const shadeRef = firestore.collection('shades').doc(shadeId);
          const doc = await shadeRef.get();
          if (!doc.exists) {
            return h.response({ message: 'Shade not found' }).code(404);
          }

          await shadeRef.delete();
          return h.response({ message: 'Shade deleted successfully' }).code(200);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });

    const getSkintone = (number) => {
      if (number === 1 || number === 2) return 'FAIR';
      if (number === 3 || number === 4) return 'LIGHT';
      if (number === 5) return 'LIGHT MEDIUM';
      if (number === 6) return 'MEDIUM TAN';
      if (number === 7 || number === 8) return 'DARK';
      if (number === 9 || number === 10) return 'DEEP';
      return null;
    };

    server.route({
      method: 'GET',
      path: '/api/shades/by-number',
      options: {
        validate: {
          query: Joi.object({
            number: Joi.number().min(1).max(10).required()
          }).required()
        }
      },
      handler: async (request, h) => {
        try {
          const number = request.query.number;
          const skintone = getSkintone(number);

          if (!skintone) {
            return h.response({ message: 'Invalid number, skintone not found' }).code(400);
          }

          const shadesRef = firestore.collection('shades');
          const querySnapshot = await shadesRef.where('skintone', '==', skintone).get();

          if (querySnapshot.empty) {
            return h.response({ message: 'No shades found for the given skintone' }).code(404);
          }

          const shades = [];
          querySnapshot.forEach(doc => {
            shades.push(doc.data());
          });

          return h.response(shades).code(200);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });

    // New endpoint to get shades by number
    server.route({
      method: 'POST',
      path: '/api/shades/number',
      options: {
        validate: {
          payload: Joi.object({
            number: Joi.number().min(1).max(10).required()
          }).required()
        }
      },
      handler: async (request, h) => {
        try {
          const number = request.payload.number;
          const skintone = getSkintone(number);

          if (!skintone) {
            return h.response({ message: 'Invalid number, skintone not found' }).code(400);
          }

          // Make an internal request to /api/shades with skintone query parameter
          const internalRequest = {
            method: 'GET',
            url: `/api/shades?skintone=${encodeURIComponent(skintone)}`,
            headers: request.headers
          };

          const response = await server.inject(internalRequest);

          return h.response(response.result).code(response.statusCode);
        } catch (error) {
          console.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      }
    });
  }
};
