import jwt from 'jsonwebtoken';
import User from './auth/auth.model.js';
import Worker from './workers/worker.model.js';
import ClientProfile from './client/client.model.js';
import { emitWorkerAvailability, isWorkerSocketOnline, roomId, setWorkerSocketPresence } from '../common/utils/realtime.js';

export const registerRealtimeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = payload.id || payload.userId || payload._id;
      const user = await User.findById(userId).select('_id role');
      if (!user) return next(new Error('User no longer exists'));
      socket.user = { id: user._id.toString(), role: user.role };
      if (user.role === 'worker') {
        const profile = await Worker.findOne({ user: user._id }).select('skills services city availability').lean();
        socket.workerProfile = profile || {};
      } else if (user.role === 'client') {
        const profile = await ClientProfile.findOne({ user: user._id }).select('city').lean();
        socket.clientProfile = profile || {};
      }
      next();
    } catch (error) {
      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    if (role === 'admin') socket.join('admin');

    if (role === 'client') {
      const city = roomId(socket.clientProfile?.city);
      if (city) socket.join(`client-city:${city}`);
    }

    if (role === 'worker') {
      setWorkerSocketPresence(id, true);
      const profile = socket.workerProfile || {};
      const city = roomId(profile.city);
      if (city) socket.join(`city:${city}`);
      const categories = [...new Set((profile.skills || []).map(roomId).filter(Boolean))];
      categories.forEach((category) => {
        // Worker job-feed rooms are restricted by BOTH skill and city.
        if (city) socket.join(`category:${category}:city:${city}`);
      });
      if (city) emitWorkerAvailability(id, profile.city, Boolean(profile.availability && isWorkerSocketOnline(id)));
    }

    socket.on('disconnect', async () => {
      if (role !== 'worker') return;
      try {
        const remaining = setWorkerSocketPresence(id, false);
        if (!remaining) emitWorkerAvailability(id, socket.workerProfile?.city, false);
      } catch (error) {
        console.error('Could not update worker presence after disconnect:', error.message);
      }
    });

    // Rejoin after reconnect is automatic because the authenticated connection
    // re-runs this handler and derives room membership from MongoDB.
  });
};
