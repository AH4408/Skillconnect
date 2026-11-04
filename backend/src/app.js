import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import authRoute from "./modules/auth/auth.routes.js";
import clientRoute from "./modules/client/client.routes.js";
import workerRoute from "./modules/workers/worker.routes.js";
import jobRoute from "./modules/job/job.routes.js";
import bookingRoute from "./modules/bookings/booking.routes.js";
import chatRoute from "./modules/chat/chat.routes.js";
import paymentRoute from "./modules/payments/payment.routes.js";
import reviewRoute from "./modules/reviews/review.routes.js";
import notificationRoute from "./modules/notifications/notification.routes.js";
import adminRoute from "./modules/admin/admin.routes.js";
import disputeRoute from "./modules/disputes/dispute.routes.js";

const app = express();

/*
 * CORS
 * Local React/Vite frontend:
 *   http://localhost:5173
 *
 * In production, replace this with your deployed frontend origin.
 */
const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header (Postman, curl, server-to-server).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/*
 * Health check
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SkillConnect API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

/*
 * API routes
 */
app.use("/api/auth", authRoute);
app.use("/api/client", clientRoute);
app.use("/api/workers", workerRoute);
app.use("/api/jobs", jobRoute);
app.use("/api/bookings", bookingRoute);
app.use("/api/chats", chatRoute);
app.use("/api/payments", paymentRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/disputes", disputeRoute);

/*
 * Unknown API route
 */
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

/*
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  });
});

export default app;
