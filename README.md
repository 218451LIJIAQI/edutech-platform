<p align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.18.2-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-14-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-5.7.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

# 🎓 Edutech Platform

> A comprehensive, production-ready online education platform connecting teachers with students. Features course management, real-time messaging, Stripe payments, and a vibrant community ecosystem.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Docker Deployment](#-docker-deployment)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Security Features](#-security-features)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Edutech Platform** is a full-featured online education marketplace designed to facilitate seamless learning experiences. The platform supports three user roles—**Students**, **Teachers**, and **Administrators**—each with dedicated dashboards and functionalities.

### Key Highlights

- 🎯 **Multi-Role System** - Separate experiences for Students, Teachers, and Admins
- 📚 **Flexible Course Types** - Support for Live, Recorded, and Hybrid courses
- 💳 **Secure Payments** - Stripe integration with commission management
- 💬 **Real-Time Messaging** - Socket.io-powered instant communication
- 🏘️ **Community Features** - Posts, comments, likes, bookmarks, and following
- 🎫 **Support System** - Complete ticketing system for customer support
- 💰 **Teacher Wallet** - Earnings management and payout system
- 🔒 **Enterprise Security** - JWT auth, rate limiting, XSS protection

---

## ✨ Features

### 👨‍🎓 For Students

| Feature | Description |
|---------|-------------|
| **Course Discovery** | Browse and search courses with advanced filtering |
| **Course Enrollment** | Purchase via secure Stripe checkout |
| **Learning Experience** | Video lessons, live sessions, downloadable materials |
| **Progress Tracking** | Monitor completion percentages and milestones |
| **Reviews & Ratings** | Rate and review completed courses |
| **Shopping Cart** | Multi-course checkout support |
| **Order History** | Access past purchases and invoices |
| **Refund Requests** | Multiple refund method options |
| **Support Tickets** | Create and track support issues |
| **Real-Time Messaging** | Direct communication with teachers |
| **Community** | Create posts, comment, like, bookmark, follow users |

### 👩‍🏫 For Teachers

| Feature | Description |
|---------|-------------|
| **Profile Management** | Bio, qualifications, certifications |
| **Course Creation** | Multiple lessons, packages, pricing tiers |
| **Content Upload** | Videos, documents, supplementary materials |
| **Live Sessions** | Schedule and manage live teaching |
| **Student Management** | View enrolled students, track progress |
| **Earnings Dashboard** | Revenue, commission rates, transactions |
| **Wallet System** | Bank, PayPal, GrabPay, Touch 'n Go payouts |
| **Analytics** | Detailed course performance metrics |

### 🔧 For Administrators

| Feature | Description |
|---------|-------------|
| **User Management** | Full CRUD with batch operations |
| **Teacher Verification** | Review and approve applications |
| **Course Moderation** | Approve/reject course listings |
| **Order Management** | View and manage all orders |
| **Refund Processing** | Review refund requests |
| **Payout Management** | Process teacher withdrawals |
| **Support Tickets** | Handle customer issues |
| **Financial Reports** | Revenue analytics and reports |
| **Audit Logs** | Track all admin actions |

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Library |
| TypeScript | 5.3.3 | Type Safety |
| Vite | 5.0.8 | Build Tool |
| TailwindCSS | 3.3.6 | Styling |
| Zustand | 4.4.7 | State Management |
| React Router | 6.20.1 | Routing |
| React Query | 5.59.0 | Data Fetching |
| Socket.io Client | 4.6.0 | Real-time |
| Stripe React | 5.4.0 | Payments |
| Recharts | 3.5.0 | Charts |
| Lucide React | 0.294.0 | Icons |
| i18next | 23.11.5 | i18n |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18.2 | Framework |
| TypeScript | 5.3.3 | Type Safety |
| Prisma | 5.7.0 | ORM |
| PostgreSQL | 14 | Database |
| Redis | Latest | Caching |
| Socket.io | 4.6.0 | WebSocket |
| JWT | 9.0.2 | Auth |
| Stripe | 14.9.0 | Payments |
| BullMQ | 5.65.0 | Job Queue |
| Winston | 3.11.0 | Logging |
| Swagger | 5.0.1 | API Docs |
| Sentry | 10.27.0 | Monitoring |

### DevOps

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Nginx | Reverse Proxy |
| Jest | Testing |
| ESLint | Linting |
| Prettier | Formatting |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React + TypeScript + Vite                 │
│         (Zustand, React Query, TailwindCSS, Socket.io)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              NGINX (Reverse Proxy, Load Balancing)           │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
       /api/*           /socket.io/*       /uploads/*
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              Express + TypeScript + Socket.io                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Middleware: Auth | CORS | Helmet | Rate Limit | XSS    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Controllers → Services → Prisma ORM                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │      Redis      │  │     BullMQ      │
│   (Primary DB)  │  │   (Cache/Pub)   │  │   (Job Queue)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 📁 Project Structure

```
edutech-platform/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Database migrations
│   │   └── schema.prisma        # Schema definition
│   ├── src/
│   │   ├── __tests__/           # Unit tests
│   │   ├── config/              # Redis, Stripe, Swagger, Sentry
│   │   ├── controllers/         # Route handlers (20 files)
│   │   ├── middleware/          # Auth, CORS, Rate limit, XSS
│   │   ├── routes/              # API routes (18 files)
│   │   ├── services/            # Business logic (19 files)
│   │   ├── socket/              # WebSocket handlers
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Helpers, logger
│   │   ├── validators/          # Input validation
│   │   └── index.ts             # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable components (77 files)
│   │   │   ├── animation/       # Animation components
│   │   │   ├── auth/            # Auth guards
│   │   │   ├── common/          # Button, Card, Modal, etc.
│   │   │   ├── form/            # Form components
│   │   │   ├── layout/          # Header, Footer, Sidebar
│   │   │   └── teacher/         # Teacher-specific
│   │   ├── hooks/               # Custom hooks (26 files)
│   │   ├── pages/               # Page components (55 files)
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── community/       # Community pages
│   │   │   ├── courses/         # Course listing/detail
│   │   │   ├── messages/        # Messaging
│   │   │   ├── student/         # Student dashboard
│   │   │   └── teacher/         # Teacher dashboard
│   │   ├── services/            # API services (20 files)
│   │   ├── store/               # Zustand stores
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utilities
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Software | Version | Required |
|----------|---------|----------|
| Node.js | 18.17.0+ | ✅ |
| PostgreSQL | 14+ | ✅ |
| Redis | 6.0+ | Optional |
| Docker | Latest | Optional |

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/edutech-platform.git
cd edutech-platform

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Environment Configuration

**Backend (`backend/.env`):**

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/edutech"

# JWT (use strong secrets in production)
JWT_SECRET=your-jwt-secret-at-least-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
CSRF_SECRET=your-csrf-secret-32-chars
ENCRYPTION_KEY=your-encryption-key-32-chars

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
QUEUE_ENABLED=true

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug

# Sentry (optional)
SENTRY_DSN=
```

**Frontend (`frontend/.env`):**

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio
npx prisma studio
```

### Running the Application

**Development:**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Access URLs:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| API Docs | http://localhost:3000/api-docs |
| Health Check | http://localhost:3000/api/v1/health |

---

## 🐳 Docker Deployment

### Quick Start

```bash
# Create .env in project root
cat > .env << EOF
JWT_SECRET=your-production-jwt-secret-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-32-chars
STRIPE_SECRET_KEY=sk_live_...
EOF

# Build and run
docker-compose up -d --build

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f
```

### Docker Services

| Service | Container | Port |
|---------|-----------|------|
| PostgreSQL | edutech-postgres | 5432 |
| Backend | edutech-backend | 3000 |
| Frontend | edutech-frontend | - |
| Nginx | edutech-nginx | 80, 443 |

### Docker Commands

```bash
docker-compose up -d          # Start all
docker-compose down           # Stop all
docker-compose down -v        # Stop + remove volumes
docker-compose logs -f        # View logs
docker-compose exec backend sh # Shell into container
```

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:3000/api/v1
Production: https://your-domain.com/api/v1
```

### Authentication

```
Authorization: Bearer <jwt_token>
```

### Main Endpoints

| Category | Endpoints | Auth |
|----------|-----------|------|
| **Auth** | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` | Varies |
| **Courses** | `/courses`, `/courses/:id`, `/courses/:id/lessons` | Varies |
| **Teachers** | `/teachers`, `/teachers/:id`, `/teachers/profile` | Varies |
| **Enrollments** | `/enrollments/my-courses`, `/enrollments/:id` | Yes |
| **Cart** | `/cart`, `/cart/:packageId` | Yes |
| **Orders** | `/orders`, `/orders/:id`, `/orders/refund` | Yes |
| **Payments** | `/payments/create-checkout-session`, `/payments/webhook` | Varies |
| **Reviews** | `/reviews/course/:id`, `/reviews/teacher/:id` | Varies |
| **Messages** | `/messages/threads`, `/messages/threads/:id` | Yes |
| **Community** | `/community/posts`, `/community/users/:id/follow` | Varies |
| **Support** | `/support/tickets`, `/support/tickets/:id` | Yes |
| **Wallet** | `/wallet`, `/wallet/transactions`, `/wallet/payout-requests` | Teacher |
| **Admin** | `/admin/dashboard`, `/admin/users`, `/admin/orders` | Admin |
| **Health** | `/health`, `/health/detailed` | No |

### Swagger UI

Interactive API documentation available at:
```
http://localhost:3000/api-docs
```

---

## 🗄 Database Schema

### Core Models

```
Users                    TeacherProfile           Courses
├── id                   ├── userId ──────────────├── teacherProfileId
├── email                ├── bio                  ├── title
├── password             ├── qualifications       ├── description
├── firstName            ├── commissionRate       ├── courseType (LIVE/RECORDED/HYBRID)
├── lastName             ├── registrationStatus   ├── lessons[]
├── role (STUDENT/       └── wallet               └── packages[]
│   TEACHER/ADMIN)
└── isActive

Enrollments              Orders                   Payments
├── userId               ├── userId               ├── orderId
├── packageId            ├── items[]              ├── amount
├── progress             ├── totalAmount          ├── stripePaymentId
└── completedLessons     ├── status               └── status

Wallet                   CommunityPost            MessageThread
├── userId               ├── authorId             ├── participants[]
├── availableBalance     ├── title                └── messages[]
├── pendingPayout        ├── content
├── payoutMethods[]      ├── likes
└── transactions[]       └── comments[]
```

### Enums

- **UserRole**: STUDENT, TEACHER, ADMIN
- **CourseType**: LIVE, RECORDED, HYBRID
- **OrderStatus**: PENDING, PAID, CANCELLED, REFUNDED
- **RefundStatus**: PENDING, APPROVED, REJECTED, COMPLETED
- **PayoutMethodType**: BANK_TRANSFER, GRABPAY, TOUCH_N_GO, PAYPAL

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| **Authentication** | JWT with refresh tokens |
| **Password Security** | bcrypt hashing (12 rounds) |
| **Rate Limiting** | Express-rate-limit (configurable) |
| **XSS Protection** | Input sanitization, sanitize-html |
| **Security Headers** | Helmet middleware |
| **CORS** | Configurable origin whitelist |
| **CSRF Protection** | Double-submit cookie pattern |
| **Data Encryption** | AES-256 for sensitive data |
| **Token Blacklist** | Redis-based logout invalidation |
| **Request Tracing** | Correlation ID middleware |
| **Error Monitoring** | Sentry integration |
| **Audit Logging** | Admin action tracking |

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run frontend tests
cd frontend
npm test
```

### Test Structure

```
backend/src/__tests__/
├── setup.ts              # Test configuration
├── auth.service.test.ts  # Auth service tests
├── auth.test.ts          # Auth integration tests
└── errors.test.ts        # Error handling tests
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [Stripe](https://stripe.com/)
- [Socket.io](https://socket.io/)

---

<p align="center">
  Made with ❤️ by the Edutech Team
</p>

<p align="center">
  <a href="#-edutech-platform">Back to Top</a>
</p>
