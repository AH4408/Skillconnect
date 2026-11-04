import Dispute from "./dispute.model.js";
import Job from "../job/job.model.js";
import User from "../auth/auth.model.js";
import ApiError from "../../common/utils/api-error.js";
import { createNotification } from "../notifications/notification.service.js";
import { emitAdminRefresh, emitToUser } from "../../common/utils/realtime.js";

const notify = async (userIds, title, message, data) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  await Promise.allSettled(uniqueIds.map(async userId => {
    const notification = await createNotification(userId, title, message, "DISPUTE", data);
    emitToUser(userId, "notification:new", notification);
  }));
};

const populatedDispute = id => Dispute.findById(id)
  .populate({ path: "job", select: "title city client assignedWorker" })
  .populate("raisedBy", "name role")
  .populate("resolvedBy", "name role");

const createDispute = async (user, data) => {
  const job = await Job.findById(data.job);
  if (!job) throw ApiError.notfound("Job not found");

  const userId = String(user.id);
  const isJobClient = user.role === "client" && String(job.client) === userId;
  const isAssignedWorker = user.role === "worker" && String(job.assignedWorker || "") === userId;
  if (!isJobClient && !isAssignedWorker) {
    throw ApiError.forbidden("You can only dispute a job you are part of");
  }

  const existing = await Dispute.findOne({ job: job._id, status: "OPEN" });
  if (existing) throw ApiError.conflict("An open dispute already exists for this job");

  const dispute = await Dispute.create({
    job: job._id,
    raisedBy: userId,
    raisedByRole: user.role,
    category: data.category,
    description: data.description,
  });
  const result = await populatedDispute(dispute._id);
  const participantIds = [job.client, job.assignedWorker];
  const admins = await User.find({ role: "admin" }).select("_id").lean();
  const title = "New dispute";
  const message = `A dispute was opened for “${job.title}”. An admin will review it.`;
  await notify([...participantIds, ...admins.map(admin => admin._id)], title, message, {
    disputeId: String(dispute._id), jobId: String(job._id),
  });
  emitAdminRefresh({ type: "dispute:created", disputeId: String(dispute._id) });
  return result;
};

const getAdminDisputes = () => Dispute.find()
  .populate({ path: "job", select: "title city client assignedWorker" })
  .populate("raisedBy", "name role")
  .populate("resolvedBy", "name role")
  .sort({ createdAt: -1 });

const resolveDispute = async (adminId, disputeId, resolution) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw ApiError.notfound("Dispute not found");
  if (dispute.status !== "OPEN") throw ApiError.badRequest("This dispute has already been resolved");

  dispute.status = "RESOLVED";
  dispute.resolution = resolution;
  dispute.resolvedBy = adminId;
  dispute.resolvedAt = new Date();
  await dispute.save();

  const result = await populatedDispute(dispute._id);
  const participantIds = [result.job?.client, result.job?.assignedWorker];
  await notify(
    participantIds,
    "Dispute resolved",
    `The dispute for “${result.job?.title || "your job"}” was resolved: ${resolution}`,
    { disputeId: String(dispute._id), jobId: String(dispute.job) }
  );
  emitAdminRefresh({ type: "dispute:resolved", disputeId: String(dispute._id) });
  return result;
};

export { createDispute, getAdminDisputes, resolveDispute };
