# FlexiLearnProject / Edutech Platform

This repository contains a full-stack online learning platform. The local folder is named `FlexiLearnProject`, while the codebase, package metadata, UI branding, and API responses primarily use the name `Edutech` / `EduTech Platform`.

This is not just a static course showcase or a simple CRUD demo. Based on the current implementation, it is a multi-role education platform that covers students, teachers, and administrators, with modules for courses, teacher approval, checkout and refunds, learning progress, community, direct messaging, notifications, support tickets, teacher wallets and payouts, admin operations, and promotional ads.

## Overview

The project is designed to cover the full business flow of an online education platform:

- from user registration to course access
- from teacher onboarding to teacher approval
- from checkout to refunds and support
- from course operations to platform administration

In practice, the repository is closer to:

- an online education platform
- a course commerce platform
- a teacher onboarding and approval platform
- an admin operations platform

and not just:

- a course landing website
- a front-end-only prototype
- a basic practice project with only CRUD pages

## Key Facts First

To keep this README fully aligned with the actual codebase, these points matter:

1. The current payment flow is a simulated checkout, not a real third-party payment gateway.
   The frontend checkout pages explicitly state that this build uses simulated checkout. The backend still creates real business records such as payments, orders, enrollments, and wallet transactions, but the repository does not integrate Stripe, PayPal, FPX, or a bank card processor.

2. The live session feature is not a built-in video conferencing system.
   The repository does implement Socket.IO-based real-time class state, join/leave, chat, hand-raise, start-session, and end-session logic, but the actual meeting room is opened through `meetingUrl`, which points to an external live meeting link.

3. The Prisma seed is intentionally empty.
   `backend/prisma/seed.js` does not create default users, courses, orders, or test data. The project is intentionally designed to start from an empty baseline database.

4. A fresh database does not automatically include an admin account.
   Public registration only allows `STUDENT` and `TEACHER`. To test admin features, an existing user must be promoted to `ADMIN`, for example through Prisma Studio or a direct database update.

5. There are currently no project-owned automated test files in this repository.
   Type checking and builds are available, but there is no `backend` / `frontend` test suite with `*.test.*` or `*.spec.*` files in the source project itself.

## Roles and Capabilities

| Role | Main capabilities currently implemented |
| --- | --- |
| Guest | Home page, course browsing, course details, teacher browsing, teacher details, help center, login, register, forgot password, terms page, privacy page |
| Student | Cart, single-course checkout, cart checkout, my courses, course learning page, quiz submission, course reviews, orders, refund requests, notifications, direct messages, community, reports, support tickets, live sessions, profile |
| Teacher | Basic profile, extended profile, certifications, identity verification submission, course creation, lesson management, package management, material uploads, course notifications, student stats, student management, earnings view, wallet, payout methods, payout requests |
| Admin | Platform overview, user management, batch operations, audit logs, course moderation, teacher verification review, teacher profile review, report handling, refund handling, support ticket handling, ad management, financial analytics, payout review |

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

On the implementation side, the backend uses JWT-based auth, while the frontend uses Axios interceptors to attach access tokens and attempt session recovery through `/auth/refresh` when needed.

### 2. Teacher Onboarding and Approval

- teacher registration automatically creates `TeacherProfile`
- teachers can complete both basic and extended profile data
- teachers can upload certifications and verification materials
- teachers can submit profile and verification data for review
- admins can review registration status, verification status, and extended profile submissions
- only approved teachers can access the full teacher operations flow

This means the teacher workflow is intentionally approval-gated rather than "register and immediately teach."

### 3. Course and Learning Content Management

- course creation, update, and deletion
- course categories and filtering
- course details
- lesson management
- lesson package management
- course materials upload and download
- lesson quiz submission and quiz result tracking
- course notification dispatch

The pricing model is not a single flat course price. It is structured as `course + multiple packages`, which supports different price points, durations, student limits, and feature sets.

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

The commerce flow is already implemented at a meaningful business level, including:

- order states
- payment states
- refund states
- platform commission
- teacher net earnings
- order and cart coordination
- automatic enrollment creation

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
- follow / unfollow-style social relationship flow

Community posts can include tags, media, and course references, so this is more than a plain text feed.

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
- current schema placement includes `LOGIN_MODAL`
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
| Auth | JWT, refresh tokens, httpOnly-cookie refresh flow |
| Uploads | Multer |
| Real-Time Server | Socket.io |
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

