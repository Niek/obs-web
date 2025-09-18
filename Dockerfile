FROM node:lts-alpine
COPY ./ ./
RUN apk add --no-cache git && npm ci && npm run build && apk del git
EXPOSE 8080
ENTRYPOINT [ "npm", "run", "start" ]
LABEL org.opencontainers.image.source="https://github.com/Niek/obs-web"