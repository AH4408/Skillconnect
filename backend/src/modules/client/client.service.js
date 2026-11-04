import User from "../auth/auth.model.js";
import ClientProfile from "./client.model.js";
import Job from "../job/job.model.js";
import ApiError from "../../common/utils/api-error.js";

const getProfile = async (userId) => {
  const user = await User.findById(userId).select("name email role isVerified createdAt");
  if (!user || user.role !== "client") throw ApiError.notfound("Client not found");

  const profile = await ClientProfile.findOne({ user: userId });
  return { user, profile };
};

const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user || user.role !== "client") throw ApiError.notfound("Client not found");

  if (data.name !== undefined) user.name = data.name;
  await user.save();

  const profile = await ClientProfile.findOneAndUpdate(
    { user: userId },
    { $set: { ...data, user: userId } },
    { returnDocument: 'after', upsert: true, runValidators: true },
  );

  return { user, profile };
};

const getDashboard = async (userId) => {
  const [total, pending, active, completed] = await Promise.all([
    Job.countDocuments({ client: userId }),
    Job.countDocuments({ client: userId, status: { $in: ["PENDING", "QUOTING"] } }),
    Job.countDocuments({ client: userId, status: { $in: ["ASSIGNED", "IN_PROGRESS"] } }),
    Job.countDocuments({ client: userId, status: { $in: ["COMPLETED", "CONFIRMED", "CLOSED"] } }),
  ]);

  return { total, pending, active, completed };
};

const getRecentJobs = async (userId, limit = 10) => {
  return Job.find({ client: userId })
    .populate("assignedWorker", "name email")
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 10, 50));
};

export { getProfile, updateProfile, getDashboard, getRecentJobs };
