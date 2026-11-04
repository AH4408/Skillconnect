import * as service from "./chat.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const createOrGetChat = async (req, res) =>
  ApiResponse.ok(
    res,
    "Chat fetched",
    await service.createOrGetChat(req.user.id, req.body.bookingId)
  );

const getMyChats = async (req, res) =>
  ApiResponse.ok(res, "Chats fetched", await service.getMyChats(req.user.id));

const getMessages = async (req, res) =>
  ApiResponse.ok(
    res,
    "Messages fetched",
    await service.getMessages(req.params.chatId, req.user.id)
  );

const sendMessage = async (req, res) =>
  ApiResponse.created(
    res,
    "Message sent",
    await service.sendMessage(req.params.chatId, req.user.id, req.body)
  );

const markAsRead = async (req, res) =>
  ApiResponse.ok(
    res,
    "Messages marked as read",
    await service.markAsRead(req.params.chatId, req.user.id)
  );

export { createOrGetChat, getMyChats, getMessages, sendMessage, markAsRead };
