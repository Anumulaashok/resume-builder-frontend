# Stage 1: Build React production assets
FROM node:alpine AS builder
WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code and build production assets
COPY . .
RUN npm run build

# Stage 2: Serve React production assets with Nginx
FROM nginx:alpine AS runner

# Copy production build artifacts from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration for SPA fallback and asset caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
