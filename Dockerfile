FROM node:20.5-bookworm-slim

WORKDIR /app

RUN apt update && apt install -y python3 fontconfig

COPY package.json .

RUN npm install

COPY data ./data
COPY events ./events
COPY models ./models
COPY slash_commands ./slash_commands
COPY util ./util
COPY index.js .
COPY config.js .

CMD ["node", "index.js"]
