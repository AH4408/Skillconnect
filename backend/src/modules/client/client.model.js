import mongoose from "mongoose";

const clientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    area: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

clientProfileSchema.index({ city: 1 });

export default mongoose.model("ClientProfile", clientProfileSchema);
