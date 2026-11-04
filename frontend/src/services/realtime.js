import { io } from 'socket.io-client';

let socket;

export function connectRealtime() {
  const token = localStorage.getItem('skillconnect_access_token');
  if (!token) return null;

  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5004', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
