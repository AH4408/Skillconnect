import Notification from "./notification.model.js";

const createNotification = (user, title, message, type = "SYSTEM", data = {}) =>
  Notification.create({ user, title, message, type, data });

const getMyNotifications = userId =>
  Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(100);

const markAsRead = async (id, userId) =>
  Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { read: true },
    { returnDocument: 'after' }
  );

const markAllAsRead = userId =>
  Notification.updateMany({ user: userId, read: false }, { read: true });

export { createNotification, getMyNotifications, markAsRead, markAllAsRead };
