import * as clientService from "./client.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const getProfile = async (req, res) => {
  const profile = await clientService.getProfile(req.user.id);
  ApiResponse.ok(res, "Client profile fetched successfully", profile);
};

const updateProfile = async (req, res) => {
  const profile = await clientService.updateProfile(req.user.id, req.body);
  ApiResponse.ok(res, "Client profile updated successfully", profile);
};

const getDashboard = async (req, res) => {
  const dashboard = await clientService.getDashboard(req.user.id);
  ApiResponse.ok(res, "Client dashboard fetched successfully", dashboard);
};

const getRecentJobs = async (req, res) => {
  const jobs = await clientService.getRecentJobs(req.user.id, req.query.limit);
  ApiResponse.ok(res, "Recent jobs fetched successfully", jobs);
};

export { getProfile, updateProfile, getDashboard, getRecentJobs };
