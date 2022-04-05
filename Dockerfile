FROM node:16-alpine
COPY ./ ./
RUN apk add --no-cache git && npm i && npm run build && apk del git
EXPOSE 5000
ENTRYPOINT [ "npm", "run", "start" ]
LABEL org.opencontainers.image.source="https://github.com/Niek/obs-web"