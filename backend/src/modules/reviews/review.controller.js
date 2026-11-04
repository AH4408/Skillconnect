import * as service from "./review.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitAdminRefresh } from "../../common/utils/realtime.js";

const createReview = async (req, res) => {
  const review = await service.createReview(req.user.id, req.body);
  emitAdminRefresh({ type: 'review:created', reviewId: review._id });
  ApiResponse.created(res, "Review created", review);
};

const getWorkerReviews = async (req, res) =>
  ApiResponse.ok(res, "Reviews fetched", await service.getWorkerReviews(req.params.workerId));

export { createReview, getWorkerReviews };
