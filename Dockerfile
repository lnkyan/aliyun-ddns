FROM node:21-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY . .
RUN npm ci --omit-dev

ENV accessKey=AK accessKeySecret=AS domain=sub.example.com interval=300 webHook="https://webhook.example.com?text={msg}"

CMD ["npm", "start"]
