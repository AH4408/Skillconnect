import React from 'react';
import { initials, colorFor } from '../../utils/formatters';

export default function Avatar({ user, size = '', className = '', style = {}, onClick, ...rest }) {
  const cls = `avatar ${size ? `avatar-${size}` : ''} ${className}`.trim();
  const userName = user?.name || '?';
  const userInitials = initials(userName);

  if (user?.avatar) {
    return (
      <span className={cls} style={style} onClick={onClick} {...rest}>
        <img src={user.avatar} alt={userName} />
      </span>
    );
  }

  const { bg, fg } = colorFor(user?.id || userName);
  const combinedStyle = {
    background: bg,
    color: fg,
    ...style
  };

  return (
    <span className={cls} style={combinedStyle} onClick={onClick} {...rest}>
      {userInitials}
    </span>
  );
}

