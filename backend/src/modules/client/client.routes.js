import { Router } from "express";
import * as controller from "./client.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import UpdateClientDto from "./dto/update-client.dto.js";

const router = Router();

router.use(authenticate, authorize("client"));

router.get("/profile", controller.getProfile);
router.patch("/profile", validate(UpdateClientDto), controller.updateProfile);
router.get("/dashboard", controller.getDashboard);
router.get("/jobs/recent", controller.getRecentJobs);

export default router;