The frontend is a `React + Vite + TypeScript` single-page application, but it is organized beyond a basic `pages + components` structure.

### Frontend Structure

| Directory | Purpose |
| --- | --- |
| `frontend/src/app` | main route configuration |
| `frontend/src/pages` | page-level components, loaded with `React.lazy()` for route-based splitting |
| `frontend/src/components` | reusable UI components grouped by admin / auth / common / layout / student / teacher |
| `frontend/src/features` | higher-level business modules such as course editor and course management |
| `frontend/src/services` | API layer wrappers |
| `frontend/src/store` | Zustand state stores |
| `frontend/src/hooks` | custom hooks |
| `frontend/src/types` | frontend business types |
| `frontend/src/utils` | helpers, runtime URL logic, error handling, asset normalization, auth storage helpers |
| `frontend/src/lib` | lower-level configuration such as i18n bootstrap |
| `frontend/src/locales` | English, Chinese, and Malay translation resources |

### Important Frontend Characteristics

- routes are split by guest, student, teacher, and admin access
- page-level lazy loading is enabled
- `vite.config.ts` proxies `/api`, `/uploads`, and `/socket.io`
- Axios interceptors centralize auth, token refresh, and error handling
- auth state is managed in Zustand and synchronized across tabs
- i18n infrastructure exists for `en`, `zh`, and `ms`
- pages such as home, navigation, checkout, live session, and admin dashboards are connected to real service layers rather than static placeholders

## Backend Architecture

The backend follows a layered structure that is easier to maintain over time:

- `routes` handle routing and role-based access wiring
- `controllers` handle HTTP input/output
- `services` contain business logic
- `middleware` handles auth, security, rate limiting, error handling, uploads, and shared request concerns
- `config` contains environment, database, and CORS configuration
- `utils` contains logger setup, custom errors, sanitization helpers, and other utilities
- `socket` contains live session real-time logic

### Important Backend Characteristics

- the API is mounted under `/api/v1`
- dedicated `health` and `ready` endpoints are exposed
- graceful shutdown is implemented
- every request gets a request ID
- request input is sanitized for XSS protection
- auth-related routes are rate-limited
- sensitive fields such as passwords, tokens, cookies, and bank details are redacted from logs
- uploads are validated by type, extension, file signature, and file size

## Database Design Overview

`backend/prisma/schema.prisma` is one of the strongest parts of the project. The schema already covers most of the platform's core business areas.

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

### 3. Commerce and Support Models

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

- clear enums are used for roles, payments, orders, reports, support, refunds, and payouts
- money values rely on `Decimal`
- wallet, order, payment, and audit records are modeled with safer history-preserving behavior
- courses are modeled as a combination of course, lessons, packages, materials, and live sessions

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
| Orders | `/orders` | order history, order details, cancellation, refund requests and refund lookup |
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

- it is not a built-in video streaming or WebRTC conferencing stack
- the UI shows session status and chat
- if `meetingUrl` exists, the page opens an external meeting room
- in short: live session coordination is implemented in-repo, while the actual meeting room is external

## Uploads and Protected Assets

The upload flow is not a generic "accept any file" mechanism. It is folder-based, type-restricted, and validated.

### Supported Upload Categories

| Category | Typical Use | Size Limit Defined in Code |
| --- | --- | --- |
| `general` | generic uploads | 10MB |
| `support-attachments` | support attachments | 10MB |
| `community-images` | community images | 10MB |
| `thumbnails` | course thumbnails | 5MB |
| `videos` | course / lesson videos | 500MB |
| `documents` | course documents | 50MB |
| `avatars` | avatars | 5MB |
| `verifications` | teacher verification materials | 10MB |
| `teacher-profiles` | teacher profile images | 5MB |
| `teacher-certificates` | teacher certificates / PDFs | 10MB |

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

So the platform does not simply expose every upload directory as a fully public asset bucket.

## Security and Risk Controls

Based on the current codebase, the project already includes several meaningful protections:

- JWT access token + refresh token model
- refresh-token-based session recovery
- token version invalidation
- failed-login tracking and temporary account locking
- `helmet`
- origin-based `cors` control with local dev allowances
- `express-rate-limit`
- request sanitization using `sanitize-html`
- log redaction for sensitive fields
- protected upload directories

## Internationalization and Frontend Experience

### Internationalization

The frontend already has i18n infrastructure and includes these resource directories:

- `frontend/src/locales/en`
- `frontend/src/locales/zh`
- `frontend/src/locales/ms`

