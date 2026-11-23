FROM node:20-alpine
WORKDIR /app
COPY package.json server.js setup.js ./
RUN apk add --no-cache unzip && node setup.js
EXPOSE 8080
CMD ["node", "server.js"]
