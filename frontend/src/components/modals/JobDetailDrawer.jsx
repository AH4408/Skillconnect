import React from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import StatusBadge from '../common/StatusBadge';
import SkillChip from '../common/SkillChip';
import Stars from '../common/Stars';
import { money, timeAgo, dateStr, etaLabel } from '../../utils/formatters';

export default function JobDetailDrawer() {
  const {
    jobDrawer,
    setJobDrawer,
    jobById,
    userSafe,
    currentUser,
    workerStats,
    quotesFor,
    reviewFor,
    disputeFor,
    openOffers,
    openChat,
    confirmDone,
    openRate,
    openDispute,
    cancelJob,
    advanceJob,
    adminCancelJob,
    setWorkerDrawer,
    setVideoModal
  } = useApp();

  const { open, jobId } = jobDrawer;
  const job = jobId ? jobById(jobId) : null;
  const me = currentUser();

  if (!open || !job) return null;

  const clientUser = userSafe(job.clientId);
  const client = clientUser.deleted && job.clientName
    ? {
      ...clientUser,
      name: job.clientName,
      email: job.clientEmail || '',
      city: clientUser.city === '—' ? job.city : clientUser.city,
      area: clientUser.area === '—' ? job.area : clientUser.area,
      deleted: false
    }
    : clientUser;
  const workerUser = job.workerId ? userSafe(job.workerId) : null;
  const worker = workerUser?.deleted && job.workerName
    ? { ...workerUser, name: job.workerName, deleted: false }
    : workerUser;
  const quotes = quotesFor(job.id);
  const liveQuotes = quotes.filter(q => q.status === 'Pending');
  const review = reviewFor(job.id);
  const dispute = disputeFor(job.id);
  const role = me ? me.role : 'admin';

  const whenLabelMap = {
    asap: 'As soon as possible',
    today: 'Today',
    tomorrow: 'Tomorrow',
    week: 'This week'
  };

  const closeDrawer = () => setJobDrawer({ open: false, jobId: null });

  return (
    <div className="drawer" onClick={closeDrawer}>
      <div className="drawer-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">
              {job.id} {job.sos ? '· EMERGENCY' : ''}
            </p>
            <h3 className="mt-1">{job.title}</h3>
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
          {/* Status & Badges */}
          <div className="row gap-2 wrap mb-4">
            <StatusBadge job={job} />
            <SkillChip skill={job.skill} />
            {job.urgent && (
              <span className="badge badge-critical">
                <i className="fas fa-fire"></i> Urgent
              </span>
            )}
            {job.sos && (
              <span className="badge badge-critical">
                <i className="fas fa-tower-broadcast"></i> SOS
              </span>
            )}
          </div>

          {/* Description */}
          <p className="muted" style={{ lineHeight: 1.65 }}>
            {job.desc}
          </p>

          {/* Video Attachment Button */}
          {job.videoUrl && (
            <button
              className="btn btn-outline btn-sm mt-3"
              onClick={() => setVideoModal({ open: true, url: job.videoUrl })}
            >
              <i className="fas fa-circle-play"></i> Watch the issue video
            </button>
          )}

          {/* Meta Details Panel */}
          <div className="panel mt-4 col gap-2">
            <div className="spread gap-3">
              <span className="small muted shrink0">Location</span>
              <span className="small strong right">{job.area}, {job.city}</span>
            </div>
            <div className="spread gap-3">
              <span className="small muted shrink0">Posted</span>
              <span className="small strong right">{timeAgo(job.createdAt)} · {dateStr(job.createdAt)}</span>
            </div>
            <div className="spread gap-3">
              <span className="small muted shrink0">Needed</span>
              <span className="small strong right">{whenLabelMap[job.when] || '—'}</span>
            </div>
            <div className="spread gap-3">
              <span className="small muted shrink0">Client budget</span>
              <span className="small strong right">{job.budget ? money(job.budget) : 'Not specified'}</span>
            </div>
            {job.price && (
              <div className="spread gap-3">
                <span className="small muted shrink0">Agreed price</span>
                <span className="small strong right" style={{ color: 'var(--brand)' }}>
                  {money(job.price)}
                </span>
              </div>
            )}
            {job.cancelReason && (
              <div className="spread gap-3">
                <span className="small muted shrink0">Cancellation reason</span>
                <span className="small strong right">{job.cancelReason}</span>
              </div>
            )}
          </div>

          {/* People Section */}
          <h4 className="mt-6 mb-3">People</h4>
          <div className="offer-row">
            <Avatar user={client} />
            <div className="flex1">
              <div className="small strong">{client.name}</div>
              <div className="xs dim">
                Client · {client.area || '—'}, {client.city}
              </div>
            </div>
            {role !== 'client' && !client.deleted && client.phone && (
              <span className="badge badge-neutral mono">+91 {client.phone}</span>
            )}
          </div>

          {worker && (
            <div className="offer-row mt-2">
              <Avatar user={worker} />
              <div className="flex1">
                <div className="small strong">{worker.name}</div>
                <div className="xs dim">
                  <Stars rating={workerStats(worker.id).rating} /> {workerStats(worker.id).ratingLabel} · {workerStats(worker.id).jobsDone} jobs done
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setWorkerDrawer({ open: true, workerId: worker.id })}
              >
                View
              </button>
            </div>
          )}

          {/* Quotes Section (when pending) */}
          {job.status === 'Pending' && (
            <>
              <h4 className="mt-6 mb-3">
                Quotes <span className="badge badge-neutral">{liveQuotes.length}</span>
              </h4>
              {!liveQuotes.length ? (
                <p className="small muted">
                  No quotes yet. Matching workers in {job.city} have been notified.
                </p>
              ) : role === 'client' ? (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => openOffers(job.id)}
                >
                  <i className="fas fa-scale-unbalanced"></i> Compare {liveQuotes.length} quote{liveQuotes.length === 1 ? '' : 's'}
                </button>
              ) : (
                <div className="col gap-2">
                  {liveQuotes.map(q => {
                    const w = userSafe(q.workerId);
                    return (
                      <div key={q.id} className="offer-row">
                        <div className="flex1">
                          <span className="small strong">{w.name}</span>
                          <div className="xs dim">
                            {etaLabel(q.etaMin)} · {timeAgo(q.createdAt)}
                          </div>
                        </div>
                        <span className="price-tag">{money(q.price)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Timeline Section */}
          <h4 className="mt-6 mb-3">Timeline</h4>
          <div className="timeline">
            {job.timeline
              .slice()
              .sort((a, b) => a.at - b.at)
              .map((t, i, arr) => (
                <div
                  key={i}
                  className={`tl-item ${i === arr.length - 1 ? 'current' : 'done'}`}
                >
                  <div className="tl-title">{t.text}</div>
                  <div className="tl-time">{timeAgo(t.at)} · {dateStr(t.at)}</div>
                </div>
              ))}
          </div>

          {/* Review Section if available */}
          {review && (
            <>
              <h4 className="mt-6 mb-3">Client review</h4>
              <div className="panel">
                <Stars rating={review.stars} />
                {review.text ? (
                  <p className="small mt-2">“{review.text}”</p>
                ) : (
                  <p className="small dim mt-2">No written review.</p>
                )}
              </div>
            </>
          )}

          {/* Dispute Section if available */}
          {dispute && (
            <div
              className="panel mt-4"
              style={{ borderColor: 'color-mix(in srgb, var(--st-critical) 40%, var(--border))' }}
            >
              <div className="spread">
                <span className={`badge ${dispute.status === 'Open' ? 'badge-critical' : 'badge-good'}`}>
                  <i className="fas fa-scale-balanced"></i> Dispute {dispute.status}
                </span>
                <span className="xs dim">{timeAgo(dispute.at)}</span>
              </div>
              <p className="small strong mt-2">{dispute.category}</p>
              <p className="small muted mt-1">{dispute.text}</p>
              {dispute.resolution && (
                <p className="small mt-2">
                  <span className="strong">Ruling:</span> {dispute.resolution}
                </p>
              )}
            </div>
          )}

          {/* Contextual Actions */}
          <div className="row wrap gap-2 mt-6">
            {/* Client actions */}
            {me?.role === 'client' && job.clientId === me.id && (
              <>
                {job.status === 'Pending' && (
                  <>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => openOffers(job.id)}
                      disabled={!liveQuotes.length}
                    >
                      <i className="fas fa-scale-unbalanced"></i>{' '}
                      {liveQuotes.length ? `Compare ${liveQuotes.length} quote${liveQuotes.length > 1 ? 's' : ''}` : 'No quotes yet'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => cancelJob(job.id)}
                    >
                      <i className="fas fa-ban"></i> Cancel
                    </button>
                  </>
                )}

                {job.workerId && ['Assigned', 'InProgress', 'Completed'].includes(job.status) && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => openChat(job.id)}
                  >
                    <i className="fas fa-comment"></i> Message
                  </button>
                )}

                {['Assigned', 'InProgress'].includes(job.status) && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => cancelJob(job.id)}
                  >
                    <i className="fas fa-ban"></i> Cancel job
                  </button>
                )}

                {job.status === 'Completed' && !job.confirmedAt && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => confirmDone(job.id)}
                  >
                    <i className="fas fa-circle-check"></i> Confirm &amp; pay {money(job.price)}
                  </button>
                )}

                {job.status === 'Completed' && job.confirmedAt && !review && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => openRate(job.id)}
                  >
                    <i className="fas fa-star"></i> Rate this job
                  </button>
                )}

                {job.workerId && job.status !== 'Cancelled' && (!dispute || dispute.status !== 'Open') && (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => openDispute(job.id)}
                  >
                    <i className="fas fa-flag"></i> Report an issue
                  </button>
                )}
              </>
            )}

            {/* Worker actions */}
            {me?.role === 'worker' && (
              <>
                {job.workerId === me.id && (
                  <>
                    {job.status === 'Assigned' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => advanceJob(job.id)}
                      >
                        <i className="fas fa-play"></i> Start job
                      </button>
                    )}
                    {job.status === 'InProgress' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => advanceJob(job.id)}
                      >
                        <i className="fas fa-flag-checkered"></i> Mark complete
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => openChat(job.id)}
                    >
                      <i className="fas fa-comment"></i> Message
                    </button>
                    {job.status !== 'Cancelled' && (!dispute || dispute.status !== 'Open') && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => openDispute(job.id)}
                      >
                        <i className="fas fa-flag"></i> Report an issue
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* Admin actions */}
            {me?.role === 'admin' && !['Cancelled', 'Completed'].includes(job.status) && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => adminCancelJob(job.id)}
              >
                <i className="fas fa-ban"></i> Force-cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

