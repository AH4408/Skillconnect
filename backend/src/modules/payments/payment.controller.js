import * as service from "./payment.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitAdminRefresh } from "../../common/utils/realtime.js";

const makePayment = async (req, res) => {
  const payment = await service.makePayment(req.user.id, req.params.bookingId, req.body);
  emitAdminRefresh({ type: 'payment:created', paymentId: payment._id });
  ApiResponse.created(res, "Payment successful", payment);
};

const refund = async (req, res) => {
  const payment = await service.refund(req.params.id, req.body.reason);
  emitAdminRefresh({ type: 'payment:refunded', paymentId: payment._id });
  ApiResponse.ok(res, "Payment refunded", payment);
};

const getMyPayments = async (req, res) =>
  ApiResponse.ok(res, "Payments fetched", await service.getMyPayments(req.user.id, req.user.role));

export { makePayment, refund, getMyPayments };
