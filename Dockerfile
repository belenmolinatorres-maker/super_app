FROM node:18-alpine

WORKDIR /app

COPY src/package*.json ./src/
RUN cd src && npm ci --omit=dev

COPY src/ ./src/
COPY index.html reset_password.html manifest.json ./
COPY assets/ ./assets/
COPY private/ ./private/
COPY plantillas/ ./plantillas/

EXPOSE 3000

CMD ["node", "src/server.js"]
