FROM node:18-bullseye-slim
WORKDIR /app

ENV NODE_ENV=development

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install --no-save @rollup/rollup-linux-x64-gnu @esbuild/linux-x64@0.21.5

# Copy source
COPY . .

ENV ESBUILD_BINARY_PATH=/app/node_modules/@esbuild/linux-x64/bin/esbuild

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
