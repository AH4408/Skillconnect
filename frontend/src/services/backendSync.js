import { client, workers, jobs, bookings, reviews, disputes as disputesApi, notifications, admin } from './domain';

export const BACKEND_ENABLED = import.meta.env.VITE_USE_BACKEND === 'true';

const idOf = value => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
};

export const normalizeUser = (u, extra = {}) => {
  if (!u) return null;
  const candidateName = [u.name, u.fullName, u.displayName, extra.name]
    .find(value => typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'user');
  return {
    id: idOf(u),
    name: candidateName?.trim() || (u.email ? u.email.split('@')[0] : 'Worker'),
    email: u.email || '',
    role: u.role || extra.role || 'client',
    phone: u.phone || '',
    city: u.city || extra.city || '',
    area: u.area || extra.area || '',
    avatar: u.avatar || null,
    createdAt: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
    suspended: !!u.suspended,
    deleted: false,
    skills: extra.skills || u.skills || [],
    bio: extra.bio || u.bio || '',
    online: extra.online ?? u.availability ?? false,
    verification: extra.verification || u.verification || (u.role === 'worker' ? 'pending' : 'approved'),
  };
};

const normalizeReview = r => ({
  id: idOf(r),
  jobId: idOf(r.job),
  workerId: idOf(r.worker),
  clientId: idOf(r.client),
  stars: Number(r.rating || 0),
  text: r.comment || '',
  at: new Date(r.createdAt || Date.now()).getTime()
});

export const normalizeDispute = dispute => ({
  id: idOf(dispute),
  jobId: idOf(dispute.job),
  byId: idOf(dispute.raisedBy),
  byRole: dispute.raisedByRole || '',
  category: dispute.category || '',
  text: dispute.description || '',
  status: dispute.status === 'RESOLVED' ? 'Resolved' : 'Open',
  at: new Date(dispute.createdAt || Date.now()).getTime(),
  resolution: dispute.resolution || null,
  resolvedAt: dispute.resolvedAt ? new Date(dispute.resolvedAt).getTime() : null
});

export const normalizeJob = (j, priceOverride = undefined) => {
  if (!j) return null;
  const clientId = idOf(j.client);
  const workerId = idOf(j.assignedWorker);
  const statusMap = {
    PENDING: 'Pending',
    QUOTING: 'Pending',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'InProgress',
    COMPLETED: 'Completed',
    CONFIRMED: 'Completed',
    CLOSED: 'Completed',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Cancelled'
  };
  const status = statusMap[j.status] || 'Pending';
  return {
    id: idOf(j),
    clientId,
    clientName: typeof j.client === 'object' ? (j.client?.name || '') : '',
    clientEmail: typeof j.client === 'object' ? (j.client?.email || '') : '',
    workerId,
    workerName: typeof j.assignedWorker === 'object' ? (j.assignedWorker?.name || '') : '',
    title: j.title || '',
    desc: j.description || '',
    skill: j.category || '',
    city: j.city || '',
    area: j.area || '',
    budget: Number(j.budget || 0),
    when: j.preferredDate ? 'scheduled' : 'asap',
    urgent: false,
    sos: false,
    price: priceOverride !== undefined ? priceOverride : (j.price ?? j.agreedAmount ?? null),
    status,
    createdAt: new Date(j.createdAt || Date.now()).getTime(),
    assignedAt: j.status && ['ASSIGNED','IN_PROGRESS','COMPLETED','CONFIRMED','CLOSED'].includes(j.status)
      ? new Date(j.updatedAt || j.createdAt || Date.now()).getTime() : null,
    startedAt: j.status && ['IN_PROGRESS','COMPLETED','CONFIRMED','CLOSED'].includes(j.status)
      ? new Date(j.updatedAt || Date.now()).getTime() : null,
    completedAt: j.completedAt ? new Date(j.completedAt).getTime() : null,
    confirmedAt: j.confirmedAt ? new Date(j.confirmedAt).getTime() : null,
    cancelledAt: j.status === 'CANCELLED' ? new Date(j.updatedAt || Date.now()).getTime() : null,
    cancelReason: j.cancellationReason || null,
    videoUrl: null,
    timeline: [{ text: `Backend status: ${j.status || 'PENDING'}`, at: new Date(j.updatedAt || j.createdAt || Date.now()).getTime() }]
  };
};

export const normalizeBooking = booking => {
  if (!booking) return { booking: null, quotes: [] };
  const job = normalizeJob(booking.job);
  const quotes = (booking.quotes || []).map(q => ({
    id: idOf(q),
    jobId: idOf(booking.job),
    workerId: idOf(q.worker),
    price: Number(q.amount || 0),
    etaMin: Number.parseInt(q.eta, 10) || 30,
    note: q.message || '',
    status: q.status === 'ACCEPTED' ? 'Accepted' : q.status === 'REJECTED' ? 'Declined' : 'Pending',
    createdAt: new Date(q.createdAt || booking.createdAt || Date.now()).getTime()
  }));
  return {
    booking: {
      id: idOf(booking),
      jobId: idOf(booking.job),
      workerId: idOf(booking.worker),
      clientId: idOf(booking.client),
      price: Number(booking.agreedAmount || 0),
      status: booking.status,
      createdAt: new Date(booking.createdAt || Date.now()).getTime()
    },
    quotes
  };
};

