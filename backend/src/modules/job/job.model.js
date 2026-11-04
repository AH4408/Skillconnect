import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    preferredDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "QUOTING",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "CONFIRMED",
        "CLOSED",
        "CANCELLED",
        "DISPUTED",
      ],
      default: "PENDING",
    },

    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ city: 1, category: 1 });
jobSchema.index({ client: 1 });
jobSchema.index({ assignedWorker: 1 });
jobSchema.index({ status: 1 });

export default mongoose.model("Job", jobSchema);
