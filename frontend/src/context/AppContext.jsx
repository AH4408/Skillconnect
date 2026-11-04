import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppContext from './AppContextBase';
import { STORE_KEY, CITIES, CATEGORIES, ADMIN_PASSCODE, NEXT_STATUS, STATUS_META } from '../utils/constants';
import { uid, money, startOfDay, DAY, tierOf } from '../utils/formatters';
import { seedDB } from '../utils/seedData';
import { BACKEND_ENABLED, hydrateBackend, normalizeDispute, normalizeJob, normalizeUser } from '../services/backendSync';
import * as backendAuth from '../services/auth';
import { connectRealtime, disconnectRealtime } from '../services/realtime';
import { client as clientApi, workers as workersApi, jobs as jobsApi, bookings as bookingsApi, chats as chatsApi, reviews as reviewsApi, disputes as disputesApi, notifications as notificationsApi } from '../services/domain';

export function AppProvider({ children }) {
  // Initialize Database from localStorage or seed
  const [db, setDb] = useState(() => {
    // In backend mode, MongoDB/API is the source of truth for users, jobs,
    // quotes, bookings, reviews and notifications. Keep only the static seed
    // structure for the landing/demo shell until a real account logs in.
    if (BACKEND_ENABLED) return seedDB();

    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 3 && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load DB from localStorage, seeding new DB', e);
    }
    const seeded = seedDB();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    } catch (e) {}
    return seeded;
  });

  // Current view: 'landing' | 'client' | 'worker' | 'admin'
  const [view, setViewInternal] = useState(() => {
    const resume = db.session?.active;
    if (resume && db.session?.[resume] && db.users?.some(u => u.id === db.session[resume])) {
      return resume;
    }
    return 'landing';
  });

  // Tab states for Client & Worker, Page state for Admin
  const [clientTab, setClientTab] = useState('home');
  const [workerTab, setWorkerTab] = useState('dash');
  const [adminPage, setAdminPage] = useState('dashboard');

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Non-blocking Modals State
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, text, confirmLabel, danger, icon, resolve }
  const [promptDialog, setPromptDialog] = useState(null);   // { title, text, placeholder, value, validate, resolve }
  const [chartTip, setChartTip] = useState({ visible: false, text: '', x: 0, y: 0 });

  // Domain Modals & Drawers
  const [authModal, setAuthModal] = useState({ open: false, role: 'client', mode: 'login' });
  const [postJobModal, setPostJobModal] = useState({ open: false, preselect: null });
  const [quoteModal, setQuoteModal] = useState({ open: false, jobId: null });
  const [offersModal, setOffersModal] = useState({ open: false, jobId: null });
  const [jobDrawer, setJobDrawer] = useState({ open: false, jobId: null });
  const [workerDrawer, setWorkerDrawer] = useState({ open: false, workerId: null });
  const [chatModal, setChatModal] = useState({ open: false, jobId: null, withId: null });
  const [backendChat, setBackendChat] = useState({ chatId: null, messages: [], participants: [], loading: false, error: '' });
  const [rateModal, setRateModal] = useState({ open: false, jobId: null });
  const [disputeModal, setDisputeModal] = useState({ open: false, jobId: null });
  const [videoModal, setVideoModal] = useState({ open: false, url: null });

  // Notifications Popover open state ('client' | 'worker' | null)
  const [notifOpenRole, setNotifOpenRole] = useState(null);

  // Save DB to localStorage helper
  const persistDB = useCallback(newDb => {
    setDb(newDb);
    // Backend mode intentionally does not persist application data to the
    // browser. MongoDB is the source of truth; localStorage is only used by
    // the auth service for the access token/user convenience.
    if (BACKEND_ENABLED) return true;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(newDb));
      return true;
    } catch (err) {
      toast('Storage is full — that change was not saved. Try a smaller photo.', 'error', 6000);
      return false;
    }
  }, []);

  // Synchronize view with <body> theme and meta theme-color
  const setView = useCallback((nextView) => {
    setViewInternal(nextView);
    setNotifOpenRole(null);
    setDb(prev => {
      const nextDb = {
        ...prev,
        session: {
          ...prev.session,
          active: nextView === 'landing' ? null : nextView
        }
      };
      if (!BACKEND_ENABLED) {
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
      }
      return nextDb;
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, []);

  useEffect(() => {
    document.body.dataset.theme = view;
    document.documentElement.dataset.theme = view;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        view === 'worker' ? '#080d18' : view === 'landing' ? '#090f1c' : '#ffffff'
      );
    }
  }, [view]);

  // Backend session hydration. The existing local store remains as a safe
  // fallback, so the visual UI does not change when the API is unavailable.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;

    let cancelled = false;
    (async () => {
      try {
        // The refresh token lives in an HttpOnly cookie. Restore an access
        // token from it when localStorage was cleared or the tab has no token.
        if (!localStorage.getItem('skillconnect_access_token')) {
          await backendAuth.refresh();
        }
        const backendUser = await backendAuth.me();
        if (!backendUser || cancelled) return;
        const hydrated = await hydrateBackend(backendUser.role, backendUser);
        if (cancelled) return;

        const normalized = {
          id: backendUser._id || backendUser.id,
          name: backendUser.name,
          email: backendUser.email || '',
          role: backendUser.role,
          phone: backendUser.phone || '',
          city: backendUser.city || '',
          area: backendUser.area || '',
          avatar: null,
          createdAt: new Date(backendUser.createdAt || Date.now()).getTime(),
          suspended: false,
          deleted: false
        };

        setDb(prev => ({
          ...prev,
          ...hydrated,
          // Replace demo collections with the authenticated user's backend
          // view. Do not merge seeded users/jobs into live data.
          users: hydrated?.users?.length ? hydrated.users : [normalized],
          jobs: hydrated?.jobs || [],
          quotes: hydrated?.quotes || [],
          bookings: hydrated?.bookings || [],
          reviews: hydrated?.reviews || [],
          notifications: hydrated?.notifications || [],
          session: { client: null, worker: null, admin: null, [backendUser.role]: normalized.id, active: backendUser.role }
        }));
        setViewInternal(backendUser.role);
      } catch (error) {
        console.warn('Backend session could not be restored:', error.message);
        localStorage.removeItem('skillconnect_access_token');
        localStorage.removeItem('skillconnect_user');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Toast manager
  const toast = useCallback((msg, kind = 'info', ms = 3200, action = null) => {
    const id = uid('t');
    setToasts(prev => [...prev, { id, msg, kind, ms, action, out: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, out: true } : t)));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 320);
    }, ms);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Async Confirm Modal
  const ask = useCallback(opts => {
    return new Promise(resolve => {
      setConfirmDialog({
        title: opts.title || 'Are you sure?',
        text: opts.text || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        danger: opts.danger !== false,
        icon: opts.icon || 'fa-triangle-exclamation',
        resolve: val => {
          setConfirmDialog(null);
          resolve(val);
        }
      });
    });
  }, []);

  // Async Prompt Modal
  const askText = useCallback(opts => {
    return new Promise(resolve => {
      setPromptDialog({
        title: opts.title || 'Enter a value',
        text: opts.text || '',
        placeholder: opts.placeholder || '',
        value: opts.value || '',
        validate: opts.validate || null,
        resolve: val => {
          setPromptDialog(null);
          resolve(val);
        }
      });
    });
  }, []);

  // Chart Tip
  const showTip = useCallback((text, x, y) => {
    const clampedX = Math.min(x + 12, window.innerWidth - 180);
    const clampedY = y - 34;
    setChartTip({ visible: true, text, x: clampedX, y: clampedY });
  }, []);

  const hideTip = useCallback(() => {
    setChartTip({ visible: false, text: '', x: 0, y: 0 });
  }, []);

  // Notifications and Logging
  const notify = useCallback((userId, text, icon = 'fa-bell', act = null) => {
    if (!userId) return;
    setDb(prev => {
      if (!prev.users.some(u => u.id === userId)) return prev;
      const notifs = [
        { id: uid('n'), userId, text, icon, at: Date.now(), read: false, act },
        ...prev.notifications
      ].slice(0, 300);
      const nextDb = { ...prev, notifications: notifs };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });
  }, []);

  const logEvent = useCallback((kind, text, actorId = null) => {
    setDb(prev => {
      const logs = [
        { id: uid('l'), at: Date.now(), kind, text, actor: actorId },
        ...prev.logs
      ].slice(0, 400);
      const nextDb = { ...prev, logs };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });
  }, []);

  // Lookups
  const userById = useCallback(id => db.users.find(u => u.id === id) || null, [db.users]);
  const userSafe = useCallback(id => {
    const u = db.users.find(x => String(x.id) === String(id));
    if (u) return u;
    return { id, name: 'Removed user', role: 'client', deleted: true, city: '—', area: '—', avatar: null, phone: '' };
  }, [db.users]);

  const sessionUser = useCallback(role => {
    const id = db.session?.[role];
    return id ? userById(id) : null;
  }, [db.session, userById]);

  const refreshBackend = useCallback(async (role, userOverride = null) => {
    if (!BACKEND_ENABLED) return null;
    const user = userOverride || sessionUser(role);
    if (!user) return null;
    try {
      const hydrated = await hydrateBackend(role, user);
      if (hydrated) {
        setDb(prev => ({
          ...prev,
          ...hydrated,
          // Only replace a collection when the backend actually returned it.
          // A transient/unauthorized fetch must never turn real MongoDB data
          // already shown in the UI into an empty array.
          users: hydrated.users !== undefined ? hydrated.users : prev.users,
          jobs: hydrated.jobs !== undefined ? hydrated.jobs : prev.jobs,
          quotes: hydrated.quotes !== undefined ? hydrated.quotes : prev.quotes,
          bookings: hydrated.bookings !== undefined ? hydrated.bookings : prev.bookings,
          reviews: hydrated.reviews !== undefined ? hydrated.reviews : prev.reviews,
          notifications: hydrated.notifications !== undefined ? hydrated.notifications : prev.notifications,
          categories: prev.categories,
          cities: prev.cities,
          session: { client: null, worker: null, admin: null, [role]: user.id, active: role }
        }));
      }
      return hydrated;
    } catch (error) {
      console.warn('Backend sync failed:', error.message);
      return null;
    }
  }, [sessionUser]);

  // Load the client's jobs and quote/booking state on tab entry and in
  // response to Socket.IO events; there is no periodic polling loop.
  const refreshClientMyJobs = useCallback(async () => {
    if (!BACKEND_ENABLED || view !== 'client' || clientTab !== 'jobs') return null;
    const user = sessionUser('client');
    if (!user || !localStorage.getItem('skillconnect_access_token')) return null;

    try {
      const [myJobs, myBookings] = await Promise.all([
        jobsApi.mine().catch(() => null),
        bookingsApi.mine().catch(() => null)
      ]);

      const nextJobs = Array.isArray(myJobs) ? myJobs.map(normalizeJob).filter(Boolean) : null;
      const nextQuotes = Array.isArray(myBookings)
        ? myBookings.flatMap(b => (b.quotes || []).map(q => ({
            id: q._id || q.id,
            jobId: b.job?._id || b.job?.id || b.job,
            workerId: q.worker?._id || q.worker?.id || q.worker,
            price: Number(q.amount || 0),
            etaMin: Number.parseInt(q.eta, 10) || 30,
            note: q.message || '',
            status: q.status === 'ACCEPTED' ? 'Accepted' : q.status === 'REJECTED' ? 'Declined' : 'Pending',
            createdAt: new Date(q.createdAt || b.createdAt || Date.now()).getTime()
          })))
        : null;
      const nextBookings = Array.isArray(myBookings)
        ? myBookings.map(b => ({
            id: b._id || b.id,
            jobId: b.job?._id || b.job?.id || b.job,
            workerId: b.worker?._id || b.worker?.id || b.worker || null,
            clientId: b.client?._id || b.client?.id || b.client || user.id,
            price: Number(b.agreedAmount || 0),
            status: b.status,
            createdAt: new Date(b.createdAt || Date.now()).getTime()
          }))
        : null;

      if (nextJobs === null && nextBookings === null) return null;

      setDb(prev => {
        let jobs = nextJobs !== null ? nextJobs : prev.jobs;
        // MongoDB stores the agreed price on Booking, not Job. Reflect it on
        // the client's job card after a quote is accepted.
        if (nextBookings) {
          const amountByJob = new Map(nextBookings.map(b => [b.jobId, b.price]));
          jobs = jobs.map(j => amountByJob.has(j.id) ? { ...j, price: amountByJob.get(j.id) } : j);
        }
        return {
          ...prev,
          jobs,
          ...(nextQuotes !== null ? { quotes: nextQuotes } : {}),
          ...(nextBookings !== null ? { bookings: nextBookings } : {})
        };
      });
      return true;
    } catch (error) {
      console.warn('Client My Jobs refresh failed:', error.message);
      return null;
    }
  }, [view, clientTab, sessionUser]);

  // Client Find My Jobs: REST loads the initial state; Socket.IO handles live changes.
  useEffect(() => {
    if (!BACKEND_ENABLED || view !== 'client' || clientTab !== 'jobs') return undefined;
    refreshClientMyJobs().catch(() => {});
  }, [view, clientTab, refreshClientMyJobs]);

  // REST fetch for the Worker's Find Work feed; Socket.IO supplies later updates.
  const refreshWorkerAvailableJobs = useCallback(async () => {
    if (!BACKEND_ENABLED || view !== 'worker' || workerTab !== 'find') return null;
    const user = sessionUser('worker');
    if (!user || !localStorage.getItem('skillconnect_access_token')) return null;

    try {
      const available = await jobsApi.available();
      const incomingJobs = (available || []).map(normalizeJob).filter(Boolean);
      const incomingClients = (available || [])
        .filter(job => job.client && typeof job.client === 'object')
        .map(job => normalizeUser(job.client, { role: 'client', city: job.city, area: job.area }))
        .filter(Boolean);

      setDb(prev => {
        // Replace only the open/pending feed jobs. Keep assigned/completed jobs
        // and other worker state intact for Pipeline/Earnings/Profile.
        const nonFeedJobs = prev.jobs.filter(j => j.status !== 'Pending');
        const merged = [...nonFeedJobs, ...incomingJobs];
        const unique = [...new Map(merged.map(j => [j.id, j])).values()];
        const users = new Map(prev.users.map(user => [String(user.id), user]));
        incomingClients.forEach(client => {
          const existing = users.get(String(client.id));
          users.set(String(client.id), existing
            ? {
              ...existing,
              ...client,
              name: client.name || existing.name,
              email: client.email || existing.email,
              phone: existing.phone || client.phone,
              city: client.city || existing.city,
              area: client.area || existing.area,
              avatar: existing.avatar || client.avatar,
              online: existing.online
            }
            : client);
        });
        return { ...prev, jobs: unique, users: [...users.values()] };
      });

      return incomingJobs;
    } catch (error) {
      if (error?.response?.status === 401 || /jwt expired|token expired|unauthorized/i.test(error?.message || '')) {
        localStorage.removeItem('skillconnect_access_token');
        localStorage.removeItem('skillconnect_user');
        toast('Your session has expired. Please sign in again.', 'warn', 5000);
      } else {
        console.warn('Available jobs refresh failed:', error.message);
      }
      return null;
    }
  }, [view, workerTab, sessionUser, toast]);

  // Worker Find Available Jobs: REST loads existing jobs; Socket.IO supplies new ones.
  useEffect(() => {
    if (!BACKEND_ENABLED || view !== 'worker' || workerTab !== 'find') return undefined;
    refreshWorkerAvailableJobs().catch(() => {});
  }, [view, workerTab, refreshWorkerAvailableJobs]);

  // Keep the latest refresh callbacks without reconnecting the socket every
  // time backend hydration replaces arrays in React state.
  const realtimeActionsRef = useRef({});
  realtimeActionsRef.current = { refreshClientMyJobs, refreshWorkerAvailableJobs, refreshBackend };

  // Fetch a fresh directory snapshot when the client opens Find workers.
  useEffect(() => {
    if (!BACKEND_ENABLED || view !== 'client' || clientTab !== 'workers') return;
    realtimeActionsRef.current.refreshBackend?.('client').catch(() => {});
  }, [view, clientTab]);

  // Open only the real-time channels needed by the active role/module.
  useEffect(() => {
    if (!BACKEND_ENABLED) return undefined;
    const needsClientJobs = view === 'client' && clientTab === 'jobs';
    const needsClientDirectory = view === 'client' && clientTab === 'workers';
    const needsWorkerRealtime = view === 'worker' && ['find', 'tasks'].includes(workerTab);
    const needsAdminRealtime = view === 'admin';
    const needsWorkerPresence = needsClientDirectory || needsAdminRealtime;
    const needsNotifications = view === 'client' || view === 'worker';
    const needsChat = chatModal.open && !!backendChat.chatId;
    if (!needsClientJobs && !needsClientDirectory && !needsWorkerRealtime && !needsAdminRealtime && !needsNotifications && !needsChat) return undefined;

    const socket = connectRealtime();
    if (!socket) return undefined;

    const onClientJobsChanged = () => realtimeActionsRef.current.refreshClientMyJobs?.().catch(() => {});
    const onNewJob = () => realtimeActionsRef.current.refreshWorkerAvailableJobs?.().catch(() => {});
    const onWorkerBookingsChanged = () => realtimeActionsRef.current.refreshBackend?.('worker').catch(() => {});
    const onAdminRefresh = () => realtimeActionsRef.current.refreshBackend?.('admin').catch(() => {});
    const onWorkerAvailability = ({ workerId, availability }) => {
      setDb(prev => ({
        ...prev,
        users: prev.users.map(user => String(user.id) === String(workerId)
          ? { ...user, online: Boolean(availability) }
          : user)
      }));
    };
    const onNewNotification = raw => {
      if (!raw) return;
      const notification = {
        id: String(raw._id || raw.id || ''),
        userId: String(raw.user?._id || raw.user?.id || raw.user || ''),
        text: raw.message || raw.title || 'New notification',
        icon: raw.type === 'CHAT' ? 'fa-comment' : 'fa-bell',
        at: new Date(raw.createdAt || Date.now()).getTime(),
        read: Boolean(raw.read),
        data: raw.data || {}
      };
      if (!notification.id) return;
      setDb(prev => prev.notifications.some(item => String(item.id) === notification.id)
        ? prev
        : { ...prev, notifications: [notification, ...prev.notifications] });
    };
    const activeChatId = needsChat ? backendChat.chatId : null;
    const onChatMessage = message => {
      const messageChatId = message?.chat?._id || message?.chat;
      if (!activeChatId || String(messageChatId) !== String(activeChatId)) return;
      setBackendChat(prev => prev.chatId !== activeChatId || prev.messages.some(m => String(m._id || m.id) === String(message._id || message.id))
        ? prev
        : { ...prev, messages: [...prev.messages, message] });
    };
    const joinChat = () => {
      if (!activeChatId) return;
      socket.emit('chat:join', { chatId: activeChatId });
      chatsApi.messages(activeChatId).then(messages => {
        setBackendChat(prev => {
          if (prev.chatId !== activeChatId) return prev;
          const merged = [...(messages || []), ...prev.messages];
          return { ...prev, messages: [...new Map(merged.map(m => [String(m._id || m.id), m])).values()] };
        });
      }).catch(() => {});
    };
    const onChatError = error => toast(error?.message || 'Chat connection failed.', 'error');

    if (needsClientJobs) {
      socket.on('client:jobs:updated', onClientJobsChanged);
      socket.on('client:bookings:updated', onClientJobsChanged);
    }
    if (needsWorkerRealtime) {
      socket.on('jobs:new', onNewJob);
      socket.on('worker:bookings:updated', onWorkerBookingsChanged);
    }
    if (needsAdminRealtime) socket.on('admin:refresh', onAdminRefresh);
    if (needsWorkerPresence) socket.on('worker:availability', onWorkerAvailability);
    if (needsNotifications) socket.on('notification:new', onNewNotification);
    if (needsChat) {
      socket.on('chat:message', onChatMessage);
      socket.on('connect', joinChat);
      socket.on('chat:error', onChatError);
    }

    // Re-fetch after the authenticated connection/reconnection has joined its
    // server-derived rooms. This closes the initial-fetch/subscription race.
    const onConnected = () => {
      if (needsClientJobs) onClientJobsChanged();
      if (needsClientDirectory) realtimeActionsRef.current.refreshBackend?.('client').catch(() => {});
      if (view === 'worker' && workerTab === 'find') onNewJob();
      if (view === 'worker' && workerTab === 'tasks') onWorkerBookingsChanged();
      if (needsAdminRealtime) onAdminRefresh();
      if (needsChat) joinChat();
    };
    socket.on('connect', onConnected);
    if (socket.connected) onConnected();

    return () => {
      socket.off('client:jobs:updated', onClientJobsChanged);
      socket.off('client:bookings:updated', onClientJobsChanged);
      socket.off('jobs:new', onNewJob);
      socket.off('worker:bookings:updated', onWorkerBookingsChanged);
      socket.off('admin:refresh', onAdminRefresh);
      socket.off('worker:availability', onWorkerAvailability);
      socket.off('notification:new', onNewNotification);
      if (needsChat) {
        socket.off('chat:message', onChatMessage);
        socket.off('connect', joinChat);
        socket.off('chat:error', onChatError);
      }
      socket.off('connect', onConnected);
    };
  }, [view, clientTab, workerTab, chatModal.open, backendChat.chatId, toast]);

  // Keep the authenticated Socket.IO connection alive while switching tabs;
  // close it when the user returns to the landing/sign-in view.
  useEffect(() => {
    if (view === 'landing') {
      disconnectRealtime();
      return undefined;
    }
    return () => disconnectRealtime();
  }, [view]);

  const currentUser = useCallback(() => {
    if (view === 'landing') return null;
    return sessionUser(view);
  }, [view, sessionUser]);

  const jobById = useCallback(id => db.jobs.find(j => j.id === id) || null, [db.jobs]);
  const quoteById = useCallback(id => db.quotes.find(q => q.id === id) || null, [db.quotes]);
  const quotesFor = useCallback(jobId => db.quotes.filter(q => q.jobId === jobId), [db.quotes]);
  const openQuotesFor = useCallback(jobId => db.quotes.filter(q => q.jobId === jobId && q.status === 'Pending'), [db.quotes]);
  const reviewFor = useCallback(jobId => db.reviews.find(r => r.jobId === jobId) || null, [db.reviews]);
  const disputeFor = useCallback(jobId => db.disputes.find(d => d.jobId === jobId) || null, [db.disputes]);
  const msgsFor = useCallback(jobId => db.messages.filter(m => m.jobId === jobId).sort((a, b) => a.at - b.at), [db.messages]);

  // Derived calculations
  const workerStats = useCallback(workerId => {
    const done = db.jobs.filter(j => j.workerId === workerId && j.status === 'Completed');
    const paid = done.filter(j => j.confirmedAt);
    const revs = db.reviews.filter(r => r.workerId === workerId);
    const rating = revs.length ? revs.reduce((s, r) => s + r.stars, 0) / revs.length : 0;
    return {
      jobsDone: done.length,
      earned: paid.reduce((s, j) => s + (j.price || 0), 0),
      pending: done.filter(j => !j.confirmedAt).reduce((s, j) => s + (j.price || 0), 0),
      reviews: revs.length,
      rating,
      ratingLabel: revs.length ? rating.toFixed(1) : '—'
    };
  }, [db.jobs, db.reviews]);

  const clientStats = useCallback(clientId => {
    const jobs = db.jobs.filter(j => j.clientId === clientId);
    const done = jobs.filter(j => j.status === 'Completed');
    return {
      total: jobs.length,
      open: jobs.filter(j => j.status === 'Pending').length,
      active: jobs.filter(j => j.status === 'Assigned' || j.status === 'InProgress').length,
      completed: done.length,
      spent: done.filter(j => j.confirmedAt).reduce((s, j) => s + (j.price || 0), 0)
    };
  }, [db.jobs]);

  const unreadFor = useCallback(userId => {
    return db.notifications.filter(n => n.userId === userId && !n.read).length;
  }, [db.notifications]);

  const weeklyEarnings = useCallback(workerId => {
    const out = [];
    const today = startOfDay(Date.now());
    for (let i = 6; i >= 0; i--) {
      const day = today - i * DAY;
      const value = db.jobs
        .filter(j => j.workerId === workerId && j.confirmedAt && startOfDay(j.confirmedAt) === day)
        .reduce((s, j) => s + (j.price || 0), 0);
      out.push({
        label: new Date(day).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2),
        value,
        tip: `${new Date(day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${money(value)}`
      });
    }
    return out;
  }, [db.jobs]);

  // Auth Operations
  const openAuth = useCallback((role = 'client', mode = 'login') => {
    setAuthModal({ open: true, role, mode });
  }, []);

  const closeAuth = useCallback(() => {
    setAuthModal(prev => ({ ...prev, open: false }));
  }, []);

  const demoLogin = useCallback(userId => {
    const u = userById(userId);
    if (!u) return;
    const nextDb = {
      ...db,
      session: {
        ...db.session,
        [u.role]: u.id,
        active: u.role
      }
    };
    persistDB(nextDb);
    closeAuth();
    toast(`Signed in as ${u.name}.`, 'success');
    setView(u.role);
  }, [db, userById, persistDB, closeAuth, toast, setView]);

  const authRegister = useCallback((userData) => {
    const newUser = {
      id: uid('u'),
      role: userData.role,
      name: userData.name,
      phone: userData.phone,
      city: userData.city,
      area: userData.area,
      avatar: null,
      createdAt: Date.now(),
      suspended: false,
      ...(userData.role === 'worker' && {
        skills: userData.skills || [],
        bio: '',
        online: false,
        verification: db.settings.autoApprove ? 'approved' : 'pending'
      })
    };

    const nextDb = {
      ...db,
      users: [...db.users, newUser],
      session: {
        ...db.session,
        [newUser.role]: newUser.id,
        active: newUser.role
      }
    };

    persistDB(nextDb);
    logEvent('signup', `${newUser.role.toUpperCase()} account created: ${newUser.name} (${newUser.city}).`, newUser.id);

    if (newUser.role === 'worker' && newUser.verification === 'pending') {
      db.users.filter(u => u.role === 'admin').forEach(a => {
        notify(a.id, `${newUser.name} submitted worker verification.`, 'fa-user-check');
      });
    }

    closeAuth();
    toast(`Signed in as ${newUser.name}.`, 'success');
    setView(newUser.role);
  }, [db, persistDB, logEvent, notify, closeAuth, toast, setView]);

  const logout = useCallback(role => {
    const u = sessionUser(role);
    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      backendAuth.logout().catch(() => {}).finally(() => {
        const nextSession = { ...db.session, [role]: null };
        const other = ['client', 'worker', 'admin'].find(r => nextSession[r]);
        nextSession.active = other || null;
        const nextDb = { ...db, session: nextSession };
        persistDB(nextDb);
        toast(`${u ? u.name : 'You'} signed out.`, 'info');
        setView(other || 'landing');
      });
      return;
    }
    const nextSession = { ...db.session, [role]: null };
    const other = ['client', 'worker', 'admin'].find(r => nextSession[r]);
    nextSession.active = other || null;

    const nextDb = { ...db, session: nextSession };
    persistDB(nextDb);
    toast(`${u ? u.name : 'You'} signed out.`, 'info');
    setView(other || 'landing');
  }, [db, sessionUser, persistDB, toast, setView]);

  const uploadAvatar = useCallback((role, file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast('Choose an image file.', 'error');
      return;
    }
    const user = sessionUser(role);
    if (!user) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);

        setDb(prev => {
          const nextUsers = prev.users.map(u => (u.id === user.id ? { ...u, avatar: dataUrl } : u));
          const nextDb = { ...prev, users: nextUsers };
          try {
            localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
            toast('Photo updated.', 'success');
            return nextDb;
          } catch (e) {
            toast('Storage quota exceeded. Image not saved.', 'error');
            return prev;
          }
        });
      };
      img.onerror = () => toast('That image could not be read.', 'error');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, [sessionUser, toast]);

  const updateProfile = useCallback((role, updates) => {
    const user = sessionUser(role);
    if (!user) return false;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      const request = role === 'worker'
        ? workersApi.update(updates)
        : role === 'client'
          ? clientApi.update(updates)
          : Promise.resolve();
      return request
        .then(async () => {
          setDb(prev => ({
            ...prev,
            users: prev.users.map(existing => existing.id === user.id
              ? { ...existing, ...updates }
              : existing)
          }));
          await refreshBackend(role, user);
          toast('Profile updated.', 'success');
          return true;
        })
        .catch(error => {
          toast(error.message || 'Failed to update profile.', 'error');
          return false;
        });
    }

    setDb(prev => {
      const nextUsers = prev.users.map(u => (u.id === user.id ? { ...u, ...updates } : u));
      const nextDb = { ...prev, users: nextUsers };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        toast('Profile updated.', 'success');
        return nextDb;
      } catch (e) {
        toast('Failed to save profile changes.', 'error');
        return prev;
      }
    });
    return true;
  }, [sessionUser, toast]);

  const deleteAccount = useCallback(role => {
    const u = sessionUser(role);
    if (!u) return;

    ask({
      title: 'Delete your account?',
      confirmLabel: 'Delete permanently',
      text: 'This cannot be undone. Jobs you have already posted stay in the platform record as “Removed user”.'
    }).then(yes => {
      if (!yes) return;
      setDb(prev => {
        const nextUsers = prev.users.filter(x => x.id !== u.id);
        const nextNotifs = prev.notifications.filter(n => n.userId !== u.id);
        const nextQuotes = prev.quotes.map(q => (q.workerId === u.id && q.status === 'Pending' ? { ...q, status: 'Withdrawn' } : q));
        const nextJobs = prev.jobs.map(j => {
          if (j.clientId === u.id && j.status === 'Pending') {
            return {
              ...j,
              status: 'Cancelled',
              cancelledAt: Date.now(),
              cancelReason: 'Client account was deleted',
              timeline: [...j.timeline, { text: 'Job cancelled — client account deleted', at: Date.now() }]
            };
          }
          return j;
        });

        const nextSession = { ...prev.session, [role]: null };
        const other = ['client', 'worker', 'admin'].find(r => nextSession[r]);
        nextSession.active = other || null;

        const nextDb = {
          ...prev,
          users: nextUsers,
          notifications: nextNotifs,
          quotes: nextQuotes,
          jobs: nextJobs,
          session: nextSession
        };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      logEvent('admin', `${u.name} deleted their own account.`);
      toast('Your account has been deleted.', 'info');
      const other = ['client', 'worker', 'admin'].find(r => r !== role && db.session[r]);
      setView(other || 'landing');
    });
  }, [sessionUser, ask, logEvent, toast, setView, db.session]);

  // Job Actions
  const openPostJob = useCallback(cat => {
    const me = sessionUser('client');
    if (!me) {
      openAuth('client', 'signup');
      return;
    }
    setPostJobModal({ open: true, preselect: cat || null });
  }, [sessionUser, openAuth]);

  const closePostJob = useCallback(() => {
    setPostJobModal({ open: false, preselect: null });
  }, []);

  const submitJob = useCallback(async (jobPayload) => {
    const me = sessionUser('client');
    if (!me) {
      toast('Please sign in as a client before posting a job.', 'error');
      return false;
    }

    if (BACKEND_ENABLED) {
      const token = localStorage.getItem('skillconnect_access_token');
      if (!token) {
        toast('Your session has expired. Please sign in again.', 'error');
        return false;
      }

      try {
        const created = await jobsApi.create({
          title: jobPayload.title,
          description: jobPayload.desc,
          category: jobPayload.skill,
          budget: Number(jobPayload.budget || 0),
          city: jobPayload.city,
          area: jobPayload.area || '',
          address: jobPayload.address || '',
          preferredDate: jobPayload.preferredDate || null
        });

        // Immediately reflect the server-created job in the current UI.
        // A background refresh is attempted afterwards, but a failed refresh
        // must never make a successfully-created job disappear.
        const createdJob = normalizeJob(created);
        if (createdJob) {
          setDb(prev => ({
            ...prev,
            jobs: [createdJob, ...prev.jobs.filter(j => j.id !== createdJob.id)]
          }));
        }

        closePostJob();
        setClientTab('jobs');
        toast('Job posted successfully.', 'success');

        // Reconcile with MongoDB without blocking the successful UI action.
        refreshBackend('client', me).catch(() => {});
        return true;
      } catch (error) {
        toast(error.message || 'Could not post the job.', 'error');
        return false;
      }
    }

    const newJob = {
      id: 'JOB-' + (++db.seq.job),
      clientId: me.id,
      workerId: null,
      title: jobPayload.title,
      desc: jobPayload.desc,
      skill: jobPayload.skill,
      city: jobPayload.city,
      area: jobPayload.area,
      budget: jobPayload.budget,
      when: jobPayload.when || 'asap',
      urgent: !!jobPayload.urgent,
      sos: false,
      price: null,
      status: 'Pending',
      createdAt: Date.now(),
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      confirmedAt: null,
      cancelledAt: null,
      cancelReason: null,
      videoUrl: jobPayload.videoUrl || null,
      timeline: [{ text: 'Job posted', at: Date.now() }]
    };

    const matchedWorkers = db.users.filter(
      u => u.role === 'worker' && !u.suspended && u.city === newJob.city && (u.skills || []).includes(newJob.skill)
    );

    setDb(prev => {
      const nextDb = {
        ...prev,
        jobs: [...prev.jobs, newJob],
        seq: { ...prev.seq, job: prev.seq.job + 1 }
      };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    matchedWorkers.forEach(w => {
      notify(w.id, `New ${newJob.skill} job in ${newJob.city}: “${newJob.title}”.`, 'fa-bolt');
    });

    logEvent('job', `Job ${newJob.id} posted in ${newJob.city} (${newJob.skill}).`, me.id);
    closePostJob();

    toast(
      matchedWorkers.length
        ? `Job posted — ${matchedWorkers.length} matching worker${matchedWorkers.length === 1 ? '' : 's'} notified.`
        : `Job posted. No workers match that skill in ${newJob.city} yet.`,
      matchedWorkers.length ? 'success' : 'warn',
      4200
    );

    setClientTab('jobs');
  }, [db.seq.job, db.users, sessionUser, notify, logEvent, closePostJob, toast]);

  const sendSos = useCallback(() => {
    const me = sessionUser('client');
    if (!me) return;
    if (!db.settings.sosEnabled) {
      toast('Emergency SOS is currently disabled by the platform.', 'warn');
      return;
    }

    ask({
      title: 'Broadcast an emergency?',
      text: `Every available worker in ${me.city} will be alerted immediately, regardless of skill. Use this only for genuine emergencies.`,
      confirmLabel: 'Broadcast SOS',
      icon: 'fa-tower-broadcast'
    }).then(yes => {
      if (!yes) return;

      const newJob = {
        id: 'JOB-' + (++db.seq.job),
        clientId: me.id,
        workerId: null,
        title: 'EMERGENCY — immediate help needed',
        skill: 'Emergency',
        desc: `Emergency broadcast from ${me.name} at ${me.area}, ${me.city}. Contact the client directly and respond only if you can reach them now.`,
        city: me.city,
        area: me.area,
        budget: null,
        when: 'asap',
        urgent: true,
        sos: true,
        price: null,
        status: 'Pending',
        createdAt: Date.now(),
        assignedAt: null,
        startedAt: null,
        completedAt: null,
        confirmedAt: null,
        cancelledAt: null,
        cancelReason: null,
        videoUrl: null,
        timeline: [{ text: 'Emergency SOS broadcast', at: Date.now() }]
      };

      const reached = db.users.filter(u => u.role === 'worker' && !u.suspended && u.city === me.city && u.online);

      setDb(prev => {
        const nextDb = {
          ...prev,
          jobs: [...prev.jobs, newJob],
          seq: { ...prev.seq, job: prev.seq.job + 1 }
        };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      reached.forEach(w => {
        notify(w.id, `SOS — ${me.name} needs immediate help in ${me.area}.`, 'fa-tower-broadcast');
      });

      logEvent('sos', `Emergency SOS broadcast in ${me.city}.`, me.id);
      toast(
        reached.length
          ? `SOS sent to ${reached.length} worker${reached.length === 1 ? '' : 's'} online in ${me.city}.`
          : `SOS posted, but no workers are online in ${me.city} right now.`,
        reached.length ? 'success' : 'warn',
        5000
      );

      setClientTab('jobs');
    });
  }, [db.settings.sosEnabled, db.seq.job, db.users, sessionUser, ask, notify, logEvent, toast]);

  // Quotes
  const openQuoteModal = useCallback(jobId => {
    const me = sessionUser('worker');
    const job = jobById(jobId);
    if (!job || !me) return;
    if (db.settings.requireVerification && me.verification !== 'approved') {
      toast('Your account must be verified before you can send quotes.', 'warn', 4200);
      return;
    }
    if (!me.online) {
      toast('Go online before quoting — clients expect a response.', 'warn');
      return;
    }
    if (job.status !== 'Pending') {
      toast('This job is no longer open for quotes.', 'warn');
      return;
    }
    if (db.quotes.some(q => q.jobId === jobId && q.workerId === me.id && q.status === 'Pending')) {
      toast('You have already quoted on this job.', 'warn');
      return;
    }
    setQuoteModal({ open: true, jobId });
  }, [db.settings.requireVerification, db.quotes, sessionUser, jobById, toast]);

  const closeQuoteModal = useCallback(() => {
    setQuoteModal({ open: false, jobId: null });
  }, []);

  const submitQuote = useCallback((quoteData) => {
    const me = sessionUser('worker');
    const job = jobById(quoteData.jobId);
    if (!job || !me) return;

    if (BACKEND_ENABLED) {
      bookingsApi.quote(quoteData.jobId, {
        amount: Number(quoteData.price || 0),
        eta: String(quoteData.etaMin || 30),
        message: quoteData.note || ''
      }).then(async () => {
        await refreshBackend('worker', me);
        closeQuoteModal();
        toast('Quote sent. You will be notified if the client accepts.', 'success');
      }).catch(error => toast(
        !localStorage.getItem('skillconnect_access_token')
          ? 'Your session expired. Sign in again before sending a quote.'
          : (error.message || 'Could not send quote.'),
        'error'
      ));
      return;
    }

    if (job.status !== 'Pending') {
      closeQuoteModal();
      toast('This job was taken while you were quoting.', 'warn');
      return;
    }

    const newQuote = {
      id: uid('q'),
      jobId: job.id,
      workerId: me.id,
      price: quoteData.price,
      etaMin: quoteData.etaMin || 30,
      note: quoteData.note || '',
      status: 'Pending',
      createdAt: Date.now()
    };

    setDb(prev => {
      const nextJobs = prev.jobs.map(j => {
        if (j.id === job.id) {
          return {
            ...j,
            timeline: [...j.timeline, { text: `${me.name} sent a quote of ${money(newQuote.price)}`, at: Date.now() }]
          };
        }
        return j;
      });
      const nextDb = {
        ...prev,
        quotes: [...prev.quotes, newQuote],
        jobs: nextJobs
      };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    notify(job.clientId, `${me.name} quoted ${money(newQuote.price)} on “${job.title}”.`, 'fa-file-invoice-dollar');
    logEvent('quote', `${me.name} quoted ${money(newQuote.price)} on ${job.id}.`, me.id);
    closeQuoteModal();
    toast('Quote sent. You will be notified if the client accepts.', 'success');
  }, [sessionUser, jobById, closeQuoteModal, toast, notify, logEvent]);

  const withdrawQuote = useCallback(quoteId => {
    const q = quoteById(quoteId);
    if (!q || q.status !== 'Pending') return;

    ask({
      title: 'Withdraw this quote?',
      text: 'The client will no longer see your offer on this job.',
      confirmLabel: 'Withdraw'
    }).then(yes => {
      if (!yes) return;
      setDb(prev => {
        const nextQuotes = prev.quotes.map(x => (x.id === quoteId ? { ...x, status: 'Withdrawn' } : x));
        const nextJobs = prev.jobs.map(j => {
          if (j.id === q.jobId) {
            return {
              ...j,
              timeline: [...j.timeline, { text: `${userSafe(q.workerId).name} withdrew their quote`, at: Date.now() }]
            };
          }
          return j;
        });
        const nextDb = { ...prev, quotes: nextQuotes, jobs: nextJobs };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });
      toast('Quote withdrawn.', 'info');
    });
  }, [quoteById, ask, userSafe, toast]);

  const openOffers = useCallback(jobId => {
    setOffersModal({ open: true, jobId });
  }, []);

  const closeOffers = useCallback(() => {
    setOffersModal({ open: false, jobId: null });
  }, []);

  const acceptQuote = useCallback(quoteId => {
    const q = quoteById(quoteId);
    if (!q) return;
    const job = jobById(q.jobId);
    const worker = userSafe(q.workerId);
    if (!job || job.status !== 'Pending') {
      toast('This job is no longer open.', 'warn');
      return;
    }

    ask({
      title: `Accept ${worker.name}?`,
      danger: false,
      icon: 'fa-handshake',
      confirmLabel: `Accept ${money(q.price)}`,
      text: `The price locks at ${money(q.price)} and every other quote on this job is declined. You still confirm the work before any payment is released.`
    }).then(yes => {
      if (!yes) return;

      if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
        const booking = db.bookings?.find?.(b => b.jobId === job.id);
        const bookingId = booking?.id;
        if (!bookingId) {
          toast('This quote is not linked to a backend booking yet.', 'error');
          return;
        }
        bookingsApi.accept(bookingId, { workerId: q.workerId, quoteId: q.id })
          .then(async () => {
            await refreshBackend('client');
            closeOffers();
            toast(`${worker.name} is assigned.`, 'success');
          })
          .catch(error => toast(error.message || 'Could not accept quote.', 'error'));
        return;
      }

      setDb(prev => {
        const nextJobs = prev.jobs.map(j => {
          if (j.id === job.id) {
            return {
              ...j,
              workerId: q.workerId,
              price: q.price,
              status: 'Assigned',
              assignedAt: Date.now(),
              timeline: [...j.timeline, { text: `Quote from ${worker.name} accepted at ${money(q.price)}`, at: Date.now() }]
            };
          }
          return j;
        });

        const nextQuotes = prev.quotes.map(o => {
          if (o.jobId === job.id) {
            return o.id === q.id ? { ...o, status: 'Accepted' } : { ...o, status: 'Declined' };
          }
          return o;
        });

        const nextDb = { ...prev, jobs: nextJobs, quotes: nextQuotes };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      db.quotes.filter(o => o.jobId === job.id && o.id !== q.id && o.status === 'Pending').forEach(o => {
        notify(o.workerId, `Your quote on “${job.title}” was not selected.`, 'fa-circle-xmark');
      });

      notify(q.workerId, `Your ${money(q.price)} quote on “${job.title}” was accepted.`, 'fa-handshake');
      logEvent('job', `${job.id} assigned to ${worker.name} at ${money(q.price)}.`, job.clientId);
      closeOffers();
      toast(`${worker.name} is assigned. Message them to agree a time.`, 'success', 4200);
    });
  }, [quoteById, jobById, userSafe, ask, toast, db.quotes, db.bookings, notify, logEvent, closeOffers]);

  const declineQuote = useCallback(quoteId => {
    const q = quoteById(quoteId);
    if (!q || q.status !== 'Pending') return;
    const job = jobById(q.jobId);

    if (BACKEND_ENABLED) {
      const booking = db.bookings?.find?.(item => String(item.jobId) === String(q.jobId));
      if (!booking?.id) {
        toast('Could not find the backend booking for this quote. Refresh the page and try again.', 'error');
        return;
      }
      bookingsApi.reject(booking.id, { workerId: q.workerId, quoteId: q.id })
        .then(async () => {
          await refreshBackend('client');
          toast('Quote declined. The worker can send another quote.', 'info');
        })
        .catch(error => toast(error.message || 'Could not decline quote.', 'error'));
      return;
    }

    setDb(prev => {
      const nextQuotes = prev.quotes.map(o => (o.id === quoteId ? { ...o, status: 'Declined' } : o));
      const nextDb = { ...prev, quotes: nextQuotes };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    notify(q.workerId, `Your quote on “${job ? job.title : 'a job'}” was declined.`, 'fa-circle-xmark');
    toast('Quote declined.', 'info');
  }, [quoteById, jobById, db.bookings, refreshBackend, notify, toast]);

  // Stage Transitions
  const advanceJob = useCallback(jobId => {
    const job = jobById(jobId);
    const me = sessionUser('worker');
    if (!job || !me || job.workerId !== me.id) return;

    const next = NEXT_STATUS[job.status];
    if (!next) return;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      const target = next === 'InProgress' ? 'IN_PROGRESS' : 'COMPLETED';
      if (target === 'COMPLETED') {
        ask({
          title: 'Mark this job complete?',
          danger: false,
          icon: 'fa-circle-check',
          confirmLabel: 'Mark complete',
          text: `The client is asked to confirm the work. ${money(job.price)} moves to your payout balance once they do.`
        }).then(async yes => {
          if (!yes) return;
          try {
            const hydrated = await hydrateBackend('worker', me);
            const booking = hydrated?.bookings?.find?.(b => b.jobId === job.id);
            if (booking?.id) await bookingsApi.complete(booking.id);
            else await jobsApi.status(job.id, { status: target });
            await refreshBackend('worker', me);
            toast('Done. Waiting on the client to confirm.', 'success');
          } catch (error) {
            toast(error.message || 'Could not update the job.', 'error');
          }
        });
      } else {
        (async () => {
          try {
            const hydrated = await hydrateBackend('worker', me);
            const booking = hydrated?.bookings?.find?.(b => b.jobId === job.id);
            if (booking?.id) await bookingsApi.start(booking.id);
            else await jobsApi.status(job.id, { status: target });
            await refreshBackend('worker', me);
            toast('Marked as in progress.', 'success');
          } catch (error) {
            toast(error.message || 'Could not update the job.', 'error');
          }
        })();
      }
      return;
    }

    if (next === 'InProgress') {
      setDb(prev => {
        const nextJobs = prev.jobs.map(j => {
          if (j.id === jobId) {
            return {
              ...j,
              status: 'InProgress',
              startedAt: Date.now(),
              timeline: [...j.timeline, { text: 'Worker started the job', at: Date.now() }]
            };
          }
          return j;
        });
        const nextDb = { ...prev, jobs: nextJobs };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      notify(job.clientId, `${me.name} has started work on “${job.title}”.`, 'fa-person-digging');
      toast('Marked as in progress.', 'success');
      return;
    }

    ask({
      title: 'Mark this job complete?',
      danger: false,
      icon: 'fa-circle-check',
      confirmLabel: 'Mark complete',
      text: `The client is asked to confirm the work. ${money(job.price)} moves to your payout balance once they do.`
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextJobs = prev.jobs.map(j => {
          if (j.id === jobId) {
            return {
              ...j,
              status: 'Completed',
              completedAt: Date.now(),
              timeline: [...j.timeline, { text: 'Worker marked the job complete', at: Date.now() }]
            };
          }
          return j;
        });
        const nextDb = { ...prev, jobs: nextJobs };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      notify(job.clientId, `${me.name} marked “${job.title}” complete — confirm to release ${money(job.price)}.`, 'fa-circle-check');
      logEvent('job', `${job.id} completed by ${me.name}.`, me.id);
      toast('Done. Waiting on the client to confirm.', 'success');
    });
  }, [jobById, sessionUser, notify, toast, ask, logEvent]);

  const confirmDone = useCallback(jobId => {
    const job = jobById(jobId);
    if (!job || job.status !== 'Completed' || job.confirmedAt) return;
    const worker = userSafe(job.workerId);

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      ask({
        title: 'Confirm the work is done?',
        danger: false,
        icon: 'fa-handshake-angle',
        confirmLabel: `Confirm & release ${money(job.price)}`,
        text: `This confirms completion for ${worker.name}.`
      }).then(async yes => {
        if (!yes) return;
        try {
          const hydrated = await hydrateBackend('client', sessionUser('client'));
          const booking = hydrated?.bookings?.find?.(b => b.jobId === job.id);
          if (!booking?.id) throw new Error('No backend booking found for this job.');
          await bookingsApi.confirm(booking.id);
          await refreshBackend('client');
          closeRate();
          closeRate();
          toast('Payment released. Leave a rating to help other clients.', 'success', 4500);
          if (!reviewFor(job.id)) setTimeout(() => setRateModal({ open: true, jobId: job.id }), 500);
        } catch (error) {
          toast(error.message || 'Could not confirm completion.', 'error');
        }
      });
      return;
    }

    ask({
      title: 'Confirm the work is done?',
      danger: false,
      icon: 'fa-handshake-angle',
      confirmLabel: `Confirm & release ${money(job.price)}`,
      text: `This releases ${money(job.price)} to ${worker.name}. If something is wrong, report an issue instead.`
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextJobs = prev.jobs.map(j => {
          if (j.id === jobId) {
            return {
              ...j,
              confirmedAt: Date.now(),
              timeline: [...j.timeline, { text: `Client confirmed the work and released ${money(job.price)}`, at: Date.now() }]
            };
          }
          return j;
        });
        const nextDb = { ...prev, jobs: nextJobs };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      notify(job.workerId, `${userSafe(job.clientId).name} confirmed “${job.title}”. ${money(job.price)} added to your earnings.`, 'fa-sack-dollar');
      logEvent('payment', `${money(job.price)} released on ${job.id}.`, job.clientId);
      toast('Payment released. Leave a rating to help other clients.', 'success', 4500);

      if (!reviewFor(job.id)) {
        setTimeout(() => setRateModal({ open: true, jobId: job.id }), 500);
      }
    });
  }, [jobById, userSafe, ask, notify, logEvent, toast, reviewFor]);

  const cancelJob = useCallback(jobId => {
    const job = jobById(jobId);
    if (!job) return;
    const assigned = !!job.workerId;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      ask({
        title: 'Cancel this job?',
        confirmLabel: 'Cancel job',
        text: assigned ? `${userSafe(job.workerId).name} is already assigned.` : 'Any quotes will no longer be actionable.'
      }).then(async yes => {
        if (!yes) return;
        try {
          await jobsApi.cancel(jobId);
          await refreshBackend('client');
          setJobDrawer({ open: false, jobId: null });
          toast('Job cancelled.', 'info');
        } catch (error) {
          toast(error.message || 'Could not cancel the job.', 'error');
        }
      });
      return;
    }

    ask({
      title: 'Cancel this job?',
      confirmLabel: 'Cancel job',
      text: assigned
        ? `${userSafe(job.workerId).name} is already assigned and will be notified. Cancelling after work has started may affect your account standing.`
        : 'The job is removed from every worker’s feed. Any quotes you received are withdrawn.'
    }).then(yes => {
      if (!yes) return;

      askText({
        title: 'Why are you cancelling?',
        text: 'A short reason keeps the record clear for both sides.',
        placeholder: 'e.g. Fixed it myself',
        validate: v => (v.trim().length >= 3 ? '' : 'Give a reason of at least 3 characters.')
      }).then(reason => {
        if (reason === null) return;

        setDb(prev => {
          const nextJobs = prev.jobs.map(j => {
            if (j.id === jobId) {
              return {
                ...j,
                status: 'Cancelled',
                cancelledAt: Date.now(),
                cancelReason: reason.trim(),
                timeline: [...j.timeline, { text: `Job cancelled: ${reason.trim()}`, at: Date.now() }]
              };
            }
            return j;
          });

          const nextQuotes = prev.quotes.map(q => (q.jobId === jobId && q.status === 'Pending' ? { ...q, status: 'Declined' } : q));
          const nextDb = { ...prev, jobs: nextJobs, quotes: nextQuotes };
          try {
            localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
          } catch (e) {}
          return nextDb;
        });

        if (job.workerId) {
          notify(job.workerId, `“${job.title}” was cancelled by the client: ${reason.trim()}`, 'fa-ban');
        }
        logEvent('job', `${job.id} cancelled.`, job.clientId);
        setJobDrawer({ open: false, jobId: null });
        toast('Job cancelled.', 'info');
      });
    });
  }, [jobById, ask, userSafe, askText, notify, logEvent, toast]);

  // Chat
  const openChat = useCallback((jobId, withId = null) => {
    setChatModal({ open: true, jobId, withId });
  }, []);

  const chatBookingId = (db.bookings || []).find(b => b.jobId === chatModal.jobId && (!chatModal.withId || String(b.workerId) === String(chatModal.withId)))?.id;

  useEffect(() => {
    if (!BACKEND_ENABLED || !chatModal.open || !chatModal.jobId) return undefined;
    let cancelled = false;
    setBackendChat({ chatId: null, messages: [], participants: [], loading: true, error: '' });
    (async () => {
      try {
        if (!chatBookingId) throw new Error('Chat is available after a worker accepts the job.');
        const chat = await chatsApi.create(chatBookingId);
        const chatId = chat?._id || chat?.id;
        if (!chatId) throw new Error('Could not open this chat.');
        const messages = await chatsApi.messages(chatId);
        if (cancelled) return;
        const participants = [
          chat.client && { user: chat.client, role: 'client' },
          chat.worker && { user: chat.worker, role: 'worker' }
        ].filter(Boolean).map(({ user, role }) => ({
          id: user._id || user.id,
          name: user.name || 'User',
          email: user.email || '',
          role
        }));
        setDb(prev => {
          const byId = new Map(prev.users.map(user => [String(user.id), user]));
          participants.forEach(participant => {
            if (!participant.id) return;
            byId.set(String(participant.id), {
              ...byId.get(String(participant.id)),
              ...participant,
              deleted: false
            });
          });
          return { ...prev, users: [...byId.values()] };
        });
        setBackendChat({ chatId, messages: messages || [], participants, loading: false, error: '' });
        chatsApi.read(chatId).catch(() => {});
      } catch (error) {
        if (!cancelled) setBackendChat({ chatId: null, messages: [], participants: [], loading: false, error: error.message || 'Could not load chat.' });
      }
    })();
    return () => { cancelled = true; };
  }, [chatModal.open, chatModal.jobId, chatModal.withId, chatBookingId]);

  const closeChat = useCallback(() => {
    setChatModal({ open: false, jobId: null, withId: null });
  }, []);

  const sendChat = useCallback((jobId, text) => {
    const job = jobById(jobId);
    const me = currentUser();
    if (!job || !me || !text.trim()) return;

    if (BACKEND_ENABLED) {
      if (!backendChat.chatId) {
        toast(backendChat.error || 'Chat is not ready yet.', 'warn');
        return;
      }
      chatsApi.send(backendChat.chatId, text.trim()).then(message => {
        setBackendChat(prev => prev.messages.some(m => String(m._id || m.id) === String(message._id || message.id))
          ? prev
          : { ...prev, messages: [...prev.messages, message] });
      }).catch(error => toast(error.message || 'Message could not be sent.', 'error'));
      return;
    }

    const newMsg = {
      id: uid('m'),
      jobId,
      fromId: me.id,
      text: text.trim(),
      at: Date.now()
    };

    setDb(prev => {
      const nextDb = { ...prev, messages: [...prev.messages, newMsg] };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    const otherId = me.id === job.clientId ? job.workerId : job.clientId;
    if (otherId) {
      notify(otherId, `${me.name} messaged you about “${job.title}”.`, 'fa-comment');
    }
  }, [jobById, currentUser, notify, backendChat, toast]);

  // Ratings
  const openRate = useCallback(jobId => {
    const job = jobById(jobId);
    if (!job || !job.workerId) return;
    if (reviewFor(jobId)) {
      toast('You have already rated this job.', 'info');
      return;
    }
    if (job.status !== 'Completed') {
      toast('You can rate once the job is complete.', 'warn');
      return;
    }
    setRateModal({ open: true, jobId });
  }, [jobById, reviewFor, toast]);

  const closeRate = useCallback(() => {
    setRateModal({ open: false, jobId: null });
  }, []);

  const submitRating = useCallback((jobId, stars, text) => {
    const job = jobById(jobId);
    if (!job) return;
    if (reviewFor(job.id)) {
      closeRate();
      toast('This job was already rated.', 'info');
      return;
    }

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      reviewsApi.create({ job: job.id, rating: stars, comment: text.trim() })
        .then(async () => {
          await refreshBackend('client');
          closeRate();
          toast('Thanks — your rating is live.', 'success');
        })
        .catch(error => toast(error.message || 'Could not submit rating.', 'error'));
      return;
    }

    const newRev = {
      id: uid('r'),
      jobId: job.id,
      workerId: job.workerId,
      clientId: job.clientId,
      stars,
      text: text.trim(),
      at: Date.now()
    };

    setDb(prev => {
      const nextJobs = prev.jobs.map(j => {
        if (j.id === job.id) {
          return {
            ...j,
            timeline: [...j.timeline, { text: `Client left a ${stars}-star review`, at: Date.now() }]
          };
        }
        return j;
      });
      const nextDb = {
        ...prev,
        reviews: [...prev.reviews, newRev],
        jobs: nextJobs
      };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    notify(job.workerId, `${userSafe(job.clientId).name} rated you ${stars} stars on “${job.title}”.`, 'fa-star');
    logEvent('review', `${stars}-star review left on ${job.id}.`, job.clientId);
    closeRate();
    toast('Thanks — your rating is live.', 'success');
  }, [jobById, reviewFor, closeRate, toast, userSafe, notify, logEvent]);

  // Disputes
  const openDispute = useCallback(jobId => {
    const job = jobById(jobId);
    if (!job) return;
    const existing = disputeFor(jobId);
    if (existing && existing.status === 'Open') {
      toast('A dispute on this job is already open with the platform.', 'info');
      return;
    }
    setDisputeModal({ open: true, jobId });
  }, [jobById, disputeFor, toast]);

  const closeDispute = useCallback(() => {
    setDisputeModal({ open: false, jobId: null });
  }, []);

  const submitDispute = useCallback(async (jobId, category, text) => {
    const job = jobById(jobId);
    const me = currentUser();
    if (!job || !me) return;

    if (BACKEND_ENABLED) {
      try {
        const saved = await disputesApi.create({ job: job.id, category, description: text.trim() });
        const dispute = normalizeDispute(saved);
        setDb(prev => ({
          ...prev,
          disputes: [dispute, ...prev.disputes.filter(item => String(item.id) !== String(dispute.id))]
        }));
        closeDispute();
        toast('Reported. An admin will review the full job history.', 'success', 4200);
      } catch (error) {
        toast(error.message || 'Could not submit the dispute.', 'error');
      }
      return;
    }

    const newDispute = {
      id: uid('d'),
      jobId: job.id,
      byId: me.id,
      byRole: me.role,
      category,
      text: text.trim(),
      status: 'Open',
      at: Date.now(),
      resolution: null,
      resolvedAt: null
    };

    setDb(prev => {
      const nextJobs = prev.jobs.map(j => {
        if (j.id === job.id) {
          return {
            ...j,
            timeline: [...j.timeline, { text: `${me.name} raised a dispute`, at: Date.now() }]
          };
        }
        return j;
      });
      const nextDb = {
        ...prev,
        disputes: [newDispute, ...prev.disputes],
        jobs: nextJobs
      };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    db.users.filter(u => u.role === 'admin').forEach(a => {
      notify(a.id, `New dispute raised on ${job.id} by ${me.name}.`, 'fa-scale-balanced');
    });

    const otherId = me.id === job.clientId ? job.workerId : job.clientId;
    if (otherId) {
      notify(otherId, `A dispute was raised on “${job.title}”. An admin will review it.`, 'fa-scale-balanced');
    }

    logEvent('dispute', `Dispute opened on ${job.id} by ${me.name}.`, me.id);
    closeDispute();
    toast('Reported. An admin will review the full job history.', 'success', 4200);
  }, [jobById, currentUser, db.users, notify, logEvent, closeDispute, toast]);

  // Worker Skills & Online state
  const toggleOnline = useCallback((on) => {
    const me = sessionUser('worker');
    if (!me) return;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      workersApi.update({ availability: !!on })
        .then(async () => {
          await refreshBackend('worker', me);
          toast(on ? 'You are online — clients can see you and you can quote.' : 'You are offline.', on ? 'success' : 'info');
        })
        .catch(error => toast(error.message || 'Could not update availability.', 'error'));
      return;
    }

    setDb(prev => {
      const nextUsers = prev.users.map(u => (u.id === me.id ? { ...u, online: on } : u));
      const nextDb = { ...prev, users: nextUsers };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    toast(
      on
        ? 'You are online — clients can see you and you can quote.'
        : 'You are offline. Jobs stay visible but quoting is paused.',
      on ? 'success' : 'info'
    );
  }, [sessionUser, toast]);

  const addWorkerSkill = useCallback(skill => {
    const me = sessionUser('worker');
    if (!me || (me.skills || []).includes(skill)) return;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      workersApi.update({ skills: [...(me.skills || []), skill] })
        .then(async () => {
          await refreshBackend('worker', me);
          toast(`${skill} added — matching jobs now appear in your feed.`, 'success');
        })
        .catch(error => toast(error.message || 'Could not update skills.', 'error'));
      return;
    }

    setDb(prev => {
      const nextUsers = prev.users.map(u => (u.id === me.id ? { ...u, skills: [...(u.skills || []), skill] } : u));
      const nextDb = { ...prev, users: nextUsers };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    toast(`${skill} added — matching jobs now appear in your feed.`, 'success');
  }, [sessionUser, toast]);

  const removeWorkerSkill = useCallback(skill => {
    const me = sessionUser('worker');
    if (!me) return;
    if ((me.skills || []).length <= 1) {
      toast('Keep at least one skill so clients can find you.', 'warn');
      return;
    }

    ask({
      title: `Remove ${skill}?`,
      text: 'Jobs in this category will disappear from your feed. Any quotes you already sent stay live.',
      confirmLabel: 'Remove skill'
    }).then(yes => {
      if (!yes) return;

      if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
        workersApi.update({ skills: (me.skills || []).filter(s => s !== skill) })
          .then(async () => {
            await refreshBackend('worker', me);
            toast(`${skill} removed.`, 'info');
          })
          .catch(error => toast(error.message || 'Could not update skills.', 'error'));
        return;
      }

      setDb(prev => {
        const nextUsers = prev.users.map(u => (u.id === me.id ? { ...u, skills: (u.skills || []).filter(s => s !== skill) } : u));
        const nextDb = { ...prev, users: nextUsers };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      toast(`${skill} removed.`, 'info');
    });
  }, [sessionUser, toast, ask]);

  // Admin Actions
  const adminVerify = useCallback((workerId, decision) => {
    const u = userById(workerId);
    const me = sessionUser('admin');
    if (!u || !me) return;

    const applyDecision = (note = '') => {
      if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
        import('../services/domain').then(({ admin }) =>
          admin.verify(workerId, { verification: decision })
        ).then(async () => {
          await refreshBackend('admin', me);
          toast(`Worker verification ${decision}.`, 'success');
        }).catch(error => toast(error.message || 'Could not update verification.', 'error'));
        return;
      }

      setDb(prev => {
        const nextUsers = prev.users.map(x => (x.id === workerId ? { ...x, verification: decision } : x));
        const nextDb = { ...prev, users: nextUsers };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      notify(
        u.id,
        decision === 'approved'
          ? 'Your account is verified — you can now send quotes.'
          : decision === 'rejected'
          ? `Verification was rejected: ${note}`
          : 'Your verification has been reopened for review.',
        decision === 'approved' ? 'fa-circle-check' : 'fa-circle-xmark'
      );

      logEvent('verification', `${u.name} ${decision}${note ? ' — ' + note : ''}.`, me.id);
      toast(`${u.name} ${decision}.`, decision === 'approved' ? 'success' : 'info');
    };

    if (decision === 'rejected') {
      askText({
        title: `Reject ${u.name}?`,
        text: 'The reason is sent to the worker so they can fix it.',
        placeholder: 'e.g. ID document was unreadable',
        validate: v => (v.trim().length >= 5 ? '' : 'Give a reason of at least 5 characters.')
      }).then(note => {
        if (note !== null) applyDecision(note.trim());
      });
    } else {
      applyDecision('');
    }
  }, [userById, sessionUser, notify, logEvent, toast, askText]);

  const adminResolveDispute = useCallback(disputeId => {
    const d = db.disputes.find(x => x.id === disputeId);
    const me = sessionUser('admin');
    if (!d || d.status !== 'Open' || !me) return;

    askText({
      title: 'Record your ruling',
      text: 'Both parties are notified with exactly this text.',
      placeholder: 'e.g. Worker agreed to return and redo the grouting at no charge.',
      validate: v => (v.trim().length >= 10 ? '' : 'Write at least 10 characters so both sides understand the outcome.')
    }).then(async text => {
      if (text === null) return;

      if (BACKEND_ENABLED) {
        try {
          const saved = await disputesApi.resolve(disputeId, { resolution: text.trim() });
          const updated = normalizeDispute(saved);
          setDb(prev => ({
            ...prev,
            disputes: prev.disputes.map(item => String(item.id) === String(disputeId) ? updated : item)
          }));
          toast('Ruling recorded and both parties notified.', 'success');
        } catch (error) {
          toast(error.message || 'Could not resolve the dispute.', 'error');
        }
        return;
      }

      setDb(prev => {
        const nextDisputes = prev.disputes.map(x =>
          x.id === disputeId ? { ...x, status: 'Resolved', resolution: text.trim(), resolvedAt: Date.now() } : x
        );
        const nextJobs = prev.jobs.map(j =>
          j.id === d.jobId ? { ...j, timeline: [...j.timeline, { text: 'Dispute resolved by an admin', at: Date.now() }] } : j
        );
        const nextDb = { ...prev, disputes: nextDisputes, jobs: nextJobs };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      const job = jobById(d.jobId);
      if (job) {
        [job.clientId, job.workerId].filter(Boolean).forEach(uid2 => {
          notify(uid2, `Your dispute on “${job.title}” was resolved: ${text.trim()}`, 'fa-gavel');
        });
      }

      logEvent('dispute', `Dispute on ${d.jobId} resolved.`, me.id);
      toast('Ruling recorded and both parties notified.', 'success');
    });
  }, [db.disputes, sessionUser, askText, jobById, notify, logEvent, toast]);

  const adminCancelJob = useCallback(jobId => {
    const job = jobById(jobId);
    const me = sessionUser('admin');
    if (!job || !me) return;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      ask({
        title: `Force-cancel ${job.id}?`,
        confirmLabel: 'Force-cancel',
        text: 'Both parties will see the cancellation on the backend.'
      }).then(async yes => {
        if (!yes) return;
        try {
          const { admin } = await import('../services/domain');
          await admin.cancelJob(jobId, { reason: 'Cancelled by platform administration' });
          await refreshBackend('admin', me);
          toast('Job cancelled.', 'info');
        } catch (error) {
          toast(error.message || 'Could not cancel job.', 'error');
        }
      });
      return;
    }

    ask({
      title: `Force-cancel ${job.id}?`,
      confirmLabel: 'Force-cancel',
      text: 'Both the client and the worker are notified. Use this only when a job is stuck or fraudulent.'
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextJobs = prev.jobs.map(j => {
          if (j.id === jobId) {
            return {
              ...j,
              status: 'Cancelled',
              cancelledAt: Date.now(),
              cancelReason: 'Cancelled by platform administration',
              timeline: [...j.timeline, { text: 'Cancelled by platform administration', at: Date.now() }]
            };
          }
          return j;
        });
        const nextQuotes = prev.quotes.map(q => (q.jobId === jobId && q.status === 'Pending' ? { ...q, status: 'Declined' } : q));
        const nextDb = { ...prev, jobs: nextJobs, quotes: nextQuotes };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      [job.clientId, job.workerId].filter(Boolean).forEach(uid2 => {
        notify(uid2, `“${job.title}” was cancelled by platform administration.`, 'fa-ban');
      });

      logEvent('admin', `${job.id} force-cancelled.`, me.id);
      setJobDrawer({ open: false, jobId: null });
      toast('Job cancelled.', 'info');
    });
  }, [jobById, sessionUser, ask, notify, logEvent, toast]);

  const adminSuspend = useCallback(userId => {
    const u = userById(userId);
    const me = sessionUser('admin');
    if (!u || u.id === me.id) return;
    const suspending = !u.suspended;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      ask({
        title: `${suspending ? 'Suspend ' : 'Reinstate '} ${u.name}?`,
        danger: suspending,
        confirmLabel: suspending ? 'Suspend' : 'Reinstate',
        text: suspending ? 'Block this user on the backend.' : 'Restore this user on the backend.'
      }).then(async yes => {
        if (!yes) return;
        try {
          const { admin } = await import('../services/domain');
          await admin.suspend(userId, { suspended: suspending });
          await refreshBackend('admin', me);
          toast(suspending ? 'User suspended.' : 'User reinstated.', 'success');
        } catch (error) {
          toast(error.message || 'Could not update user status.', 'error');
        }
      });
      return;
    }

    ask({
      title: `${suspending ? 'Suspend ' : 'Reinstate '} ${u.name}?`,
      danger: suspending,
      confirmLabel: suspending ? 'Suspend' : 'Reinstate',
      text: suspending
        ? 'They are signed out immediately, hidden from search and cannot post jobs or quote. Existing jobs are untouched.'
        : 'Full access is restored right away.'
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextUsers = prev.users.map(x => (x.id === userId ? { ...x, suspended: suspending, online: suspending ? false : x.online } : x));
        const nextSession = {
          ...prev.session,
          ...(suspending && prev.session[u.role] === u.id ? { [u.role]: null } : {})
        };
        const nextDb = { ...prev, users: nextUsers, session: nextSession };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      notify(
        u.id,
        suspending ? 'Your account has been suspended by platform administration.' : 'Your account has been reinstated.',
        suspending ? 'fa-ban' : 'fa-circle-check'
      );

      logEvent('admin', `${u.name} ${suspending ? 'suspended' : 'reinstated'}.`, me.id);
      toast(`${u.name} ${suspending ? 'suspended' : 'reinstated'}.`, suspending ? 'warn' : 'success');
    });
  }, [userById, sessionUser, ask, notify, logEvent, toast]);

  const adminDeleteUser = useCallback(userId => {
    const u = userById(userId);
    const me = sessionUser('admin');
    if (!u || u.id === me.id) return;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      ask({
        title: `Delete ${u.name}?`,
        confirmLabel: 'Delete user',
        text: 'This permanently removes the user from the backend.'
      }).then(async yes => {
        if (!yes) return;
        try {
          const { admin } = await import('../services/domain');
          await admin.removeUser(userId);
          await refreshBackend('admin');
          toast(`${u.name} deleted.`, 'info');
        } catch (error) {
          toast(error.message || 'Could not delete user.', 'error');
        }
      });
      return;
    }

    ask({
      title: `Delete ${u.name}?`,
      confirmLabel: 'Delete account',
      text: 'The profile is removed permanently. Existing job history stays in the platform record, attributed to “Removed user”.'
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextUsers = prev.users.filter(x => x.id !== userId);
        const nextNotifs = prev.notifications.filter(n => n.userId !== userId);
        const nextQuotes = prev.quotes.map(q => (q.workerId === userId && q.status === 'Pending' ? { ...q, status: 'Withdrawn' } : q));
        const nextJobs = prev.jobs.map(j => {
          if (j.clientId === userId && j.status === 'Pending') {
            return {
              ...j,
              status: 'Cancelled',
              cancelledAt: Date.now(),
              cancelReason: 'Client account was deleted',
              timeline: [...j.timeline, { text: 'Job cancelled — client account deleted', at: Date.now() }]
            };
          }
          return j;
        });
        const nextSession = {
          ...prev.session,
          ...(prev.session[u.role] === u.id ? { [u.role]: null } : {})
        };
        const nextDb = {
          ...prev,
          users: nextUsers,
          notifications: nextNotifs,
          quotes: nextQuotes,
          jobs: nextJobs,
          session: nextSession
        };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      logEvent('admin', `${u.name} deleted by an administrator.`, me.id);
      toast(`${u.name} deleted.`, 'info');
    });
  }, [userById, sessionUser, ask, logEvent, toast]);

  const adminRemoveReview = useCallback(reviewId => {
    const r = db.reviews.find(x => x.id === reviewId);
    const me = sessionUser('admin');
    if (!r || !me) return;

    if (BACKEND_ENABLED && localStorage.getItem('skillconnect_access_token')) {
      ask({
        title: 'Remove this review?',
        confirmLabel: 'Remove review',
        text: 'Remove this review from the backend.'
      }).then(async yes => {
        if (!yes) return;
        try {
          const { admin } = await import('../services/domain');
          await admin.removeReview(reviewId);
          await refreshBackend('admin');
          toast('Review removed.', 'info');
        } catch (error) {
          toast(error.message || 'Could not remove review.', 'error');
        }
      });
      return;
    }

    ask({
      title: 'Remove this review?', 
      confirmLabel: 'Remove review',
      text: `${userSafe(r.workerId).name}'s average is recalculated, and the client can leave a fresh rating on that job.`
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextReviews = prev.reviews.filter(x => x.id !== reviewId);
        const nextJobs = prev.jobs.map(j =>
          j.id === r.jobId ? { ...j, timeline: [...j.timeline, { text: 'Review removed by an administrator', at: Date.now() }] } : j
        );
        const nextDb = { ...prev, reviews: nextReviews, jobs: nextJobs };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      notify(r.workerId, 'A review on your profile was removed by platform administration.', 'fa-shield-halved');
      notify(r.clientId, 'Your review was removed by an admin. You can rate that job again.', 'fa-star');
      logEvent('admin', `Review on ${r.jobId} removed.`, me.id);
      toast('Review removed.', 'info');
    });
  }, [db.reviews, sessionUser, ask, userSafe, notify, logEvent, toast]);

  const adminAddCategory = useCallback(name => {
    if (!name || name.trim().length < 3) {
      toast('Category name must be at least 3 characters.', 'error');
      return;
    }
    const trimmed = name.trim();
    if (db.categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast('That category already exists.', 'warn');
      return;
    }

    setDb(prev => {
      const nextDb = { ...prev, categories: [...prev.categories, trimmed] };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    logEvent('admin', `Category “${trimmed}” added.`, sessionUser('admin')?.id);
    toast(`${trimmed} added.`, 'success');
  }, [db.categories, logEvent, sessionUser, toast]);

  const adminRemoveCategory = useCallback(name => {
    if (db.categories.length <= 1) {
      toast('Keep at least one service category.', 'warn');
      return;
    }
    const inUse = db.jobs.filter(j => j.skill === name && ['Pending', 'Assigned', 'InProgress'].includes(j.status)).length;
    const workers = db.users.filter(u => u.role === 'worker' && (u.skills || []).includes(name)).length;

    ask({
      title: `Remove ${name}?`,
      confirmLabel: 'Remove category',
      text: `${inUse ? `${inUse} live job(s) still use it and ` : ''}${workers} worker(s) list it as a skill. Existing jobs keep the label; the category just stops being offered to new posts.`
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextCategories = prev.categories.filter(c => c !== name);
        const nextDb = { ...prev, categories: nextCategories };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      logEvent('admin', `Category “${name}” removed.`, sessionUser('admin')?.id);
      toast(`${name} removed.`, 'info');
    });
  }, [db.categories, db.jobs, db.users, ask, logEvent, sessionUser, toast]);

  const adminAddCity = useCallback(name => {
    if (!name || name.trim().length < 3) {
      toast('City name must be at least 3 characters.', 'error');
      return;
    }
    const trimmed = name.trim();
    if (db.cities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast('That city is already served.', 'warn');
      return;
    }

    setDb(prev => {
      const nextDb = { ...prev, cities: [...prev.cities, trimmed] };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    logEvent('admin', `City “${trimmed}” added.`, sessionUser('admin')?.id);
    toast(`${trimmed} added.`, 'success');
  }, [db.cities, logEvent, sessionUser, toast]);

  const adminRemoveCity = useCallback(name => {
    if (db.cities.length <= 1) {
      toast('Keep at least one city.', 'warn');
      return;
    }
    const usersCount = db.users.filter(u => u.city === name).length;

    ask({
      title: `Stop serving ${name}?`,
      confirmLabel: 'Remove city',
      text: `${usersCount} account(s) currently sit in ${name}. They keep working, but nobody new can pick this city.`
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextCities = prev.cities.filter(c => c !== name);
        const nextDb = { ...prev, cities: nextCities };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      logEvent('admin', `City “${name}” removed.`, sessionUser('admin')?.id);
      toast(`${name} removed.`, 'info');
    });
  }, [db.cities, db.users, ask, logEvent, sessionUser, toast]);

  const adminSetting = useCallback((key, value) => {
    setDb(prev => {
      const nextSettings = { ...prev.settings, [key]: value };
      const nextDb = { ...prev, settings: nextSettings };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });

    logEvent('admin', `Setting “${key}” set to ${value}.`, sessionUser('admin')?.id);
    toast('Setting saved.', 'success', 1800);
  }, [logEvent, sessionUser, toast]);

  const adminClearLogs = useCallback(() => {
    ask({
      title: 'Clear the activity log?',
      confirmLabel: 'Clear log',
      text: 'Every entry is deleted. Jobs, users and disputes are untouched.'
    }).then(yes => {
      if (!yes) return;

      setDb(prev => {
        const nextDb = { ...prev, logs: [] };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
        } catch (e) {}
        return nextDb;
      });

      logEvent('admin', 'Activity log cleared.', sessionUser('admin')?.id);
      toast('Log cleared.', 'info');
    });
  }, [ask, logEvent, sessionUser, toast]);

  // Demo Reseed & Wipe
  const reseedDemo = useCallback(() => {
    ask({
      title: 'Reseed demo data?',
      confirmLabel: 'Reseed',
      danger: false,
      icon: 'fa-rotate',
      text: 'Current data is replaced with the original sample cities, workers, jobs and reviews.'
    }).then(yes => {
      if (!yes) return;
      const seeded = seedDB();
      persistDB(seeded);
      toast('Demo data restored.', 'success');
      setView('landing');
    });
  }, [ask, persistDB, toast, setView]);

  const wipeDemo = useCallback(() => {
    ask({
      title: 'Wipe all demo data?',
      confirmLabel: 'Wipe and reload',
      text: 'Everything stored in this browser is deleted and the app restarts with a blank platform.'
    }).then(yes => {
      if (!yes) return;
      try {
        localStorage.removeItem(STORE_KEY);
      } catch (e) {}
      window.location.reload();
    });
  }, [ask]);

  // Notifications Popover & Mark all read
  const toggleNotifs = useCallback(role => {
    setNotifOpenRole(prev => (prev === role ? null : role));
  }, []);

  const markAllRead = useCallback(role => {
    const me = sessionUser(role);
    if (!me) return;

    setDb(prev => {
      const nextNotifs = prev.notifications.map(n => (n.userId === me.id ? { ...n, read: true } : n));
      const nextDb = { ...prev, notifications: nextNotifs };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });
  }, [sessionUser]);

  const openNotif = useCallback(notifId => {
    setDb(prev => {
      const nextNotifs = prev.notifications.map(n => (n.id === notifId ? { ...n, read: true } : n));
      const nextDb = { ...prev, notifications: nextNotifs };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(nextDb));
      } catch (e) {}
      return nextDb;
    });
  }, []);

  const value = {
    db,
    view,
    setView,
    clientTab,
    setClientTab,
    workerTab,
    setWorkerTab,
    adminPage,
    setAdminPage,
    toasts,
    toast,
    dismissToast,
    confirmDialog,
    promptDialog,
    chartTip,
    showTip,
    hideTip,
    ask,
    askText,
    userById,
    userSafe,
    sessionUser,
    currentUser,
    jobById,
    quoteById,
    quotesFor,
    openQuotesFor,
    reviewFor,
    disputeFor,
    msgsFor,
    workerStats,
    clientStats,
    unreadFor,
    weeklyEarnings,
    authModal,
    openAuth,
    closeAuth,
    demoLogin,
    authRegister,
    logout,
    uploadAvatar,
    updateProfile,
    deleteAccount,
    postJobModal,
    openPostJob,
    closePostJob,
    submitJob,
    sendSos,
    quoteModal,
    openQuoteModal,
    closeQuoteModal,
    submitQuote,
    withdrawQuote,
    offersModal,
    openOffers,
    closeOffers,
    acceptQuote,
    declineQuote,
    jobDrawer,
    setJobDrawer,
    workerDrawer,
    setWorkerDrawer,
    chatModal,
    backendChat,
    openChat,
    closeChat,
    sendChat,
    rateModal,
    openRate,
    closeRate,
    submitRating,
    disputeModal,
    openDispute,
    closeDispute,
    submitDispute,
    videoModal,
    setVideoModal,
    advanceJob,
    confirmDone,
    cancelJob,
    toggleOnline,
    addWorkerSkill,
    removeWorkerSkill,
    adminVerify,
    adminResolveDispute,
    adminCancelJob,
    adminSuspend,
    adminDeleteUser,
    adminRemoveReview,
    adminAddCategory,
    adminRemoveCategory,
    adminAddCity,
    adminRemoveCity,
    adminSetting,
    adminClearLogs,
    reseedDemo,
    wipeDemo,
    notifOpenRole,
    toggleNotifs,
    setNotifOpenRole,
    markAllRead,
    openNotif
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
