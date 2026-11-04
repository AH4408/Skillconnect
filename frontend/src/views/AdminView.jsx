import React, { useState, useRef } from 'react';
import { useApp } from '../context/useApp';
import AdminSidebar from '../components/layout/AdminSidebar';
import AdminHeader from '../components/layout/AdminHeader';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import SkillChip from '../components/common/SkillChip';
import VerifyBadge from '../components/common/VerifyBadge';
import Stars from '../components/common/Stars';
import BarChart from '../components/common/BarChart';
import BarRows from '../components/common/BarRows';
import EmptyState from '../components/common/EmptyState';
import { STATUS_META, ROLE_META } from '../utils/constants';
import { money, timeAgo, dateStr, pluralise, startOfDay, DAY, isPhone } from '../utils/formatters';

const PAGE_SIZE = 12;

export default function AdminView() {
  const {
    db,
    adminPage,
    setAdminPage,
    sessionUser,
    userSafe,
    workerStats,
    setJobDrawer,
    setWorkerDrawer,
    adminVerify,
    adminResolveDispute,
    adminSuspend,
    adminDeleteUser,
    adminRemoveReview,
    adminAddCategory,
    adminRemoveCategory,
    adminAddCity,
    adminRemoveCity,
    adminSetting,
    adminClearLogs,
    reseedDemo,
    wipeDemo,
    updateProfile,
    uploadAvatar,
    toast
  } = useApp();

  const me = sessionUser('admin');
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Verification Page Filter
  const [verifFilter, setVerifFilter] = useState('pending');

  // Job Oversight Page Filter & Sort & Paging
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobCityFilter, setJobCityFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [jobSort, setJobSort] = useState({ key: 'createdAt', dir: -1 });
  const [jobsPage, setJobsPage] = useState(1);

  // Disputes Page Filter
  const [disputeFilter, setDisputeFilter] = useState('Open');

  // Users Page Filter & Sort & Paging
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState({ key: 'name', dir: 1 });
  const [usersPage, setUsersPage] = useState(1);

  // Ratings Moderation Page Filter
  const [ratingFilter, setRatingFilter] = useState('all');

  // Settings Page Profile Edit & Inputs
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
  const [adminName, setAdminName] = useState(me?.name || '');
  const [adminPhone, setAdminPhone] = useState(me?.phone || '');
  const [adminErrors, setAdminErrors] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCityName, setNewCityName] = useState('');

  // Activity Log Search
  const [logSearch, setLogSearch] = useState('');

  const avatarInputRef = useRef(null);

  if (!me) return null;

  // --- 1. Dashboard calculations ---
  const activeUsers = db.users.filter(u => !u.deleted);
  const totalWorkers = activeUsers.filter(u => u.role === 'worker');
  const totalClients = activeUsers.filter(u => u.role === 'client');
  const onlineWorkersCount = totalWorkers.filter(u => u.online).length;
  const completedJobs = db.jobs.filter(j => j.status === 'Completed');
  const totalGmv = completedJobs.reduce((s, j) => s + (j.price || 0), 0);
  const newSignupsThisWeek = activeUsers.filter(u => Date.now() - u.createdAt < 7 * DAY).length;
  const last7DaysJobsCount = db.jobs.filter(j => Date.now() - j.createdAt < 7 * DAY).length;

  // 14-day posting volume
  const today = startOfDay(Date.now());
  const chart14Days = [];
  for (let i = 13; i >= 0; i--) {
    const d = today - i * DAY;
    const n = db.jobs.filter(j => startOfDay(j.createdAt) === d).length;
    chart14Days.push({
      label: i % 2 === 0 ? String(new Date(d).getDate()) : '',
      value: n,
      tip: `${new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${pluralise(n, 'job')}`
    });
  }

  // Pipeline breakdown meters
  const pipelineStatuses = ['Pending', 'Assigned', 'InProgress', 'Completed', 'Cancelled'];
  const pipelineBreakdown = pipelineStatuses.map(s => ({
    label: STATUS_META[s].label,
    value: db.jobs.filter(j => j.status === s).length
  }));

  // Top skills in demand
  const skillCountMap = {};
  db.jobs.forEach(j => {
    skillCountMap[j.skill] = (skillCountMap[j.skill] || 0) + 1;
  });
  const skillDemandData = Object.keys(skillCountMap)
    .map(k => ({
      label: k,
      value: skillCountMap[k],
      color: (db.categories.includes(k) && db.categories.find(c => c === k)) ? '#2a78d6' : undefined
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Demand by city
  const cityCountMap = {};
  db.jobs.forEach(j => {
    cityCountMap[j.city] = (cityCountMap[j.city] || 0) + 1;
  });
  const cityDemandData = Object.keys(cityCountMap)
    .map(k => ({ label: k, value: cityCountMap[k] }))
    .sort((a, b) => b.value - a.value);

  // --- 2. Verification Queue calculations ---
  const verifWorkers = db.users
    .filter(u => u.role === 'worker' && u.verification === verifFilter)
    .sort((a, b) => b.createdAt - a.createdAt);

  // --- 3. Job Oversight calculations ---
  let jobRows = db.jobs.slice();
  if (jobStatusFilter !== 'all') jobRows = jobRows.filter(j => j.status === jobStatusFilter);
  if (jobCityFilter !== 'all') jobRows = jobRows.filter(j => j.city === jobCityFilter);
  if (jobSearch.trim()) {
    const q = jobSearch.toLowerCase();
    jobRows = jobRows.filter(
      j =>
        (
          j.id +
          ' ' +
          j.title +
          ' ' +
          j.skill +
          ' ' +
          j.city +
          ' ' +
          j.area +
          ' ' +
          userSafe(j.clientId).name +
          ' ' +
          (j.workerId ? userSafe(j.workerId).name : '')
        )
          .toLowerCase()
          .includes(q)
    );
  }

  jobRows.sort((a, b) => {
    let av = a[jobSort.key];
    let bv = b[jobSort.key];
    if (jobSort.key === 'price') {
      av = av || 0;
      bv = bv || 0;
    }
    if (typeof av === 'string') return av.localeCompare(bv) * jobSort.dir;
    return ((av || 0) - (bv || 0)) * jobSort.dir;
  });

  const totalJobPages = Math.max(1, Math.ceil(jobRows.length / PAGE_SIZE));
  const currentJobsPage = Math.min(jobsPage, totalJobPages);
  const pagedJobs = jobRows.slice((currentJobsPage - 1) * PAGE_SIZE, currentJobsPage * PAGE_SIZE);

  const toggleJobSort = key => {
    if (jobSort.key === key) {
      setJobSort({ key, dir: jobSort.dir * -1 });
    } else {
      setJobSort({ key, dir: key === 'id' ? 1 : -1 });
    }
  };

  // --- 4. Disputes calculations ---
  const disputeRows = db.disputes
    .filter(d => disputeFilter === 'all' || d.status === disputeFilter)
    .sort((a, b) => b.at - a.at);

  // --- 5. Users calculations ---
  let userRows = db.users.slice();
  if (userRoleFilter !== 'all') userRows = userRows.filter(u => u.role === userRoleFilter);
  if (userSearch.trim()) {
    const q = userSearch.toLowerCase();
    userRows = userRows.filter(u => (u.name + ' ' + u.phone + ' ' + u.city).toLowerCase().includes(q));
  }

  const countJobs = u => {
    if (u.role === 'worker') return db.jobs.filter(j => j.workerId === u.id).length;
    if (u.role === 'client') return db.jobs.filter(j => j.clientId === u.id).length;
    return 0;
  };

  userRows.sort((a, b) => {
    let av, bv;
    if (userSort.key === 'rating') {
      av = a.role === 'worker' ? workerStats(a.id).rating : -1;
      bv = b.role === 'worker' ? workerStats(b.id).rating : -1;
    } else if (userSort.key === 'jobs') {
      av = countJobs(a);
      bv = countJobs(b);
    } else {
      av = a.name;
      bv = b.name;
    }
    if (typeof av === 'string') return av.localeCompare(bv) * userSort.dir;
    return (av - bv) * userSort.dir;
  });

  const totalUserPages = Math.max(1, Math.ceil(userRows.length / PAGE_SIZE));
  const currentUsersPage = Math.min(usersPage, totalUserPages);
  const pagedUsers = userRows.slice((currentUsersPage - 1) * PAGE_SIZE, currentUsersPage * PAGE_SIZE);

  const toggleUserSort = key => {
    if (userSort.key === key) {
      setUserSort({ key, dir: userSort.dir * -1 });
    } else {
      setUserSort({ key, dir: key === 'name' ? 1 : -1 });
    }
  };

  // --- 6. Ratings moderation calculations ---
  const ratingsRows = db.reviews
    .filter(r => ratingFilter === 'all' || r.stars <= 2)
    .sort((a, b) => b.at - a.at)
    .slice(0, 60);

  // --- 7. Activity logs calculations ---
  const filteredLogs = db.logs
    .filter(l => !logSearch.trim() || (l.text + ' ' + l.kind).toLowerCase().includes(logSearch.toLowerCase()))
    .slice(0, 120);

  const logIcon = kind =>
    ({
      job: 'fa-briefcase',
      quote: 'fa-file-invoice-dollar',
      signup: 'fa-user-plus',
      payment: 'fa-indian-rupee-sign',
      verification: 'fa-user-check',
      dispute: 'fa-scale-balanced',
      review: 'fa-star',
      admin: 'fa-shield-halved',
      sos: 'fa-tower-broadcast',
      system: 'fa-gear'
    }[kind] || 'fa-circle-info');

  // CSV Export helper
  const exportCSV = what => {
    const csvCell = v => {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    let rows;
    if (what === 'jobs') {
      rows = [['Job ID', 'Title', 'Skill', 'City', 'Area', 'Client', 'Worker', 'Budget', 'Agreed price', 'Status', 'Posted', 'Completed']];
      jobRows.forEach(j =>
        rows.push([
          j.id,
          j.title,
          j.skill,
          j.city,
          j.area,
          userSafe(j.clientId).name,
          j.workerId ? userSafe(j.workerId).name : '',
          j.budget || '',
          j.price || '',
          j.status,
          new Date(j.createdAt).toISOString(),
          j.completedAt ? new Date(j.completedAt).toISOString() : ''
        ])
      );
    } else {
      rows = [['Name', 'Role', 'Phone', 'City', 'Area', 'Skills', 'Verification', 'Rating', 'Jobs', 'Suspended', 'Joined']];
      userRows.forEach(u => {
        const st = u.role === 'worker' ? workerStats(u.id) : null;
        rows.push([
          u.name,
          u.role,
          u.phone,
          u.city,
          u.area,
          (u.skills || []).join(' | '),
          u.verification || '',
          st ? st.ratingLabel : '',
          countJobs(u),
          u.suspended ? 'yes' : 'no',
          new Date(u.createdAt).toISOString()
        ]);
      });
    }

    const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillconnect-${what}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${rows.length - 1} rows exported.`, 'success');
  };

  const handleSaveAdminProfile = () => {
    const errs = {};
    if (adminName.trim().length < 3) errs.name = 'Name must be at least 3 characters.';
    const cleanPhone = adminPhone.replace(/\D/g, '').slice(0, 10);
    if (!isPhone(cleanPhone)) errs.phone = 'Enter a valid 10-digit mobile number.';
    if (!errs.phone && db.users.some(u => u.phone === cleanPhone && u.id !== me.id)) {
      errs.phone = 'Another account already uses that number.';
    }

    setAdminErrors(errs);
    if (Object.keys(errs).length > 0) return;

    updateProfile('admin', {
      name: adminName.trim(),
      phone: cleanPhone
    });
    setIsEditingAdminProfile(false);
  };

  return (
    <section id="view-admin" className="view">
      <div className="admin-shell">
        <AdminSidebar
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
        />

        <div className="admin-main">
          <AdminHeader onOpenNav={() => setIsNavOpen(true)} />

          <div className="admin-content">
            {/* Hidden File Input for Avatar */}
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files && e.target.files[0];
                if (file) uploadAvatar('admin', file);
                e.target.value = '';
              }}
            />

            {/* PAGE 1: DASHBOARD */}
            {adminPage === 'dashboard' && (
              <div>
                {/* 4 KPI stats */}
                <div className="grid g4 mb-6">
                  <div className="stat stat-accent">
                    <div className="stat-label">Total users</div>
                    <div className="stat-value">{activeUsers.length}</div>
                    <div className="stat-sub">
                      {totalClients.length} clients · {totalWorkers.length} workers ·{' '}
                      <span className="delta-up">+{newSignupsThisWeek}</span> this week
                    </div>
                    <div className="stat-icon"><i className="fas fa-users"></i></div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Workers online</div>
                    <div className="stat-value">{onlineWorkersCount}</div>
                    <div className="stat-sub">
                      {totalWorkers.length
                        ? `${Math.round((onlineWorkersCount / totalWorkers.length) * 100)}% of the workforce available`
                        : 'No workers registered'}
                    </div>
                    <div className="stat-icon"><i className="fas fa-signal"></i></div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Jobs posted</div>
                    <div className="stat-value">{db.jobs.length}</div>
                    <div className="stat-sub">{last7DaysJobsCount} posted in the last 7 days</div>
                    <div className="stat-icon"><i className="fas fa-briefcase"></i></div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Gross job value</div>
                    <div className="stat-value">{money(totalGmv)}</div>
                    <div className="stat-sub">
                      Across {pluralise(completedJobs.length, 'completed job')} ·{' '}
                      {money((db.settings.commission / 100) * totalGmv)} commission
                    </div>
                    <div className="stat-icon"><i className="fas fa-indian-rupee-sign"></i></div>
                  </div>
                </div>

                {/* 14-day Chart & Pipeline breakdown */}
                <div className="grid mb-6" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
                  <div className="card">
                    <div className="card-head">
                      <div>
                        <h4>Jobs posted — last 14 days</h4>
                        <p className="xs dim mt-1">Daily volume across all cities</p>
                      </div>
                    </div>
                    <div className="card-body">
                      <BarChart data={chart14Days} height={210} />
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <h4>Job pipeline</h4>
                    </div>
                    <div className="card-body">
                      <BarRows data={pipelineBreakdown} brand />
                    </div>
                  </div>
                </div>

                {/* 3 Ranked Lists Grid */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
                  <div className="card">
                    <div className="card-head">
                      <h4>Top skills in demand</h4>
                    </div>
                    <div className="card-body">
                      <BarRows data={skillDemandData} />
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <h4>Demand by city</h4>
                    </div>
                    <div className="card-body">
                      <BarRows data={cityDemandData} brand />
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <h4>Recent activity</h4>
                      <button
                        className="btn-link"
                        onClick={() => setAdminPage('logs')}
                      >
                        View all
                      </button>
                    </div>
                    <div className="card-body">
                      <div className="col gap-3">
                        {db.logs.slice(0, 6).map(l => (
                          <div key={l.id} className="row-top gap-3">
                            <span className="n-ico shrink0">
                              <i className={`fas ${logIcon(l.kind)}`}></i>
                            </span>
                            <div className="flex1">
                              <p className="small">{l.text}</p>
                              <p className="xs dim mt-1">{timeAgo(l.at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: VERIFICATION QUEUE */}
            {adminPage === 'verification' && (
              <div>
                <div className="segmented mb-4">
                  <button
                    className={verifFilter === 'pending' ? 'is-on' : ''}
                    onClick={() => setVerifFilter('pending')}
                  >
                    Pending
                  </button>
                  <button
                    className={verifFilter === 'approved' ? 'is-on' : ''}
                    onClick={() => setVerifFilter('approved')}
                  >
                    Approved
                  </button>
                  <button
                    className={verifFilter === 'rejected' ? 'is-on' : ''}
                    onClick={() => setVerifFilter('rejected')}
                  >
                    Rejected
                  </button>
                </div>

                <div className="card">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Worker</th>
                          <th>Skills</th>
                          <th>City</th>
                          <th>Applied</th>
                          <th className="right">Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifWorkers.length ? (
                          verifWorkers.map(u => (
                            <tr key={u.id}>
                              <td className="strong-cell">
                                <div className="row gap-3">
                                  <Avatar user={u} size="sm" />
                                  <div>
                                    <div>{u.name}</div>
                                    <div className="xs dim mono">+91 {u.phone}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="row wrap gap-1">
                                  {(u.skills || []).map(s => (
                                    <SkillChip key={s} skill={s} />
                                  ))}
                                </div>
                              </td>
                              <td>{u.city}</td>
                              <td>{timeAgo(u.createdAt)}</td>
                              <td className="right">
                                <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => setWorkerDrawer({ open: true, workerId: u.id })}
                                  >
                                    Review
                                  </button>
                                  {u.verification === 'pending' ? (
                                    <>
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => adminVerify(u.id, 'rejected')}
                                      >
                                        Reject
                                      </button>
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => adminVerify(u.id, 'approved')}
                                      >
                                        Approve
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-outline"
                                      onClick={() => adminVerify(u.id, 'pending')}
                                    >
                                      Reopen
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5}>
                              <EmptyState
                                icon="fa-user-check"
                                title={verifFilter === 'pending' ? 'Queue is clear' : 'Nothing here'}
                                text={
                                  verifFilter === 'pending'
                                    ? 'Every worker application has been reviewed.'
                                    : 'No workers in this state.'
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: JOB OVERSIGHT */}
            {adminPage === 'jobs' && (
              <div>
                <div className="spread wrap gap-3 mb-4">
                  <div className="row gap-2 wrap">
                    <select
                      className="select"
                      style={{ width: 'auto' }}
                      value={jobStatusFilter}
                      onChange={e => {
                        setJobStatusFilter(e.target.value);
                        setJobsPage(1);
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="InProgress">In progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <select
                      className="select"
                      style={{ width: 'auto' }}
                      value={jobCityFilter}
                      onChange={e => {
                        setJobCityFilter(e.target.value);
                        setJobsPage(1);
                      }}
                    >
                      <option value="all">All cities</option>
                      {db.cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="row gap-2">
                    <div className="input-icon">
                      <i className="fas fa-magnifying-glass"></i>
                      <input
                        className="input"
                        type="search"
                        placeholder="Search jobs…"
                        style={{ width: '210px' }}
                        value={jobSearch}
                        onChange={e => {
                          setJobSearch(e.target.value);
                          setJobsPage(1);
                        }}
                      />
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => exportCSV('jobs')}
                    >
                      <i className="fas fa-file-csv"></i> Export
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th
                            className={`sortable ${jobSort.key === 'id' ? 'is-sorted' : ''}`}
                            onClick={() => toggleJobSort('id')}
                          >
                            Job{' '}
                            <i
                              className={`fas sort-ind ${
                                jobSort.key === 'id'
                                  ? jobSort.dir === 1
                                    ? 'fa-arrow-up-short-wide'
                                    : 'fa-arrow-down-wide-short'
                                  : 'fa-sort'
                              }`}
                            />
                          </th>
                          <th>Client</th>
                          <th>Worker</th>
                          <th>Skill</th>
                          <th
                            className={`sortable ${jobSort.key === 'price' ? 'is-sorted' : ''}`}
                            onClick={() => toggleJobSort('price')}
                          >
                            Value{' '}
                            <i
                              className={`fas sort-ind ${
                                jobSort.key === 'price'
                                  ? jobSort.dir === 1
                                    ? 'fa-arrow-up-short-wide'
                                    : 'fa-arrow-down-wide-short'
                                  : 'fa-sort'
                              }`}
                            />
                          </th>
                          <th>Status</th>
                          <th
                            className={`sortable ${jobSort.key === 'createdAt' ? 'is-sorted' : ''}`}
                            onClick={() => toggleJobSort('createdAt')}
                          >
                            Posted{' '}
                            <i
                              className={`fas sort-ind ${
                                jobSort.key === 'createdAt'
                                  ? jobSort.dir === 1
                                    ? 'fa-arrow-up-short-wide'
                                    : 'fa-arrow-down-wide-short'
                                  : 'fa-sort'
                              }`}
                            />
                          </th>
                          <th className="right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedJobs.length ? (
                          pagedJobs.map(j => {
                            const client = userSafe(j.clientId);
                            const worker = j.workerId ? userSafe(j.workerId) : null;
                            const dispute = db.disputes.find(d => d.jobId === j.id && d.status === 'Open');

                            return (
                              <tr key={j.id}>
                                <td className="strong-cell mono">
                                  <button
                                    className="btn-link"
                                    onClick={() => setJobDrawer({ open: true, jobId: j.id })}
                                  >
                                    {j.id}
                                  </button>
                                  {dispute && (
                                    <i
                                      className="fas fa-scale-balanced"
                                      style={{ color: 'var(--st-critical)', marginLeft: '4px' }}
                                      title="Open dispute"
                                    />
                                  )}
                                  {j.sos && (
                                    <i
                                      className="fas fa-tower-broadcast"
                                      style={{ color: 'var(--st-critical)', marginLeft: '4px' }}
                                      title="SOS"
                                    />
                                  )}
                                  <div
                                    className="xs dim truncate"
                                    style={{ maxWidth: '190px', fontFamily: 'var(--font-ui)' }}
                                  >
                                    {j.title}
                                  </div>
                                </td>
                                <td>{client.name}</td>
                                <td>{worker ? worker.name : <span className="dim">—</span>}</td>
                                <td>{j.skill}</td>
                                <td className="mono">
                                  {j.price ? (
                                    money(j.price)
                                  ) : j.budget ? (
                                    <span className="dim">{money(j.budget)}*</span>
                                  ) : (
                                    <span className="dim">—</span>
                                  )}
                                </td>
                                <td><StatusBadge job={j} /></td>
                                <td>{timeAgo(j.createdAt)}</td>
                                <td className="right">
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => setJobDrawer({ open: true, jobId: j.id })}
                                  >
                                    Open
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8}>
                              <EmptyState
                                icon="fa-briefcase"
                                title="No jobs match"
                                text="Adjust the filters or clear the search."
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pager */}
                  <div className="pager">
                    <span>
                      {jobRows.length
                        ? `${(currentJobsPage - 1) * PAGE_SIZE + 1}–${Math.min(currentJobsPage * PAGE_SIZE, jobRows.length)} of ${jobRows.length}`
                        : '0 results'}
                    </span>
                    <div className="row gap-2">
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={currentJobsPage <= 1}
                        onClick={() => setJobsPage(prev => Math.max(1, prev - 1))}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <span className="small strong">{currentJobsPage} / {totalJobPages}</span>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={currentJobsPage >= totalJobPages}
                        onClick={() => setJobsPage(prev => Math.min(totalJobPages, prev + 1))}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 4: DISPUTES */}
            {adminPage === 'disputes' && (
              <div>
                <div className="segmented mb-4">
                  <button
                    className={disputeFilter === 'Open' ? 'is-on' : ''}
                    onClick={() => setDisputeFilter('Open')}
                  >
                    Open
                  </button>
                  <button
                    className={disputeFilter === 'Resolved' ? 'is-on' : ''}
                    onClick={() => setDisputeFilter('Resolved')}
                  >
                    Resolved
                  </button>
                  <button
                    className={disputeFilter === 'all' ? 'is-on' : ''}
                    onClick={() => setDisputeFilter('all')}
                  >
                    All
                  </button>
                </div>

                <div className="col gap-4">
                  {disputeRows.length ? (
                    disputeRows.map(d => {
                      const job = db.jobs.find(j => j.id === d.jobId);
                      const byUser = userSafe(d.byId);
                      const otherUser = job ? userSafe(d.byId === job.clientId ? job.workerId : job.clientId) : null;

                      return (
                        <div key={d.id} className="card">
                          <div className="card-head">
                            <div className="row gap-3">
                              <span className={`badge ${d.status === 'Open' ? 'badge-critical' : 'badge-good'}`}>
                                <i className={`fas ${d.status === 'Open' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />{' '}
                                Dispute {d.status}
                              </span>
                              <div>
                                <p className="strong small">{d.category}</p>
                                <p className="xs dim">
                                  {job ? `${job.id} · ${job.title}` : 'Job removed'}
                                </p>
                              </div>
                            </div>
                            <span className="xs dim">{timeAgo(d.at)}</span>
                          </div>

                          <div className="card-body">
                            <div className="row gap-3 mb-3">
                              <Avatar user={byUser} size="sm" />
                              <div>
                                <p className="small strong">
                                  {byUser.name} <span className="badge badge-neutral cap">{d.byRole}</span>
                                </p>
                                {otherUser && (
                                  <p className="xs dim">against {otherUser.name}</p>
                                )}
                              </div>
                            </div>
                            <p className="small muted" style={{ lineHeight: 1.65 }}>
                              {d.text}
                            </p>
                            {d.resolution && (
                              <div className="panel mt-3">
                                <p className="eyebrow">Ruling</p>
                                <p className="small mt-1">{d.resolution}</p>
                                <p className="xs dim mt-1">{dateStr(d.resolvedAt)}</p>
                              </div>
                            )}
                          </div>

                          <div className="card-foot row gap-2 wrap">
                            {job && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setJobDrawer({ open: true, jobId: job.id })}
                              >
                                <i className="fas fa-clock-rotate-left"></i> Full job history
                              </button>
                            )}
                            {d.status === 'Open' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => adminResolveDispute(d.id)}
                              >
                                <i className="fas fa-gavel"></i> Record a ruling
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      icon="fa-scale-balanced"
                      title={disputeFilter === 'Open' ? 'No open disputes' : 'Nothing here'}
                      text={
                        disputeFilter === 'Open'
                          ? 'Both sides are happy — nothing needs a ruling right now.'
                          : 'Try another filter.'
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {/* PAGE 5: USERS */}
            {adminPage === 'users' && (
              <div>
                <div className="spread wrap gap-3 mb-4">
                  <div className="segmented">
                    <button
                      className={userRoleFilter === 'all' ? 'is-on' : ''}
                      onClick={() => {
                        setUserRoleFilter('all');
                        setUsersPage(1);
                      }}
                    >
                      All
                    </button>
                    <button
                      className={userRoleFilter === 'client' ? 'is-on' : ''}
                      onClick={() => {
                        setUserRoleFilter('client');
                        setUsersPage(1);
                      }}
                    >
                      Clients
                    </button>
                    <button
                      className={userRoleFilter === 'worker' ? 'is-on' : ''}
                      onClick={() => {
                        setUserRoleFilter('worker');
                        setUsersPage(1);
                      }}
                    >
                      Workers
                    </button>
                    <button
                      className={userRoleFilter === 'admin' ? 'is-on' : ''}
                      onClick={() => {
                        setUserRoleFilter('admin');
                        setUsersPage(1);
                      }}
                    >
                      Admins
                    </button>
                  </div>

                  <div className="row gap-2">
                    <div className="input-icon">
                      <i className="fas fa-magnifying-glass"></i>
                      <input
                        className="input"
                        type="search"
                        placeholder="Search name or phone…"
                        style={{ width: '230px' }}
                        value={userSearch}
                        onChange={e => {
                          setUserSearch(e.target.value);
                          setUsersPage(1);
                        }}
                      />
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => exportCSV('users')}
                    >
                      <i className="fas fa-file-csv"></i> Export
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th
                            className={`sortable ${userSort.key === 'name' ? 'is-sorted' : ''}`}
                            onClick={() => toggleUserSort('name')}
                          >
                            User{' '}
                            <i
                              className={`fas sort-ind ${
                                userSort.key === 'name'
                                  ? userSort.dir === 1
                                    ? 'fa-arrow-up-short-wide'
                                    : 'fa-arrow-down-wide-short'
                                  : 'fa-sort'
                              }`}
                            />
                          </th>
                          <th>Role</th>
                          <th>City</th>
                          <th
                            className={`sortable ${userSort.key === 'rating' ? 'is-sorted' : ''}`}
                            onClick={() => toggleUserSort('rating')}
                          >
                            Rating{' '}
                            <i
                              className={`fas sort-ind ${
                                userSort.key === 'rating'
                                  ? userSort.dir === 1
                                    ? 'fa-arrow-up-short-wide'
                                    : 'fa-arrow-down-wide-short'
                                  : 'fa-sort'
                              }`}
                            />
                          </th>
                          <th
                            className={`sortable ${userSort.key === 'jobs' ? 'is-sorted' : ''}`}
                            onClick={() => toggleUserSort('jobs')}
                          >
                            Jobs{' '}
                            <i
                              className={`fas sort-ind ${
                                userSort.key === 'jobs'
                                  ? userSort.dir === 1
                                    ? 'fa-arrow-up-short-wide'
                                    : 'fa-arrow-down-wide-short'
                                  : 'fa-sort'
                              }`}
                            />
                          </th>
                          <th>Status</th>
                          <th className="right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUsers.length ? (
                          pagedUsers.map(u => {
                            const st = u.role === 'worker' ? workerStats(u.id) : null;
                            const isMe = u.id === me.id;

                            return (
                              <tr key={u.id}>
                                <td className="strong-cell">
                                  <div className="row gap-3">
                                    <Avatar user={u} size="sm" />
                                    <div>
                                      <div>
                                        {u.name} {isMe && <span className="badge badge-brand">You</span>}
                                      </div>
                                      <div className="xs dim mono">+91 {u.phone}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-neutral cap">
                                    <i className={`fas ${ROLE_META[u.role].icon}`}></i> {u.role}
                                  </span>
                                </td>
                                <td>{u.city}</td>
                                <td>
                                  {st ? (
                                    <>
                                      <Stars rating={st.rating} />{' '}
                                      <span className="mono">{st.ratingLabel}</span>
                                    </>
                                  ) : (
                                    <span className="dim">—</span>
                                  )}
                                </td>
                                <td className="mono">{countJobs(u)}</td>
                                <td>
                                  {u.suspended ? (
                                    <span className="badge badge-critical">
                                      <i className="fas fa-ban"></i> Suspended
                                    </span>
                                  ) : u.role === 'worker' ? (
                                    <VerifyBadge worker={u} />
                                  ) : (
                                    <span className="badge badge-good">
                                      <i className="fas fa-circle-check"></i> Active
                                    </span>
                                  )}
                                </td>
                                <td className="right">
                                  <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                                    {u.role === 'worker' && (
                                      <button
                                        className="btn btn-sm btn-outline"
                                        onClick={() => setWorkerDrawer({ open: true, workerId: u.id })}
                                      >
                                        View
                                      </button>
                                    )}
                                    {isMe ? (
                                      <span className="xs dim">—</span>
                                    ) : (
                                      <>
                                        <button
                                          className="btn btn-sm btn-outline"
                                          onClick={() => adminSuspend(u.id)}
                                        >
                                          {u.suspended ? 'Reinstate' : 'Suspend'}
                                        </button>
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={() => adminDeleteUser(u.id)}
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7}>
                              <EmptyState
                                icon="fa-users"
                                title="No users match"
                                text="Change the role filter or clear the search."
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pager */}
                  <div className="pager">
                    <span>
                      {userRows.length
                        ? `${(currentUsersPage - 1) * PAGE_SIZE + 1}–${Math.min(currentUsersPage * PAGE_SIZE, userRows.length)} of ${userRows.length}`
                        : '0 results'}
                    </span>
                    <div className="row gap-2">
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={currentUsersPage <= 1}
                        onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <span className="small strong">{currentUsersPage} / {totalUserPages}</span>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={currentUsersPage >= totalUserPages}
                        onClick={() => setUsersPage(prev => Math.min(totalUserPages, prev + 1))}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 6: RATINGS MODERATION */}
            {adminPage === 'ratings' && (
              <div>
                <div className="spread wrap gap-3 mb-4">
                  <div className="segmented">
                    <button
                      className={ratingFilter === 'all' ? 'is-on' : ''}
                      onClick={() => setRatingFilter('all')}
                    >
                      All reviews
                    </button>
                    <button
                      className={ratingFilter === 'low' ? 'is-on' : ''}
                      onClick={() => setRatingFilter('low')}
                    >
                      1–2 stars
                    </button>
                  </div>
                  <p className="small muted">
                    Removing a review recalculates the worker's average and lets the client rate again.
                  </p>
                </div>

                <div className="col gap-3">
                  {ratingsRows.length ? (
                    ratingsRows.map(r => {
                      const worker = userSafe(r.workerId);
                      const client = userSafe(r.clientId);
                      const job = db.jobs.find(j => j.id === r.jobId);

                      return (
                        <div key={r.id} className="card card-pad">
                          <div className="spread wrap gap-3">
                            <div className="row gap-3 flex1" style={{ minWidth: 0 }}>
                              <Avatar user={worker} />
                              <div style={{ minWidth: 0 }}>
                                <p className="small strong">
                                  {worker.name} <Stars rating={r.stars} />
                                </p>
                                <p className="xs dim">
                                  from {client.name} · {job ? job.title : 'job removed'} · {timeAgo(r.at)}
                                </p>
                                {r.text ? (
                                  <p className="small muted mt-2">“{r.text}”</p>
                                ) : (
                                  <p className="xs dim mt-2">No written review.</p>
                                )}
                              </div>
                            </div>
                            <button
                              className="btn btn-sm btn-outline shrink0"
                              onClick={() => adminRemoveReview(r.id)}
                            >
                              <i className="fas fa-trash"></i> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      icon="fa-star"
                      title="No reviews here"
                      text={
                        ratingFilter === 'low'
                          ? 'No client has left a 1 or 2 star review.'
                          : 'Reviews appear once clients rate completed jobs.'
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {/* PAGE 7: SETTINGS */}
            {adminPage === 'settings' && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                {/* Admin Profile */}
                <div className="card">
                  <div className="card-head">
                    <h4>Administrator profile</h4>
                  </div>
                  <div className="card-body">
                    <div className="row gap-4 mb-4">
                      <div style={{ position: 'relative' }}>
                        <Avatar user={me} size="lg" />
                        <button
                          className="btn btn-primary btn-icon btn-sm"
                          style={{ position: 'absolute', bottom: '-2px', right: '-2px', borderRadius: '50%' }}
                          onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                          aria-label="Change photo"
                        >
                          <i className="fas fa-camera"></i>
                        </button>
                      </div>
                      <div>
                        <p className="strong">{me.name}</p>
                        <p className="small muted mono">+91 {me.phone}</p>
                      </div>
                    </div>

                    {isEditingAdminProfile && (
                      <div className="col gap-3 mb-4">
                        <div className="field">
                          <label className="label">Name</label>
                          <input
                            className={`input ${adminErrors.name ? 'input-err' : ''}`}
                            value={adminName}
                            onChange={e => setAdminName(e.target.value)}
                          />
                          {adminErrors.name && (
                            <p className="err-msg">
                              <i className="fas fa-circle-exclamation"></i> {adminErrors.name}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label className="label">Phone</label>
                          <input
                            className={`input mono ${adminErrors.phone ? 'input-err' : ''}`}
                            maxLength={10}
                            inputMode="numeric"
                            value={adminPhone}
                            onChange={e => setAdminPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          />
                          {adminErrors.phone && (
                            <p className="err-msg">
                              <i className="fas fa-circle-exclamation"></i> {adminErrors.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="row gap-2">
                      {!isEditingAdminProfile ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setAdminName(me.name);
                            setAdminPhone(me.phone);
                            setAdminErrors({});
                            setIsEditingAdminProfile(true);
                          }}
                        >
                          Edit profile
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={handleSaveAdminProfile}
                          >
                            <i className="fas fa-check"></i> Save
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setIsEditingAdminProfile(false)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service Categories */}
                <div className="card">
                  <div className="card-head">
                    <h4>Service categories</h4>
                    <span className="badge badge-neutral">{db.categories.length}</span>
                  </div>
                  <div className="card-body">
                    <div className="row wrap gap-2 mb-4">
                      {db.categories.map(c => (
                        <span key={c} className="chip">
                          <i className="fas fa-tag" style={{ color: 'var(--brand)' }}></i> {c}
                          <button
                            type="button"
                            onClick={() => adminRemoveCategory(c)}
                            aria-label={`Remove ${c}`}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="row gap-2">
                      <input
                        className="input flex1"
                        placeholder="e.g. Carpentry"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            adminAddCategory(newCategoryName);
                            setNewCategoryName('');
                          }
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          adminAddCategory(newCategoryName);
                          setNewCategoryName('');
                        }}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cities Served */}
                <div className="card">
                  <div className="card-head">
                    <h4>Cities served</h4>
                    <span className="badge badge-neutral">{db.cities.length}</span>
                  </div>
                  <div className="card-body">
                    <div className="row wrap gap-2 mb-4">
                      {db.cities.map(city => (
                        <span key={city} className="chip">
                          <i className="fas fa-location-dot"></i> {city}
                          <button
                            type="button"
                            onClick={() => adminRemoveCity(city)}
                            aria-label={`Remove ${city}`}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="row gap-2">
                      <input
                        className="input flex1"
                        placeholder="e.g. Nadiad"
                        value={newCityName}
                        onChange={e => setNewCityName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            adminAddCity(newCityName);
                            setNewCityName('');
                          }
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          adminAddCity(newCityName);
                          setNewCityName('');
                        }}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Platform Rules */}
                <div className="card">
                  <div className="card-head">
                    <h4>Platform rules</h4>
                  </div>
                  <div className="card-body col gap-4">
                    <div className="spread gap-4">
                      <div className="flex1">
                        <p className="small strong">Emergency SOS broadcast</p>
                        <p className="xs muted">Lets clients alert every available worker, bypassing skill matching.</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={db.settings.sosEnabled}
                          onChange={e => adminSetting('sosEnabled', e.target.checked)}
                        />
                        <span className="track"></span>
                      </label>
                    </div>

                    <div className="spread gap-4">
                      <div className="flex1">
                        <p className="small strong">Require verification to quote</p>
                        <p className="xs muted">Unverified workers can browse but not send quotes.</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={db.settings.requireVerification}
                          onChange={e => adminSetting('requireVerification', e.target.checked)}
                        />
                        <span className="track"></span>
                      </label>
                    </div>

                    <div className="spread gap-4">
                      <div className="flex1">
                        <p className="small strong">Auto-approve new workers</p>
                        <p className="xs muted">Skips the manual verification queue. Not recommended.</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={db.settings.autoApprove}
                          onChange={e => adminSetting('autoApprove', e.target.checked)}
                        />
                        <span className="track"></span>
                      </label>
                    </div>

                    <div className="field">
                      <label className="label">
                        Platform commission — {db.settings.commission}% of job value
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        style={{ accentColor: 'var(--brand)' }}
                        value={db.settings.commission}
                        onChange={e => adminSetting('commission', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div
                  className="card"
                  style={{ borderColor: 'color-mix(in srgb, var(--st-critical) 35%, var(--border))' }}
                >
                  <div className="card-head">
                    <h4 style={{ color: 'var(--st-critical)' }}>Danger zone</h4>
                  </div>
                  <div className="card-body col gap-4">
                    <div className="spread wrap gap-3">
                      <div>
                        <p className="small strong">Reseed demo data</p>
                        <p className="xs muted">Restores the sample cities, workers, jobs and reviews.</p>
                      </div>
                      <button className="btn btn-outline btn-sm" onClick={reseedDemo}>
                        Reseed
                      </button>
                    </div>

                    <div className="spread wrap gap-3">
                      <div>
                        <p className="small strong">Wipe everything</p>
                        <p className="xs muted">Clears local storage and reloads with a blank platform.</p>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={wipeDemo}>
                        Wipe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 8: ACTIVITY LOGS */}
            {adminPage === 'logs' && (
              <div>
                <div className="spread wrap gap-3 mb-4">
                  <div className="input-icon" style={{ maxWidth: '320px', width: '100%' }}>
                    <i className="fas fa-magnifying-glass"></i>
                    <input
                      className="input"
                      type="search"
                      placeholder="Filter activity…"
                      value={logSearch}
                      onChange={e => setLogSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={adminClearLogs}
                  >
                    <i className="fas fa-eraser"></i> Clear log
                  </button>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="col">
                      {filteredLogs.length ? (
                        filteredLogs.map(l => {
                          const actor = l.actor ? userSafe(l.actor) : null;
                          return (
                            <div key={l.id} className="earn-row">
                              <div className="row gap-3 flex1" style={{ minWidth: 0 }}>
                                <span className="n-ico shrink0">
                                  <i className={`fas ${logIcon(l.kind)}`}></i>
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <p className="small">{l.text}</p>
                                  <p className="xs dim">
                                    {actor ? actor.name : 'System'} · {l.kind}
                                  </p>
                                </div>
                              </div>
                              <span className="xs dim shrink0">{timeAgo(l.at)}</span>
                            </div>
                          );
                        })
                      ) : (
                        <EmptyState
                          icon="fa-terminal"
                          title="Nothing logged"
                          text={logSearch ? 'No entries match that filter.' : 'Activity shows up here as it happens.'}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

