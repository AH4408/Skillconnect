# SkillConnect

SkillConnect is a local services marketplace that helps clients find nearby workers. Clients can post jobs, compare worker quotes, and manage bookings. Workers can find jobs, send quotes, and track accepted work. Administrators can manage users, jobs, bookings, and disputes.

## Features

- Client, worker, and administrator accounts
- Job posting and city/category-based job discovery
- Worker quotes, acceptance, rejection, and requoting
- Booking and job status tracking
- Real-time updates and chat with Socket.IO
- Notifications, worker profiles, ratings, and reviews
- Admin tools for users, workers, jobs, bookings, and disputes
- MongoDB persistence with JWT-based authentication

## Technology

- **Frontend:** React, Vite, Axios, Socket.IO Client
- **Backend:** Node.js, Express, Socket.IO, Mongoose
- **Database:** MongoDB

## Run locally
### Prerequisites

- Node.js and npm
- A running MongoDB instance, either local MongoDB or MongoDB Atlas

### 1. Clone the repository

```bash
git clone https://github.com/AH4408/Skillconnect.git
cd Skillconnect
```

### 2. Configure and start the backend

In a terminal:

```bash
cd backend
npm install
```

Create `backend/.env` with your local settings:

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

Use different random values for the two JWT secrets. You can generate them with `openssl rand -base64 48`.

Start the API:

```bash
npm start
```

The API listens on `http://localhost:5004`. Its health endpoint is `http://localhost:5004/health`.

### 3. Configure and start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

The frontend environment file points the app to the backend API and Socket.IO server. If you change the backend port, update `VITE_API_BASE_URL` and `VITE_SOCKET_URL` in `frontend/.env` to match.

## Production build

To build the frontend:

```bash
cd frontend
npm run build
```

For production, set environment variables through your hosting provider and use a MongoDB Atlas URI. Do not use the local development secrets or commit `.env` files. See [`backend/ENV_AND_DEPLOYMENT.md`](backend/ENV_AND_DEPLOYMENT.md) for additional deployment notes.

Email delivery requires valid SMTP credentials and a configured SMTP provider in the backend.

## Repository layout

```text
backend/   Express API, MongoDB models, authentication, and Socket.IO server
frontend/  React application built with Vite
```

## Security

The repository ignores `.env` files. Keep database credentials, JWT secrets, and SMTP passwords in local environment files or your hosting provider’s secret settings. The committed `*.env.example` files are templates only.
