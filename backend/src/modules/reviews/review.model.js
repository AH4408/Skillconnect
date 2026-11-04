import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

reviewSchema.index({ worker: 1 });
reviewSchema.index({ client: 1 });
reviewSchema.index({ job: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
