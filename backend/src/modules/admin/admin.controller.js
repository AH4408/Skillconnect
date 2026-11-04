import * as service from "./admin.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitAdminRefresh, emitBookingChanged, emitJobChanged, emitToUser } from "../../common/utils/realtime.js";
import { createNotification } from "../notifications/notification.service.js";

const dashboard = async (req, res) =>
  ApiResponse.ok(res, "Admin dashboard fetched", await service.getDashboard());

const users = async (req, res) =>
  ApiResponse.ok(res, "Users fetched", await service.getUsers(req.query));

const suspendUser = async (req, res) => {
  const user = await service.setUserSuspended(req.params.id, req.body.suspended);
  emitAdminRefresh({ type: 'user:updated', userId: user._id });
  ApiResponse.ok(res, "User status updated", user);
};

const deleteUser = async (req, res) => {
  const user = await service.deleteUser(req.params.id);
  emitAdminRefresh({ type: 'user:deleted', userId: user._id });
  ApiResponse.ok(res, "User deleted", user);
};

const workers = async (req, res) =>
  ApiResponse.ok(res, "Workers fetched", await service.getWorkers(req.query));

const verifyWorker = async (req, res) => {
  const worker = await service.verifyWorker(req.params.id, req.body.verification);
  emitAdminRefresh({ type: 'worker:verified', userId: req.params.id });
  ApiResponse.ok(res, "Worker verification updated", worker);
};

const jobs = async (req, res) =>
  ApiResponse.ok(res, "Jobs fetched", await service.getJobs(req.query));

const cancelJob = async (req, res) => {
  const { job, booking, workerIds } = await service.cancelJob(req.params.id, req.body.reason);
  if (booking) emitBookingChanged(booking, { type: 'job:cancelled', jobId: job._id });
  else emitJobChanged(job, { type: 'job:cancelled' });

  const recipients = new Set([job.client.toString(), ...workerIds]);
  await Promise.all([...recipients].map(userId =>
    createNotification(
      userId,
      "Job cancelled by platform administration",
      `“${job.title}” was cancelled by platform administration.`,
      "JOB",
      { jobId: job._id, status: "CANCELLED" }
    ).then(notification => emitToUser(userId, 'notification:new', notification))
      .catch(error => console.error("Could not notify a participant about job cancellation:", error.message))
  ));
  emitAdminRefresh({ type: 'job:cancelled', jobId: job._id });
  ApiResponse.ok(res, "Job cancelled", job);
};

const bookings = async (req, res) =>
  ApiResponse.ok(res, "Bookings fetched", await service.getBookings(req.query));

const cancelBooking = async (req, res) => {
  const booking = await service.cancelBooking(req.params.id, req.body.reason);
  emitBookingChanged(booking, { type: 'booking:cancelled' });
  emitAdminRefresh({ type: 'booking:cancelled', bookingId: booking._id });
  ApiResponse.ok(res, "Booking cancelled", booking);
};

const payments = async (req, res) =>
  ApiResponse.ok(res, "Payments fetched", await service.getPayments(req.query));

const reviews = async (req, res) =>
  ApiResponse.ok(res, "Reviews fetched", await service.getReviews(req.query));

const deleteReview = async (req, res) => {
  const review = await service.deleteReview(req.params.id);
  emitAdminRefresh({ type: 'review:deleted', reviewId: review._id });
  ApiResponse.ok(res, "Review removed", review);
};

const reports = async (req, res) =>
  ApiResponse.ok(res, "Reports fetched", await service.getReports());

export {
  dashboard, users, suspendUser, deleteUser,
  workers, verifyWorker, jobs, cancelJob,
  bookings, cancelBooking, payments, reviews,
  deleteReview, reports
};
