let ioInstance = null;
// Presence is deliberately transient. `WorkerProfile.availability` is the
// worker's saved preference; it cannot tell us whether their app is connected.
const workerSockets = new Map();

export const setSocketServer = (io) => { ioInstance = io; };
export const getSocketServer = () => ioInstance;

export const setWorkerSocketPresence = (userId, connected) => {
  if (!userId) return 0;
  const id = String(userId);
  const count = Math.max(0, (workerSockets.get(id) || 0) + (connected ? 1 : -1));
  if (count) workerSockets.set(id, count);
  else workerSockets.delete(id);
  return count;
};

export const isWorkerSocketOnline = userId => Boolean(userId && workerSockets.get(String(userId)));

export const roomId = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const emitToUser = (userId, event, payload = {}) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

export const emitWorkerAvailability = (userId, city, availability) => {
  if (!ioInstance || !userId) return;
  const payload = {
    workerId: String(userId),
    availability: Boolean(availability),
  };
  if (city) ioInstance.to(`client-city:${roomId(city)}`).emit("worker:availability", payload);
  ioInstance.to('admin').emit("worker:availability", payload);
};

export const emitAdminRefresh = (payload = {}) => {
  if (!ioInstance) return;
  ioInstance.to('admin').emit('admin:refresh', payload);
};

export const emitJobCreated = (job) => {
  if (!ioInstance || !job) return;
  const category = roomId(job.category);
  const city = roomId(job.city);
  if (category && city) {
    // Deliver only to workers whose saved skills match this job category
    // AND whose saved city matches the job city. Do not broadcast city-wide.
    ioInstance.to(`category:${category}:city:${city}`).emit('jobs:new', { job });
  }
  emitToUser(job.client?._id || job.client, 'client:jobs:updated', { jobId: job._id });
  emitAdminRefresh({ type: 'job:created', jobId: job._id });
};

export const emitBookingChanged = (booking, extra = {}) => {
  if (!booking) return;
  const bookingId = booking._id || booking.id;
  const clientId = booking.client?._id || booking.client;
  const payload = { bookingId, status: booking.status, ...extra };
  emitToUser(clientId, 'client:jobs:updated', payload);
  emitToUser(clientId, 'client:bookings:updated', payload);
  const workerIds = new Set([
    booking.worker?._id || booking.worker,
    extra.workerId,
    ...(booking.quotes || []).map(quote => quote.worker?._id || quote.worker),
  ].filter(Boolean).map(id => String(id)));
  workerIds.forEach(workerId => emitToUser(workerId, 'worker:bookings:updated', payload));
  emitAdminRefresh({ type: 'booking:updated', bookingId });
};

export const emitJobChanged = (job, extra = {}) => {
  if (!job) return;
  const jobId = job._id || job.id;
  const clientId = job.client?._id || job.client;
  const workerId = job.assignedWorker?._id || job.assignedWorker;
  const payload = { jobId, status: job.status, ...extra };
  emitToUser(clientId, 'client:jobs:updated', payload);
  emitToUser(workerId, 'worker:bookings:updated', payload);
  emitAdminRefresh({ type: 'job:updated', jobId });
};
