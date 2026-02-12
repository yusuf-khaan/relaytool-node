# --- Stage 1: Build Stage ---
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json package-lock.json tsconfig.json ./

# Install all dependencies
RUN npm install --legacy-peer-deps

# Copy all source files (TS + JS)
COPY server/src ./server/src

# Build TypeScript → dist/
RUN npm run build

# --- Stage 2: Production Stage ---
FROM node:18-alpine
WORKDIR /app

# Copy only production dependencies
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./

# Copy compiled output
COPY --from=build /app/dist ./dist

# Copy JS files that TypeScript may not compile (config, middleware, etc.)
COPY --from=build /app/server/src ./server/src

EXPOSE 3000

CMD ["node", "dist/src/index.js"]

