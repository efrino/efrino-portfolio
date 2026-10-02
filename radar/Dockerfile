# Built from the repo root so the portfolio profile can seed the Radar profile.
FROM node:22-alpine
WORKDIR /app
COPY radar/ ./
COPY web/profile.txt ./profile.txt
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "--no-warnings", "server.js"]
