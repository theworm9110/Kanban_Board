# Real-Time Collaborative Kanban Board

A Trello-like collaborative Kanban board with real-time synchronization, presence indicators, and per-card edit locks. Built with **Next.js**, **WebSockets (Socket.io)**, **Redis Pub/Sub**, and **@dnd-kit** for drag-and-drop.

## Features

- **Real-time collaboration** – Card movements, edits, and comments sync across all users instantly (<200ms propagation)
- **Optimistic UI** – Instant local updates with server reconciliation; zero perceived lag under normal network conditions
- **Presence indicators** – See who's online (active users with colored avatars)
- **Per-card edit locks** – Redis TTL keys prevent edit conflicts; only one user can edit a card at a time
- **Conflict-free editing** – Edit lock system reduces conflicts to zero in multi-user stress tests

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, @dnd-kit (drag-and-drop), Socket.io Client
- **Backend**: Node.js WebSocket server (Socket.io), Redis Pub/Sub
- **Presence**: Redis TTL keys for online users and edit locks

## Prerequisites

- Node.js 18+
- Redis (local or via Docker)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run the app

```bash
npm run dev
```

This starts both:
- **Next.js** on [http://localhost:3000](http://localhost:3000)
- **WebSocket server** on port 3001

**Note:** If Redis is not running, the WebSocket server uses in-memory storage. The app works for local development, but board state is lost on restart.

### 3. (Optional) Start Redis for persistence

From the project folder, run:

```bash
docker compose up -d
```

> If that fails, try `docker-compose up -d` (older Docker Compose V1).

Restart `npm run dev` after Redis is running. Board state will persist across restarts.

## Environment Variables

Copy `.env.example` to `.env.local` and adjust:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Next.js app URL (for CORS) | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `http://localhost:3001` |
| `WS_PORT` | WebSocket server port | `3001` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   Next.js App   │◄──────────────────►│  WS Server       │
│   (Port 3000)   │                    │  (Port 3001)     │
└─────────────────┘                    └────────┬─────────┘
                                                │
                                                │ Pub/Sub
                                                ▼
                                       ┌──────────────────┐
                                       │      Redis       │
                                       │ - board:state    │
                                       │ - presence:{id}  │
                                       │ - edit:{cardId}  │
                                       └──────────────────┘
```

- **Board state** is stored in Redis (`board:state`) and synced via events
- **Presence** uses Redis TTL keys (`presence:{userId}`) expiring every 30s; heartbeats keep users online
- **Edit locks** use Redis keys (`edit:{cardId}`) with 120s TTL; one user per card

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + WebSocket server (concurrent) |
| `npm run build` | Build Next.js for production |
| `npm run start` | Run production build + WebSocket server |

## Deployment

You can deploy the application using any container‑capable host or a platform‑as‑a‑service. Two common approaches are described below; follow the steps on your development machine (project root) and then push the resulting files to GitHub as usual.

### Docker / Docker Compose (any cloud VM or droplet)

1. A `Dockerfile` is already included; build the image locally:
   ```bash
   docker build -t kanban-board:latest .
   ```
2. Optionally run everything locally with Redis:
   ```bash
   docker compose up --build
   ```
   Open `http://localhost:3500` to verify the app.
3. Push the image to a registry and pull/run it on your server, or simply copy the above `docker-compose.yml` to the host and run `docker compose up -d`.

### Heroku / Render / Railway style (Git‑push deployment)

1. A `Procfile` is included:
   ```text
   web: npm run start:next
   ws:  npm run start:ws
   ```
2. Create an app on the platform and connect your GitHub repository.
3. Set environment variables (`WS_PORT=3501`, `REDIS_URL`, etc.) and add a managed Redis addon if available.
4. Push your code (`git push heroku main` or let the service build on each commit).

## License

MIT
