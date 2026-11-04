import * as service from "./notification.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const getMine = async (req, res) =>
  ApiResponse.ok(res, "Notifications fetched", await service.getMyNotifications(req.user.id));

const markRead = async (req, res) =>
  ApiResponse.ok(res, "Notification marked as read", await service.markAsRead(req.params.id, req.user.id));

const markAllRead = async (req, res) =>
  ApiResponse.ok(res, "Notifications marked as read", await service.markAllAsRead(req.user.id));

export { getMine, markRead, markAllRead };
