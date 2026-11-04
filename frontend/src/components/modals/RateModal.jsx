import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import Stars from '../common/Stars';
import { RATE_LABELS } from '../../utils/constants';

export default function RateModal() {
  const { rateModal, closeRate, jobById, userSafe, submitRating } = useApp();
  const { open, jobId } = rateModal;
  const job = jobId ? jobById(jobId) : null;

  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStars(0);
      setText('');
      setError('');
    }
  }, [open]);

  if (!open || !job || !job.workerId) return null;

  const worker = userSafe(job.workerId);

  const handleSubmit = () => {
    if (!stars) {
      setError('Pick a star rating first.');
      return;
    }
    submitRating(job.id, stars, text);
  };

  return (
    <div className="modal" onClick={closeRate}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Feedback</p>
            <h3 className="mt-1">Rate your worker</h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeRate}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body col gap-4">
          <div className="row gap-3">
            <Avatar user={worker} size="lg" />
            <div>
              <p className="strong">{worker.name}</p>
              <p className="small muted">{job.title}</p>
            </div>
          </div>

          <div className="center">
            <Stars
              rating={stars}
              interactive
              onChange={v => {
                setStars(v);
                if (error) setError('');
              }}
            />
            <p className="small muted mt-2">{RATE_LABELS[stars] || 'Tap a star'}</p>
            {error && (
              <p className="err-msg hide-if-empty mt-2">
                <i className="fas fa-circle-exclamation"></i> {error}
              </p>
            )}
          </div>

          <div className="field">
            <label className="label">Write a review (optional)</label>
            <textarea
              className="textarea"
              maxLength={240}
              placeholder="How did it go?"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={closeRate}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Submit rating
          </button>
        </div>
      </div>
    </div>
  );
}

