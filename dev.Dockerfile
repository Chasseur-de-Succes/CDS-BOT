FROM node:20.11.0-alpine3.19 AS base
WORKDIR /home/node

RUN apk add --no-cache \
    ttf-dejavu \
    python3 \
    py3-pip \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    cairo \
    jpeg \
    pango \
    giflib

RUN npm i -g clean-modules@3

RUN npm i -g nodemon

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js .

CMD ["nodemon", "index.js"]
