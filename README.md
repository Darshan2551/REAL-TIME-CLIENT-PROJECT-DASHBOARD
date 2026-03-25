# Real-Time Client Project Dashboard

A full stack internal agency dashboard with strict role-based API authorization, JWT auth with refresh-cookie rotation, real-time activity feeds over WebSockets, overdue background scheduling, and in-app notifications.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL + Prisma ORM
- Real-time: Socket.IO
- Background jobs: node-cron

## Why These Choices

- **Express over Fastify**: lighter setup and clearer middleware composition for strict RBAC + validation + structured error pipeline in an assessment-sized codebase.
- **Socket.IO over native WebSocket**: built-in auth handshake, reconnect handling, room targeting, and event semantics made role-filtered broadcasts/presence straightforward and safer.
- **node-cron over Bull**: overdue flagging is deterministic and lightweight (simple periodic DB sync), so queue infrastructure would add overhead without clear benefit.
- **Token storage**: access token is held in client memory, refresh token is in an **HttpOnly cookie** (`/api/auth/refresh` path scoped), then rotated server-side with hashed token records.

## Core Features Implemented

- JWT authentication with access + refresh tokens
- Refresh token rotation and revocation
- API-level RBAC for all protected routes
- 3 role permissions:
  - Admin: global visibility + management
  - Project Manager: only their own projects
  - Developer: only tasks assigned to them
- Projects + tasks + activity logs persisted in PostgreSQL
- Scheduled overdue flagging job via `node-cron`
- Live role-filtered activity feed over Socket.IO
- Missed event catch-up from DB (`/api/activity/feed?since=...&take=20`)
- Live online user presence count for admin
- In-app notifications with unread badge and dropdown
- Real-time unread count updates (socket push)
- Query-param based task filtering (`status`, `priority`, `dueFrom`, `dueTo`, `projectId`)
- Seed script with mandatory sample data

## Repository Layout

- `/server` - Express API, Prisma schema, socket service, cron job, seed script
- `/client` - React dashboard, auth/session handling, role views, live feed UI
- `docker-compose.yml` - local dev stack (postgres + server + client)

## Local Setup (Docker Recommended)

### 1) Start everything

```bash
docker compose up --build
```

This boots:

- Postgres in Docker network only (not published to host by default)
- API on `http://localhost:4000`
- Frontend on `http://localhost:5173`

### 2) Seed behavior

The server service runs:

```bash
npm run prisma:push && npm run seed && npm run dev
```

So schema + seed are applied automatically during startup.

## Local Setup (Without Docker)

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Seeded Accounts

Password for all users: `Password123!`

- Admin: `admin@agency.local`
- PM 1: `ravi.pm@agency.local`
- PM 2: `neha.pm@agency.local`
- Dev 1: `isha.dev@agency.local`
- Dev 2: `karan.dev@agency.local`
- Dev 3: `meera.dev@agency.local`
- Dev 4: `vikram.dev@agency.local`

Seed includes:

- 1 admin, 2 PMs, 4 developers
- 3 projects with 5 tasks each
- multiple statuses/priorities
- at least 2 overdue tasks
- pre-existing activity logs and assignment notifications

## API Security Notes

- RBAC is enforced in backend route handlers + ownership checks.
- PM cannot read/manage another PM's projects/tasks.
- Developer queries are always scoped to `assignedDeveloperId = authUser.id`.
- Direct endpoint hits with modified frontend state do not bypass access.

## Database Schema (Summary)

### Main tables

- `User` (role enum: `ADMIN`, `PROJECT_MANAGER`, `DEVELOPER`)
- `AgencyClient`
- `Project` (FK: `clientId`, `createdById`)
- `Task` (FK: `projectId`, `assignedDeveloperId`, `createdById`)
- `TaskActivity` (FK: `taskId`, `projectId`, `actorId`)
- `Notification` (FK: `userId`, optional `projectId`/`taskId`)
- `RefreshToken` (hashed token persistence + revocation)

### Important indexes

- `Task(projectId, status, priority, dueDate)` for dashboard/filter queries
- `Task(assignedDeveloperId)` for developer-scoped views
- `Task(isOverdue)` for overdue metrics
- `TaskActivity(projectId, createdAt)` for live/catch-up feed queries
- `Notification(userId, isRead, createdAt)` for unread badge/dropdown
- `Project(createdById)` for PM ownership scoping
- `RefreshToken(userId)` + unique `tokenHash` for secure rotation/revocation

## WebSocket Behavior

- Authenticated socket handshake via access token
- Auto room joins:
  - `user:{userId}`
  - `role:{role}`
- On demand room join: `project:{projectId}` (server re-checks authorization)
- Events:
  - `activity:new`
  - `presence:update`
  - `notifications:new`
  - `notifications:count`

## Known Limitations

- No automated test suite yet (manual verification only).
- UI is functional but not fully production-hardened (no advanced form UX/state libraries).
- Socket auth relies on current access token and does not hot-swap token mid-connection.
- Docker command reseeds on service restart by design for easy evaluator setup.

## Explanation (Assessment Field, ~200 words)

The hardest problem was building a real-time feed that stays role-safe while still feeling instant. A naive broadcast would leak data, especially for developers who should never see peer task activity. I solved this in two layers: strict query scoping for REST catch-up and socket room targeting for live pushes. Every activity event is stored in `TaskActivity` first, then emitted only to authorized channels (`role:ADMIN`, `project:{id}`, and relevant user rooms). On project-room join, the server re-checks access using the same RBAC rules as HTTP routes, so socket access cannot bypass backend permissions.

For offline users, I avoided in-memory replay and implemented DB-based catch-up using `GET /api/activity/feed?since=...&take=20`. The client keeps a `lastSeenAt` timestamp and fetches missed events on reconnect, then merges with latest feed entries. This keeps behavior deterministic across restarts and multiple instances.

If I had more time, I would replace the in-process presence map and cron runner with distributed infrastructure (Redis adapter + Bull queue). That would make presence and scheduled jobs horizontally scalable and safer for multi-instance production deployments.
