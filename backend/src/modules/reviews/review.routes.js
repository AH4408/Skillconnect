import { Router } from "express";
import * as controller from "./review.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import CreateReviewDto from "./dto/create-review.dto.js";

const router = Router();
router.use(authenticate);

router.post("/", authorize("client"), validate(CreateReviewDto), controller.createReview);
router.get("/worker/:workerId", authorize("client", "worker", "admin"), controller.getWorkerReviews);

export default router;
