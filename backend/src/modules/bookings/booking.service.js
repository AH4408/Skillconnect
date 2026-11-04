import Booking from "./booking.model.js";
import Job from "../job/job.model.js";
import ApiError from "../../common/utils/api-error.js";

const createQuote = async (jobId, workerId, data) => {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notfound("Job not found");
  if (!["PENDING", "QUOTING"].includes(job.status))
    throw ApiError.badRequest("Quotes are closed for this job");

  const already = await Booking.findOne({
    job: jobId,
    quotes: { $elemMatch: { worker: workerId, status: "PENDING" } },
  });
  if (already) throw ApiError.badRequest("You already have an active quote on this job");

  let booking = await Booking.findOne({ job: jobId });
  if (!booking) {
    booking = await Booking.create({
      job: jobId,
      client: job.client,
      worker: workerId,
      agreedAmount: data.amount,
      quotes: [{ worker: workerId, ...data }],
      status: "PENDING",
    });
  } else {
    booking.quotes.push({ worker: workerId, ...data });
    await booking.save();
  }

  if (job.status === "PENDING") {
    job.status = "QUOTING";
    await job.save();
  }
  return booking;
};

const getBooking = async (id) => {
  const booking = await Booking.findById(id)
    .populate("job")
    .populate("client", "name email")
    .populate("worker", "name email")
    .populate("quotes.worker", "name email");
  if (!booking) throw ApiError.notfound("Booking not found");
  return booking;
};

const acceptQuote = async (bookingId, clientId, workerId, quoteId = null) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");
  if (booking.client.toString() !== clientId.toString())
    throw ApiError.forbidden("Only the client can accept a quote");

  const quote = quoteId
    ? booking.quotes.find(q => q._id.toString() === quoteId.toString() && q.worker.toString() === workerId.toString())
    : booking.quotes.find(q => q.worker.toString() === workerId.toString() && q.status === "PENDING");
  if (!quote) throw ApiError.notfound("Quote not found");
  if (quote.status !== "PENDING") throw ApiError.badRequest("This quote is no longer active");

  booking.quotes.forEach(q => {
    if (q._id.toString() === quote._id.toString()) q.status = "ACCEPTED";
    else if (q.status === "PENDING") q.status = "REJECTED";
  });
  booking.worker = workerId;
  booking.agreedAmount = quote.amount;
  booking.status = "CONFIRMED";
  await booking.save();

  await Job.findByIdAndUpdate(booking.job, {
    assignedWorker: workerId,
    status: "ASSIGNED",
  });
  return booking;
};

const rejectQuote = async (bookingId, clientId, workerId, quoteId = null) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");
  if (booking.client.toString() !== clientId.toString())
    throw ApiError.forbidden("Only the client can reject a quote");

  const quote = quoteId
    ? booking.quotes.find(q => q._id.toString() === quoteId.toString() && q.worker.toString() === workerId.toString())
    : booking.quotes.find(q => q.worker.toString() === workerId.toString() && q.status === "PENDING");
  if (!quote) throw ApiError.notfound("Quote not found");
  if (quote.status !== "PENDING") throw ApiError.badRequest("This quote is no longer active");
  quote.status = "REJECTED";
  await booking.save();
  return booking;
};

const startBooking = async (bookingId, workerId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");
  if (booking.worker.toString() !== workerId.toString())
    throw ApiError.forbidden("Only the assigned worker can start the job");
  if (booking.status !== "CONFIRMED")
    throw ApiError.badRequest("Booking is not ready to start");

  booking.status = "IN_PROGRESS";
  booking.startedAt = new Date();
  await booking.save();
  await Job.findByIdAndUpdate(booking.job, { status: "IN_PROGRESS" });
  return booking;
};

const completeBooking = async (bookingId, workerId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");
  if (booking.worker.toString() !== workerId.toString())
    throw ApiError.forbidden("Only the assigned worker can complete the job");
  if (booking.status !== "IN_PROGRESS")
    throw ApiError.badRequest("Booking is not in progress");

  booking.status = "COMPLETED";
  booking.completedAt = new Date();
  await booking.save();
  await Job.findByIdAndUpdate(booking.job, { status: "COMPLETED", completedAt: new Date() });
  return booking;
};

const confirmCompletion = async (bookingId, clientId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");
  if (booking.client.toString() !== clientId.toString())
    throw ApiError.forbidden("Only the client can confirm completion");
  if (booking.status !== "COMPLETED")
    throw ApiError.badRequest("Worker has not completed the job");

  booking.status = "CONFIRMED_BY_CLIENT";
  booking.confirmedAt = new Date();
  await booking.save();
  await Job.findByIdAndUpdate(booking.job, { status: "CONFIRMED", confirmedAt: new Date() });
  return booking;
};

const getMyBookings = async (userId, role) => {
  const query = role === "worker"
    ? { $or: [{ worker: userId }, { "quotes.worker": userId }] }
    : { client: userId };
  return Booking.find(query)
    .populate("job")
    .populate("client", "name email")
    .populate("worker", "name email")
    .sort({ createdAt: -1 });
};

export {
  createQuote, getBooking, acceptQuote, rejectQuote,
  startBooking, completeBooking, confirmCompletion, getMyBookings,
};
