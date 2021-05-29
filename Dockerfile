FROM node:16-alpine
COPY ./ ./
RUN npm i && npm run build
EXPOSE 5000
ENTRYPOINT [ "npm", "run", "start" ]
LABEL org.opencontainers.image.source="https://github.com/Niek/obs-web"