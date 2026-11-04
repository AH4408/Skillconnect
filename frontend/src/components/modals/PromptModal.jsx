import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp';

export default function PromptModal() {
  const { promptDialog } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (promptDialog) {
      setInputVal(promptDialog.value || '');
      setError('');
    }
  }, [promptDialog]);

  if (!promptDialog) return null;

  const { title, text, placeholder, validate, resolve } = promptDialog;

  const handleSave = () => {
    if (validate) {
      const err = validate(inputVal);
      if (err) {
        setError(err);
        return;
      }
    }
    resolve(inputVal);
  };

  return (
    <div className="modal" onClick={() => resolve(null)}>
      <div
        className="modal-box"
        style={{ maxWidth: '420px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => resolve(null)}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body col gap-3">
          {text && <p className="small muted">{text}</p>}
          <textarea
            className={`textarea ${error ? 'input-err' : ''}`}
            maxLength={240}
            placeholder={placeholder}
            value={inputVal}
            onChange={e => {
              setInputVal(e.target.value);
              if (error) setError('');
            }}
            autoFocus
          />
          {error && (
            <p className="err-msg">
              <i className="fas fa-circle-exclamation"></i> {error}
            </p>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={() => resolve(null)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

