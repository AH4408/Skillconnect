import { Router } from "express";
import * as controller from "./worker.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import UpdateWorkerDto from "./dto/update-worker.dto.js";
import WorkerSearchDto from "./dto/worker-search.dto.js";

const router = Router();
router.use(authenticate);

router.get("/search", authorize("client", "worker", "admin"), validate(WorkerSearchDto, "query"), controller.findWorkers);
router.get("/profile", authorize("worker"), controller.getProfile);
router.patch("/profile", authorize("worker"), validate(UpdateWorkerDto), controller.updateProfile);

export default router;
