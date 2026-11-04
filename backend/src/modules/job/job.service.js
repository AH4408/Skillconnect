import mongoose from "mongoose";
import Job from "./job.model.js";
import Worker from "../workers/worker.model.js";
import ApiError from "../../common/utils/api-error.js";

const ALLOWED_STATUSES = [
  "PENDING",
  "QUOTING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CONFIRMED",
  "CLOSED",
  "CANCELLED",
  "DISPUTED",
];

const createJob = async (clientId, data) => {
  const job = await Job.create({
    ...data,
    client: clientId,
    status: "PENDING",
  });

  return job;
};

const getMyJobs = async (clientId, query = {}) => {
  const filter = { client: clientId };

  if (query.status) filter.status = query.status.toUpperCase();
  if (query.category) filter.category = query.category;
  if (query.city) filter.city = query.city;

  return Job.find(filter)
    .populate("client", "name email")
    .populate("assignedWorker", "name email")
    .sort({ createdAt: -1 });
};

const getAvailableJobs = async (worker, query = {}) => {
  // A worker can see jobs only in categories listed in their saved skills.
  // Never fall back to a city-wide feed when skills are empty or missing.
  const workerProfile = await Worker.findOne({ user: worker.id })
    .select("city skills availability")
    .lean();

  const city = String(workerProfile?.city || worker.city || "").trim();
  const skills = [...new Set(
    (workerProfile?.skills || [])
      .map((skill) => String(skill || "").trim())
      .filter(Boolean)
  )];

  if (!city || skills.length === 0) return [];

  // Match category names case-insensitively, but exactly. For example,
  // "Painting" matches "painting", but never matches "Electrical".
  const categoryPatterns = skills.map(
    (skill) => new RegExp(`^\\s*${skill.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`, "i")
  );

  const filter = {
    status: { $in: ["PENDING", "QUOTING"] },
    city: { $regex: `^\\s*${city.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`, $options: "i" },
    category: { $in: categoryPatterns },
  };

  // A requested category can narrow the worker's own skills, never widen them.
  if (query.category) {
    const requestedCategory = String(query.category).trim();
    const allowed = skills.some(
      (skill) => skill.toLowerCase() === requestedCategory.toLowerCase()
    );
    if (!allowed) return [];
    filter.category = {
      $regex: `^\\s*${requestedCategory.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`,
      $options: "i",
    };
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
    ];
  }

  return Job.find(filter)
    .populate("client", "name email")
    .sort({ createdAt: -1 });
};

const getJobById = async (jobId, user) => {
  if (!mongoose.isValidObjectId(jobId)) {
    throw ApiError.badRequest("Invalid job id");
  }

  const job = await Job.findById(jobId)
    .populate("client", "name email")
    .populate("assignedWorker", "name email");

  if (!job) throw ApiError.notfound("Job not found");

  const isClient = user.role === "client" && job.client._id.toString() === user.id.toString();
  const isWorker = user.role === "worker" && job.assignedWorker?._id.toString() === user.id.toString();
  const isAdmin = user.role === "admin";

  if (!isClient && !isWorker && !isAdmin) {
    throw ApiError.forbidden("You cannot access this job");
  }

  return job;
};

const updateJob = async (jobId, clientId, data) => {
  const job = await Job.findOne({ _id: jobId, client: clientId });
  if (!job) throw ApiError.notfound("Job not found");

  if (!["PENDING", "QUOTING"].includes(job.status)) {
    throw ApiError.badRequest("Job can no longer be edited");
  }

  const allowedFields = [
    "title",
    "description",
    "category",
    "budget",
    "city",
    "area",
    "address",
    "preferredDate",
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) job[field] = data[field];
  });

  await job.save();
  return job;
};

const cancelJob = async (jobId, clientId) => {
  const job = await Job.findOne({ _id: jobId, client: clientId });
  if (!job) throw ApiError.notfound("Job not found");

  if (["COMPLETED", "CONFIRMED", "CLOSED", "CANCELLED"].includes(job.status)) {
    throw ApiError.badRequest("Job cannot be cancelled now");
  }

  job.status = "CANCELLED";
  await job.save();
  return job;
};

const updateStatus = async (jobId, user, status) => {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw ApiError.badRequest("Invalid job status");
  }

  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notfound("Job not found");

  const userId = user.id.toString();

  if (status === "IN_PROGRESS") {
    if (user.role !== "worker" || !job.assignedWorker || job.assignedWorker.toString() !== userId) {
      throw ApiError.forbidden("Only the assigned worker can start this job");
    }
    if (job.status !== "ASSIGNED") {
      throw ApiError.badRequest("Only an assigned job can be started");
    }
  }

  if (status === "COMPLETED") {
    if (user.role !== "worker" || !job.assignedWorker || job.assignedWorker.toString() !== userId) {
      throw ApiError.forbidden("Only the assigned worker can complete this job");
    }
    if (job.status !== "IN_PROGRESS") {
      throw ApiError.badRequest("Only an in-progress job can be completed");
    }
    job.completedAt = new Date();
  }

  if (status === "CONFIRMED") {
    if (user.role !== "client" || job.client.toString() !== userId) {
      throw ApiError.forbidden("Only the client can confirm completion");
    }
    if (job.status !== "COMPLETED") {
      throw ApiError.badRequest("Only a completed job can be confirmed");
    }
    job.confirmedAt = new Date();
  }

  if (status === "CLOSED") {
    if (user.role !== "admin") {
      throw ApiError.forbidden("Only admin can close a job");
    }
  }

  if (status === "DISPUTED") {
    if (!["client", "worker", "admin"].includes(user.role)) {
      throw ApiError.forbidden("Not allowed to raise a dispute");
    }
  }

  job.status = status;
  await job.save();
  return job;
};

const assignWorker = async (jobId, workerId) => {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notfound("Job not found");

  if (!["PENDING", "QUOTING"].includes(job.status)) {
    throw ApiError.badRequest("Worker cannot be assigned at this stage");
  }

  job.assignedWorker = workerId;
  job.status = "ASSIGNED";
  await job.save();
  return job;
};

export {
  createJob,
  getMyJobs,
  getAvailableJobs,
  getJobById,
  updateJob,
  cancelJob,
  updateStatus,
  assignWorker,
};
