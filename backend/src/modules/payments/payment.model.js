import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["PENDING", "PAID", "REFUNDED", "FAILED"],
    default: "PENDING",
  },
  transactionId: { type: String, trim: true },
  paidAt: Date,
  refundedAt: Date,
  refundReason: String,
}, { timestamps: true });

paymentSchema.index({ client: 1 });
paymentSchema.index({ worker: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.model("Payment", paymentSchema);
