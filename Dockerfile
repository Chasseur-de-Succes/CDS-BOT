FROM node:20.11.0-alpine3.19 AS base
WORKDIR /home/node

RUN apk add --no-cache ttf-dejavu

########################
FROM base AS build

RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

RUN npm i -g clean-modules@3

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN clean-modules -y
RUN rm -rf ./node_modules/.cache

####################
FROM base
RUN apk add --no-cache cairo jpeg pango giflib

USER node

COPY --chown=node:node . .
COPY --chown=node:node --from=build /home/node/node_modules node_modules

CMD ["node", "index.js"]
