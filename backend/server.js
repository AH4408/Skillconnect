import "dotenv/config";
import http from "http";
import { Server } from "socket.io";

import app from "./src/app.js";
import connectDB from "./src/common/config/db.js";
import registerChatSocket from "./src/modules/chat/chat.socket.js";
import { registerRealtimeSocket } from "./src/modules/realtime.socket.js";
import { setSocketServer } from "./src/common/utils/realtime.js";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setSocketServer(io);
registerRealtimeSocket(io);
registerChatSocket(io);

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`SkillConnect API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log("Socket.IO real-time updates and chat enabled");
    });
  } catch (error) {
    console.error("Failed to start SkillConnect:", error);
    process.exit(1);
  }
};

startServer();

export { httpServer, io };