So the safest accurate statement is:

- the project already has multilingual infrastructure
- English, Chinese, and Malay resources exist in the codebase
- but it should not be described as "every screen is fully translated" unless each page is verified end-to-end

### Frontend Experience Notes

- custom Tailwind-based design system
- responsive navigation
- route-based code splitting
- toast feedback
- network status and error boundary components
- page-level loading, skeleton, and transition patterns

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

## Requirements

- Node.js `>= 20`
- npm
- PostgreSQL

For local development, it is best to run:

- one terminal for the backend
- one terminal for the frontend

The root `package.json` does not currently provide a monorepo-style unified start script.

## Local Setup from Scratch

### 1. Install Backend Dependencies

```bash
cd backend
npm ci
cp .env.example .env
```

Then update `backend/.env` with your own database connection, JWT secrets, and CORS values.

The example configuration currently uses:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edutech_platform?schema=public"
```

So you need a PostgreSQL database ready locally, for example:

- database name: `edutech_platform`
- credentials: whatever matches your own local setup

### 2. Run Prisma Migrations

```bash
cd backend
npm run prisma:migrate
```

If you only want to generate the Prisma Client first:

```bash
npm run prisma:generate
```

### 3. Understand the Seed Behavior

```bash
cd backend
npm run seed
```

This command does not insert sample data. It only reports that the project intentionally uses an empty baseline database.

### 4. Start the Backend

```bash
cd backend
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

### 5. Start the Frontend

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Default frontend dev address:

```text
http://localhost:5173
```

Default frontend env values:

```env
VITE_API_URL=/api/v1
VITE_SOCKET_URL=
VITE_DEV_BACKEND_ORIGIN=http://localhost:3000
```

That means the frontend uses the Vite dev proxy for `/api`, `/uploads`, and `/socket.io`.

## How to Get the First Admin on a Fresh Database

This is one of the easiest places to get blocked when testing the platform.

### Why It Happens

- public registration only creates `STUDENT` or `TEACHER`
- the seed does not create an admin
- but teacher approval, refund handling, support management, and payout review all require admin access

### Correct Approach

1. Register a normal account through the frontend
2. Open Prisma Studio

```bash
cd backend
npm run prisma:studio
```

3. Open the `User` table
4. Change one user's `role` to `ADMIN`
5. Log in again with that account

That gives you access to the admin dashboard so you can continue testing verification, ads, refunds, support, and payout review flows.

## Recommended Teacher Testing Flow

If you want to test the teacher path end-to-end, this order is recommended:

1. register a `TEACHER` account
2. log in as the teacher
3. complete the teacher profile
4. submit extended profile data, certifications, and verification materials
5. approve the teacher through an admin account
6. return to the teacher side and test course creation, student management, wallet, and payout flows

In other words, many teacher pages are intentionally gated by approval state, not opened immediately after registration.

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
| `VITE_SOCKET_URL` | socket server URL, or current-origin-based fallback when empty |
| `VITE_DEV_BACKEND_ORIGIN` | Vite dev proxy backend target |

### Optional Public-Site Frontend Variables

These are supported by the codebase even though they are not currently listed in `frontend/.env.example`:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPPORT_EMAIL` | help center / footer support email |
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

## How to Describe This Project Accurately

If you want to present it to a teacher, teammate, interviewer, or in a portfolio, an accurate description would be:

> This is a full-stack online education platform built with React, Vite, TypeScript, Express, Prisma, and PostgreSQL. It is not just a course showcase frontend. It implements separate student, teacher, and admin role flows, including course management, teacher approval, simulated checkout and orders, refunds, wallets, community features, messaging, notifications, support tickets, admin operations, and live session state management.

If you want a slightly more conservative description:

> This is a fairly complete online education platform prototype / business-oriented full-stack system. The main workflows are implemented, but payments are still simulated, live sessions rely on external meeting links, the database starts from an empty baseline, and automated tests are not yet present.

## Current Status Summary

### What the Project Already Achieves

- complete frontend/backend separation
- high-coverage business schema
- clear multi-role design
- structured route and permission separation
- substantial admin functionality
- implemented order, refund, and wallet flows
- real-time session and chat support

### What the Project Does Not Yet Include

- no real payment gateway integration
- no built-in native video conferencing stack
- no default seed data
- no project-owned automated test suite
- no unified root-level one-command start script

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

These belong to local runtime or debugging workflows, not to the core source code of the project.
