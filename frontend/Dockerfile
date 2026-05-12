FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=development

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source
COPY frontend/ .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
