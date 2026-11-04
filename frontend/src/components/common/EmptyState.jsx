import React from 'react';

export default function EmptyState({ icon = 'fa-inbox', title, text, action, children }) {
  return (
    <div className="empty">
      <div className="e-ico">
        <i className={`fas ${icon}`}></i>
      </div>
      {title && <h4>{title}</h4>}
      {text && <p>{text}</p>}
      {action && action}
      {children}
    </div>
  );
}

