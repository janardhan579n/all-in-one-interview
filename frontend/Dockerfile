# syntax=docker/dockerfile:1
#
# Frontend image: build with Node, serve with nginx.
#
# Build from the REPOSITORY ROOT, not from frontend/:
#   docker build -f frontend/Dockerfile -t learnplatform-web .
# The build needs /content as well as /frontend, because `npm run sync-content` copies the
# content library into the bundle that makes offline mode work.

FROM node:20-alpine AS build
WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
COPY content/ /content/
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /build/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD ["sh", "-c", "wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1"]
