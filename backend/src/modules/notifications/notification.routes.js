import { Router } from "express";
import * as controller from "./notification.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();
router.use(authenticate);

router.get("/", controller.getMine);
router.patch("/:id/read", controller.markRead);
router.patch("/read-all", controller.markAllRead);

export default router;
