import Payment from "./payment.model.js";
import Booking from "../bookings/booking.model.js";
import ApiError from "../../common/utils/api-error.js";

const makePayment = async (clientId, bookingId, data = {}) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");
  if (booking.client.toString() !== clientId.toString())
    throw ApiError.forbidden("Only the client can make this payment");
  if (booking.status !== "CONFIRMED_BY_CLIENT")
    throw ApiError.badRequest("Payment is available after completion confirmation");

  const existing = await Payment.findOne({ booking: bookingId });
  if (existing && existing.status === "PAID") throw ApiError.badRequest("Payment already completed");

  return Payment.findOneAndUpdate(
    { booking: bookingId },
    {
      booking: bookingId,
      client: booking.client,
      worker: booking.worker,
      amount: booking.agreedAmount,
      status: "PAID",
      transactionId: data.transactionId || `DEMO-${Date.now()}`,
      paidAt: new Date(),
    },
    { upsert: true, returnDocument: 'after' }
  );
};

const refund = async (paymentId, reason) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notfound("Payment not found");
  if (payment.status !== "PAID") throw ApiError.badRequest("Only paid payments can be refunded");

  payment.status = "REFUNDED";
  payment.refundedAt = new Date();
  payment.refundReason = reason;
  await payment.save();
  return payment;
};

const getMyPayments = async (userId, role) => {
  const field = role === "worker" ? "worker" : "client";
  return Payment.find({ [field]: userId }).sort({ createdAt: -1 });
};

export { makePayment, refund, getMyPayments };
