# relay-hooks

`relay-hooks` is a Node.js + TypeScript microservice used by the main automation engine.
It receives provider/action requests, executes the mapped integration client method, and returns normalized results to the main system.

## What This Service Does

- Runs as an integration execution layer for the main automation engine.
- Exposes API endpoints for provider actions and provider metadata.
- Manages provider credentials and OAuth-based integrations.
- Uses a blueprint-style payload mapping flow to keep function behavior structured and reusable.

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL (or compatible DB settings)

## Setup

```bash
npm install
```

## Environment Configuration (.env is required)

You must create `.env` before running the service.
Without it, auth and integration calls may fail.

Example `.env` keys used by this project:

```env
NODE_PORT=5000
NODE_ENV=development
WEB_URL=https://relayhook.in

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=relayhooks
DB_USER=postgres
DB_PASS=your_password

SANDBOX_ALLOWED_HTTP_HOSTS=localhost,127.0.0.1
```

Notes:
- Keep real secrets only in `.env` (never hardcode tokens in code).
- Ensure redirect URIs in `.env` match provider console settings exactly.
- Use environment-specific values for local/dev/prod deployments.

## Development

```bash
npm run dev
```

Runs `server/src/index.ts` with live reload.

## Build

```bash
npm run build
```

Compiles TypeScript using `tsconfig.json`.

## Production Run

```bash
npm start
```

Runs compiled output from `dist/index.js`.

## API Endpoints

Base path: `/api`

- `ALL /api/integration/action/:provider/:action`
- `POST /api/integration/get-provider-metadata`

Auth routes are available under `/auth`.

## Blueprint-Based Function Design

This project follows a blueprint approach for easier function/integration maintenance.

High-level flow:
1. Schema mapping
2. Blueprint payload creation
3. Integration formatter
4. Send/execute action

This pattern is implemented around utility helpers and provider clients (for example payload construction in `server/src/services/Utility.ts`).
It helps keep each provider action consistent and easier to extend.

## Project Structure

- `server/src` - source code
- `server/src/integrations` - provider clients and provider metadata
- `server/src/services` - integration orchestration and payload utilities
- `Dockerfile` - container build config
- `package.json` - scripts and dependencies
