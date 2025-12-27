FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./
COPY routes.js ./
COPY posthog.js ./
COPY public ./public/

RUN ls -la && ls -la public/

EXPOSE 5050
ENV PORT=5050
ENV NODE_ENV=production

CMD ["npm", "start"]
