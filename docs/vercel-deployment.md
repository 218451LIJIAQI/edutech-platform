# Vercel full-stack demo

The root `vercel.json` builds the React frontend and Express API in one project.
The existing business routes stay under `/api/v1`. `api/index.js` exports the
HTTP server for API requests and Socket.IO connections. The website is served
from `frontend/dist` by Vercel's CDN.

## Required configuration

Connect a Neon PostgreSQL database to the project, including its pooled
`DATABASE_URL` and direct `DATABASE_URL_UNPOOLED`. The direct URL is required
for Socket.IO's PostgreSQL LISTEN/NOTIFY adapter.

Set these environment variables in Vercel:

- `NODE_ENV=production`
- `JWT_SECRET`: a unique randomly generated secret of at least 32 characters
- `JWT_REFRESH_SECRET`: a different random secret of at least 32 characters
- `CORS_ORIGIN`: the final public website origin, including `https://`
- `SOCKET_CORS_ORIGIN`: the same origin
- `VITE_MAX_UPLOAD_BYTES=4000000`

Vercel supplies `PORT` and `VERCEL_PROJECT_PRODUCTION_URL`. No private values
belong in the Git repository. The build runs Prisma migrations after both
production builds succeed. Keep preview deployments on a separate database
branch when developing schema changes after the first demo.

## Uploads and live sessions

On Vercel, validated demo uploads are stored as bytes in PostgreSQL instead
of the instance filesystem. Protected documents keep their existing access
checks and are restored to temporary storage only for authorized downloads.
Other hosts retain the original filesystem behavior.

Vercel's function request/response size limits mean this demo supports small
files up to 4,000,000 bytes; the total multipart request must also stay below
the platform limit. Large course videos should use external hosted video links.
For larger direct uploads, add an object-storage client-upload flow rather
than increasing the function upload limit.

Socket.IO uses WebSocket transport and a PostgreSQL adapter so broadcasts can
reach users on different instances. Reconnecting clients rejoin their session
and reload its state. Connections may reconnect at Vercel's function duration
limit. The database, not process memory, stores the session status.

## Verification

- `/api/v1/health` must return `status: ok`.
- `/api/v1/ready` must return `checks.database: ok`.
- Verify registration, login, course browsing, and a protected route.
- Upload a small valid image and check it from a fresh backend process.
- Verify that a protected-folder URL cannot be opened directly.
- Check two authenticated WebSocket clients in the same session.

The database starts empty. Register users through the website. Admin access
can be assigned explicitly to the owner's registered user in the database.
Payments remain simulated, as in the original application.
