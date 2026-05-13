# Build stage
FROM oven/bun:alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add custom nginx config if needed, otherwise default is fine for simple SPA
# We'll use a basic SPA config to handle routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
