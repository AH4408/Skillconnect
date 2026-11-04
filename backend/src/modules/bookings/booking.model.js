import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true, min: 0 },
  eta: { type: String, trim: true },
  message: { type: String, trim: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
  },
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quotes: [quoteSchema],
  agreedAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CONFIRMED_BY_CLIENT", "CANCELLED", "DISPUTED"],
    default: "PENDING",
  },
  startedAt: Date,
  completedAt: Date,
  confirmedAt: Date,
  cancelledAt: Date,
  cancellationReason: { type: String, trim: true, default: null },
}, { timestamps: true });

bookingSchema.index({ client: 1 });
bookingSchema.index({ worker: 1 });
bookingSchema.index({ status: 1 });

export default mongoose.model("Booking", bookingSchema);
