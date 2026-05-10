# Delta Journal - Frontend

A React + TypeScript frontend for the Delta Exchange trading journal.

## Prerequisites

- [Bun](https://bun.sh) (v1.3+)

## Installation

```bash
bun install
```

## Configuration

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |

## Development

Start the development server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API URL |

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS 4
- Recharts (charts)
- Lucide React (icons)
- Axios (HTTP client)