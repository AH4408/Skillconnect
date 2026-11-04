import * as service from "./booking.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitBookingChanged } from "../../common/utils/realtime.js";

const createQuote = async (req, res) => {
  const booking = await service.createQuote(req.params.jobId, req.user.id, req.body);
  emitBookingChanged(booking, { workerId: req.user.id, type: 'quote:created' });
  ApiResponse.created(res, "Quote submitted", booking);
};

const getBooking = async (req, res) =>
  ApiResponse.ok(res, "Booking fetched", await service.getBooking(req.params.id));

const acceptQuote = async (req, res) => {
  const booking = await service.acceptQuote(req.params.id, req.user.id, req.body.workerId, req.body.quoteId);
  emitBookingChanged(booking, { type: 'quote:accepted' });
  ApiResponse.ok(res, "Quote accepted", booking);
};

const rejectQuote = async (req, res) => {
  const booking = await service.rejectQuote(req.params.id, req.user.id, req.body.workerId, req.body.quoteId);
  emitBookingChanged(booking, { type: 'quote:rejected' });
  ApiResponse.ok(res, "Quote rejected", booking);
};

const startBooking = async (req, res) => {
  const booking = await service.startBooking(req.params.id, req.user.id);
  emitBookingChanged(booking, { type: 'booking:status' });
  ApiResponse.ok(res, "Job started", booking);
};

const completeBooking = async (req, res) => {
  const booking = await service.completeBooking(req.params.id, req.user.id);
  emitBookingChanged(booking, { type: 'booking:status' });
  ApiResponse.ok(res, "Job completed", booking);
};

const confirmCompletion = async (req, res) => {
  const booking = await service.confirmCompletion(req.params.id, req.user.id);
  emitBookingChanged(booking, { type: 'booking:status' });
  ApiResponse.ok(res, "Completion confirmed", booking);
};

const getMyBookings = async (req, res) =>
  ApiResponse.ok(res, "Bookings fetched", await service.getMyBookings(req.user.id, req.user.role));

export { createQuote, getBooking, acceptQuote, rejectQuote, startBooking, completeBooking, confirmCompletion, getMyBookings };
