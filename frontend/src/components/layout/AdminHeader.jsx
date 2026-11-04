import React from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import { ADMIN_PAGES } from '../../utils/constants';

export default function AdminHeader({ onOpenNav }) {
  const { adminPage, sessionUser } = useApp();
  const me = sessionUser('admin');

  const meta = ADMIN_PAGES[adminPage] || ADMIN_PAGES.dashboard;

  return (
    <div className="admin-top">
      <div className="row gap-3">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onOpenNav}
          id="admin-burger"
        >
          <i className="fas fa-bars"></i>
        </button>
        <div>
          <h3>{meta[0]}</h3>
          <p className="xs dim">{meta[1]}</p>
        </div>
      </div>

      <div className="row gap-2">
        <span className="badge badge-good">
          <i className="fas fa-circle-check"></i> All systems normal
        </span>
        <Avatar user={me} size="sm" />
      </div>
    </div>
  );
}

