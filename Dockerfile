FROM node:lts-stretch-slim

WORKDIR /app

RUN apt update && apt install -y python

COPY package.json .
#COPY package-lock.json .

RUN npm install

COPY commands ./commands
COPY data ./data
COPY events ./events
COPY models ./models
COPY slash_commands ./slash_commands
COPY util ./util
COPY index.js .
COPY config.js .

CMD ["node", "index.js"]
