FROM node:18.16.1-alpine3.18

# Create app directory
WORKDIR /app

# Install app dependencies
COPY . .
RUN npm ci --registry=https://registry.npm.taobao.org --only=production

ENV accessKey=AK accessKeySecret=AS domain=sub.example.com interval=300 webHook="https://webhook.example.com?text={msg}"

CMD ["npm", "start"]
