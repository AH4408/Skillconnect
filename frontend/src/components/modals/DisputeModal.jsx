import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp';

export default function DisputeModal() {
  const { disputeModal, closeDispute, jobById, submitDispute } = useApp();
  const { open, jobId } = disputeModal;
  const job = jobId ? jobById(jobId) : null;

  const [category, setCategory] = useState('Work quality was poor');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCategory('Work quality was poor');
      setText('');
      setError('');
    }
  }, [open]);

  if (!open || !job) return null;

  const handleSubmit = () => {
    if (text.trim().length < 20) {
      setError('Give the admin at least 20 characters of detail.');
      return;
    }
    submitDispute(job.id, category, text);
  };

  return (
    <div className="modal" onClick={closeDispute}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Escalate</p>
            <h3 className="mt-1">Report an issue</h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeDispute}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body col gap-4">
          <p className="small muted">
            An admin will review <span className="strong">“{job.title}”</span> along with its full chat history and timeline.
          </p>

          <div className="field">
            <label className="label">What went wrong?</label>
            <select
              className="select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option>Work quality was poor</option>
              <option>Worker or client didn't show up</option>
              <option>Price changed after agreement</option>
              <option>Unprofessional behaviour</option>
              <option>Damage to property</option>
              <option>Something else</option>
            </select>
          </div>

          <div className="field">
            <label className="label">Details</label>
            <textarea
              className={`textarea ${error ? 'input-err' : ''}`}
              maxLength={400}
              placeholder="Describe what happened…"
              value={text}
              onChange={e => {
                setText(e.target.value);
                if (error) setError('');
              }}
            />
            {error && (
              <p className="err-msg">
                <i className="fas fa-circle-exclamation"></i> {error}
              </p>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={closeDispute}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleSubmit}>
            Submit report
          </button>
        </div>
      </div>
    </div>
  );
}

