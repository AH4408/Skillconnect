# Chat Module

SkillConnect chat is job/booking scoped.

Flow:
Client/Worker -> Booking -> Chat -> Messages

Only the client and assigned worker for the booking can access the chat.

REST endpoints:
POST   /api/chats
GET    /api/chats
GET    /api/chats/:chatId/messages
POST   /api/chats/:chatId/messages
PATCH  /api/chats/:chatId/read

DTOs:
- CreateChatDto
- SendMessageDto

chat.socket.js provides Socket.IO room/join and typing events. Wire it into
your existing Socket.IO server and authenticate the socket with your existing
JWT/authentication approach.
