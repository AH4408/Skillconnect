import Worker from "./worker.model.js";
import ApiError from "../../common/utils/api-error.js";
import { isWorkerSocketOnline } from "../../common/utils/realtime.js";

const getProfile = async userId => {
  const worker = await Worker.findOne({ user: userId }).populate("user", "name email phone city");
  if (!worker) throw ApiError.notfound("Worker profile not found");
  return worker;
};

const updateProfile = async (userId, data) => {
  const allowed = ["skills", "services", "bio", "city", "area", "experience", "hourlyRate", "availability"];
  const update = {};
  allowed.forEach(k => { if (data[k] !== undefined) update[k] = data[k]; });

  return Worker.findOneAndUpdate(
    { user: userId },
    { $set: update, $setOnInsert: { user: userId } },
    { returnDocument: 'after', upsert: true, runValidators: true }
  ).populate("user", "name email phone city");
};

const findWorkers = async query => {
  // Directory entries need a live user account: orphaned profiles cannot
  // provide the worker's real name or a valid review/account identity.
  const filter = { verification: "approved" };
  if (query.city) {
    const city = String(query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.city = { $regex: `^\\s*${city}\\s*$`, $options: "i" };
  }
  if (query.skill) filter.skills = query.skill;
  const profiles = await Worker.find(filter)
    .populate("user", "name email phone city role")
    .lean();

  // Expose the linked account identity explicitly. The profile `_id` is not
  // the user ID used by reviews, bookings, or the public display name.
  // WorkerProfile is the source of worker role. Older account records may not
  // have a normalized `role` value, so require a linked account but don't hide
  // an otherwise valid approved profile solely because that field is missing.
  return profiles.filter(profile => profile.user)
    .map(profile => ({
    ...profile,
    userId: profile.user?._id || profile.user || null,
    name: profile.user?.name || "",
    email: profile.user?.email || "",
    // `availability` is the saved preference. `online` is current socket
    // presence, which is what the directory badge and Online now filter mean.
    online: Boolean(profile.availability && isWorkerSocketOnline(profile.user?._id)),
  }))
    .filter(profile => query.online !== "true" || profile.online);
};

export { getProfile, updateProfile, findWorkers };
