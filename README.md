# SkillConnect

SkillConnect is a full-stack local services marketplace. It connects clients who need work done with nearby workers who can quote on jobs. The project includes separate client, worker, and administrator experiences, a React frontend, an Express API, MongoDB persistence, and Socket.IO updates.

## Contents

- [What it does](#what-it-does)
- [Technology](#technology)
- [How the app is organized](#how-the-app-is-organized)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [API areas](#api-areas)
- [Real-time updates](#real-time-updates)
- [Build](#build)
- [Production notes and current limitations](#production-notes-and-current-limitations)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## What it does

### Clients

- Create and manage a client profile with a city and area.
- Post a job with its category, location, budget, and description.
- Browse workers by city, skills, availability, and rating.
- Review worker quotes and accept or decline an offer.
- Track a job from posting through booking, work completion, confirmation, and payment status.
- Chat with workers, receive notifications, and leave reviews.
- Open a dispute for administrator review.

### Workers

- Create a worker profile with city, service area, skills, and biography.
- Set availability and browse jobs that match the worker's city and skills.
- Send a quote with a price, arrival estimate, and optional note.
- See when a client declines a quote and submit a replacement quote while the job remains open.
- Manage accepted work through the job pipeline, message clients, and view earnings and reviews.
- Receive notifications about quotes, jobs, messages, and cancellations.

### Administrators

- View dashboard data and manage users and worker verification.
- Review jobs and bookings, cancel jobs or bookings, and manage disputes.
- Review payments and ratings, remove reviews, and view reports.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, Axios, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB, Mongoose |
| Authentication | JWT access tokens and refresh-token cookies |

## How the app is organized

```text
Skillconnect/
├── backend/
│   ├── server.js             # Express and Socket.IO server entry point
│   └── src/modules/           # Auth, clients, workers, jobs, bookings, chat, admin, etc.
├── frontend/
│   ├── src/components/        # Shared UI and dialogs
│   ├── src/context/           # App state and backend synchronization
│   ├── src/services/          # API clients and Socket.IO connection
│   └── src/views/             # Client, worker, and admin experiences
├── .gitignore
└── README.md
```

The browser talks to the REST API for authenticated actions and data. MongoDB is the persistent source of truth. Socket.IO carries live updates between connected accounts.

## Run locally

### Prerequisites

- Node.js and npm
- MongoDB running locally, or a MongoDB Atlas connection string

### 1. Clone the repository

```bash
git clone https://github.com/AH4408/Skillconnect.git
cd Skillconnect
```

### 2. Configure the backend

In Terminal 1:

```bash
cd backend
npm install
```

Create a file named `backend/.env`:

```env
PORT=5004
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/skillconnect
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

The example URI connects to a local MongoDB server and stores data in a database named `skillconnect`. For MongoDB Atlas, replace it with your Atlas URI. Generate two different JWT secrets; on macOS you can run `openssl rand -base64 48` twice.

Start the API:

```bash
npm start
```

The API is available at `http://localhost:5004`. Check that it is running at `http://localhost:5004/health`.

### 3. Configure and run the frontend

Open Terminal 2 at the repository root:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

The provided frontend environment example points to the local API and Socket.IO server on port `5004`. If you change the backend port, update `VITE_API_BASE_URL` and `VITE_SOCKET_URL` in `frontend/.env` to match.

Keep the backend and frontend terminals running while you use the app. MongoDB must also remain available; it may run as a separate local service.

## Environment variables

### Backend

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP and Socket.IO server port; use `5004` for the included local frontend defaults. |
| `NODE_ENV` | Runtime mode. Local registration is enabled for development. |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime, for example `15m`. |
| `JWT_REFRESH_SECRET` | Separate secret used to sign refresh tokens. |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime, for example `7d`. |
| `FRONTEND_URL` | Allowed frontend origin for CORS and Socket.IO. Defaults to `http://localhost:5173`. |

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend REST API URL, including `/api`. |
| `VITE_SOCKET_URL` | Backend Socket.IO origin. |
| `VITE_USE_BACKEND` | Set to `true` to use the backend-backed app. |

Vite exposes `VITE_*` values to browser code, so never put passwords or private keys in frontend environment variables.

## API areas

The API is mounted under `/api`. Most endpoints require a valid access token and role authorization.

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Register, sign in, refresh session, sign out, and retrieve the current account. |
| `/api/client` | Client profile and dashboard data. |
| `/api/workers` | Worker search and worker profile management. |
| `/api/jobs` | Create, find, update, assign, track, and cancel jobs. |
| `/api/bookings` | Submit quotes, accept or decline quotes, and advance booking status. |
| `/api/chats` | Create conversations, retrieve messages, send messages, and mark chats read. |
| `/api/notifications` | Retrieve notifications and mark them read. |
| `/api/reviews` | Create reviews and retrieve a worker's reviews. |
| `/api/disputes` | Create disputes and let administrators review or resolve them. |
| `/api/payments` | View payment records, record a payment, and process an administrator refund. |
| `/api/admin` | Administrator dashboard, account management, and operational reports. |

The unauthenticated health endpoint is `GET /health`.

## Real-time updates

Socket.IO authenticates connections with the access token and assigns each user to server-controlled rooms. Events include job availability, worker presence, booking and quote changes, chat messages, notifications, and administrator refreshes.

The frontend fetches an initial snapshot through REST and re-fetches authoritative data after relevant Socket.IO events or reconnection. There is no periodic jobs polling loop. Socket.IO is configured with WebSocket transport and long-polling fallback if a WebSocket connection cannot be used.

## Build

Create a production frontend build with:

```bash
cd frontend
npm run build
```

The generated static assets are written to `frontend/dist/` and are ignored by Git.

## Production notes and current limitations

- GitHub stores this repository's source code; it does not host the running full-stack app. A live deployment needs a frontend host, a backend host that supports persistent Socket.IO connections, and a MongoDB database.
- Set production environment variables in the hosting provider. Use HTTPS origins, an Atlas connection string, and newly generated secrets. Do not reuse local development secrets.
- The frontend must use the deployed API origin in `VITE_API_BASE_URL` and the deployed backend origin in `VITE_SOCKET_URL`. Configure the backend's `FRONTEND_URL` to allow the deployed frontend origin.
- Payment records currently use a demo transaction ID; no external payment gateway is integrated.
- Email verification delivery is currently disabled in the registration service. Production account signup and verification need to be configured before relying on that flow.
- The backend currently exposes `npm start`; there is no separate backend development/watch script.

## Troubleshooting

### Frontend cannot reach the API

Make sure MongoDB and the backend are running. Check `http://localhost:5004/health` and confirm `frontend/.env` points to port `5004`.

### MongoDB connection fails

Start your local MongoDB service or check that `MONGODB_URI` points to a reachable database. For Atlas, verify the URI and network access rules.

### A worker does not see a job

Check that the worker profile has the same city and a matching skill/category as the job. The backend filters available jobs by both.

## Security

- Never commit `.env` files, database credentials, JWT secrets, or SMTP passwords.
- The root and backend `.gitignore` files exclude local environment files and generated dependencies/build output.
- Keep secrets in local environment files or your hosting provider's secret manager.
- Admin accounts are platform accounts and cannot be created through public registration.
