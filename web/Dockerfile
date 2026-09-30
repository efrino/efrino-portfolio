FROM node:22-alpine
WORKDIR /app
COPY server.js profile.txt ./
COPY public ./public
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
