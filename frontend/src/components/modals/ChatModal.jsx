import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import EmptyState from '../common/EmptyState';
import { timeAgo } from '../../utils/formatters';
import { BACKEND_ENABLED } from '../../services/backendSync';

export default function ChatModal() {
  const {
    chatModal,
    backendChat,
    closeChat,
    jobById,
    userSafe,
    currentUser,
    msgsFor,
    sendChat,
    toast
  } = useApp();

  const { open, jobId, withId } = chatModal;
  const job = jobId ? jobById(jobId) : null;
  const me = currentUser();

  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      setInputMsg('');
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 50);
    }
  }, [open, jobId]);

  if (!open || !job || !me) return null;

  const otherId = withId || (me.id === job.clientId ? job.workerId : job.clientId);
  const chatParticipant = backendChat.participants?.find(user => String(user.id) === String(otherId));
  const fallbackUser = otherId ? userSafe(otherId) : { name: 'Job thread', id: 'x' };
  const other = chatParticipant || (fallbackUser.deleted && job.workerName
    ? { ...fallbackUser, name: job.workerName, deleted: false }
    : fallbackUser);
  const messages = BACKEND_ENABLED ? backendChat.messages : msgsFor(job.id);

  const handleSend = () => {
    const text = inputMsg.trim();
    if (!text) return;
    if (text.length > (BACKEND_ENABLED ? 3000 : 500)) {
      toast(`Message is too long (${BACKEND_ENABLED ? 3000 : 500} characters max).`, 'warn');
      return;
    }
    sendChat(job.id, text);
    setInputMsg('');
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="modal" onClick={closeChat}>
      <div
        className="modal-box"
        style={{ height: 'min(76vh, 660px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="row gap-3">
            <Avatar user={other} />
            <div>
              <h4>{other.name}</h4>
              <p className="xs dim">{job.title}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeChat}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            background: 'var(--surface-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {BACKEND_ENABLED && backendChat.loading ? (
            <EmptyState icon="fa-spinner fa-spin" title="Loading chat" text="Getting your messages…" />
          ) : BACKEND_ENABLED && backendChat.error ? (
            <EmptyState icon="fa-comments" title="Chat unavailable" text={backendChat.error} />
          ) : messages.length ? (
            messages.map(m => {
              const senderId = BACKEND_ENABLED ? (m.sender?._id || m.sender?.id || m.sender) : m.fromId;
              const mine = String(senderId) === String(me.id);
              const sender = BACKEND_ENABLED ? (m.sender?.name ? m.sender : userSafe(senderId)) : userSafe(senderId);

              return (
                <div
                  key={m.id || m._id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '78%'
                  }}
                >
                  {!mine && <p className="xs dim mb-1">{sender.name}</p>}
                  <div
                    style={{
                      background: mine ? 'var(--brand)' : 'var(--surface)',
                      color: mine ? 'var(--brand-fg)' : 'var(--text)',
                      padding: '9px 13px',
                      borderRadius: '14px',
                      borderBottomRightRadius: mine ? '4px' : '14px',
                      borderBottomLeftRadius: mine ? '14px' : '4px',
                      fontSize: '.86rem',
                      lineHeight: 1.5,
                      border: mine ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {m.text}
                  </div>
                  <p
                    className="xs dim mt-1"
                    style={{ textAlign: mine ? 'right' : 'left' }}
                  >
                    {timeAgo(BACKEND_ENABLED ? new Date(m.createdAt).getTime() : m.at)}
                  </p>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon="fa-comments"
              title="No messages yet"
              text="Ask about timing, parts or access before the work starts."
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="modal-foot" style={{ gap: '8px' }}>
          <input
            className="input flex1"
            placeholder="Type a message…"
            autoComplete="off"
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
            }}
            autoFocus
          />
          <button
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            style={{ flex: '0 0 auto' }}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

