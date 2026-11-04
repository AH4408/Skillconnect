import * as service from "./worker.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitAdminRefresh, emitWorkerAvailability, isWorkerSocketOnline } from "../../common/utils/realtime.js";

const getProfile = async (req, res) =>
  ApiResponse.ok(res, "Worker profile fetched", await service.getProfile(req.user.id));

const updateProfile = async (req, res) => {
  const worker = await service.updateProfile(req.user.id, req.body);
  emitAdminRefresh({ type: "worker:profile:updated", userId: req.user.id });
  if (req.body.availability !== undefined) {
    emitWorkerAvailability(req.user.id, worker.city, Boolean(worker.availability && isWorkerSocketOnline(req.user.id)));
  }
  return ApiResponse.ok(res, "Worker profile updated", worker);
};

const findWorkers = async (req, res) =>
  ApiResponse.ok(res, "Workers fetched", await service.findWorkers(req.query));

export { getProfile, updateProfile, findWorkers };
