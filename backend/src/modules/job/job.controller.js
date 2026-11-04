import * as jobService from "./job.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitJobCreated, emitJobChanged } from "../../common/utils/realtime.js";

const createJob = async (req, res) => {
  const job = await jobService.createJob(req.user.id, req.body);
  emitJobCreated(job);
  ApiResponse.created(res, "Job created successfully", job);
};

const getMyJobs = async (req, res) => {
  const jobs = await jobService.getMyJobs(req.user.id, req.query);
  ApiResponse.ok(res, "Jobs fetched successfully", jobs);
};

const getAvailableJobs = async (req, res) => {
  const jobs = await jobService.getAvailableJobs(req.user, req.query);
  ApiResponse.ok(res, "Available jobs fetched successfully", jobs);
};

const getJobById = async (req, res) => {
  const job = await jobService.getJobById(req.params.id, req.user);
  ApiResponse.ok(res, "Job fetched successfully", job);
};

const updateJob = async (req, res) => {
  const job = await jobService.updateJob(req.params.id, req.user.id, req.body);
  emitJobChanged(job);
  ApiResponse.ok(res, "Job updated successfully", job);
};

const cancelJob = async (req, res) => {
  const job = await jobService.cancelJob(req.params.id, req.user.id);
  emitJobChanged(job);
  ApiResponse.ok(res, "Job cancelled successfully", job);
};

const updateStatus = async (req, res) => {
  const job = await jobService.updateStatus(req.params.id, req.user, req.body.status);
  emitJobChanged(job);
  ApiResponse.ok(res, "Job status updated successfully", job);
};

const assignWorker = async (req, res) => {
  const job = await jobService.assignWorker(req.params.id, req.body.workerId);
  emitJobChanged(job);
  ApiResponse.ok(res, "Worker assigned successfully", job);
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
