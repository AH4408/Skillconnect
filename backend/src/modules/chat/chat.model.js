import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
}, { timestamps: true });

chatSchema.index({ client: 1 });
chatSchema.index({ worker: 1 });

export default mongoose.model("Chat", chatSchema);
