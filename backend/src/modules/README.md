# SkillConnect Modular Monolith

Role areas:
- Client
- Worker
- Admin

Business modules:
- Auth (existing)
- Users
- Workers
- Jobs (existing/generated separately)
- Bookings
- Reviews
- Payments
- Notifications
- Admin

Mount the generated routes in app.js:

app.use("/api/users", userRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

These modules reuse the existing SkillConnect auth middleware, User model,
ApiError and ApiResponse utilities.
