FROM node:20-alpine

# Add labels for CapRover
LABEL maintainer="PostHog PoC"

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 5050

# Environment variables
ENV PORT=5050
ENV NODE_ENV=production

# Health check for CapRover
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5050/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Start the application
CMD ["npm", "start"]
