import { Router } from "express";
import * as controller from "./admin.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import UserStatusDto from "./dto/user-status.dto.js";
import WorkerVerificationDto from "./dto/worker-verification.dto.js";
import AdminActionDto from "./dto/action.dto.js";
import ListUsersDto from "./dto/list-users.dto.js";
import ListWorkersDto from "./dto/list-workers.dto.js";
import ListJobsDto from "./dto/list-jobs.dto.js";
import ListBookingsDto from "./dto/list-bookings.dto.js";
import ListPaymentsDto from "./dto/list-payments.dto.js";
import ListReviewsDto from "./dto/list-reviews.dto.js";

const router = Router();
router.use(authenticate, authorize("admin"));

router.get("/dashboard", controller.dashboard);
router.get("/users", validate(ListUsersDto, "query"), controller.users);
router.patch("/users/:id/suspend", validate(UserStatusDto), controller.suspendUser);
router.delete("/users/:id", controller.deleteUser);
router.get("/workers", validate(ListWorkersDto, "query"), controller.workers);
router.patch("/workers/:id/verification", validate(WorkerVerificationDto), controller.verifyWorker);
router.get("/jobs", validate(ListJobsDto, "query"), controller.jobs);
router.patch("/jobs/:id/cancel", validate(AdminActionDto), controller.cancelJob);
router.get("/bookings", validate(ListBookingsDto, "query"), controller.bookings);
router.patch("/bookings/:id/cancel", validate(AdminActionDto), controller.cancelBooking);
router.get("/payments", validate(ListPaymentsDto, "query"), controller.payments);
router.get("/reviews", validate(ListReviewsDto, "query"), controller.reviews);
router.delete("/reviews/:id", controller.deleteReview);
router.get("/reports", controller.reports);

export default router;
