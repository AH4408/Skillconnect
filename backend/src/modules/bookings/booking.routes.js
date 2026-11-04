import { Router } from "express";
import * as controller from "./booking.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import CreateQuoteDto from "./dto/create-quote.dto.js";
import QuoteActionDto from "./dto/quote-action.dto.js";

const router = Router();
router.use(authenticate);

router.get("/my", authorize("client", "worker"), controller.getMyBookings);
router.post("/jobs/:jobId/quotes", authorize("worker"), validate(CreateQuoteDto), controller.createQuote);
router.get("/:id", authorize("client", "worker", "admin"), controller.getBooking);
router.patch("/:id/accept-quote", authorize("client"), validate(QuoteActionDto), controller.acceptQuote);
router.patch("/:id/reject-quote", authorize("client"), validate(QuoteActionDto), controller.rejectQuote);
router.patch("/:id/start", authorize("worker"), controller.startBooking);
router.patch("/:id/complete", authorize("worker"), controller.completeBooking);
router.patch("/:id/confirm", authorize("client"), controller.confirmCompletion);

export default router;
