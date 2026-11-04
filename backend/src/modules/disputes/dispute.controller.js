import * as service from "./dispute.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const create = async (req, res) =>
  ApiResponse.created(res, "Dispute opened", await service.createDispute(req.user, req.body));

const listAdmin = async (_req, res) =>
  ApiResponse.ok(res, "Disputes fetched", await service.getAdminDisputes());

const resolve = async (req, res) =>
  ApiResponse.ok(res, "Dispute resolved", await service.resolveDispute(
    req.user.id,
    req.params.id,
    req.body.resolution
  ));

export { create, listAdmin, resolve };
