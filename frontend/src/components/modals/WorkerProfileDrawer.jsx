import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/useApp';
import { connectRealtime } from '../../services/realtime';
import Avatar from '../common/Avatar';
import VerifyBadge from '../common/VerifyBadge';
import SkillChip from '../common/SkillChip';
import Stars from '../common/Stars';
import { dateStr, timeAgo, tierOf } from '../../utils/formatters';

export default function WorkerProfileDrawer() {
  const {
    workerDrawer,
    setWorkerDrawer,
    userById,
    userSafe,
    workerStats,
    db
  } = useApp();

  const { open, workerId } = workerDrawer;
  const worker = workerDrawer.worker || (workerId ? userById(workerId) : null);
  const [online, setOnline] = useState(Boolean(worker?.online));

  useEffect(() => {
    if (!open || !workerId || !worker) return undefined;
    setOnline(Boolean(worker.online));
    const socket = connectRealtime();
    const onWorkerAvailability = event => {
      if (String(event?.workerId) === String(workerId)) {
        setOnline(Boolean(event.availability));
      }
    };
    socket?.on('worker:availability', onWorkerAvailability);
    return () => socket?.off('worker:availability', onWorkerAvailability);
  }, [open, workerId, worker?.online]);

  if (!open || !worker) return null;

  const st = workerStats(worker.id);
  const tier = tierOf(st.jobsDone);
  const reviews = db.reviews
    .filter(r => r.workerId === worker.id)
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  const closeDrawer = () => setWorkerDrawer({ open: false, workerId: null });

  return (
    <div className="drawer" onClick={closeDrawer}>
      <div className="drawer-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Worker profile</p>
            <h3 className="mt-1">{worker.name}</h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeDrawer}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="row gap-4 mb-4">
            <Avatar user={worker} size="xl" />
            <div className="flex1">
              <div className="row gap-2 wrap mb-1">
                <VerifyBadge worker={worker} />
                <span className="badge badge-brand">
                  <i className={`fas ${tier.icon}`}></i> {tier.name}
                </span>
                {online ? (
                  <span className="badge badge-good">
                    <i className="fas fa-circle"></i> Online
                  </span>
                ) : (
                  <span className="badge badge-neutral">
                    <i className="far fa-circle"></i> Offline
                  </span>
                )}
              </div>
              <p className="small muted">
                <i className="fas fa-location-dot"></i> {worker.area}, {worker.city}
              </p>
              <p className="xs dim mt-1">
                On skillConnect since {dateStr(worker.createdAt)}
              </p>
            </div>
          </div>

          {worker.bio && (
            <p className="muted small" style={{ lineHeight: 1.65 }}>
              {worker.bio}
            </p>
          )}

          {/* Stats 3-tile grid */}
          <div className="grid g3 mt-4" style={{ textAlign: 'center' }}>
            <div className="panel">
              <p className="num" style={{ fontSize: '1.3rem', color: 'var(--brand)' }}>
                {st.ratingLabel}
              </p>
              <p className="eyebrow mt-1">Rating</p>
            </div>
            <div className="panel">
              <p className="num" style={{ fontSize: '1.3rem' }}>
                {st.jobsDone}
              </p>
              <p className="eyebrow mt-1">Jobs done</p>
            </div>
            <div className="panel">
              <p className="num" style={{ fontSize: '1.3rem' }}>
                {st.reviews}
              </p>
              <p className="eyebrow mt-1">Reviews</p>
            </div>
          </div>

          {/* Skills */}
          <h4 className="mt-6 mb-3">Skills</h4>
          <div className="row wrap gap-2">
            {(worker.skills || []).map(skill => (
              <SkillChip key={skill} skill={skill} />
            ))}
          </div>

          {/* Reviews */}
          <h4 className="mt-6 mb-3">Reviews</h4>
          {reviews.length ? (
            <div className="col gap-3">
              {reviews.map(r => (
                <div key={r.id} className="panel">
                  <div className="spread">
                    <Stars rating={r.stars} />
                    <span className="xs dim">{timeAgo(r.at)}</span>
                  </div>
                  {r.text && <p className="small mt-2">“{r.text}”</p>}
                  <p className="xs dim mt-2">{userSafe(r.clientId).name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">
              No reviews yet — this worker is new to the platform.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

