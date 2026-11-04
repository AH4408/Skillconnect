import Chat from "./chat.model.js";
import Message from "./message.model.js";
import Booking from "../bookings/booking.model.js";
import Job from "../job/job.model.js";
import { createNotification } from "../notifications/notification.service.js";
import ApiError from "../../common/utils/api-error.js";
import { emitToUser, getSocketServer } from "../../common/utils/realtime.js";

const ensureParticipant = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw ApiError.notfound("Chat not found");

  const allowed =
    chat.client.toString() === userId.toString() ||
    chat.worker.toString() === userId.toString();

  if (!allowed) throw ApiError.forbidden("You are not a participant in this chat");
  return chat;
};

const createOrGetChat = async (userId, bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notfound("Booking not found");

  const isParticipant =
    booking.client.toString() === userId.toString() ||
    booking.worker.toString() === userId.toString();

  if (!isParticipant) throw ApiError.forbidden("You cannot access this booking chat");

  let chat = await Chat.findOne({ booking: bookingId });
  if (!chat) {
    chat = await Chat.create({
      job: booking.job,
      booking: booking._id,
      client: booking.client,
      worker: booking.worker,
    });
  }

  return Chat.findById(chat._id)
    .populate("job", "title status")
    .populate("booking", "status agreedAmount")
    .populate("client", "name email")
    .populate("worker", "name email");
};

const getMyChats = async userId => {
  return Chat.find({
    $or: [{ client: userId }, { worker: userId }],
  })
    .populate("job", "title status")
    .populate("client", "name")
    .populate("worker", "name")
    .populate("lastMessage", "text sender createdAt")
    .sort({ updatedAt: -1 });
};

const getMessages = async (chatId, userId) => {
  await ensureParticipant(chatId, userId);
  return Message.find({ chat: chatId })
    .populate("sender", "name")
    .sort({ createdAt: 1 });
};

const sendMessage = async (chatId, senderId, data) => {
  const chat = await ensureParticipant(chatId, senderId);

  const receiverId =
    chat.client.toString() === senderId.toString()
      ? chat.worker
      : chat.client;

  const message = await Message.create({
    chat: chatId,
    sender: senderId,
    receiver: receiverId,
    text: data.text,
  });

  chat.lastMessage = message._id;
  await chat.save();

  const populatedMessage = await Message.findById(message._id).populate("sender", "name");
  getSocketServer()?.to(`chat:${chatId}`).emit("chat:message", populatedMessage);

  try {
    const job = await Job.findById(chat.job).select("title");
    const notification = await createNotification(
      receiverId,
      "New message",
      `${populatedMessage.sender?.name || "Someone"} sent you a message${job?.title ? ` about “${job.title}”` : ""}.`,
      "CHAT",
      { chatId: String(chatId), jobId: String(chat.job) }
    );
    // Keep the notification in MongoDB and update the recipient's bell live.
    if (notification) emitToUser(receiverId, "notification:new", notification);
  } catch (error) {
    // The message has already been saved; don't report a failed send because
    // only the auxiliary notification write failed.
    console.error("Chat notification could not be created:", error.message);
  }
  return populatedMessage;
};

const markAsRead = async (chatId, userId) => {
  await ensureParticipant(chatId, userId);
  await Message.updateMany(
    { chat: chatId, receiver: userId, read: false },
    { read: true }
  );
  return { chatId, read: true };
};

export { createOrGetChat, getMyChats, getMessages, sendMessage, markAsRead };
