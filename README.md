# FlexiLearnProject / Edutech Platform

This repository contains a full-stack Desktop Web online learning platform built with `React`, `Vite`, `TypeScript`, `Express`, `Prisma`, and `PostgreSQL`.

## Table of Contents

- [At a Glance](#at-a-glance)
- [Key Facts First](#key-facts-first)
- [Quick Start](#quick-start)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Roles and Capabilities](#roles-and-capabilities)
- [Typical End-to-End Flows](#typical-end-to-end-flows)
- [Core Modules Already Implemented](#core-modules-already-implemented)
- [Tech Stack](#tech-stack)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design Overview](#database-design-overview)
- [API Modules](#api-modules)
- [Real-Time and Live Session Notes](#real-time-and-live-session-notes)
- [Uploads and Protected Assets](#uploads-and-protected-assets)
- [Security and Risk Controls](#security-and-risk-controls)
- [Desktop Web Frontend Experience](#desktop-web-frontend-experience)
- [Project Structure](#project-structure)
- [Full Local Setup from Scratch](#full-local-setup-from-scratch)
- [How to Get the First Admin on a Fresh Database](#how-to-get-the-first-admin-on-a-fresh-database)
- [Recommended Demo Paths](#recommended-demo-paths)
- [Common Commands](#common-commands)
- [Environment Variables](#environment-variables)
- [Troubleshooting Notes](#troubleshooting-notes)
- [How to Describe This Project Accurately](#how-to-describe-this-project-accurately)
- [Current Status Summary](#current-status-summary)
- [Commit and Cleanup Guidance](#commit-and-cleanup-guidance)

## At a Glance

This project is a business-oriented Desktop Web online education platform featuring:

- separate guest, student, teacher, and admin experiences
- teacher onboarding and approval
- course creation and lesson management
- package-based course pricing
- simulated checkout, orders, enrollments, refunds, and wallet bookkeeping
- community, messaging, notifications, and support tickets
- admin moderation and finance-related operations
- Socket.IO-based real-time live session coordination

It is best described as:

- an online education platform
- a course commerce platform
- a teacher onboarding and approval platform
- an admin operations platform

## Key Facts First

These points are important if you want to describe the repository accurately.

1. Target platform is Desktop Web Application Only.
   The UI preserves flexible desktop browser window resizing, zoom levels (`125%`–`200%`), keyboard navigation, focus trapping, and overflow safety without mobile-only drawers, touch-only wrappers, or PWA metadata.

2. The payment flow is simulated, not connected to a real payment gateway.
   The frontend checkout UI clearly presents the flow as simulated checkout. The backend still creates meaningful business records such as orders, payments, enrollments, wallet transactions, and refunds, without external Stripe, PayPal, or FPX gateway integrations.

3. The live session feature is not a built-in video conferencing stack.
   The repository implements Socket.IO-based session state, join and leave behavior, chat, hand raise, and teacher session controls. The actual meeting room is opened through `meetingUrl`, which points to an external live meeting link.

4. The Prisma seed is intentionally empty.
   `backend/prisma/seed.js` does not create demo users, courses, orders, or default admin accounts. The project is designed to start from an empty baseline database.

5. A fresh database does not automatically include an admin account.
   Public registration allows `STUDENT` and `TEACHER`. To test admin workflows, an existing user must be promoted to `ADMIN`.

6. Automated unit and contract tests cover core backend and frontend business invariants.
   `backend/src/__tests__` and `frontend/src/__tests__` exercise sanitization idempotency, email canonicalization, cookie security policies, HTTP parsing/pagination helpers, multi-item order financial settlements, split-origin API/asset URL resolution, video embed parsing, course/package/lesson/material persistence contracts, and enrollment deduplication via Node's built-in test runner (`scripts/run-tests.mjs`).

7. Backend and frontend are started as two independent processes in development.
   Local development uses one terminal for `backend` and one terminal for `frontend`.

## Quick Start

### 1. Requirements

- Node.js `>= 20`
- npm
- PostgreSQL

### 2. Backend Setup

Copy `backend/.env.example` to `backend/.env`, then update the database URL, JWT secrets, and CORS values if needed.

```bash
cd backend
npm ci
npm run prisma:migrate
npm run dev
```

Default backend address:

```text
http://localhost:3000
```

Health endpoints:

```text
http://localhost:3000/api/v1/health
http://localhost:3000/api/v1/ready
```

### 3. Frontend Setup

Copy `frontend/.env.example` to `frontend/.env`.

```bash
cd frontend
npm ci
npm run dev
```

Default frontend address:

```text
http://localhost:5173
```

### 4. Important First-Test Note

If you want to test admin functionality, you must manually promote one user to `ADMIN`. A fresh database will not create one for you automatically.

## Architecture at a Glance

```mermaid
flowchart LR
    A["Guest / Student / Teacher / Admin Desktop Browser"] --> B["React 18 + Vite + TypeScript Frontend"]
    B --> C["Express 4 + TypeScript API<br/>/api/v1"]
    B <--> D["Socket.IO Real-Time Layer"]
    C --> E["Prisma ORM"]
    E --> F[("PostgreSQL")]
    C --> G["Validated Upload Storage"]
    B --> H["External Meeting Room via meetingUrl"]
```

### What This Means in Practice

- the frontend is a full Desktop Web SPA, not a static mockup
- the backend is a structured API with business rules and persistence
- the database schema models commerce, learning, support, communication, and admin workflows
- real-time behavior exists for live-session coordination
- actual video conferencing is delegated to an external meeting URL

## Roles and Capabilities

| Role | Main capabilities currently implemented |
| --- | --- |
| Guest | home page, course browsing, course details, teacher browsing, teacher details, help center, login, register, forgot password, terms page, privacy page |
| Student | cart, single-course checkout, cart checkout, my courses, course learning page, quiz submission, course reviews, orders, refund requests, notifications, direct messages, community, reports, support tickets, live sessions, profile |
| Teacher | basic profile, extended profile, certifications, identity verification submission, course creation, lesson management, package management, material uploads, course notifications, student stats, student management, earnings view, wallet, payout methods, payout requests |
| Admin | platform overview, user management, batch operations, audit logs, course moderation, teacher verification review, teacher profile review, report handling, refund handling, support ticket handling, ad management, financial analytics, payout review |

## Typical End-to-End Flows

### Student Flow

1. register or log in
2. browse courses and teachers
3. add courses to cart or buy directly
4. complete simulated checkout
5. receive enrollment access
6. study lessons, submit quizzes, and track progress
7. leave reviews or request refunds when needed

### Teacher Flow

1. register as `TEACHER`
2. complete teacher profile information
3. upload certifications and verification materials
4. submit profile and verification for review
5. wait for admin approval
6. create courses, lessons, packages, and materials
7. manage students, notifications, wallet, and payout requests

### Admin Flow

1. access admin dashboard with an `ADMIN` account
2. review teacher verification and profile submissions
3. moderate courses, reports, and support tickets
4. review refunds and payout requests
5. manage ads, users, and platform analytics

## Core Modules Already Implemented

### 1. Authentication and Account Management

- registration, login, and logout
- current profile fetch and profile update
- password change, forgot password, 6-digit reset code verification, and short-lived reset token flow
- account deactivation
- JWT-based authentication with `tokenVersion` session invalidation
- `HttpOnly` refresh token cookies (`SameSite=Lax` by default, or `SameSite=None; Secure` for cross-origin HTTPS deployments)
- email canonicalization via trim + lowercase without mutating local-part dots or subaddresses
- Axios interceptors for token attachment and refresh coordination

### 2. Teacher Onboarding and Approval

- teacher registration automatically creates `TeacherProfile`
- teachers can complete both basic and extended profile data, upload certifications, and submit verification documents
- admins review registration status, document verification status, and extended profile submissions independently
- only approved teachers can move through the full teacher operations flow

### 3. Course and Learning Content Management

- course creation, update, deletion, categories, and filtering
- lesson management and lesson package management (including lifetime `0`-day packages)
- course material upload and protected download
- lesson quiz submission and quiz result tracking
- course notification dispatch

### 4. Student Checkout, Orders, and Refunds

- cart, single-course checkout, and multi-course cart checkout
- order creation, payment intent creation, payment confirmation, and automatic enrollment creation
- platform commission (honoring explicit `0%` teacher commission overrides) and multi-item order settlement attribution
- order history, refund request submission, and refund history

### 5. Teacher Wallet and Payouts

- wallet summary and transaction history
- payout method management (`BANK_TRANSFER`, `GRABPAY`, `TOUCH_N_GO`, `PAYPAL`, `OTHER`)
- payout requests and admin payout review
- automatic teacher wallet credit after course sales and debit on refunds

### 6. Community and Social Interaction

- community tags, post creation, post details, likes, bookmarks, comments, user community profiles, and following relationships
- posts support tags, images, uploaded videos, external video embeds (YouTube, Vimeo, Dailymotion), and course references

### 7. Direct Messaging and Notifications

- contact list with batched unread message counts, thread-based messaging, unread count, and mark-as-read flow
- notifications list, unread count, mark single/all as read, and deletion

### 8. Support and After-Sales Service

- unified support ticket creation, conversation replies, protected support attachment uploads, ticket closing, ticket statistics, and admin support management

### 9. Reports and Governance

- student report submission (`type`, `description`, `contentType`, `contentId`) and admin report review/resolution

### 10. Live Sessions

- Socket.IO session join/leave, teacher start/end controls, student hand raise, live chat, status synchronization, and enrollment-based access validation

### 11. Ads and Promotion Slots

- admin-managed ad campaigns including `LOGIN_MODAL` login promotion modal support

## Tech Stack

### Frontend

| Category | Technology |
| --- | --- |
| Framework | React 18 |
| Build Tool | Vite 7 |
| Language | TypeScript |
| Routing | React Router DOM 6 |
| State Management | Zustand |
| Forms | React Hook Form |
| Networking | Axios |
| UI / Styling | Tailwind CSS 3, custom design system, Lucide React |
| Charts | Recharts |
| Feedback | react-hot-toast |
| Real-Time Client | socket.io-client |

### Backend

| Category | Technology |
| --- | --- |
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Language | TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Auth | JWT, refresh tokens, cookie-based refresh flow |
| Uploads | Multer |
| Real-Time Server | Socket.IO |
| Security | Helmet, CORS, rate limiting, idempotent plain-text input sanitization, custom security headers |
| Logging | Morgan + Winston |
| Password Hashing | bcryptjs |
| Validation | express-validator |

### Data Layer

| Category | Technology |
| --- | --- |
| Database | PostgreSQL |
| Schema Definition | Prisma Schema |
| Money Precision | Decimal fields |
| Migrations | Prisma Migrate |
| Data Inspection | Prisma Studio |

## Frontend Architecture

The frontend is a Desktop Web `React + Vite + TypeScript` single-page application with route-level and business-module separation.

### Frontend Structure

| Directory | Purpose |
| --- | --- |
| `frontend/src/app` | main route configuration |
| `frontend/src/pages` | page-level components loaded with `React.lazy()` for route-based splitting |
| `frontend/src/components` | reusable UI components grouped by admin, auth, common, community, layout, student, and teacher |
| `frontend/src/features` | larger business modules such as course editor, lesson editor, and course management |
| `frontend/src/services` | API layer wrappers |
| `frontend/src/store` | Zustand stores |
| `frontend/src/hooks` | custom hooks |
| `frontend/src/types` | frontend business types |
| `frontend/src/utils` | helpers for runtime URLs, asset normalization, video embeds, storage, and error handling |
| `frontend/src/__tests__` | automated frontend unit and persistence-contract tests |

### Important Frontend Characteristics

- routes are separated by guest, student, teacher, and admin access patterns
- page-level lazy loading is enabled
- `vite.config.ts` proxies `/api`, `/uploads`, and `/socket.io`
- Axios interceptors centralize auth handling, token refresh attempts, and error handling across both relative `/api/v1` and split-origin `VITE_API_URL` deployments
- auth state is managed with Zustand

## Backend Architecture

The backend follows a layered structure with explicit controller-to-service boundaries:

- `routes` wire URL prefixes, auth middleware, validation chains, and role boundaries
- `controllers` handle HTTP request parsing and response shaping via shared typed HTTP helpers without direct ORM queries
- `services` contain domain business logic and Prisma persistence
- `middleware` handles auth, security, plain-text sanitization, uploads, rate limiting, request IDs, and error handling
- `config` stores environment, database, and origin policy configuration
- `utils` contains logging, errors, HTTP/path primitives, protected asset streaming, sanitization, and cookie policies
- `socket` contains live-session real-time behavior
- `__tests__` contains automated backend unit and domain-logic tests

## Database Design Overview

`backend/prisma/schema.prisma` models four core domains using `Decimal` financial precision and typed enums:

1. **User and Permission Models**: `User`, `TeacherProfile`, `TeacherVerification`, `TeacherProfileSubmission`, `Certification`, `PasswordResetCode`, `UserAuditLog`, `AdCampaign`
2. **Courses and Learning Models**: `Course`, `Lesson`, `LessonPackage`, `Material`, `LiveSession`, `QuizAttempt`, `Enrollment`, `Review`
3. **Commerce and Finance Models**: `CartItem`, `Order`, `OrderItem`, `Payment`, `Refund`, `Wallet`, `WalletTransaction`, `PayoutMethod`, `PayoutRequest`
4. **Community and Communication Models**: `CommunityTag`, `CommunityPost`, `CommunityMedia`, `CommunityComment`, `CommunityPostLike`, `CommunityPostBookmark`, `CommunityFollowing`, `MessageThread`, `Message`, `Notification`, `SupportTicket`, `SupportTicketMessage`, `Report`

## API Modules

All API routes are mounted under `/api/v1`:

| Module | Prefix | Description |
| --- | --- | --- |
| Auth | `/auth` | register, login, refresh, password reset flow, profile update, password change, account deletion |
| Ads | `/ads` | login promotion content |
| Teachers | `/teachers` | teacher directory, teacher profiles, certifications, verification, admin review flows |
| Courses | `/courses` | course listing, course details, lessons, packages, materials, notifications, quizzes |
| Enrollments | `/enrollments` | my courses, access checks, progress updates, teacher-side student and course stats |
| Payments | `/payments` | create checkout, confirm payment, teacher earnings, admin refunds |
| Orders | `/orders` | order history, order details, cancellation, refund requests, refund lookup |
| Cart | `/cart` | cart CRUD and clear |
| Reviews | `/reviews` | course review flow |
| Reports | `/reports` | student reports and admin moderation |
| Notifications | `/notifications` | list, unread count, read actions, delete |
| Messages | `/messages` | contacts, threads, message send, unread count |
| Community | `/community` | tags, posts, comments, likes, bookmarks, follows |
| Support | `/support` | tickets, ticket messages, attachments, close actions |
| Upload | `/upload` | single and multiple uploads |
| Wallet | `/wallet` | wallet summary, transactions, payout methods, payout requests |
| Admin | `/admin` | platform overview, users, courses, ads, verification, reports, refunds, support, financials, payouts |

## Real-Time and Live Session Notes

Implemented in `backend/src/socket/live-session.handler.ts` and `frontend/src/pages/student/LiveSessionPage.tsx`:

- socket authentication enforcing account active/lock status and `tokenVersion`
- join/leave session, live chat, hand raise, teacher start/end session, and status broadcasting
- when a session is `LIVE`, the frontend opens the configured external `meetingUrl` rather than an in-repo WebRTC stack

## Uploads and Protected Assets

| Category | Typical Use | Size Limit Defined in Code |
| --- | --- | --- |
| `general` | generic uploads | 10MB |
| `support-attachments` | support attachments (protected) | 10MB |
| `community-images` | community images | 10MB |
| `thumbnails` | course thumbnails | 5MB |
| `videos` | course or lesson videos | 500MB |
| `documents` | course documents (protected) | 50MB |
| `avatars` | user avatars | 5MB |
| `verifications` | teacher verification materials (protected) | 10MB |
| `teacher-profiles` | teacher profile images | 5MB |
| `teacher-certificates` | teacher certificates or PDFs (protected) | 10MB |

Uploads enforce MIME type, file extension, magic-byte signature, size, and path-traversal validation, with authenticated streaming for sensitive folders (`documents`, `verifications`, `support-attachments`, `teacher-certificates`).

## Security and Risk Controls

- JWT access token plus `HttpOnly` refresh token cookie model
- token version invalidation on password reset/change and account lock
- failed-login tracking and temporary account locking
- `helmet`, origin-based `cors`, and `express-rate-limit`
- idempotent request sanitization stripping executable HTML/script markup without corrupting plain-text symbols
- redaction of sensitive values in logs
- protected upload directories with authenticated download routes

## Desktop Web Frontend Experience

- custom Tailwind-based design system tailored for Desktop Web browsers
- elastic layout and flexible wrapping across desktop window resizing and browser zoom levels
- keyboard navigation, dialog focus trapping, and ARIA accessibility attributes
- route-based code splitting, toast feedback, network status banner, and error boundary protection

## Project Structure

```text
edutech-platform/
├─ backend/
│  ├─ prisma/
│  │  ├─ migrations/
│  │  ├─ schema.prisma
│  │  └─ seed.js
│  ├─ src/
│  │  ├─ __tests__/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ socket/
│  │  ├─ types/
│  │  ├─ utils/
│  │  ├─ validators/
│  │  └─ index.ts
│  ├─ package.json
│  └─ tsconfig.json
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ __tests__/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ config/
│  │  ├─ features/
│  │  ├─ hooks/
│  │  ├─ pages/
│  │  ├─ services/
│  │  ├─ store/
│  │  ├─ types/
│  │  ├─ utils/
│  │  ├─ App.tsx
│  │  └─ main.tsx
│  ├─ package.json
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  └─ vite.config.ts
├─ scripts/
│  └─ run-tests.mjs
├─ docs/
│  └─ render-deployment.md
├─ render.yaml
└─ README.md
```

## Full Local Setup from Scratch

1. Prepare PostgreSQL (`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edutech_platform?schema=public"`).
2. Copy `backend/.env.example` to `backend/.env`, configure secrets/origins, and run `cd backend && npm ci && npm run prisma:migrate && npm run dev`.
3. Copy `frontend/.env.example` to `frontend/.env`, and run `cd frontend && npm ci && npm run dev`.

## How to Get the First Admin on a Fresh Database

1. Register a normal account through the frontend.
2. Open Prisma Studio (`cd backend && npm run prisma:studio`).
3. Open the `User` table and change one user's `role` to `ADMIN`.
4. Log in again with that account.

## Recommended Demo Paths

- **Demo Path A (Student)**: Register student -> browse courses -> add to cart or direct checkout -> complete simulated checkout -> open purchased course in "My Courses" -> study lessons, materials, and quiz -> view order history and refund request flow.
- **Demo Path B (Teacher)**: Register teacher -> complete basic and extended profile -> upload certification and verification materials -> submit for review -> approve via admin account -> create course, lessons, packages, and materials.
- **Demo Path C (Admin)**: Log in as `ADMIN` -> review teacher verifications/profiles -> manage reports and support tickets -> review refunds and payouts -> manage ads and platform analytics.

## Common Commands

### Backend

| Command | Purpose |
| --- | --- |
| `npm run dev` | start backend in development mode |
| `npm run build` | generate Prisma Client and compile TypeScript |
| `npm run start` | run the compiled backend |
| `npm test` | run backend unit and contract tests |
| `npm run typecheck` | TypeScript type check |
| `npm run prisma:generate` | generate Prisma Client |
| `npm run prisma:migrate` | run development migrations |
| `npm run prisma:deploy` | deploy migrations |
| `npm run prisma:studio` | open Prisma Studio |
| `npm run seed` | run the intentionally empty seed script |
| `npm run clean` | clean build and cache artifacts |

### Frontend

| Command | Purpose |
| --- | --- |
| `npm run dev` | start frontend in development mode |
| `npm run build` | type check and build production assets |
| `npm test` | run frontend unit and persistence-contract tests |
| `npm run preview` | preview the production build |
| `npm run typecheck` | TypeScript type check |
| `npm run clean` | clean build and cache artifacts |

## Environment Variables

### Backend `.env`

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | runtime environment |
| `PORT` | backend port |
| `API_VERSION` | API version prefix, default `v1` |
| `FRONTEND_DIST_DIR` | built frontend directory path |
| `LOG_LEVEL` | log level |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | access token secret |
| `JWT_EXPIRES_IN` | access token lifetime |
| `JWT_REFRESH_SECRET` | refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | refresh token lifetime |
| `PASSWORD_RESET_CODE_TTL_MINUTES` | reset code validity in minutes |
| `PASSWORD_RESET_MAX_ATTEMPTS` | max reset code attempts |
| `PASSWORD_RESET_TOKEN_EXPIRES_IN` | reset token lifetime |
| `AUTH_MAX_FAILED_LOGINS` | failed login threshold before lock |
| `AUTH_LOCKOUT_MINUTES` | lock duration |
| `PLATFORM_COMMISSION_RATE` | default platform commission rate |
| `MAX_FILE_SIZE` | global upload ceiling |
| `UPLOAD_DIR` | upload root directory |
| `CORS_ORIGIN` | allowed HTTP origins |
| `SOCKET_CORS_ORIGIN` | allowed Socket.IO origins |
| `RATE_LIMIT_WINDOW_MS` | rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | rate-limit threshold |

### Frontend `.env`

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base path or split-origin API URL |
| `VITE_SOCKET_URL` | socket server URL, or current-origin fallback when empty |
| `VITE_DEV_BACKEND_ORIGIN` | Vite dev proxy backend target |
| `VITE_SUPPORT_EMAIL` | optional help center or footer support email |
| `VITE_LEGAL_EMAIL` | optional legal contact email |
| `VITE_PRIVACY_EMAIL` | optional privacy contact email |
| `VITE_SUPPORT_PHONE` | optional support phone |
| `VITE_SUPPORT_ADDRESS` | optional support address |
| `VITE_SUPPORT_HOURS` | optional support hours |
| `VITE_SUPPORT_RESPONSE_WINDOW` | optional support response time text |
| `VITE_SOCIAL_X_URL` | optional X profile URL |
| `VITE_SOCIAL_GITHUB_URL` | optional GitHub URL |
| `VITE_SOCIAL_LINKEDIN_URL` | optional LinkedIn URL |
| `VITE_TERMS_LAST_UPDATED` | optional terms last-updated date |
| `VITE_PRIVACY_LAST_UPDATED` | optional privacy last-updated date |
| `VITE_GOVERNING_LAW` | optional governing law text |

## Troubleshooting Notes

- **The seed ran, but no users or courses appeared**: Expected. `backend/prisma/seed.js` is intentionally empty.
- **I cannot access admin pages**: Expected on a fresh database. Promote an existing user to `ADMIN` via Prisma Studio or SQL.
- **The frontend loads, but API requests fail**: Verify the backend is running on `http://localhost:3000` and `CORS_ORIGIN` / `SOCKET_CORS_ORIGIN` allow the frontend origin.
- **Live session opens the page, but not a built-in video room**: Expected. Session coordination and chat run in-app while the live room opens via external `meetingUrl`.

## How to Describe This Project Accurately

> This is a full-stack Desktop Web online education platform built with React, Vite, TypeScript, Express, Prisma, and PostgreSQL. It implements separate student, teacher, and admin workflows, including teacher approval, course management, simulated checkout and multi-item orders, refunds, wallet and payout logic, community features, messaging, notifications, support tickets, admin moderation, and real-time live session coordination.

## Current Status Summary

### What the Project Achieves

- clear frontend and backend separation with strict service-layer boundaries
- high-coverage Prisma business schema
- multi-role workflow design across student, teacher, and admin portals
- automated unit and contract tests for critical business invariants
- implemented order, refund, wallet, financial settlement, and payout flows
- real-time session coordination and chat support

### Current Intentional Scope Boundaries

- Desktop Web Application Only target platform
- simulated checkout rather than a live payment gateway
- external meeting room links rather than an in-repo WebRTC media server
- empty baseline seed by design

## Commit and Cleanup Guidance

Keep runtime and build outputs out of source control: `node_modules/`, `dist/`, `.env`, `uploads/`, `.pgdata/`, log files, build caches, and `*.tsbuildinfo` files.
