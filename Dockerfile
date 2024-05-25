FROM node:20

WORKDIR /user/src/app

COPY package*.json ./

RUN npm install

COPY  . .

ENV PORT=3000

ENV MODEL_URL=

CMD [ "npm", "start" ]