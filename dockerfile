FROM mcr.microsoft.com/playwright:v1.56.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN chmod +x cmd.sh
#CMD ["sh", "cmd.sh"]
