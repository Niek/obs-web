FROM node:lts-alpine
COPY ./ ./
RUN npm ci && npm run build
EXPOSE 8080
ENTRYPOINT [ "npm", "run", "start" ]
LABEL org.opencontainers.image.source="https://github.com/Niek/obs-web"
