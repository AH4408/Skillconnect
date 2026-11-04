import { Router } from "express";
import * as controller from "./payment.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import CreatePaymentDto from "./dto/create-payment.dto.js";
import RefundDto from "./dto/refund.dto.js";

const router = Router();
router.use(authenticate);

router.get("/my", authorize("client", "worker"), controller.getMyPayments);
router.post("/booking/:bookingId", authorize("client"), validate(CreatePaymentDto), controller.makePayment);
router.post("/:id/refund", authorize("admin"), validate(RefundDto), controller.refund);

export default router;
