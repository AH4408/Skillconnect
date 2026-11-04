import Review from "./review.model.js";
import Booking from "../bookings/booking.model.js";
import ApiError from "../../common/utils/api-error.js";

const createReview = async (clientId, data) => {
  const booking = await Booking.findOne({
    job: data.job,
    client: clientId,
    status: "CONFIRMED_BY_CLIENT",
  });
  if (!booking) throw ApiError.badRequest("You can review only a completed and confirmed job");

  const exists = await Review.findOne({ job: data.job });
  if (exists) throw ApiError.badRequest("This job has already been reviewed");

  return Review.create({
    job: data.job,
    client: clientId,
    worker: booking.worker,
    rating: data.rating,
    comment: data.comment,
  });
};

const getWorkerReviews = async workerId =>
  Review.find({ worker: workerId })
    .populate("client", "name")
    .populate("job", "title")
    .sort({ createdAt: -1 });

export { createReview, getWorkerReviews };
