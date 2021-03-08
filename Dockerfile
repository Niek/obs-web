FROM node:14-alpine
RUN apk --no-cache add git
RUN git clone https://github.com/Niek/obs-web
WORKDIR /obs-web
RUN npm i
EXPOSE 5000
ENTRYPOINT npm run dev
