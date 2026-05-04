FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production || true

# Copy source
COPY . .

EXPOSE 3000

CMD [ "node", "bot/index.js" ]
