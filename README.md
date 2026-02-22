# relay-hooks

Node.js + TypeScript service for handling relay integrations.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
```

Create and configure environment variables in `.env`.

## Development

```bash
npm run dev
```

This runs the service from `server/src/index.ts` with live reload.

## Build

```bash
npm run build
```

Compiles TypeScript using `tsconfig.json`.

## Production Run

```bash
npm start
```

Runs the compiled output (`dist/index.js`).

## Project Structure

- `server/src` - application source code
- `Dockerfile` - container build configuration
- `package.json` - scripts and dependencies
