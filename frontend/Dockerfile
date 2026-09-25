FROM node:24.9.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .

CMD ["npx", "expo", "start", "--clear", "--web", "--port", "8081"]

