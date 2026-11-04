import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import { ROLE_META, ADMIN_PASSCODE } from '../../utils/constants';
import { isPhone } from '../../utils/formatters';
import Avatar from '../common/Avatar';
import SkillChip from '../common/SkillChip';
import * as backendAuth from '../../services/auth';
import { BACKEND_ENABLED } from '../../services/backendSync';

export default function AuthModal() {
  const { db, authModal, closeAuth, demoLogin, authRegister, toast } = useApp();
  const { open, role: initialRole, mode: initialMode } = authModal;

  const [role, setRole] = useState(initialRole || 'client');
  const [mode, setMode] = useState(initialMode || 'login');
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP

  // Form Fields
  const [name, setName] = useState('');
  const [city, setCity] = useState(db.cities[0] || 'Anand');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skills, setSkills] = useState([]);
  const [passcode, setPasscode] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('000000');

  // Field Errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setRole(initialRole || 'client');
      setMode(initialRole === 'admin' ? 'login' : (initialMode || 'login'));
      setStep(1);
      setName('');
      setCity(db.cities[0] || 'Anand');
      setArea('');
      setPhone('');
      setEmail('');
      setPassword('');
      setSkills([]);
      setPasscode('');
      setOtp('');
      setErrors({});
    }
  }, [open, initialRole, initialMode, db.cities]);

  if (!open) return null;

  const meta = ROLE_META[role] || ROLE_META.client;

  // Admin accounts are provisioned by the platform and cannot be created
  // through the public registration form.
  const canSignup = role !== 'admin';

  // Filter demo accounts for quick sign in
  const demoAccounts = BACKEND_ENABLED ? [] : db.users
    .filter(u => {
      if (role === 'client') return u.role === 'client';
      if (role === 'worker') return u.role === 'worker' && u.verification === 'approved';
      return u.role === 'admin';
    })
    .slice(0, 2);

  const toggleSkill = (cat) => {
    setSkills(prev => {
      const exists = prev.includes(cat);
      const next = exists ? prev.filter(s => s !== cat) : [...prev, cat];
      if (next.length > 0) {
        setErrors(errs => ({ ...errs, skills: '' }));
      }
      return next;
    });
  };

  const handleSendOtp = async () => {
    if (BACKEND_ENABLED) {
      const errs = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
      if (password.length < 8) errs.password = 'Password must contain at least 8 characters.';
      if (mode === 'signup' && name.trim().length < 2) errs.name = 'Enter your full name.';
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }

      try {
        if (mode === 'signup' && !canSignup) {
          setMode('login');
          setErrors({ email: 'Admin accounts can only sign in. Contact the platform administrator for an admin account.' });
          return;
        }
        if (mode === 'signup') {
          await backendAuth.register({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role
          });
          const logged = await backendAuth.login({
            email: email.trim().toLowerCase(),
            password
          });
          if (role === 'worker') {
            // Worker profile fields are kept in the same backend account flow.
            try {
              const { workers } = await import('../../services/domain');
              await workers.update({ city, area: area.trim(), skills });
            } catch (_) {}
          } else {
            try {
              const { client } = await import('../../services/domain');
              await client.update({ city, area: area.trim() });
            } catch (_) {}
          }
          closeAuth();
          toast(`Signed in as ${logged.user?.name || name.trim()}.`, 'success');
          window.location.reload();
          return;
        }

        const logged = await backendAuth.login({
          email: email.trim().toLowerCase(),
          password
        });
        closeAuth();
        toast(`Signed in as ${logged.user?.name || 'User'}.`, 'success');
        window.location.reload();
        return;
      } catch (error) {
        setErrors({ email: error.message || 'Authentication failed.' });
        return;
      }
    }

    const errs = {};
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);

    if (!isPhone(cleanPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    const existingUser = db.users.find(u => u.phone === cleanPhone);

    if (mode === 'login') {
      if (!errs.phone && !existingUser) {
        errs.phone = 'No account with this number. Switch to "Create account".';
      } else if (!errs.phone && existingUser.role !== role) {
        errs.phone = `That number is registered as a ${existingUser.role}. Open the ${existingUser.role} door instead.`;
      } else if (!errs.phone && existingUser.suspended) {
        errs.phone = 'This account is suspended. Contact platform support.';
      }
    } else {
      if (name.trim().length < 3) {
        errs.name = 'Enter your full name (at least 3 characters).';
      }
      if (area.trim().length < 2) {
        errs.area = 'Tell us your area so we can match you locally.';
      }
      if (!errs.phone && existingUser) {
        errs.phone = 'That number already has an account. Sign in instead.';
      }
      if (role === 'worker' && !skills.length) {
        errs.skills = 'Pick at least one skill.';
      }
      if (role === 'admin' && passcode !== ADMIN_PASSCODE) {
        errs.passcode = 'Incorrect admin passcode.';
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const mockCode = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(mockCode);
    setOtp('');
    setStep(2);
  };

  const handleVerify = () => {
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrors({ otp: 'Enter the 6-digit code.' });
      return;
    }
    if (cleanOtp !== generatedOtp) {
      setErrors({ otp: 'That code is not correct. Check the code above.' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    const existingUser = db.users.find(u => u.phone === cleanPhone);

    if (mode === 'login') {
      if (existingUser) {
        demoLogin(existingUser.id);
      }
    } else {
      authRegister({
        role,
        name: name.trim(),
        phone: cleanPhone,
        city,
        area: area.trim(),
        skills
      });
    }
  };

  const handleResend = () => {
    const mockCode = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(mockCode);
    setOtp('');
    setErrors({});
    toast('A new code has been generated.', 'info');
  };

  return (
    <div className="modal" onClick={closeAuth}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow" id="auth-eyebrow">
              <i className={`fas ${meta.icon}`}></i> {meta.label} access
            </p>
            <h3 className="mt-1">
              {mode === 'login'
                ? 'Welcome back'
                : role === 'worker'
                ? 'Start taking jobs'
                : 'Create your account'}
            </h3>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeAuth}
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Sign In / Sign Up Segmented Control */}
          <div className="segmented mb-5" style={{ width: '100%' }}>
            <button
              className={`${canSignup ? 'flex1' : 'btn-block'} ${mode === 'login' ? 'is-on' : ''}`}
              onClick={() => {
                setMode('login');
                setStep(1);
                setErrors({});
              }}
            >
              Sign in
            </button>
            {canSignup && (
              <button
                className={`flex1 ${mode === 'signup' ? 'is-on' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setStep(1);
                  setErrors({});
                }}
              >
                Create account
              </button>
            )}
          </div>

          {step === 1 ? (
            <div className="col gap-4">
              {mode === 'signup' && (
                <div className="col gap-4">
                  <div className="field">
                    <label className="label">Full name</label>
                    <input
                      className={`input ${errors.name ? 'input-err' : ''}`}
                      placeholder="e.g. Riya Patel"
                      value={name}
                      onChange={e => {
                        setName(e.target.value);
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                      }}
                    />
                    {errors.name && (
                      <p className="err-msg">
                        <i className="fas fa-circle-exclamation"></i> {errors.name}
                      </p>
                    )}
                  </div>

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

                  {role === 'worker' && (
                    <div className="field">
                      <label className="label">Your skills — pick at least one</label>
                      <div className="row wrap gap-2">
                        {db.categories.map(cat => (
                          <SkillChip
                            key={cat}
                            skill={cat}
                            asButton
                            selected={skills.includes(cat)}
                            onClick={() => toggleSkill(cat)}
                          />
                        ))}
                      </div>
                      {errors.skills && (
                        <p className="err-msg">
                          <i className="fas fa-circle-exclamation"></i> {errors.skills}
                        </p>
                      )}
                    </div>
                  )}

                </div>
              )}

              {BACKEND_ENABLED && (
                <div className="grid g2">
                  <div className="field">
                    <label className="label">Email</label>
                    <input
                      className={`input ${errors.email ? 'input-err' : ''}`}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                      }}
                    />
                    {errors.email && <p className="err-msg"><i className="fas fa-circle-exclamation"></i> {errors.email}</p>}
                  </div>
                  <div className="field">
                    <label className="label">Password</label>
                    <input
                      className={`input ${errors.password ? 'input-err' : ''}`}
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                      }}
                    />
                    {errors.password && <p className="err-msg"><i className="fas fa-circle-exclamation"></i> {errors.password}</p>}
                  </div>
                </div>
              )}

              {/* Phone Field */}
              {!BACKEND_ENABLED && <div className="field">
                <label className="label">Phone number</label>
                <div className="row gap-2">
                  <span
                    className="input mono shrink0"
                    style={{
                      width: '64px',
                      textAlign: 'center',
                      background: 'var(--surface-2)',
                      color: 'var(--text-2)'
                    }}
                  >
                    +91
                  </span>
                  <input
                    className={`input mono flex1 ${errors.phone ? 'input-err' : ''}`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit number"
                    value={phone}
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(clean);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                  />
                </div>
                {errors.phone && (
                  <p className="err-msg">
                    <i className="fas fa-circle-exclamation"></i> {errors.phone}
                  </p>
                )}
              </div>}

              <button
                className="btn btn-primary btn-lg btn-block"
                onClick={handleSendOtp}
              >
                {BACKEND_ENABLED ? (mode === 'login' ? 'Sign in' : 'Create account') : 'Send verification code'}
                <i className="fas fa-arrow-right"></i>
              </button>

              {/* Demo Accounts Quick-Login List */}
              {mode === 'login' && (
                <div>
                  <div className="row gap-3 mb-3">
                    <hr className="divider flex1" style={{ margin: 0 }} />
                    <span className="xs dim">or use a demo account</span>
                    <hr className="divider flex1" style={{ margin: 0 }} />
                  </div>
                  <div className="col gap-2">
                    {demoAccounts.length ? (
                      demoAccounts.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          className="offer-row"
                          onClick={() => demoLogin(u.id)}
                        >
                          <Avatar user={u} size="sm" />
                          <div className="flex1" style={{ textAlign: 'left' }}>
                            <div className="small strong">{u.name}</div>
                            <div className="xs dim mono">+91 {u.phone} · {u.city}</div>
                          </div>
                          <i className="fas fa-arrow-right dim xs"></i>
                        </button>
                      ))
                    ) : (
                      <p className="xs dim center">No demo {role} accounts exist yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: OTP Verification */
            <div className="col gap-4">
              <button
                className="btn-link"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setStep(1)}
              >
                <i className="fas fa-arrow-left"></i> Change details
              </button>

              <div>
                <h4>Enter your code</h4>
                <p className="small muted mt-1">
                  Sent to <span className="strong mono">+91 {phone}</span>
                </p>
              </div>

              <div className="panel center" style={{ borderStyle: 'dashed' }}>
                <p className="eyebrow">Demo mode — your code is</p>
                <p
                  className="mono"
                  style={{
                    fontSize: '1.7rem',
                    fontWeight: 700,
                    letterSpacing: '.35em',
                    color: 'var(--brand)',
                    marginTop: '6px'
                  }}
                >
                  {generatedOtp}
                </p>
              </div>

              <div className="field">
                <input
                  className={`input otp-input ${errors.otp ? 'input-err' : ''}`}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="——————"
                  value={otp}
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(clean);
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleVerify();
                  }}
                  autoFocus
                />
                {errors.otp && (
                  <p className="err-msg">
                    <i className="fas fa-circle-exclamation"></i> {errors.otp}
                  </p>
                )}
              </div>

              <button
                className="btn btn-primary btn-lg btn-block"
                onClick={handleVerify}
              >
                Verify &amp; continue
              </button>

              <button
                className="btn-link center"
                onClick={handleResend}
              >
                Resend code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

