import { Router } from "express";
import * as controller from "./chat.controller.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import CreateChatDto from "./dto/create-chat.dto.js";
import SendMessageDto from "./dto/send-message.dto.js";
import validate from "../../common/middleware/validate.middleware.js";

const router = Router();

router.use(authenticate, authorize("client", "worker"));

router.post("/", validate(CreateChatDto), controller.createOrGetChat);
router.get("/", controller.getMyChats);
router.get("/:chatId/messages", controller.getMessages);
router.post(
  "/:chatId/messages",
  validate(SendMessageDto),
  controller.sendMessage
);
router.patch("/:chatId/read", controller.markAsRead);

export default router;
