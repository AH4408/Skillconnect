import { Router } from "express";
import * as controller from "./dispute.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import CreateDisputeDto from "./dto/create-dispute.dto.js";
import ResolveDisputeDto from "./dto/resolve-dispute.dto.js";

const router = Router();
router.use(authenticate);

router.post("/", authorize("client", "worker"), validate(CreateDisputeDto), controller.create);
router.get("/admin", authorize("admin"), controller.listAdmin);
router.patch("/:id/resolve", authorize("admin"), validate(ResolveDisputeDto), controller.resolve);

export default router;
