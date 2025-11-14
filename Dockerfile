FROM node:18 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:18
WORKDIR /app
COPY --from=builder /app/dist ./dist/src
COPY package.json package-lock.json ./
COPY .env ./
RUN npm ci --production
CMD ["npm", "start"]