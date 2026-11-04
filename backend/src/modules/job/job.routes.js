import { Router } from "express";
import * as controller from "./job.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import CreateJobDto from "./dto/create-job.dto.js";
import UpdateJobDto from "./dto/update-job.dto.js";
import StatusDto from "./dto/status.dto.js";
import AssignWorkerDto from "./dto/assign-worker.dto.js";
import JobQueryDto from "./dto/job-query.dto.js";

const router = Router();
router.use(authenticate);

router.post("/", authorize("client"), validate(CreateJobDto), controller.createJob);
router.get("/my", authorize("client"), validate(JobQueryDto, "query"), controller.getMyJobs);
router.patch("/:id", authorize("client"), validate(UpdateJobDto), controller.updateJob);
router.patch("/:id/cancel", authorize("client"), controller.cancelJob);
router.patch("/:id/status", validate(StatusDto), controller.updateStatus);

router.get("/available", authorize("worker"), validate(JobQueryDto, "query"), controller.getAvailableJobs);
router.get("/:id", authorize("client", "worker", "admin"), controller.getJobById);
router.patch("/:id/assign", authorize("admin"), validate(AssignWorkerDto), controller.assignWorker);

export default router;
