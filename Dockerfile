FROM node:23-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:23-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
COPY .env ./
COPY assets ./assets
RUN npm ci --production
CMD ["npm", "start"]