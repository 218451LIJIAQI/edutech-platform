# Render Deployment Guide

This project is configured for a simple prototype-level Render deploy with one public URL.

The Render Blueprint in `render.yaml` creates:

- one Node Web Service named `flexilearn`
- one Render PostgreSQL database named `flexilearn-db`
- one 1 GB persistent disk for uploads

The backend serves the built Vite frontend in production, so the deployed app uses the same origin for the frontend, API, uploads, and Socket.IO:

```text
https://flexilearn.onrender.com
https://flexilearn.onrender.com/api/v1/health
https://flexilearn.onrender.com/api/v1/ready
```

## Why This Setup

For a school prototype, this is simpler than splitting frontend and backend into separate services:

- no separate frontend service URL to maintain
- no manual `VITE_API_URL` or `VITE_SOCKET_URL` needed
- fewer CORS mistakes
- Socket.IO stays on the same origin
- Prisma migrations run automatically before each deploy

## Cost

The checked-in `render.yaml` uses paid-but-small prototype resources:

- Web Service: `starter`
- PostgreSQL: `basic-256mb`
- Upload disk: `1 GB`

This avoids free-tier sleep and free database expiry problems during grading or user testing. If you only need a very short demo, you can change the web service and database plans to `free`, but remove the `disk` block or uploads will not be persistent.

## Deploy Steps

1. Push this repository to GitHub.
2. Log in to Render.
3. Choose **New +**.
4. Choose **Blueprint**.
5. Connect the GitHub repository.
6. Render will detect `render.yaml`.
7. Click **Apply** or **Deploy Blueprint**.
8. Wait for the database and web service to finish deploying.

After deployment, open:

```text
https://flexilearn.onrender.com/api/v1/health
```

The expected response is similar to:

```json
{
  "status": "ok",
  "service": "Edutech Platform API",
  "environment": "production"
}
```

Then open:

```text
https://flexilearn.onrender.com
```

The React app should load.

## Important Environment Notes

The Blueprint auto-generates secure JWT secrets:

```text
JWT_SECRET
JWT_REFRESH_SECRET
```

The app also uses Render's built-in `RENDER_EXTERNAL_URL`, so CORS and Socket.IO can allow the actual deployed origin automatically. You do not need to manually set these unless you add a custom domain:

```text
CORS_ORIGIN
SOCKET_CORS_ORIGIN
```

If you add a custom domain later, set both of those values to your custom domain, for example:

```text
CORS_ORIGIN=https://your-domain.com
SOCKET_CORS_ORIGIN=https://your-domain.com
```

## Create The First Admin

The seed file is intentionally empty, so the deployed database starts without an admin.

1. Register a normal account in the deployed app.
2. Go to the Render dashboard.
3. Open the `flexilearn-db` PostgreSQL database.
4. Open a database shell or connect with any PostgreSQL client.
5. Run this SQL, replacing the email:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

6. Log out and log back in.
7. Open `/admin`.

## Prototype Caveats

- Payments are simulated in this repository.
- Live sessions coordinate state and chat with Socket.IO, but the actual meeting room is an external meeting URL.
- Uploaded files are stored on the Render disk. The checked-in disk is enough for prototype use, but do not ask users to upload large course videos for grading.
- Render service names must be unique inside your Render account. If Render changes the final public URL, use whatever URL Render shows for the `flexilearn` web service.

## Local Verification Commands

Before pushing, these commands should pass:

```powershell
npm run build --prefix frontend
npm run build --prefix backend
```

The production smoke test used for this deployment setup confirmed:

- `/` returns the built React HTML
- `/api/v1/health` returns HTTP 200
