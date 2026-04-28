# ─────────────────────────────────────────────
#  Stage 1: Build Angular SPA
# ─────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=optional

COPY . .
RUN npm run build -- --configuration production

# ─────────────────────────────────────────────
#  Stage 2: Serve with Nginx
# ─────────────────────────────────────────────
FROM nginx:stable-alpine AS final

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA (Angular 17+ outputs to browser/ subdirectory)
COPY --from=build /app/dist/pookie-interface/browser/ /usr/share/nginx/html/

# Custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runtime config.json will be injected at startup via env vars
COPY docker-entrypoint.sh /docker-entrypoint.d/40-inject-config.sh
RUN chmod +x /docker-entrypoint.d/40-inject-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
