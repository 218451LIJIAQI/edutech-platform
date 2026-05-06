# EduTech Platform

EduTech Platform is a full-stack learning platform with a TypeScript, Express, and Prisma backend and a React + Vite frontend.

## Tech Stack

- Backend: Node.js, TypeScript, Express, Prisma, PostgreSQL, Socket.IO
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Router, i18next

## Repository Structure

- `backend/` - API server, Prisma schema, and database-related code
- `frontend/` - client application

## Prerequisites

- Node.js 20+
- PostgreSQL

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

### `backend/.env`

- `NODE_ENV`
- `PORT`
- `API_VERSION`
- `LOG_LEVEL`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `PASSWORD_RESET_CODE_TTL_MINUTES`
- `PASSWORD_RESET_MAX_ATTEMPTS`
- `PASSWORD_RESET_TOKEN_EXPIRES_IN`
- `AUTH_MAX_FAILED_LOGINS`
- `AUTH_LOCKOUT_MINUTES`
- `PLATFORM_COMMISSION_RATE`
- `MAX_FILE_SIZE`
- `UPLOAD_DIR`
- `CORS_ORIGIN`
- `SOCKET_CORS_ORIGIN`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

### `frontend/.env`

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_DEV_BACKEND_ORIGIN`

## Scripts

### Backend

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:studio`
- `npm run seed`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`

## Notes

- The Prisma seed script is intentionally empty and does not insert default data.
- The frontend dev server proxies `/api`, `/uploads`, and `/socket.io` to the backend.
