import React from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import Stars from '../common/Stars';
import EmptyState from '../common/EmptyState';
import { money, etaLabel, timeAgo } from '../../utils/formatters';

export default function OffersModal() {
  const {
    offersModal,
    closeOffers,
    jobById,
    quotesFor,
    userSafe,
    workerStats,
    acceptQuote,
    declineQuote,
    setWorkerDrawer,
    openChat
  } = useApp();

  const { open, jobId } = offersModal;
  const job = jobId ? jobById(jobId) : null;

  if (!open || !job) return null;

  const quotes = quotesFor(job.id)
    .filter(q => q.status === 'Pending' || q.status === 'Accepted')
    .sort((a, b) => a.price - b.price);

  const cheapest = quotes.length ? quotes[0].price : null;

  return (
    <div className="modal" onClick={closeOffers}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Quotes received</p>
            <h3 className="mt-1">{job.title}</h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeOffers}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="col gap-3">
            {!quotes.length ? (
              <EmptyState
                icon="fa-file-invoice-dollar"
                title="No quotes yet"
                text={`Workers matching “${job.skill}” in ${job.city} have been notified. Most jobs get their first quote within 20 minutes.`}
              />
            ) : (
              quotes.map(q => {
                const w = userSafe(q.workerId);
                const st = workerStats(w.id);
                const isBest = q.price === cheapest && quotes.length > 1;

                return (
                  <div
                    key={q.id}
                    className={`offer-row ${isBest ? 'best' : ''}`}
                    style={{ alignItems: 'flex-start' }}
                  >
                    <Avatar user={w} />
                    <div className="flex1">
                      <div className="row gap-2 wrap">
                        <span className="strong small">{w.name}</span>
                        {w.verification === 'approved' && (
                          <i
                            className="fas fa-circle-check"
                            style={{ color: 'var(--brand)', fontSize: '.72rem' }}
                            title="Verified"
                          />
                        )}
                        {isBest && (
                          <span className="badge badge-good">
                            <i className="fas fa-tag"></i> Lowest quote
                          </span>
                        )}
                      </div>

                      <div className="row gap-3 xs dim mt-1 wrap">
                        <span>
                          <Stars rating={st.rating} /> {st.ratingLabel}
                        </span>
                        <span>
                          <i className="fas fa-briefcase"></i> {st.jobsDone} done
                        </span>
                        <span>
                          <i className="fas fa-clock"></i> {etaLabel(q.etaMin)}
                        </span>
                      </div>

                      {q.note && (
                        <p className="small muted mt-2">“{q.note}”</p>
                      )}

                      <div className="row gap-2 mt-3 wrap">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setWorkerDrawer({ open: true, workerId: w.id })}
                        >
                          <i className="fas fa-user"></i> Profile
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openChat(job.id, w.id)}
                        >
                          <i className="fas fa-comment"></i> Ask a question
                        </button>
                      </div>
                    </div>

                    <div className="right shrink0 col gap-2" style={{ alignItems: 'flex-end' }}>
                      <div className="price-tag">{money(q.price)}</div>
                      {job.budget && (
                        <div
                          className={`xs ${q.price <= job.budget ? 'delta-up' : 'delta-down'}`}
                        >
                          {q.price <= job.budget ? 'Under' : 'Over'} budget
                        </div>
                      )}

                      {q.status === 'Accepted' ? (
                        <span className="badge badge-good">
                          <i className="fas fa-check"></i> Accepted
                        </span>
                      ) : (
                        <div className="row gap-2">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => declineQuote(q.id)}
                          >
                            Decline
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => acceptQuote(q.id)}
                          >
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

