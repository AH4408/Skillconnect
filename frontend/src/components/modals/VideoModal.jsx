import React from 'react';
import { useApp } from '../../context/useApp';

export default function VideoModal() {
  const { videoModal, setVideoModal, toast } = useApp();
  const { open, url } = videoModal;

  if (!open || !url) return null;

  const closeVideo = () => setVideoModal({ open: false, url: null });

  return (
    <div className="modal" onClick={closeVideo}>
      <div
        className="modal-box modal-lg"
        style={{ background: '#000' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <h4 style={{ color: '#fff' }}>Issue video</h4>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ color: '#fff' }}
            onClick={closeVideo}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <video
            style={{ width: '100%', maxHeight: '64vh' }}
            controls
            src={url}
            onError={() => {
              toast('This video was attached in an earlier session and is no longer available.', 'warn', 5000);
            }}
          />
        </div>
      </div>
    </div>
  );
}

