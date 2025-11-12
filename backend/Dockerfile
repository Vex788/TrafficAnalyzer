# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    noto-sans \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    bash

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY . .

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

USER nodejs

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
