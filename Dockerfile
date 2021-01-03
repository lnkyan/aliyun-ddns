FROM node:10.21.0-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --registry=https://registry.npm.taobao.org
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

#EXPOSE 8080

ENV accessKey=AK accessKeySecret=AS domain=sub.example.com interval=300 webHook="https://webhook.example.com?text={msg}"

CMD ["npm", "start"]
