import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  raisedByRole: { type: String, enum: ["client", "worker"], required: true },
  category: { type: String, trim: true, required: true, maxlength: 100 },
  description: { type: String, trim: true, required: true, maxlength: 1000 },
  status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
  resolution: { type: String, trim: true, maxlength: 1000, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

disputeSchema.index({ job: 1, status: 1 });
disputeSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Dispute", disputeSchema);
