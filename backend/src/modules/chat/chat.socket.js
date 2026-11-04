import Chat from "./chat.model.js";
import Message from "./message.model.js";

const registerChatSocket = io => {
  io.on("connection", socket => {
    socket.on("chat:join", async ({ chatId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit("chat:error", { message: "Chat not found" });

        const userId = socket.user?.id;
        if (!userId) return socket.emit("chat:error", { message: "Unauthorized" });

        const participant =
          chat.client.toString() === userId.toString() ||
          chat.worker.toString() === userId.toString();

        if (!participant)
          return socket.emit("chat:error", { message: "Not a chat participant" });

        socket.join(`chat:${chatId}`);
        socket.emit("chat:joined", { chatId });
      } catch {
        socket.emit("chat:error", { message: "Unable to join chat" });
      }
    });

    socket.on("chat:typing", ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit("chat:typing", {
        chatId,
        userId: socket.user?.id,
        isTyping: Boolean(isTyping),
      });
    });
  });
};

export default registerChatSocket;
