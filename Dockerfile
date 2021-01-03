FROM node:10.21.0-buster-slim

WORKDIR /home/mapp

COPY . /home/mapp

RUN npm install --registry=https://registry.npm.taobao.org

CMD npm run start