const dedupeById = list => [...new Map(list.filter(Boolean).map(x => [x.id, x])).values()];

export async function hydrateBackend(role, user) {
  if (!BACKEND_ENABLED || !user?.id) return null;

  const base = { users: [], jobs: [], quotes: [], reviews: [], notifications: [] };

  if (role === 'client') {
    const [profile, myJobs, myBookings, notifList] = await Promise.all([
      client.profile().catch(() => null),
      jobs.mine().catch(() => null),
      bookings.mine().catch(() => null),
      notifications.mine().catch(() => null)
    ]);

    const profileUser = profile?.user || {};
    const profileData = profile?.profile || {};
    const clientCity = profileData.city || profile?.city || profileUser.city || user.city || myJobs?.[0]?.city || '';
    let workerList = await workers.search({ city: clientCity || undefined }).catch(() => null);
    // If the city-filtered request returns no rows, fetch the approved worker
    // directory once without that filter. The client view applies the same
    // city comparison locally, which avoids hiding a match due to inconsistent
    // city formatting between the client profile and worker profile.
    if (!Array.isArray(workerList) || workerList.length === 0) {
      const allWorkers = await workers.search({}).catch(() => null);
      if (Array.isArray(allWorkers) && allWorkers.length) workerList = allWorkers;
    }
    const me = normalizeUser({ ...user, ...profileUser }, {
      city: clientCity,
      area: profileData.area,
      phone: profileData.phone,
    });
    const workersUsers = (workerList || []).map(w => {
      const linkedUser = w.user && typeof w.user === 'object'
        ? w.user
        : { _id: w.userId || w.user || w._id, name: w.name, email: w.email };
      return normalizeUser(linkedUser, {
      role: 'worker',
      name: linkedUser.name || w.name || w.fullName,
      city: w.city,
      area: w.area,
      skills: w.skills,
      bio: w.bio,
      verification: w.verification,
      online: w.online
      });
    });
    // The assigned worker is populated on each booking and may not appear in
    // the current worker search result (for example, if their profile is no
    // longer discoverable). Keep that participant available to the chat UI.
    const bookedWorkers = (myBookings || [])
      .filter(b => b.worker && typeof b.worker === 'object')
      .map(b => normalizeUser(b.worker, { role: 'worker' }));
    const assignedWorkers = (myJobs || [])
      .filter(j => j.assignedWorker && typeof j.assignedWorker === 'object')
      .map(j => normalizeUser(j.assignedWorker, { role: 'worker' }));
    const reviewWorkers = dedupeById([...workersUsers, ...bookedWorkers, ...assignedWorkers]);
    const workerReviews = await Promise.all(reviewWorkers.map(worker =>
      worker?.id ? reviews.worker(worker.id).catch(() => []) : Promise.resolve([])
    ));
    const normalizedReviews = workerReviews.flat().map(normalizeReview);

    const jobList = (myJobs || []).map(normalizeJob);
    const quoteList = [];
    const bookingList = [];
    (myBookings || []).forEach(b => {
      const x = normalizeBooking(b);
      quoteList.push(...x.quotes);
      if (x.booking) bookingList.push(x.booking);
    });

    return {
      // If worker search failed, don't replace a previously loaded directory
      // with just the client account. This commonly occurs during backend restarts.
      users: workerList === null ? undefined : dedupeById([me, ...workersUsers, ...bookedWorkers, ...assignedWorkers]),
      jobs: Array.isArray(myJobs) ? dedupeById(jobList) : undefined,
      quotes: Array.isArray(myBookings) ? dedupeById(quoteList) : undefined,
      bookings: Array.isArray(myBookings) ? bookingList : undefined,
      reviews: workerList === null ? undefined : dedupeById(normalizedReviews),
      notifications: Array.isArray(notifList) ? notifList.map(n => ({
        id: idOf(n), userId: idOf(n.user || me), text: n.message || n.text || '',
        icon: n.icon || 'fa-bell', at: new Date(n.createdAt || n.at || Date.now()).getTime(),
        read: !!n.read
      })) : undefined
    };
  }

  if (role === 'worker') {
    const [profile, myBookings, notifList, myReviews] = await Promise.all([
      workers.profile().catch(() => null),
      bookings.mine().catch(() => null),
      notifications.mine().catch(() => null),
      reviews.worker(user.id).catch(() => [])
    ]);

    const me = normalizeUser(user, {
      role: 'worker',
      city: profile?.city,
      area: profile?.area,
      skills: profile?.skills,
      bio: profile?.bio,
      verification: profile?.verification,
      online: profile?.availability
    });

    const jobList = [];
    const quoteList = [];
    const bookingList = [];
    const usersList = [me];

    // Worker hydration loads booked jobs and quote statuses; available jobs
    // are fetched when Find Work opens and refreshed on Socket.IO events.
    (myBookings || []).forEach(b => {
      const x = normalizeBooking(b);
      if (x.booking?.jobId) {
        const agreedAmount = b.agreedAmount !== undefined && b.agreedAmount !== null
          ? Number(b.agreedAmount)
          : x.booking.price;
        jobList.push(normalizeJob(b.job, Number.isFinite(agreedAmount) ? agreedAmount : null));
      }
      if (x.booking) bookingList.push(x.booking);
      quoteList.push(...x.quotes);
      if (b.client) usersList.push(normalizeUser(b.client, { role: 'client' }));
    });

    return {
      users: dedupeById(usersList),
      jobs: dedupeById(jobList),
      quotes: dedupeById(quoteList),
      bookings: bookingList,
      reviews: (myReviews || []).map(normalizeReview),
      notifications: (notifList || []).map(n => ({
        id: idOf(n), userId: idOf(n.user || me), text: n.message || n.text || '',
        icon: n.icon || 'fa-bell', at: new Date(n.createdAt || n.at || Date.now()).getTime(),
        read: !!n.read
      }))
    };
  }

  if (role === 'admin') {
    const [users, workerRows, jobRows, bookingRows, reviewRows, disputeRows, dashboard] = await Promise.all([
      admin.users({}).catch(() => []),
      admin.workers({}).catch(() => []),
      admin.jobs({}).catch(() => []),
      admin.bookings({}).catch(() => []),
      admin.reviews({}).catch(() => []),
      disputesApi.adminList().catch(() => []),
      admin.dashboard().catch(() => null)
    ]);

    const normalizedUsers = (users || []).map(u => normalizeUser(u));
    (workerRows || []).forEach(w => {
      const id = idOf(w.user);
      const idx = normalizedUsers.findIndex(u => u.id === id);
      const nu = normalizeUser(w.user || w, {
        role: 'worker',
        city: w.city,
        area: w.area,
        skills: w.skills,
        bio: w.bio,
        verification: w.verification,
        online: w.online
      });
      if (idx >= 0) normalizedUsers[idx] = { ...normalizedUsers[idx], ...nu };
      else normalizedUsers.push(nu);
    });

    const normalizedReviews = (reviewRows || []).map(normalizeReview);
    const logs = [
      ...(users || []).map(user => ({
        id: `signup:${idOf(user)}`,
        kind: 'signup',
        text: `${String(user.role || 'user').toUpperCase()} account created: ${user.name}${user.city ? ` (${user.city})` : ''}.`,
        actor: idOf(user),
        at: new Date(user.createdAt || Date.now()).getTime()
      })),
      ...(jobRows || []).map(job => ({
        id: `job:${idOf(job)}`,
        kind: 'job',
        text: `Job posted: ${job.title || 'Untitled job'}${job.city ? ` (${job.city})` : ''}.`,
        actor: idOf(job.client),
        at: new Date(job.createdAt || Date.now()).getTime()
      })),
      ...(bookingRows || []).map(booking => ({
        id: `booking:${idOf(booking)}`,
        kind: 'quote',
        text: `Booking ${String(booking.status || 'created').toLowerCase().replaceAll('_', ' ')}${booking.job?.title ? ` for “${booking.job.title}”` : ''}.`,
        actor: idOf(booking.client),
        at: new Date(booking.updatedAt || booking.createdAt || Date.now()).getTime()
      })),
      ...(reviewRows || []).map(review => ({
        id: `review:${idOf(review)}`,
        kind: 'review',
        text: `${Number(review.rating || 0)}-star review${review.job?.title ? ` left on “${review.job.title}”` : ' submitted'}.`,
        actor: idOf(review.client),
        at: new Date(review.createdAt || Date.now()).getTime()
      })),
      ...(disputeRows || []).map(dispute => ({
        id: `dispute-open:${idOf(dispute)}`,
        kind: 'dispute',
        text: `Dispute opened${dispute.job?.title ? ` for “${dispute.job.title}”` : ''}.`,
        actor: idOf(dispute.raisedBy),
        at: new Date(dispute.createdAt || Date.now()).getTime()
      })),
      ...(disputeRows || []).filter(dispute => dispute.status === 'RESOLVED').map(dispute => ({
        id: `dispute-resolved:${idOf(dispute)}`,
        kind: 'dispute',
        text: `Dispute resolved${dispute.job?.title ? ` for “${dispute.job.title}”` : ''}.`,
        actor: idOf(dispute.resolvedBy),
        at: new Date(dispute.resolvedAt || dispute.updatedAt || Date.now()).getTime()
      }))
    ].filter(log => log.actor && Number.isFinite(log.at))
      .sort((a, b) => b.at - a.at)
      .slice(0, 500);

    return {
      users: dedupeById(normalizedUsers),
      jobs: dedupeById((jobRows || []).map(normalizeJob)),
      quotes: [],
      bookings: [],
      reviews: normalizedReviews,
      disputes: (disputeRows || []).map(normalizeDispute),
      logs,
      notifications: [],
      dashboard
    };
  }

  return base;
}
