# Optional: run Next.js frontend in Docker (e.g. for production).
# Build with: docker build --build-arg NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com -t smebuzz-web -f apps/website/Dockerfile apps/website
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["npm", "run", "start"]