# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — install dependencies
###############################################################################
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

###############################################################################
# Stage 2 — development (default for docker-compose)
###############################################################################
FROM node:22-alpine AS development

WORKDIR /app

# Copy node_modules from deps stage so the bind-mount doesn't clobber them
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 5173

CMD ["npm", "run", "dev"]

###############################################################################
# Stage 3 — production build
###############################################################################
FROM deps AS builder

WORKDIR /app
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
# Serve index.html for all routes (React SPA)
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri $uri/ /index.html; }\n  location /api/ { proxy_pass http://web:8000; proxy_set_header Host $host; }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
