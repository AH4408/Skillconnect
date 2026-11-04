import User from "../auth/auth.model.js";
import Job from "../job/job.model.js";
import Booking from "../bookings/booking.model.js";
import Payment from "../payments/payment.model.js";
import Review from "../reviews/review.model.js";
import Worker from "../workers/worker.model.js";
import ApiError from "../../common/utils/api-error.js";
import { isWorkerSocketOnline } from "../../common/utils/realtime.js";

const getDashboard = async () => {
  const [
    totalUsers, clients, workers, suspendedUsers,
    totalJobs, activeJobs, completedJobs,
    totalBookings, activeBookings, completedBookings,
    paidPayments, refundedPayments, reviews
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "client" }),
    User.countDocuments({ role: "worker" }),
    User.countDocuments({ suspended: true }),
    Job.countDocuments(),
    Job.countDocuments({ status: { $in: ["PENDING", "QUOTING", "ASSIGNED", "IN_PROGRESS"] } }),
    Job.countDocuments({ status: { $in: ["COMPLETED", "CONFIRMED"] } }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: { $in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] } }),
    Booking.countDocuments({ status: "CONFIRMED_BY_CLIENT" }),
    Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    Payment.aggregate([
      { $match: { status: "REFUNDED" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    Review.countDocuments()
  ]);

  return {
    users: { total: totalUsers, clients, workers, suspended: suspendedUsers },
    jobs: { total: totalJobs, active: activeJobs, completed: completedJobs },
    bookings: { total: totalBookings, active: activeBookings, completed: completedBookings },
    payments: {
      paid: paidPayments[0] || { total: 0, count: 0 },
      refunded: refundedPayments[0] || { total: 0, count: 0 }
    },
    reviews
  };
};

const getUsers = async ({ role, suspended } = {}) => {
  const filter = {};
  if (role) filter.role = role;
  if (suspended !== undefined) filter.suspended = suspended === "true";
  return User.find(filter)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 });
};

const setUserSuspended = async (id, suspended) => {
  const user = await User.findByIdAndUpdate(
    id,
    { suspended },
    { returnDocument: 'after', runValidators: true }
  ).select("-password -refreshToken");

  if (!user) throw ApiError.notfound("User not found");
  return user;
};

const deleteUser = async id => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw ApiError.notfound("User not found");
  return user;
};

const getWorkers = async ({ verification, availability } = {}) => {
  const filter = {};
  if (verification) filter.verification = verification;
  if (availability !== undefined) filter.availability = availability === "true";

  const workers = await Worker.find(filter)
    .populate("user", "name email phone createdAt role suspended")
    .sort({ createdAt: -1 })
    .lean();

  return workers.map(worker => ({
    ...worker,
    online: Boolean(worker.availability && isWorkerSocketOnline(worker.user?._id)),
  }));
};

const verifyWorker = async (id, verification) => {
  if (!["approved", "rejected", "pending"].includes(verification))
    throw ApiError.badRequest("Invalid verification status");

  // Verification belongs to WorkerProfile, not User.
  const worker = await Worker.findOneAndUpdate(
    { user: id },
    { verification },
    { returnDocument: 'after', runValidators: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("user", "name email phone createdAt role suspended");

  if (!worker) throw ApiError.notfound("Worker profile not found");
  return worker;
};

const getJobs = async ({ status, city, category } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (city) filter.city = city;
  if (category) filter.category = category;

  return Job.find(filter)
    .populate("client", "name email")
    .populate("assignedWorker", "name email")
    .sort({ createdAt: -1 });
};

const cancelJob = async (id, reason) => {
  const job = await Job.findById(id);
  if (!job) throw ApiError.notfound("Job not found");

  const cancellationReason = reason || "Cancelled by platform administration";
  const cancelledAt = new Date();
  job.status = "CANCELLED";
  job.cancellationReason = cancellationReason;
  job.cancelledAt = cancelledAt;
  await job.save();

  const booking = await Booking.findOne({ job: job._id });
  if (booking) {
    booking.status = "CANCELLED";
    booking.cancellationReason = cancellationReason;
    booking.cancelledAt = cancelledAt;
    await booking.save();
  }

  const workerIds = new Set([
    job.assignedWorker,
    booking?.worker,
    ...(booking?.quotes || []).map(quote => quote.worker),
  ].filter(Boolean).map(workerId => workerId.toString()));

  return { job, booking, workerIds: [...workerIds] };
};

const getBookings = async ({ status } = {}) => {
  const filter = status ? { status } : {};
  return Booking.find(filter)
    .populate("job")
    .populate("client", "name email")
    .populate("worker", "name email")
    .sort({ createdAt: -1 });
};

const cancelBooking = async (id, reason) => {
  const booking = await Booking.findByIdAndUpdate(
    id,
    { status: "CANCELLED", cancellationReason: reason },
    { returnDocument: 'after' }
  );
  if (!booking) throw ApiError.notfound("Booking not found");
  return booking;
};

const getPayments = async ({ status } = {}) => {
  const filter = status ? { status } : {};
  return Payment.find(filter)
    .populate("client", "name email")
    .populate("worker", "name email")
    .populate("booking")
    .sort({ createdAt: -1 });
};

const getReviews = async ({ rating } = {}) => {
  const filter = rating ? { rating: Number(rating) } : {};
  return Review.find(filter)
    .populate("client", "name")
    .populate("worker", "name")
    .populate("job", "title")
    .sort({ createdAt: -1 });
};

const deleteReview = async id => {
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw ApiError.notfound("Review not found");
  return review;
};

const getReports = async () => {
  const [jobsByStatus, bookingsByStatus, revenueByMonth] = await Promise.all([
    Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Payment.aggregate([
      { $match: { status: "PAID" } },
      {
        $group: {
          _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
          revenue: { $sum: "$amount" },
          payments: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  return { jobsByStatus, bookingsByStatus, revenueByMonth };
};

export {
  getDashboard, getUsers, setUserSuspended, deleteUser,
  getWorkers, verifyWorker, getJobs, cancelJob,
  getBookings, cancelBooking, getPayments, getReviews,
  deleteReview, getReports
};
