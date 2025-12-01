# Edutech Platform

A full-stack education technology platform for online learning.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS + Zustand
- **Backend**: Express + TypeScript + Prisma + Socket.io
- **Database**: PostgreSQL
- **Payments**: Stripe

## Features

- Multi-role system (Student, Teacher, Admin)
- Course management (Live, Recorded, Hybrid)
- Real-time messaging via Socket.io
- Teacher wallet & earnings system
- Community posts
- Support tickets & refunds

## Quick Start

### Prerequisites

- Node.js >= 18.17.0
- PostgreSQL database

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Edit with your values
npm run db:push       # Push schema to database
npm run dev           # Start dev server on port 3000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env  # Edit with your values
npm run dev           # Start dev server on port 5173
```

## Deployment

- **Backend**: Render (see `backend/render.yaml`)
- **Frontend**: Netlify (see `frontend/netlify.toml`)

## Project Structure

```text
edutech-platform/
├── backend/
│   ├── prisma/          # Database schema & migrations
│   ├── src/
│   │   ├── config/      # Environment & app config
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, validation, etc.
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── socket/      # Socket.io handlers
│   │   ├── utils/       # Helper functions
│   │   └── validators/  # Input validation
│   └── uploads/         # User uploads
├── frontend/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── config/      # App constants
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # Third-party integrations
│       ├── locales/     # i18n translations
│       ├── pages/       # Route pages
│       ├── services/    # API services
│       ├── store/       # Zustand stores
│       ├── types/       # TypeScript types
│       └── utils/       # Helper functions
└── .gitignore
```

## API Documentation

Available at `/api-docs` when backend is running.
