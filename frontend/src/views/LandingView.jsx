import React, { useEffect, useState } from 'react';
import { useApp } from '../context/useApp';

export default function LandingView() {
  const { db, openAuth } = useApp();
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const workersCount = db.users.filter(u => u.role === 'worker' && !u.suspended).length;
  const completedJobsCount = db.jobs.filter(j => j.status === 'Completed').length;
  const avgRating = db.reviews.length
    ? (db.reviews.reduce((s, r) => s + r.stars, 0) / db.reviews.length).toFixed(1) + '★'
    : '—';

  return (
    <section id="view-landing" className="view">
      {/* Navigation */}
      <nav className={`lp-nav ${navSolid ? 'solid' : ''}`} id="lp-nav">
        <div className="container">
          <a className="lp-logo" href="#top">
            <span className="mark">
              <i className="fas fa-bolt-lightning"></i>
            </span>{' '}
            skillConnect
          </a>
          <div className="lp-links">
            <a href="#how">How it works</a>
            <a href="#roles">For you</a>
            <a href="#features">Platform</a>
            <a href="#trust">Trust &amp; safety</a>
          </div>
          <div className="row gap-2">
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#b6c4de' }}
              onClick={() => openAuth('client', 'login')}
            >
              Sign in
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openAuth('client', 'signup')}
            >
              Get started <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-hero" id="top">
        <div className="container">
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)',
              gap: 'var(--sp-12)',
              alignItems: 'center'
            }}
          >
            <div>
              <span className="lp-pill">
                <b>LIVE</b> Serving {db.cities.length} cities across Gujarat
              </span>
              <h1 className="mt-4">
                The local trades market,
                <br />
                <span className="grad">run like a business.</span>
              </h1>
              <p className="lead mt-4">
                Post what you need. Verified workers nearby send you real quotes with a price and an ETA. You compare, you choose, you pay on completion — nothing happens without your say-so.
              </p>
              <div className="row wrap gap-3 mt-6">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => openAuth('client', 'signup')}
                >
                  <i className="fas fa-clipboard-list"></i> Post a job — it's free
                </button>
                <button
                  className="btn btn-lg"
                  style={{
                    '--btn-bg': 'rgba(255,255,255,.09)',
                    '--btn-bd': 'rgba(255,255,255,.18)',
                    '--btn-fg': '#fff'
                  }}
                  onClick={() => openAuth('worker', 'signup')}
                >
                  <i className="fas fa-screwdriver-wrench"></i> Find work near me
                </button>
              </div>
              <div className="lp-hero-stats">
                <div>
                  <div className="v">{workersCount}</div>
                  <div className="k">Skilled workers</div>
                </div>
                <div>
                  <div className="v">{completedJobsCount}</div>
                  <div className="k">Jobs completed</div>
                </div>
                <div>
                  <div className="v">{avgRating}</div>
                  <div className="k">Avg. rating</div>
                </div>
                <div>
                  <div className="v">₹0</div>
                  <div className="k">Client platform fee</div>
                </div>
              </div>
            </div>

            {/* Live interactive product preview card */}
            <div className="lp-glass">
              <div className="spread mb-4">
                <div className="row gap-2">
                  <span className="avatar avatar-sm" style={{ background: '#1d4ed8', color: '#fff' }}>
                    RP
                  </span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem' }}>
                      Leaking kitchen tap
                    </div>
                    <div style={{ color: '#8fa3c4', fontSize: '.72rem' }}>
                      Ganesh Chowk, Anand · posted 4 min ago
                    </div>
                  </div>
                </div>
                <span className="badge" style={{ background: 'rgba(250,178,25,.18)', color: '#fcd34d' }}>
                  <i className="fas fa-hourglass-half"></i> 3 quotes
                </span>
              </div>
              <div className="col gap-2">
                <div
                  className="row"
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(12,163,12,.45)',
                    borderRadius: '11px',
                    padding: '11px'
                  }}
                >
                  <span className="avatar avatar-sm" style={{ background: '#0ca30c', color: '#fff' }}>
                    AM
                  </span>
                  <div className="flex1">
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '.83rem' }}>
                      Arjun Mistry <i className="fas fa-circle-check" style={{ color: '#60a5fa', fontSize: '.72rem' }}></i>
                    </div>
                    <div style={{ color: '#8fa3c4', fontSize: '.72rem' }}>
                      ★ 4.9 · 63 jobs · arrives in ~25 min
                    </div>
                  </div>
                  <div className="right">
                    <div className="price-tag" style={{ color: '#fff' }}>₹450</div>
                    <div style={{ color: '#4ade80', fontSize: '.66rem', fontWeight: 800 }}>
                      BEST VALUE
                    </div>
                  </div>
                </div>

                <div
                  className="row"
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: '11px',
                    padding: '11px'
                  }}
                >
                  <span className="avatar avatar-sm" style={{ background: '#5b3df5', color: '#fff' }}>
                    KS
                  </span>
                  <div className="flex1">
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '.83rem' }}>
                      Kiran Solanki
                    </div>
                    <div style={{ color: '#8fa3c4', fontSize: '.72rem' }}>
                      ★ 4.6 · 28 jobs · arrives in ~40 min
                    </div>
                  </div>
                  <div className="price-tag" style={{ color: '#cbd5e1' }}>₹520</div>
                </div>

                <div
                  className="row"
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: '11px',
                    padding: '11px'
                  }}
                >
                  <span className="avatar avatar-sm" style={{ background: '#eb6834', color: '#fff' }}>
                    VP
                  </span>
                  <div className="flex1">
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '.83rem' }}>
                      Vipul Patel
                    </div>
                    <div style={{ color: '#8fa3c4', fontSize: '.72rem' }}>
                      ★ 4.4 · 15 jobs · arrives in ~15 min
                    </div>
                  </div>
                  <div className="price-tag" style={{ color: '#cbd5e1' }}>₹600</div>
                </div>
              </div>
              <p className="mt-4 center" style={{ color: '#8fa3c4', fontSize: '.74rem' }}>
                <i className="fas fa-lock"></i> You pick the quote. The job only starts after you accept.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ROLES SECTION */}
      <section className="lp-section" id="roles">
        <div className="container">
          <div className="center mb-6">
            <p className="eyebrow">Three ways in</p>
            <h2 className="mt-2">Pick the door that fits you</h2>
            <p className="lead mt-3" style={{ maxWidth: '560px', marginInline: 'auto' }}>
              Every role gets its own purpose-built workspace — not the same dashboard with fields hidden.
            </p>
          </div>
          <div className="grid g3">
            {/* Client Role Card */}
            <button
              className="role-card"
              style={{ '--rc-color': '#2563eb' }}
              onClick={() => openAuth('client', 'signup')}
            >
              <div className="rc-ico">
                <i className="fas fa-house-chimney-crack"></i>
              </div>
              <h3>I need a job done</h3>
              <p className="muted small mt-2">
                Describe the problem once and let verified workers nearby compete for it.
              </p>
              <ul>
                <li><i className="fas fa-check"></i> Compare quotes side by side</li>
                <li><i className="fas fa-check"></i> Chat before you commit</li>
                <li><i className="fas fa-check"></i> One-tap emergency SOS</li>
              </ul>
              <span className="rc-go">
                Continue as client <i className="fas fa-arrow-right"></i>
              </span>
            </button>

            {/* Worker Role Card */}
            <button
              className="role-card"
              style={{ '--rc-color': '#f5a623' }}
              onClick={() => openAuth('worker', 'signup')}
            >
              <div className="rc-ico">
                <i className="fas fa-screwdriver-wrench"></i>
              </div>
              <h3>I do the work</h3>
              <p className="muted small mt-2">
                See only jobs in your city that match your skills. Quote your own price.
              </p>
              <ul>
                <li><i className="fas fa-check"></i> Your price, your schedule</li>
                <li><i className="fas fa-check"></i> Pipeline board &amp; earnings</li>
                <li><i className="fas fa-check"></i> Build a verified reputation</li>
              </ul>
              <span className="rc-go">
                Continue as worker <i className="fas fa-arrow-right"></i>
              </span>
            </button>

            {/* Admin Role Card */}
            <button
              className="role-card"
              style={{ '--rc-color': '#5b3df5' }}
              onClick={() => openAuth('admin', 'login')}
            >
              <div className="rc-ico">
                <i className="fas fa-shield-halved"></i>
              </div>
              <h3>I run the platform</h3>
              <p className="muted small mt-2">
                Full operational console — verification, oversight, disputes and analytics.
              </p>
              <ul>
                <li><i className="fas fa-check"></i> Worker ID verification queue</li>
                <li><i className="fas fa-check"></i> Live job &amp; dispute oversight</li>
                <li><i className="fas fa-check"></i> Demand analytics by city</li>
              </ul>
              <span className="rc-go">
                Continue as admin <i className="fas fa-arrow-right"></i>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section alt" id="how">
        <div className="container">
          <div className="center mb-6">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2">Four steps, no surprises</h2>
          </div>
          <div className="grid g4">
            <div className="step-card">
              <div className="n">1</div>
              <h4>Post the job</h4>
              <p className="muted small mt-2">
                Pick a category, drop your area, describe the issue. Add a video if it's easier to show than tell.
              </p>
            </div>
            <div className="step-card">
              <div className="n">2</div>
              <h4>Collect quotes</h4>
              <p className="muted small mt-2">
                Matching workers in your city send a firm price and an ETA. No blind auctions, no hidden fees.
              </p>
            </div>
            <div className="step-card">
              <div className="n">3</div>
              <h4>Accept one</h4>
              <p className="muted small mt-2">
                Check ratings and past work, chat to confirm details, then lock the price by accepting.
              </p>
            </div>
            <div className="step-card">
              <div className="n">4</div>
              <h4>Confirm &amp; rate</h4>
              <p className="muted small mt-2">
                The worker marks it done, you confirm the work and release payment, then leave a rating.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="container">
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'minmax(0,.9fr) minmax(0,1.1fr)',
              gap: 'var(--sp-12)',
              alignItems: 'center'
            }}
          >
            <div>
              <p className="eyebrow">The platform</p>
              <h2 className="mt-2">Built for the messy middle of local services</h2>
              <p className="lead mt-4">
                Most of a trades job goes wrong between "I need help" and "here's my price." skillConnect makes that stretch explicit, tracked and reversible.
              </p>
              <div className="row gap-3 mt-6 wrap">
                <button
                  className="btn btn-primary"
                  onClick={() => openAuth('client', 'signup')}
                >
                  Try the client app
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => openAuth('admin', 'login')}
                >
                  Open the admin console
                </button>
              </div>
            </div>
            <div className="grid g2" style={{ gap: 'var(--sp-6)' }}>
              <div className="feature">
                <div className="f-ico"><i className="fas fa-location-crosshairs"></i></div>
                <div>
                  <h4>City-scoped matching</h4>
                  <p className="muted small mt-1">Workers only ever see jobs in the city they serve — no wasted trips, no ghost quotes.</p>
                </div>
              </div>
              <div className="feature">
                <div className="f-ico"><i className="fas fa-id-badge"></i></div>
                <div>
                  <h4>Manual ID verification</h4>
                  <p className="muted small mt-1">Every worker passes a human review queue before the verified badge appears.</p>
                </div>
              </div>
              <div className="feature">
                <div className="f-ico"><i className="fas fa-comments"></i></div>
                <div>
                  <h4>Job-scoped chat</h4>
                  <p className="muted small mt-1">Every message stays attached to its job, so disputes have a paper trail.</p>
                </div>
              </div>
              <div className="feature">
                <div className="f-ico"><i className="fas fa-tower-broadcast"></i></div>
                <div>
                  <h4>Emergency SOS</h4>
                  <p className="muted small mt-1">One tap broadcasts to every available worker nearby, skill filter bypassed.</p>
                </div>
              </div>
              <div className="feature">
                <div className="f-ico"><i className="fas fa-scale-balanced"></i></div>
                <div>
                  <h4>Dispute resolution</h4>
                  <p className="muted small mt-1">Either side can escalate. Admins see the full job timeline before ruling.</p>
                </div>
              </div>
              <div className="feature">
                <div className="f-ico"><i className="fas fa-chart-line"></i></div>
                <div>
                  <h4>Demand analytics</h4>
                  <p className="muted small mt-1">Which skills and which neighbourhoods are heating up, tracked per city.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST & SAFETY */}
      <section className="lp-section alt" id="trust">
        <div className="container">
          <div className="center mb-6">
            <p className="eyebrow">Trust &amp; safety</p>
            <h2 className="mt-2">Why people actually show up</h2>
          </div>
          <div className="grid g3">
            <div className="quote-card">
              <div className="q-mark">"</div>
              <p className="muted mt-2">
                Three quotes in eleven minutes on a Sunday. I picked the one who could come soonest, not the loudest one on a listings site.
              </p>
              <div className="row gap-3 mt-4">
                <span className="avatar" style={{ background: '#e8f0fe', color: '#1d4ed8' }}>
                  RP
                </span>
                <div>
                  <div className="strong small">Riya Patel</div>
                  <div className="xs dim">Client · Anand</div>
                </div>
              </div>
            </div>

            <div className="quote-card">
              <div className="q-mark">"</div>
              <p className="muted mt-2">
                I stopped losing half my day driving to jobs that were already taken. The feed only shows work I can actually reach.
              </p>
              <div className="row gap-3 mt-4">
                <span className="avatar" style={{ background: '#fff4e0', color: '#b45309' }}>
                  AM
                </span>
                <div>
                  <div className="strong small">Arjun Mistry</div>
                  <div className="xs dim">Electrician · 63 jobs</div>
                </div>
              </div>
            </div>

            <div className="quote-card">
              <div className="q-mark">"</div>
              <p className="muted mt-2">
                The verification queue and dispute log mean I can answer "what happened on job 2043" in about four seconds.
              </p>
              <div className="row gap-3 mt-4">
                <span className="avatar" style={{ background: '#eeeaff', color: '#4c2fe0' }}>
                  MD
                </span>
                <div>
                  <div className="strong small">Meera Desai</div>
                  <div className="xs dim">Operations lead</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="lp-section">
        <div className="container">
          <div className="lp-cta">
            <h2>Ready when you are</h2>
            <p className="lead mt-3" style={{ color: '#d7e6f8', maxWidth: '520px', marginInline: 'auto' }}>
              Create an account in under a minute. Demo accounts are pre-loaded if you'd rather look around first.
            </p>
            <div className="row wrap gap-3 mt-6" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-lg"
                style={{ '--btn-bg': '#fff', '--btn-fg': '#0f172a', '--btn-bd': 'transparent' }}
                onClick={() => openAuth('client', 'signup')}
              >
                Create a free account
              </button>
              <button
                className="btn btn-lg"
                style={{
                  '--btn-bg': 'rgba(255,255,255,.14)',
                  '--btn-bd': 'rgba(255,255,255,.3)',
                  '--btn-fg': '#fff'
                }}
                onClick={() => openAuth('client', 'login')}
              >
                Use a demo account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-foot">
        <div className="container">
          <div
            className="grid"
            style={{ gridTemplateColumns: 'minmax(0,1.4fr) repeat(3,minmax(0,1fr))' }}
          >
            <div>
              <div className="lp-logo mb-3">
                <span className="mark">
                  <i className="fas fa-bolt-lightning"></i>
                </span>{' '}
                skillConnect
              </div>
              <p className="small" style={{ maxWidth: '280px' }}>
                The local services marketplace that puts the price, the person and the paper trail in front of you before the work starts.
              </p>
            </div>
            <div>
              <h5>Product</h5>
              <a href="#how">How it works</a>
              <a href="#features">Platform</a>
              <a href="#trust">Trust &amp; safety</a>
            </div>
            <div>
              <h5>Roles</h5>
              <a
                href="#roles"
                onClick={e => {
                  e.preventDefault();
                  openAuth('client', 'signup');
                }}
              >
                For clients
              </a>
              <a
                href="#roles"
                onClick={e => {
                  e.preventDefault();
                  openAuth('worker', 'signup');
                }}
              >
                For workers
              </a>
              <a
                href="#roles"
                onClick={e => {
                  e.preventDefault();
                  openAuth('admin', 'login');
                }}
              >
                For admins
              </a>
            </div>
            <div>
              <h5>Company</h5>
              <a href="#top">About</a>
              <a href="#top">Careers</a>
              <a href="#top">Contact</a>
            </div>
          </div>
          <div className="foot-bottom spread wrap">
            <span>© 2026 skillConnect · React Build. All data lives in your browser.</span>
            <span className="row gap-4">
              <a href="#top">Privacy</a>
              <a href="#top">Terms</a>
            </span>
          </div>
        </div>
      </footer>
    </section>
  );
}

