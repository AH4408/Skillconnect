import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import { money } from '../../utils/formatters';

export default function QuoteModal() {
  const { quoteModal, closeQuoteModal, jobById, submitQuote } = useApp();
  const { open, jobId } = quoteModal;

  const job = jobId ? jobById(jobId) : null;

  const [price, setPrice] = useState('');
  const [etaMin, setEtaMin] = useState(30);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && job) {
      setPrice(job.budget ? String(job.budget) : '');
      setEtaMin(30);
      setNote('');
      setError('');
    }
    // `job` is refreshed from the backend while the modal is open. Depending
    // on the whole object resets edits (including price) back to its budget.
    // Initialize only when the modal opens or a different job is selected.
  }, [open, jobId]);

  if (!open || !job) return null;

  const handleSubmit = () => {
    const numPrice = Number(price);
    if (!numPrice || isNaN(numPrice) || numPrice < 1 || numPrice > 1000000) {
      setError('Enter a price between ₹1 and ₹10,00,000.');
      return;
    }

    submitQuote({
      jobId: job.id,
      price: numPrice,
      etaMin: Number(etaMin),
      note: note.trim()
    });
  };

  return (
    <div className="modal" onClick={closeQuoteModal}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Send a quote</p>
            <h3 className="mt-1">{job.title}</h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeQuoteModal}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body col gap-4">
          <div className="panel">
            <p className="small">{job.desc}</p>
            <div className="row gap-4 mt-3 wrap">
              <span className="xs dim">
                <i className="fas fa-location-dot"></i> {job.area}, {job.city}
              </span>
              <span className="xs dim">
                <i className="fas fa-wallet"></i> Client budget: {job.budget ? money(job.budget) : 'not specified'}
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Your price (₹)</label>
            <input
              className={`input mono ${error ? 'input-err' : ''}`}
              type="number"
              min="1"
              max="1000000"
              placeholder="e.g. 450"
              value={price}
              onChange={e => {
                setPrice(e.target.value);
                if (error) setError('');
              }}
            />
            {error && (
              <p className="err-msg">
                <i className="fas fa-circle-exclamation"></i> {error}
              </p>
            )}
          </div>

          <div className="field">
            <label className="label">How soon can you get there?</label>
            <select
              className="select"
              value={etaMin}
              onChange={e => setEtaMin(Number(e.target.value))}
            >
              <option value="15">Within 15 minutes</option>
              <option value="30">Within 30 minutes</option>
              <option value="60">Within 1 hour</option>
              <option value="180">Within 3 hours</option>
              <option value="1440">Tomorrow</option>
            </select>
          </div>

          <div className="field">
            <label className="label">Note to the client (optional)</label>
            <textarea
              className="textarea"
              maxLength={180}
              placeholder="e.g. Price includes a replacement washer and labour."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <p className="hint">
            <i className="fas fa-lock"></i> Your quote is binding once the client accepts it.
          </p>
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={closeQuoteModal}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-paper-plane"></i> Send quote
          </button>
        </div>
      </div>
    </div>
  );
}

