# SkillConnect Environment & Deployment Notes

## Environment variables actually used by the uploaded backend

PORT
NODE_ENV
MONGODB_URI
SMTP_USER
SMTP_PASS
SMTP_FROM_EMAIL
JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN

No other `process.env.*` variables were found in the uploaded backend source.

## Local Mac

1. Copy `.env` into the backend root (next to `server.js` and `package.json`).
2. Install:
   npm install
3. Start:
   npm start

The current package.json defines only:
  "start": "node server.js"

The server defaults to port 5000 if PORT is not set.

## MongoDB

Local:
  mongodb://127.0.0.1:27017/skillconnect

Production:
Use MongoDB Atlas and put the Atlas URI in MONGODB_URI.

## Production secrets

Never commit `.env` to Git.
Set production values in the hosting provider's secret/environment-variable settings.

Generate strong JWT secrets, for example on macOS:
  openssl rand -base64 48
Run it twice and use different values for access and refresh secrets.

## Important deployment/code issues found during inspection

1. CORS:
   src/app.js currently does not configure CORS. If React is hosted on a different origin, add the `cors` package and configure the frontend origin.

2. Email:
   src/common/config/email.js currently hard-codes:
     host: "smtp.example.com"
     port: 587
   SMTP_USER and SMTP_PASS are read from .env, but the host is not.
   Replace the placeholder SMTP host with your real provider before production.

3. Email verification function:
   `sendVerificationEmail` in the uploaded file references `subject` and `html` without defining them and passes `email` instead of `to`.
   This needs fixing before relying on verification emails.

4. Frontend:
   The React frontend should use:
     VITE_API_BASE_URL=http://localhost:5000/api
   for local development, and the deployed backend URL + `/api` in production.

5. PORT:
   For services such as Render/Railway, do not hard-code the production port in the platform. Let the platform inject PORT.

6. Start command:
   The uploaded backend package.json has:
     npm start
   and does not define `npm run dev`.

## Expected production flow

React frontend
  -> HTTPS deployed backend /api
  -> Express
  -> MongoDB Atlas

The email provider is used by the backend for email operations.
