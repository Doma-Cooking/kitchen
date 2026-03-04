# Docker Setup

> WIP — this guide is under construction.

## Prerequisites

- Docker and Docker Compose installed
- `.env` file configured (see `.env.example`)
- `.kitchen.yaml` configured (see `.kitchen.example.yaml`)

## Quick Start

```bash
docker compose up
```

## Services

- **app** — Kitchen agent runtime (port 3000)
- **redis** — BullMQ job queue
- **postgres** — Session persistence
