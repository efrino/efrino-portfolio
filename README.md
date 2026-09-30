# efrino.web.id

Personal portfolio for Efrino Wahyu Eko Pambudi: a Three.js 3D scene, animated sections, a subdomain hub, and an AI playground backed by the Claude API.

## Structure
- `web/public/data.js`: portfolio content (projects, subdomains, skills)
- `web/profile.txt`: facts the AI uses to answer questions about me
- `web/server.js`: zero-dependency Node server (static files, subdomain redirects, streaming `/api/chat` proxy to the Anthropic API, rate limiting)
- `docker-compose.yml`: Coolify deployment (single web service)
- `docker-compose.local.yml`: standalone deployment with manual Traefik labels

## Deploy (Coolify)
Build pack **Docker Compose**. Environment variable: `ANTHROPIC_API_KEY`. Note: running local LLMs (Ollama/llama.cpp) is not allowed on this VPS plan. Domains for service `web`:
`https://efrino.web.id,https://www.efrino.web.id,https://ai.efrino.web.id,https://shop.efrino.web.id,https://admin.efrino.web.id,https://notes.efrino.web.id,https://api.efrino.web.id,https://story.efrino.web.id,https://github.efrino.web.id,https://linkedin.efrino.web.id`

## Run locally
    docker compose -f docker-compose.local.yml up -d --build
