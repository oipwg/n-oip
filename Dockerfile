FROM node:16.14.2

WORKDIR /app
COPY package.json ./
RUN npm install
COPY .env .
COPY app.js .
COPY fcoin.conf .

EXPOSE 3000
EXPOSE 7312

CMD [ "npm", "run", "dev" ]