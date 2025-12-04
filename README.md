# EduTech Platform

<div align="center">

![EduTech Platform](https://img.shields.io/badge/EduTech-Platform-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)
![Node](https://img.shields.io/badge/node-%3E%3D18.17.0-brightgreen?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)

**A comprehensive full-stack online education platform connecting students with teachers worldwide.**

[Features](#-key-features) • [Installation](#-installation-guide) • [Usage](#-usage) • [API](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## Table of Contents

1. [Introduction](#-introduction)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [System Architecture](#-system-architecture)
5. [Project Structure](#-project-structure)
6. [Installation Guide](#-installation-guide)
7. [Configuration](#-configuration)
8. [Usage](#-usage)
9. [API Documentation](#-api-documentation)
10. [Database Schema](#-database-schema)
11. [User Roles](#-user-roles-and-permissions)
12. [Payment System](#-payment-system)
13. [Real-time Features](#-real-time-features)
14. [Internationalization](#-internationalization)
15. [Security](#-security-features)
16. [Deployment](#-deployment)
17. [Troubleshooting](#-troubleshooting)
18. [Contributing](#-contributing)
19. [License](#-license)

---

## Introduction

**EduTech Platform** is a modern, full-featured online learning management system (LMS) designed to bridge the gap between educators and learners. This platform provides a seamless experience for students to discover courses, enroll in classes, attend live sessions, and interact with a vibrant learning community. For teachers, it offers powerful tools to create and manage courses, track student progress, and earn money from their expertise.

### What Makes EduTech Special?

- **Three User Roles**: Student, Teacher, and Admin - each with tailored experiences
- **Flexible Course Types**: Support for live sessions, recorded videos, and hybrid courses
- **Complete E-commerce**: Shopping cart, checkout, orders, and refund management
- **Community Features**: Social-like posts, comments, likes, and user following
- **Real-time Communication**: Live messaging and notifications via WebSocket
- **Wallet & Earnings**: Teachers can track and withdraw their earnings
- **Multi-language Support**: Available in English, Chinese, and Malay

---

## Key Features

### For Students

| Feature | Description |
|---------|-------------|
| **Course Discovery** | Browse and search courses with advanced filtering |
| **Course Enrollment** | Enroll through smooth checkout with Stripe payment |
| **Learning Experience** | Access videos, join live sessions, download materials |
| **Progress Tracking** | Track learning progress across all enrolled courses |
| **Shopping Cart** | Add multiple courses and checkout in one transaction |
| **Order Management** | View history, request refunds, manage purchases |
| **Reviews & Ratings** | Rate and review completed courses |
| **Community Posts** | Share learning journey, ask questions, interact |
| **Real-time Messaging** | Send messages to teachers and students |
| **Report Issues** | Report problems to administrators |
| **Customer Support** | Submit support tickets and track resolution |

### For Teachers

| Feature | Description |
|---------|-------------|
| **Course Creation** | Create courses with multiple lessons and packages |
| **Content Types** | Upload videos, schedule live sessions, hybrid courses |
| **Pricing Packages** | Create multiple pricing tiers with different features |
| **Student Management** | View and manage enrolled students |
| **Earnings Dashboard** | Track earnings, commission rates, revenue analytics |
| **Wallet System** | View balance and request payouts |
| **Teacher Verification** | Submit credentials for verification |
| **Profile Completion** | Complete professional profile |
| **Live Sessions** | Host live classes with real-time interaction |
| **Materials Upload** | Upload supplementary materials (PDFs, documents) |

### For Administrators

| Feature | Description |
|---------|-------------|
| **User Management** | Create, edit, activate/deactivate users |
| **Course Oversight** | Review and manage all platform courses |
| **Teacher Verification** | Review and approve/reject teacher requests |
| **Report Management** | Handle user reports and take actions |
| **Refund Processing** | Review and process refund requests |
| **Support Tickets** | Manage customer support tickets |
| **Financial Management** | View revenue, payouts, financial analytics |
| **Batch Operations** | Perform bulk actions on users or items |
| **Audit Logs** | Track all administrative actions |

### Platform Features

| Feature | Description |
|---------|-------------|
| **Responsive Design** | Works on desktop, tablet, and mobile |
| **Real-time Notifications** | Instant notifications for events |
| **Search & Filtering** | Advanced search with filters |
| **Secure Authentication** | JWT-based with refresh tokens |
| **Rate Limiting** | Protection against API abuse |
| **XSS Protection** | Input sanitization for security |
| **File Uploads** | Secure upload for videos, images, documents |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | Core UI library |
| **TypeScript** | 5.3 | Type-safe JavaScript |
| **Vite** | 5.0 | Fast build tool |
| **TailwindCSS** | 3.3 | Utility-first CSS |
| **React Router** | 6.20 | Client-side routing |
| **Zustand** | 4.4 | State management |
| **React Query** | 5.59 | Server state management |
| **Axios** | 1.6 | HTTP client |
| **Socket.io Client** | 4.6 | Real-time communication |
| **Stripe React** | 5.4 | Payment integration |
| **Lucide React** | 0.294 | Icon library |
| **React Hook Form** | 7.49 | Form handling |
| **date-fns** | 3.0 | Date utilities |
| **Recharts** | 3.5 | Charts and analytics |
| **i18next** | 23.11 | Internationalization |
| **React Hot Toast** | 2.4 | Toast notifications |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | ≥18.17 | JavaScript runtime |
| **Express** | 4.18 | Web framework |
| **TypeScript** | 5.3 | Type-safe code |
| **Prisma** | 5.7 | Database ORM |
| **PostgreSQL** | Latest | Database |
| **Socket.io** | 4.6 | Real-time communication |
| **JWT** | 9.0 | Authentication tokens |
| **Stripe** | 14.9 | Payment processing |
| **Bcrypt** | 5.1 | Password hashing |
| **Helmet** | 6.2 | Security headers |
| **Morgan** | 1.10 | Request logging |
| **Winston** | 3.11 | Logging framework |
| **Express Validator** | 7.0 | Input validation |
| **Multer** | 1.4 | File uploads |
| **sanitize-html** | 2.17 | XSS prevention |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Application (Vite)                  │  │
│  │  Pages → Components → Hooks → Services → State        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVER LAYER                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Express Application                       │  │
│  │  Middleware → Routes → Controllers → Services         │  │
│  │                                                        │  │
│  │  Socket.io Server (Real-time Communication)           │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │  PostgreSQL + Prisma │  │  File Storage (uploads/)  │   │
│  └─────────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ┌──────────────────┐                                       │
│  │  Stripe Payments │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
edutech-platform/
├── backend/                      # Backend application
│   ├── prisma/
│   │   ├── migrations/           # Database migrations
│   │   └── schema.prisma         # Database schema
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── controllers/          # Request handlers
│   │   ├── middleware/           # Express middleware
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   ├── socket/               # WebSocket handlers
│   │   ├── types/                # TypeScript types
│   │   ├── utils/                # Utilities
│   │   ├── validators/           # Input validation
│   │   └── index.ts              # Entry point
│   ├── uploads/                  # File storage
│   ├── .env                      # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # Frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── auth/             # Auth components
│   │   │   ├── common/           # Shared components
│   │   │   ├── layout/           # Layout components
│   │   │   └── teacher/          # Teacher components
│   │   ├── hooks/                # Custom hooks
│   │   ├── locales/              # i18n translations
│   │   │   ├── en/               # English
│   │   │   ├── ms/               # Malay
│   │   │   └── zh/               # Chinese
│   │   ├── pages/                # Page components
│   │   │   ├── admin/            # Admin pages
│   │   │   ├── auth/             # Auth pages
│   │   │   ├── community/        # Community pages
│   │   │   ├── courses/          # Course pages
│   │   │   ├── messages/         # Message pages
│   │   │   ├── student/          # Student pages
│   │   │   └── teacher/          # Teacher pages
│   │   ├── services/             # API services
│   │   ├── store/                # State management
│   │   ├── types/                # TypeScript types
│   │   ├── utils/                # Utilities
│   │   ├── App.tsx               # Main component
│   │   └── main.tsx              # Entry point
│   ├── .env                      # Environment variables
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## Installation Guide

### Prerequisites

1. **Node.js** (v18.17.0+): https://nodejs.org/
2. **PostgreSQL** (v14+): https://www.postgresql.org/download/
3. **Git**: https://git-scm.com/

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/edutech-platform.git
cd edutech-platform
```

### Step 2: Setup Backend

```bash
cd backend
npm install
```

Create `.env` file:

```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/edutech"

# JWT (use secure random strings)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Platform
PLATFORM_COMMISSION_RATE=10
MAX_FILE_SIZE=52428800
UPLOAD_DIR=uploads

# CORS
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Setup database:

```bash
npm run db:generate
npm run db:migrate
```

### Step 3: Setup Frontend

```bash
cd ../frontend
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

### Step 4: Start Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1/health

---

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration | 7d |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |
| `PLATFORM_COMMISSION_RATE` | Commission % (0-100) | 10 |
| `CORS_ORIGIN` | Allowed origins | http://localhost:5173 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Frontend Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_SOCKET_URL` | WebSocket server URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

---

## Usage

### Getting Started

1. **Register**: Create an account as Student, Teacher, or Admin
2. **Login**: Use your credentials to access the platform
3. **Explore**: Browse courses, community, and features

### Student Workflow

1. Browse courses on the Courses page
2. View course details, lessons, and packages
3. Add desired packages to shopping cart
4. Checkout and pay with Stripe
5. Access enrolled courses from Dashboard
6. Watch videos, join live sessions
7. Track progress and complete courses
8. Leave reviews after completion

### Teacher Workflow

1. Complete your teacher profile
2. Submit for admin verification
3. Once approved, create your first course
4. Add lessons (videos/live sessions)
5. Create pricing packages
6. Publish course for students
7. Monitor enrollments and earnings
8. Request payouts from wallet

### Admin Workflow

1. Login with admin credentials
2. Access Admin Dashboard
3. Manage users, courses, reports
4. Verify teacher applications
5. Process refunds and support tickets
6. Monitor platform analytics

---

## API Documentation

### Base URL

```
Development: http://localhost:3000/api/v1
```

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Get current user |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List courses |
| GET | `/courses/:id` | Get course details |
| GET | `/courses/:id/lessons` | Get lessons |
| GET | `/courses/:id/packages` | Get packages |

### Teacher

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/profile` | Get profile |
| PUT | `/teacher/profile` | Update profile |
| GET | `/teacher/courses` | Get courses |
| POST | `/teacher/courses` | Create course |
| GET | `/teacher/earnings` | Get earnings |

### Cart & Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get cart |
| POST | `/cart` | Add to cart |
| DELETE | `/cart/:id` | Remove from cart |
| GET | `/orders` | Get orders |
| POST | `/orders` | Create order |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment/create-intent` | Create payment intent |
| POST | `/payment/confirm` | Confirm payment |

### Community

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/community/posts` | Get posts |
| POST | `/community/posts` | Create post |
| POST | `/community/posts/:id/like` | Like post |
| POST | `/community/posts/:id/comments` | Add comment |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/threads` | Get threads |
| POST | `/messages/threads` | Create thread |
| POST | `/messages/threads/:id` | Send message |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | Get all users |
| PUT | `/admin/users/:id` | Update user |
| GET | `/admin/refunds` | Get refunds |
| PUT | `/admin/refunds/:id` | Process refund |

---

## Database Schema

### Core Models

**User**: Stores all user accounts
- id, email, password, firstName, lastName
- role (STUDENT/TEACHER/ADMIN)
- avatar, phone, isActive, lastLoginAt

**TeacherProfile**: Teacher information
- bio, headline, hourlyRate
- totalStudents, averageRating, totalEarnings
- verificationStatus, isVerified

**Course**: Course information
- title, description, category
- courseType (LIVE/RECORDED/HYBRID)
- thumbnail, isPublished

**Lesson**: Individual lessons
- title, description, type
- duration, videoUrl, orderIndex

**LessonPackage**: Pricing tiers
- name, price, discount, finalPrice
- duration, maxStudents, features

**Enrollment**: Student enrollments
- userId, packageId
- progress, completedLessons, expiresAt

**Order**: Purchase orders
- orderNo, status, totalAmount
- paidAt, refundedAt

**Payment**: Transactions
- amount, platformCommission, teacherEarning
- stripePaymentId, status

**Wallet**: Teacher earnings
- availableBalance, pendingPayout
- transactions, payoutMethods

**Review**: Course reviews
- rating, comment
- enrollmentId, reviewerId, teacherId

**CommunityPost**: Social posts
- title, content
- likes, bookmarks, commentsCount

**Message**: Direct messages
- threadId, senderId, content
- isRead, createdAt

**SupportTicket**: Support requests
- subject, description, category
- priority, status, resolution

---

## User Roles and Permissions

### Student
- Browse and enroll in courses
- Access purchased content
- Write reviews
- Create community posts
- Send messages
- Request refunds

### Teacher
- All student permissions
- Create and manage courses
- View enrolled students
- Track earnings
- Request payouts
- Host live sessions

### Admin
- All teacher permissions
- Manage all users
- Verify teachers
- Process refunds
- Handle support tickets
- View analytics

---

## Payment System

### Flow

1. Student adds courses to cart
2. Proceeds to checkout
3. Backend creates Stripe PaymentIntent
4. Student enters card details
5. Payment processed by Stripe
6. Webhook confirms payment
7. Student enrolled in courses
8. Teacher receives earnings

### Commission

- Platform takes configurable commission (default 10%)
- Teacher receives remaining amount
- Earnings credited to teacher wallet

### Payouts

Teachers can withdraw via:
- Bank Transfer
- PayPal
- GrabPay
- Touch 'n Go

---

## Real-time Features

### Socket.io Events

| Event | Description |
|-------|-------------|
| `join_session` | Join live session |
| `leave_session` | Leave session |
| `session_started` | Session began |
| `new_notification` | New notification |
| `new_message` | New message |

### Features

- Live session participation
- Real-time notifications
- Instant messaging
- Online status

---

## Internationalization

### Supported Languages

| Language | Code |
|----------|------|
| English | en |
| 中文 | zh |
| Bahasa Melayu | ms |

Translation files in `frontend/src/locales/`.

---

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with salt
- **XSS Prevention**: Input sanitization
- **Rate Limiting**: API abuse protection
- **CORS**: Configurable origins
- **Helmet**: Security headers
- **Input Validation**: Express Validator

---

## Deployment

### Backend (Render)

1. Create Render account
2. Connect GitHub repository
3. Create PostgreSQL database
4. Deploy web service with `render.yaml`
5. Configure environment variables

### Frontend (Netlify)

1. Create Netlify account
2. Import repository
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variables

---

## Troubleshooting

### Common Issues

**Database connection failed**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check network/firewall settings

**JWT errors**
- Verify JWT_SECRET is set
- Check token expiration
- Ensure tokens aren't blacklisted

**CORS errors**
- Verify CORS_ORIGIN matches frontend URL
- Include protocol (http/https)

**Stripe errors**
- Verify API keys are correct
- Use test keys in development
- Check webhook configuration

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2024 EduTech Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Contact & Support

For questions or support, please:

1. Open an issue on GitHub
2. Check existing documentation
3. Review FAQ section

---

<div align="center">

**Built with passion for education**

Made with React, Node.js, TypeScript, and PostgreSQL

</div>
