# FlexiLearnProject / Edutech Platform

This repository contains a full-stack online learning platform built with `React`, `Vite`, `TypeScript`, `Express`, `Prisma`, and `PostgreSQL`.

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
- [Internationalization and Frontend Experience](#internationalization-and-frontend-experience)
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

This project is much closer to a business-oriented online education platform than to a simple CRUD demo.

It already includes:

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

It is not best described as:

- a static landing page
- a frontend-only prototype
- a toy CRUD practice project

## Key Facts First

These points are important if you want to describe the repository accurately.

1. The payment flow is simulated, not connected to a real payment gateway.
   The frontend checkout UI clearly presents the flow as simulated checkout. The backend still creates meaningful business records such as orders, payments, enrollments, wallet transactions, and refunds, but there is no Stripe, PayPal gateway capture flow, FPX integration, or bank card processor in this repository.

2. The live session feature is not a built-in video conferencing stack.
   The repository implements Socket.IO-based session state, join and leave behavior, chat, hand raise, and teacher session controls. The actual meeting room is opened through `meetingUrl`, which points to an external live meeting link.

3. The Prisma seed is intentionally empty.
   `backend/prisma/seed.js` does not create demo users, courses, orders, or default admin accounts. The project is designed to start from an empty baseline database.

4. A fresh database does not automatically include an admin account.
   Public registration allows `STUDENT` and `TEACHER`. To test admin workflows, an existing user must be promoted to `ADMIN`.

5. The repository currently does not include project-owned automated tests.
   Type checking and production builds are available, but there is no `backend` or `frontend` test suite with `*.test.*` or `*.spec.*` files in the source project itself.

6. The root `package.json` is not a monorepo task runner.
   Backend and frontend are started separately. In practice, local development uses one terminal for `backend` and one terminal for `frontend`.

## Quick Start

If you only want to get the platform running locally as fast as possible, this is the shortest correct path.

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
    A["Guest / Student / Teacher / Admin Browser"] --> B["React 18 + Vite + TypeScript Frontend"]
    B --> C["Express 4 + TypeScript API<br/>/api/v1"]
    B <--> D["Socket.IO Real-Time Layer"]
    C --> E["Prisma ORM"]
    E --> F[("PostgreSQL")]
    C --> G["Validated Upload Storage"]
    B --> H["External Meeting Room via meetingUrl"]
```

### What This Means in Practice

- the frontend is a real SPA, not a static mockup
- the backend is a real API with business rules and persistence
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

One of the strongest parts of this repository is that it already models several complete business flows instead of isolated pages.

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

- registration
- login
- logout
- current profile fetch
- profile update
- password change
- forgot password
- 6-digit password reset code verification
- short-lived password reset token flow
- account deactivation

Implementation notes:

- the backend uses JWT-based authentication
- refresh tokens are part of the auth design
- the frontend uses Axios interceptors for token attachment and refresh attempts

### 2. Teacher Onboarding and Approval

- teacher registration automatically creates `TeacherProfile`
- teachers can complete both basic and extended profile data
- teachers can upload certifications and verification materials
- teachers can submit profile and verification data for review
- admins can review registration status, verification status, and extended profile submissions
- only approved teachers can move through the full teacher operations flow

This means the teacher experience is intentionally approval-gated rather than open immediately after registration.

### 3. Course and Learning Content Management

- course creation, update, and deletion
- course categories and filtering
- course details
- lesson management
- lesson package management
- course material upload and download
- lesson quiz submission and quiz result tracking
- course notification dispatch

Important modeling note:

- pricing is structured as `course + multiple packages`, not one flat course price
- packages support different prices, durations, limits, and configuration options

### 4. Student Checkout, Orders, and Refunds

- cart
- single-course checkout
- multi-course cart checkout
- order creation
- payment intent creation
- payment confirmation
- enrollment creation
- progress updates
- order history
- refund request submission
- refund history

The commerce flow already includes meaningful business logic such as:

- order states
- payment states
- refund states
- platform commission
- teacher net earnings
- automatic enrollment creation
- cart and order coordination

### 5. Teacher Wallet and Payouts

- wallet summary
- transaction history
- payout method management
- payout requests
- admin payout review
- automatic teacher wallet credit after course sales
- automatic wallet debit on refunds

Supported payout method types defined in code:

- `BANK_TRANSFER`
- `GRABPAY`
- `TOUCH_N_GO`
- `PAYPAL`
- `OTHER`

### 6. Community and Social Interaction

- community tags
- post creation
- post details
- likes
- bookmarks
- comments
- user community profile
- user post listing
- follow and unfollow-style relationship flow

Community posts can include tags, media, and course references, so this module goes beyond a plain text feed.

### 7. Direct Messaging and Notifications

- contact list
- thread-based messaging
- unread message count
- mark-as-read flow
- notifications list
- unread notification count
- mark single notification as read
- mark all notifications as read
- notification deletion

### 8. Support and After-Sales Service

- support ticket creation
- ticket conversation flow
- support attachment uploads
- ticket closing
- ticket statistics
- admin-side support management

### 9. Reports and Governance

- students can submit reports
- reports support type, description, content type, and content ID
- admins can view all reports
- admins can update report status and resolution

### 10. Live Sessions

- student or teacher joins a session
- teacher starts a session
- teacher ends a session
- student hand raise
- session chat
- session status synchronization
- enrollment-based access validation

### 11. Ads and Promotion Slots

- admin-managed ad campaigns
- schema placement includes `LOGIN_MODAL`
- the frontend includes login promotion modal support

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
| Internationalization | i18next, react-i18next, i18next-browser-languagedetector |
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
| Security | Helmet, CORS, rate limiting, sanitize-html, custom security headers |
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

The frontend is a `React + Vite + TypeScript` single-page application with route-level and business-module separation.

### Frontend Structure

| Directory | Purpose |
| --- | --- |
| `frontend/src/app` | main route configuration |
| `frontend/src/pages` | page-level components loaded with `React.lazy()` for route-based splitting |
| `frontend/src/components` | reusable UI components grouped by admin, auth, common, layout, student, and teacher |
| `frontend/src/features` | larger business modules such as course editor and course management |
| `frontend/src/services` | API layer wrappers |
| `frontend/src/store` | Zustand stores |
| `frontend/src/hooks` | custom hooks |
| `frontend/src/types` | frontend business types |
| `frontend/src/utils` | helpers for runtime URLs, asset normalization, storage, and error handling |
| `frontend/src/lib` | lower-level configuration such as i18n bootstrap |
| `frontend/src/locales` | English, Chinese, and Malay translation resources |

### Important Frontend Characteristics

- routes are separated by guest, student, teacher, and admin access patterns
- page-level lazy loading is enabled
- `vite.config.ts` proxies `/api`, `/uploads`, and `/socket.io`
- Axios interceptors centralize auth handling, token refresh attempts, and error handling
- auth state is stored with Zustand
- multilingual infrastructure exists for `en`, `zh`, and `ms`
- dashboard, checkout, live-session, and admin pages are connected to real service layers rather than static placeholders

## Backend Architecture

The backend follows a layered structure that is much easier to maintain than a single-file Express app.

### Backend Layers

- `routes` wire URL prefixes, auth middleware, and role boundaries
- `controllers` handle request and response shaping
- `services` contain the main business logic
- `middleware` handles auth, security, sanitization, uploads, rate limiting, request IDs, and error handling
- `config` stores environment, database, and origin policy configuration
- `utils` contains logging, errors, and shared helpers
- `socket` contains live-session real-time behavior

### Important Backend Characteristics

- the API is mounted under `/api/v1`
- dedicated `health` and `ready` endpoints are exposed
- graceful shutdown is implemented
- every request receives a request ID
- request input is sanitized for XSS protection
- API traffic is rate-limited
- sensitive fields such as passwords, tokens, cookies, and bank details are redacted from logs
- uploads are validated by type, extension, signature, size, and path safety rules

## Database Design Overview

`backend/prisma/schema.prisma` is one of the strongest parts of the repository. The schema already models multiple real platform concerns instead of only users and courses.

### 1. User and Permission Models

- `User`
- `TeacherProfile`
- `TeacherVerification`
- `TeacherProfileSubmission`
- `Certification`
- `PasswordResetCode`
- `UserAuditLog`
- `AdCampaign`

### 2. Courses and Learning Models

- `Course`
- `Lesson`
- `LessonPackage`
- `Material`
- `LiveSession`
- `QuizAttempt`
- `Enrollment`
- `Review`

### 3. Commerce and Finance Models

- `CartItem`
- `Order`
- `OrderItem`
- `Payment`
- `Refund`
- `Wallet`
- `WalletTransaction`
- `PayoutMethod`
- `PayoutRequest`

### 4. Community and Communication Models

- `CommunityTag`
- `CommunityPost`
- `CommunityMedia`
- `CommunityComment`
- `CommunityPostLike`
- `CommunityPostBookmark`
- `CommunityFollowing`
- `MessageThread`
- `Message`
- `Notification`
- `SupportTicket`
- `SupportTicketMessage`
- `Report`

### 5. Schema Characteristics

- enums are used for roles, orders, payments, refunds, reports, support, and payouts
- money values use `Decimal`
- finance-related records preserve historical information instead of flattening everything into a user table
- courses are modeled as course, lessons, packages, materials, and live sessions rather than as a single content blob

## API Modules

All API routes are mounted under:

```text
/api/v1
```

### Main API Areas

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

The real-time layer is implemented in:

- `backend/src/socket/live-session.handler.ts`
- `frontend/src/pages/student/LiveSessionPage.tsx`

### Real-Time Features Already Implemented

- socket authentication
- join session
- leave session
- live chat
- hand raise
- teacher start session
- teacher end session
- session status broadcasting

### Actual Boundaries of the Live Session Feature

- it is not a built-in WebRTC or native video streaming stack
- the in-repo logic handles session coordination and chat
- if `meetingUrl` exists, the frontend opens an external meeting room
- the correct description is: live session coordination is implemented in-repo, while the actual meeting room is external

## Uploads and Protected Assets

The upload system is folder-based, validated, and partially protected. It is not a generic "upload any file anywhere" pipeline.

### Supported Upload Categories

| Category | Typical Use | Size Limit Defined in Code |
| --- | --- | --- |
| `general` | generic uploads | 10MB |
| `support-attachments` | support attachments | 10MB |
| `community-images` | community images | 10MB |
| `thumbnails` | course thumbnails | 5MB |
| `videos` | course or lesson videos | 500MB |
| `documents` | course documents | 50MB |
| `avatars` | user avatars | 5MB |
| `verifications` | teacher verification materials | 10MB |
| `teacher-profiles` | teacher profile images | 5MB |
| `teacher-certificates` | teacher certificates or PDFs | 10MB |

### Upload Security Rules

- MIME type validation
- extension validation
- file signature validation
- file size validation
- path safety validation
- direct public access is blocked for sensitive folders

### Folders Blocked from Direct Public Access

- `documents`
- `verifications`
- `support-attachments`
- `teacher-certificates`

## Security and Risk Controls

Based on the current implementation, the project already includes several meaningful protections:

- JWT access token plus refresh token model
- refresh-token-based session recovery
- token version invalidation
- failed-login tracking and temporary account locking
- `helmet`
- origin-based `cors` control with local-development allowances
- `express-rate-limit`
- request sanitization using `sanitize-html`
- redaction of sensitive values in logs
- protected upload directories

## Internationalization and Frontend Experience

### Internationalization

The frontend already includes multilingual infrastructure and these resource directories:

- `frontend/src/locales/en`
- `frontend/src/locales/zh`
- `frontend/src/locales/ms`

The safest accurate statement is:

- the project already has multilingual infrastructure
- English, Chinese, and Malay resources exist in the codebase
- it should not be described as "every screen is fully translated" unless every page is verified end-to-end

### Frontend Experience Notes

- custom Tailwind-based design system
- responsive navigation
- route-based code splitting
- toast feedback
- network status and error boundary components
- loading, skeleton, and transition patterns across page flows

## Project Structure

```text
FlexiLearnProject/
├─ backend/
│  ├─ prisma/
│  │  ├─ migrations/
│  │  ├─ schema.prisma
│  │  └─ seed.js
│  ├─ src/
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
│  ├─ uploads/
│  ├─ package.json
│  └─ tsconfig.json
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ config/
│  │  ├─ features/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ locales/
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
├─ FlexiLearn_SRS.md
├─ package.json
└─ README.md
```

## Full Local Setup from Scratch

This section is the longer version of the quick start, with a bit more context.

### 1. Prepare PostgreSQL

The backend example config uses:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edutech_platform?schema=public"
```

So you need a local PostgreSQL database ready, for example:

- database name: `edutech_platform`
- credentials: whatever matches your local PostgreSQL setup

### 2. Install Backend Dependencies

Copy `backend/.env.example` to `backend/.env`, then configure:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `SOCKET_CORS_ORIGIN`

Install dependencies:

```bash
cd backend
npm ci
```

### 3. Run Prisma Migrations

```bash
cd backend
npm run prisma:migrate
```

If you only want to generate Prisma Client first:

```bash
npm run prisma:generate
```

### 4. Understand the Seed Behavior

```bash
cd backend
npm run seed
```

This command does not populate demo data. It only confirms that the project intentionally starts from an empty database baseline.

### 5. Start the Backend

```bash
cd backend
npm run dev
```

Default backend address:

```text
http://localhost:3000
```

Important URLs:

```text
http://localhost:3000/
http://localhost:3000/api/v1/health
http://localhost:3000/api/v1/ready
```

### 6. Install Frontend Dependencies

Copy `frontend/.env.example` to `frontend/.env`.

Install dependencies:

```bash
cd frontend
npm ci
```

### 7. Start the Frontend

```bash
cd frontend
npm run dev
```

Default frontend development address:

```text
http://localhost:5173
```

Default frontend environment values:

```env
VITE_API_URL=/api/v1
VITE_SOCKET_URL=
VITE_DEV_BACKEND_ORIGIN=http://localhost:3000
```

This means:

- `/api` is proxied to the backend in development
- `/uploads` is proxied to the backend in development
- `/socket.io` is proxied with WebSocket support in development

## How to Get the First Admin on a Fresh Database

This is one of the most common testing blockers in this repository.

### Why It Happens

- public registration only creates `STUDENT` or `TEACHER`
- the seed does not create an admin
- teacher approval, refund review, support handling, payout review, and other operations require admin access

### Correct Approach

1. Register a normal account through the frontend.
2. Open Prisma Studio.

```bash
cd backend
npm run prisma:studio
```

3. Open the `User` table.
4. Change one user's `role` to `ADMIN`.
5. Log in again with that account.

## Recommended Demo Paths

If you want to present the project clearly to a teacher, teammate, reviewer, or interviewer, these are the easiest truthful demo paths.

### Demo Path A: Student Purchase and Learning

1. register a student account
2. browse available courses
3. add a course to the cart or use direct checkout
4. complete simulated checkout
5. open the purchased course from "my courses"
6. view lessons, materials, and quiz flow
7. show order history and refund request flow

### Demo Path B: Teacher Approval to Course Publishing

1. register a teacher account
2. complete teacher basic and extended profile sections
3. upload certification and verification materials
4. submit for review
5. switch to an admin account and approve the teacher
6. return to the teacher side
7. create a course, add lessons, add packages, and upload materials

### Demo Path C: Admin Operations

1. log in as `ADMIN`
2. show teacher verification review
3. show reports or support ticket management
4. show refund review or payout review
5. show ad management or platform overview analytics

## Common Commands

### Backend

| Command | Purpose |
| --- | --- |
| `npm run dev` | start backend in development mode |
| `npm run build` | generate Prisma Client and compile TypeScript |
| `npm run start` | run the compiled backend |
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
| `VITE_API_URL` | API base path |
| `VITE_SOCKET_URL` | socket server URL, or current-origin fallback when empty |
| `VITE_DEV_BACKEND_ORIGIN` | Vite dev proxy backend target |

### Optional Frontend Public-Site Variables

These are supported by the codebase even though they are not currently listed in `frontend/.env.example`:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPPORT_EMAIL` | help center or footer support email |
| `VITE_LEGAL_EMAIL` | legal contact email |
| `VITE_PRIVACY_EMAIL` | privacy contact email |
| `VITE_SUPPORT_PHONE` | support phone |
| `VITE_SUPPORT_ADDRESS` | support address |
| `VITE_SUPPORT_HOURS` | support hours |
| `VITE_SUPPORT_RESPONSE_WINDOW` | support response time text |
| `VITE_SOCIAL_X_URL` | X profile URL |
| `VITE_SOCIAL_GITHUB_URL` | GitHub URL |
| `VITE_SOCIAL_LINKEDIN_URL` | LinkedIn URL |
| `VITE_TERMS_LAST_UPDATED` | terms last-updated date |
| `VITE_PRIVACY_LAST_UPDATED` | privacy last-updated date |
| `VITE_GOVERNING_LAW` | governing law text |

## Troubleshooting Notes

### The seed ran, but no users or courses appeared

That is expected. The seed is intentionally empty.

### I cannot access admin pages

That is also expected on a fresh database. Promote an existing user to `ADMIN` through Prisma Studio or a direct database update.

### The frontend loads, but API requests fail

Check:

- that the backend is running on `http://localhost:3000`
- that `frontend/.env` still points development traffic to the correct backend
- that `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` allow the frontend origin

### Live session opens the page, but not a built-in video room

That is expected. The repository manages session state and chat, but the actual meeting room depends on `meetingUrl`.

### Why are backend and frontend started separately

Because the root project does not currently define a unified monorepo dev runner. Local development is intentionally split into two app processes.

## How to Describe This Project Accurately

If you want a strong but still accurate one-paragraph description, this is a safe version:

> This is a full-stack online education platform built with React, Vite, TypeScript, Express, Prisma, and PostgreSQL. It is not just a course showcase frontend. The repository implements separate student, teacher, and admin flows, including teacher approval, course management, simulated checkout and orders, refunds, wallet and payout logic, community features, messaging, notifications, support tickets, admin moderation, and real-time live session state management.

If you want a more conservative description:

> This is a fairly complete business-oriented edtech platform prototype. The main workflows are implemented across frontend, backend, and database layers, but payments are still simulated, live sessions rely on external meeting links, the database starts empty, and automated tests are not yet included.

## Current Status Summary

### What the Project Already Achieves

- clear frontend and backend separation
- high-coverage business schema
- meaningful multi-role workflow design
- route and permission separation
- substantial admin operations surface
- implemented order, refund, wallet, and payout-related flows
- real-time session coordination and chat support

### What the Project Does Not Yet Include

- no real payment gateway integration
- no built-in native video conferencing stack
- no default sample seed data
- no project-owned automated test suite
- no unified root-level one-command development script

## Commit and Cleanup Guidance

When sharing or pushing the repository, these runtime artifacts should usually stay out of source control:

- `node_modules/`
- `dist/`
- `.env`
- `uploads/`
- `.pgdata/`
- log files
- build caches
- TypeScript build info files
- local QA screenshots

These belong to local runtime, debugging, or generated output rather than the core source code of the project.
