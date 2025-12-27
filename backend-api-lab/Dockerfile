FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy all source files
COPY index.js ./
COPY routes.js ./
COPY posthog.js ./
COPY public ./public/

# Verify public folder exists
RUN ls -la && ls -la public/

EXPOSE 5050
ENV PORT=5050
ENV NODE_ENV=production

CMD ["npm", "start"]
