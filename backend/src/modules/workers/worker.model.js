import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  skills: [{ type: String, trim: true }],
  services: [{ type: String, trim: true }],
  bio: { type: String, trim: true, maxlength: 1000 },
  city: { type: String, trim: true },
  area: { type: String, trim: true },
  experience: { type: Number, min: 0, default: 0 },
  hourlyRate: { type: Number, min: 0, default: 0 },
  availability: { type: Boolean, default: true },
  verification: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, { timestamps: true });

workerSchema.index({ city: 1, skills: 1 });
workerSchema.index({ verification: 1 });

export default mongoose.model("WorkerProfile", workerSchema);
