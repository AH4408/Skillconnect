import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import SkillChip from '../common/SkillChip';

export default function PostJobModal() {
  const { db, sessionUser, postJobModal, closePostJob, submitJob, toast } = useApp();
  const { open, preselect } = postJobModal;
  const me = sessionUser('client');

  const [category, setCategory] = useState(preselect || null);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState(me?.city || db.cities[0] || 'Anand');
  const [area, setArea] = useState(me?.area || '');
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('');
  const [when, setWhen] = useState('asap');
  const [urgent, setUrgent] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setCategory(preselect && db.categories.includes(preselect) ? preselect : null);
      setTitle('');
      setCity(me?.city || db.cities[0] || 'Anand');
      setArea(me?.area || '');
      setDesc('');
      setBudget('');
      setWhen('asap');
      setUrgent(false);
      setVideoUrl(null);
      setErrors({});
    }
  }, [open, preselect, me, db.categories, db.cities]);

  if (!open) return null;

  const handleVideoFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setVideoUrl(null);
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      toast('Video is too large (60 MB max).', 'error');
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleSubmit = () => {
    const errs = {};
    if (!category) errs.category = 'Choose a category.';
    if (title.trim().length < 5) errs.title = 'Give the job a title of at least 5 characters.';
    if (desc.trim().length < 15) errs.desc = 'Describe the problem in at least 15 characters — workers quote better with detail.';
    if (area.trim().length < 2) errs.area = 'Enter the area or locality.';

    let numericBudget = null;
    if (budget !== '') {
      numericBudget = Number(budget);
      if (isNaN(numericBudget) || numericBudget <= 0 || numericBudget > 1000000) {
        errs.budget = 'Budget must be between ₹1 and ₹10,00,000.';
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    submitJob({
      title: title.trim(),
      desc: desc.trim(),
      skill: category,
      city,
      area: area.trim(),
      budget: numericBudget,
      when,
      urgent,
      videoUrl
    });
  };

  return (
    <div className="modal" onClick={closePostJob}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">New request</p>
            <h3 className="mt-1">Post a job</h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closePostJob}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body col gap-4">
          {/* Category Picker */}
          <div className="field">
            <label className="label">Category</label>
            <div className="row wrap gap-2">
              {db.categories.map(cat => (
                <SkillChip
                  key={cat}
                  skill={cat}
                  asButton
                  selected={category === cat}
                  onClick={() => {
                    setCategory(cat);
                    if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
                  }}
                />
              ))}
            </div>
            {errors.category && (
              <p className="err-msg">
                <i className="fas fa-circle-exclamation"></i> {errors.category}
              </p>
            )}
          </div>

          {/* Job Title */}
          <div className="field">
            <label className="label">Job title</label>
            <input
              className={`input ${errors.title ? 'input-err' : ''}`}
              maxLength={60}
              placeholder="e.g. Kitchen tap is leaking"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
            />
            {errors.title && (
              <p className="err-msg">
                <i className="fas fa-circle-exclamation"></i> {errors.title}
              </p>
            )}
          </div>

          {/* City & Area */}
          <div className="grid g2">
            <div className="field">
              <label className="label">City</label>
              <select
                className="select"
                value={city}
                onChange={e => setCity(e.target.value)}
              >
                {db.cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Area / locality</label>
              <input
                className={`input ${errors.area ? 'input-err' : ''}`}
                placeholder="e.g. Ganesh Chowk"
                value={area}
                onChange={e => {
                  setArea(e.target.value);
                  if (errors.area) setErrors(prev => ({ ...prev, area: '' }));
                }}
              />
              {errors.area && (
                <p className="err-msg">
                  <i className="fas fa-circle-exclamation"></i> {errors.area}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="field">
            <label className="label">Describe the problem</label>
            <textarea
              className={`textarea ${errors.desc ? 'input-err' : ''}`}
              maxLength={400}
              placeholder="What's wrong, how long has it been happening, anything a worker should bring…"
              value={desc}
              onChange={e => {
                setDesc(e.target.value);
                if (errors.desc) setErrors(prev => ({ ...prev, desc: '' }));
              }}
            />
            <div className="spread">
              {errors.desc ? (
                <p className="err-msg">
                  <i className="fas fa-circle-exclamation"></i> {errors.desc}
                </p>
              ) : (
                <span></span>
              )}
              <p className="hint">{desc.length} / 400</p>
            </div>
          </div>

          {/* Budget & Timing */}
          <div className="grid g2">
            <div className="field">
              <label className="label">Your budget (optional)</label>
              <input
                className={`input mono ${errors.budget ? 'input-err' : ''}`}
                type="number"
                min="0"
                step="50"
                placeholder="₹ e.g. 500"
                value={budget}
                onChange={e => {
                  setBudget(e.target.value);
                  if (errors.budget) setErrors(prev => ({ ...prev, budget: '' }));
                }}
              />
              <p className="hint">Helps workers quote realistically.</p>
              {errors.budget && (
                <p className="err-msg">
                  <i className="fas fa-circle-exclamation"></i> {errors.budget}
                </p>
              )}
            </div>

            <div className="field">
              <label className="label">When do you need it?</label>
              <select
                className="select"
                value={when}
                onChange={e => setWhen(e.target.value)}
              >
                <option value="asap">As soon as possible</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This week</option>
              </select>
            </div>
          </div>

          {/* Video Attachment */}
          <div className="field">
            <label className="label">Attach a video (optional)</label>
            <input
              className="input"
              type="file"
              accept="video/*"
              onChange={handleVideoFile}
            />
            <p className="hint">
              <i className="fas fa-circle-info"></i> Previews work for this session only — video files aren't saved to browser storage.
            </p>
            {videoUrl && (
              <video
                className="mt-2"
                style={{ borderRadius: 'var(--radius-sm)', maxHeight: '180px', width: '100%' }}
                src={videoUrl}
                controls
                muted
              />
            )}
          </div>

          {/* Urgent checkbox */}
          <label className="checkline">
            <input
              type="checkbox"
              checked={urgent}
              onChange={e => setUrgent(e.target.checked)}
            />
            <span>
              <span className="strong">Mark as urgent</span>
              <br />
              <span className="xs muted">Pushes your job to the top of every matching worker's feed.</span>
            </span>
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={closePostJob}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-paper-plane"></i> Post job
          </button>
        </div>
      </div>
    </div>
  );
}

