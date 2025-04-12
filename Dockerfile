FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install passport-facebook passport-google-oauth20

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]