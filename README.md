# 🎒 FlexiLearn

A student buys two classes in one cart. By lunchtime, they’ve passed a lesson quiz, raised a hand in a live session and bookmarked a classmate’s post. For the student, that’s a good morning. For the app, it’s an order split between teachers, two enrollments, a saved quiz attempt and a Socket.IO event that tells the teacher someone has a question. ✋

**FlexiLearn** is a desktop learning marketplace with student, teacher and administrator workspaces. It covers the work that happens on either side of the lesson, from approving a teacher’s profile to working out their share of a partial refund. Purchases use a simulated checkout so you can explore that whole journey with demo transactions.

## 🏫 Pick a seat in the classroom

| Workspace | A few things worth trying |
| --- | --- |
| 🎓 **Student** | Compare course packages, buy one directly or put several in a cart. Open an enrolled course, work through lessons, submit quizzes and return to saved progress. |
| 🎨 **Teacher** | Submit a profile for review, build a course with lessons and materials, set package prices, schedule a live class and inspect earnings in the teacher wallet. |
| 🛎️ **Administrator** | Review teacher applications, manage courses, respond to support tickets, moderate reports and trace refund and payout requests through the finance screens. |
| 💬 **Community** | Publish a post, attach media, comment, like, bookmark and follow. A course can give students something to work on and the community gives them somewhere to discuss it. |

Follow the [student learning room](frontend/src/pages/student/CourseLearningPage.tsx), [teacher course editor](frontend/src/pages/teacher-portal/CreateCoursePage.tsx) or [admin workspaces](frontend/src/pages/admin/).

## 📦 What’s in a course package?

A **course** is the thing a teacher builds. Its **lessons** hold the learning material and optional quizzes. A **package** carries the price and access duration. A purchase creates an **enrollment** that connects a particular student to that package. Keeping those records separate lets the app answer two different questions correctly.

- **Can I open this lesson today?** The shared enrollment check requires an active enrollment and either an expiry date in the future or open-ended access.
- **How far did I get?** The learning screen reads the learner’s enrollment progress and quiz attempts. A lesson with a quiz asks the learner to pass it before marking that lesson complete.

The same simulated confirmation form handles a single package and a cart. The learner acknowledges the simulation and submits the purchase. The app can exercise access, order history and refunds without collecting card details. [Prisma data model](backend/prisma/schema.prisma) · [Access rules](backend/src/services/shared/enrollment-access.ts) · [Checkout form](frontend/src/components/student/SimulatedCheckoutForm.tsx)

## 📡 What happens when someone raises a hand?

The teacher schedules a session and supplies a meeting link. FlexiLearn uses **Socket.IO** for the classroom around that call. Joining adds the participant to the session room. Chat messages and raised hands go to that room. The teacher’s start and end actions update the lifecycle and notify the people who joined.

The student room exposes the configured meeting link when the session is running. Opening it hands the audio and video call to the meeting service. Keeping chat, presence and lifecycle events in FlexiLearn lets everyone see the same classroom state around the call. [Socket.IO session handler](backend/src/socket/live-session.handler.ts) · [Student live room](frontend/src/pages/student/LiveSessionPage.tsx)

**Two-window tryout 🪟** Once the teacher starts a session, join it as two enrolled students in separate browser profiles. Send a chat message in the first window and reply from the second. Then raise a hand. The sender gets a confirmation, and the teacher’s live room handles the hand-raised alert.

## 🧮 The case of the $150 refund

Alice sells a **$100** package and Bob sells a **$200** package in the same order. A **$150** refund is approved. How much comes out of each teacher’s earnings? The settlement test has a surprisingly satisfying answer. 🧾

| | Alice | Bob |
| --- | ---: | ---: |
| Share of the $300 cart | 1/3 | 2/3 |
| Gross share of the $150 refund | $50 | $100 |
| Platform commission rate | 0% | 10% |
| Deduction from the teacher’s earnings | **$50** | **$90** |

Bob originally earned 90 cents per dollar on his item, so his deduction on a $100 share is $90. The test adds a separate $50 direct sale for Bob, worth $45 to him, and a $30 pending payout. His settlement becomes **$180 + $45 − $90 − $30 = $105**. Alice’s is **$100 − $50 = $50**. The report calculates totals across the full dataset before paging the list of teachers. [Settlement calculator](backend/src/services/shared/settlement-calculator.ts) · [The executable example](backend/src/__tests__/settlement-calculator.test.ts)

## 🧰 What runs the school?

| Layer | Tools | A decision you can see in the app |
| --- | --- | --- |
| Web client | React 18, TypeScript, Vite, Tailwind CSS and Zustand | Each role gets a workspace. Shared components cover checkout, lesson quizzes and media previews. |
| API | Node.js, Express and TypeScript | REST endpoints handle courses, enrollments, orders and support. Authentication uses access tokens and an HttpOnly refresh cookie. |
| Database | PostgreSQL and Prisma | Packages, order items, quiz attempts, enrollments and refunds retain their own identities. The settlement service can trace a refund to individual teachers. |
| Real-time classroom | Socket.IO | Room-scoped events handle presence, messages, raised hands and session changes. |
| Deployment | Render web service and PostgreSQL | The backend serves the built frontend and API from one origin, with uploads and Socket.IO on that same origin. |

For a closer look, open the [API service directory](backend/src/services/), [cookie implementation](backend/src/utils/auth-cookie.ts), [media URL handling](frontend/src/utils/video-embed.ts) or [Render deployment guide](docs/render-deployment.md).

## 🚀 Ring the first bell

Use **Node.js 20+** and **PostgreSQL**. Copy `backend/.env.example` and `frontend/.env.example` to `.env` in their respective directories. Configure the database URL and both JWT secrets in the backend environment. [Backend variables](backend/.env.example) · [Frontend variables](frontend/.env.example)

| Where | Commands |
| --- | --- |
| `backend/` | `npm ci`, then `npm run prisma:migrate`, then `npm run dev` |
| `frontend/` in a second terminal | `npm ci`, then `npm run dev` |
| Browser | Open `http://localhost:5173` and register an account. |

The catalogue starts empty. To try the whole teaching journey, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` together for the initial local administrator. Register a teacher, review their application and publish a course package. Then sign in as a student and take it through checkout. [Initial admin setup](backend/src/services/bootstrap-admin.service.ts)

<details>
<summary>🧪 What can I run before changing a lesson or a ledger?</summary>

Run `npm test` in each of `backend/` and `frontend/` after installing dependencies. The backend suites cover settlement arithmetic, authentication cookies, sanitization and shared utilities. The frontend suites cover editor payloads, enrollments and media handling. Both packages also provide `npm run typecheck` and `npm run build`. [Test runner](scripts/run-tests.mjs) · [Backend tests](backend/src/__tests__/) · [Frontend tests](frontend/src/__tests__/)

</details>
