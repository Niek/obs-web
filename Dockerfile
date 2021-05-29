FROM node:16-alpine
COPY ./ ./
RUN npm i
EXPOSE 5000
ENTRYPOINT [ "npm", "run", "dev" ]
LABEL org.opencontainers.image.source="https://github.com/Niek/obs-web"