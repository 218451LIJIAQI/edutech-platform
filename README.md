# FlexiLearn | EduTech Platform

A student buys Alice’s $100 course package and Bob’s $200 package in one cart. Later, a $150 refund is approved. How much should come off each teacher’s statement?

That question is covered by a regression test in **FlexiLearn**, a desktop learning marketplace. Students choose what to learn, teachers publish and teach it, and administrators handle the orders, refunds and payouts that connect them. Checkout is simulated, so the whole purchase-to-refund journey can be explored with demo transactions.

## The class on either side of checkout

| Who’s signed in | What they can do |
| --- | --- |
| **Student** | Compare course packages, enroll, work through lessons and quizzes, track progress and join a live-session chat. |
| **Teacher** | Submit a profile for approval, build lessons with materials and priced packages, schedule live sessions and follow earnings in a wallet. |
| **Administrator** | Review teacher applications, moderate reports, resolve support tickets, review refunds and process payout requests. |

A live class has two moving parts. Socket.IO coordinates the session and its chat. When the teacher starts the class, students can open the configured meeting link for the call. [Live-session handler](backend/src/socket/live-session.handler.ts) · [Student live room](frontend/src/pages/student/LiveSessionPage.tsx)

## Follow the $150

The refund follows each package’s share of the original cart. Each teacher’s commission rate then determines how much of that share was theirs to earn.

| Teacher | Original package | Gross share of refund | Platform commission rate | Deduction from teacher earnings |
| --- | ---: | ---: | ---: | ---: |
| Alice | $100 | $50 | 0% | $50 |
| Bob | $200 | $100 | 10% | $90 |

The same calculation accounts for direct purchases, multi-teacher orders and pending payouts. It totals the full dataset before paginating the admin report, so moving to page two leaves the overall balance intact. [Settlement calculator](backend/src/services/shared/settlement-calculator.ts) · [The test behind the example](backend/src/__tests__/settlement-calculator.test.ts)

## Under the hood

**React 18, TypeScript, Vite and Zustand** power the role-specific workspaces. The **Express** API uses **Prisma and PostgreSQL** for the course catalogue, orders, enrollments and wallet records. Shared enrollment checks use active status and expiry to decide whether a learner can open course content. The Render configuration serves the built frontend, API and Socket.IO connection from one origin. [Enrollment checks](backend/src/services/shared/enrollment-access.ts) · [Render deployment guide](docs/render-deployment.md)

## Start a local marketplace

Use Node.js 20+ and PostgreSQL. Copy both environment examples to `.env` in their respective directories, then set the database URL and the two JWT secrets in the backend file. [Backend settings](backend/.env.example) · [Frontend settings](frontend/.env.example)

1. From `backend/` run `npm ci`, `npm run prisma:migrate`, then `npm run dev`.
2. In a second terminal, from `frontend/` run `npm ci` and `npm run dev`. Open `http://localhost:5173`.
3. Register your first account. The catalogue starts empty. For a local admin account, backend startup accepts `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` together. [Admin bootstrap](backend/src/services/bootstrap-admin.service.ts)
