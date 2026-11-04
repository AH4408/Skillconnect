import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 3000 },
  read: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, read: 1 });

export default mongoose.model("Message", messageSchema);
