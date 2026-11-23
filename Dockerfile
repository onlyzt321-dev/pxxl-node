FROM node:24-alpine
WORKDIR /app
COPY package.json server.js setup.js ./
RUN apk add --no-cache unzip && node setup.js && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
EXPOSE 8080
CMD ["node", "server.js"]
