import { CITIES, CATEGORIES } from './constants';
import { uid, MIN, HOUR, DAY, money } from './formatters';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function seedDB() {
  const rnd = mulberry32(20260731);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const now = Date.now();

  const db = {
    v: 3,
    users: [],
    jobs: [],
    quotes: [],
    messages: [],
    reviews: [],
    disputes: [],
    notifications: [],
    logs: [],
    cities: CITIES.slice(),
    categories: CATEGORIES.map(c => c.name),
    settings: { sosEnabled: true, requireVerification: true, autoApprove: false, commission: 10 },
    session: { client: null, worker: null, admin: null, active: null },
    seq: { job: 1000 }
  };

  function mkUser(o) {
    const u = Object.assign({
      id: uid('u'),
      avatar: null,
      createdAt: now - between(20, 260) * DAY,
      suspended: false,
      area: 'Central'
    }, o);
    db.users.push(u);
    return u;
  }

  const W = (name, phone, city, area, skills, verify, bio, ageDays, online) => mkUser({
    role: 'worker', name, phone, city, area, skills,
    verification: verify, bio, online: !!online, createdAt: now - ageDays * DAY
  });

  const C = (name, phone, city, area, ageDays) => mkUser({
    role: 'client', name, phone, city, area, createdAt: now - ageDays * DAY
  });

  /* --- people --- */
  const admin1 = mkUser({ role: 'admin', name: 'Meera Desai', phone: '9825011001', city: 'Ahmedabad', area: 'Navrangpura', createdAt: now - 400 * DAY });
  mkUser({ role: 'admin', name: 'Devang Shah', phone: '9825011002', city: 'Vadodara', area: 'Alkapuri', createdAt: now - 210 * DAY });

  const w = {};
  w.arjun  = W('Arjun Mistry',   '9824100101', 'Anand',     'Ganesh Chowk',   ['Electrical', 'Appliance Repair'], 'approved', 'Licensed electrician, 11 years on the job. I carry spare MCBs, fans and regulators in the van so most calls finish in one visit.', 240, true);
  w.kiran  = W('Kiran Solanki',  '9824100102', 'Anand',     'Vidyanagar',     ['Plumbing'],                        'approved', 'Plumbing only — taps, concealed leaks, motor and tank work. Same-day service across Anand.', 190, true);
  w.vipul  = W('Vipul Patel',    '9824100103', 'Anand',     'Amul Dairy Road',['Plumbing', 'Carpentry', 'Masonry'],'approved', 'Plumbing, light carpentry and small civil work. Happy to take the little jobs other people turn down.', 120, true);
  w.bhavesh= W('Bhavesh Chauhan','9824100113', 'Anand',     'Bakrol Road',    ['Plumbing', 'Electrical'],          'approved', 'Plumbing and electrical work across Anand. I quote a fixed price up front and stick to it.', 210, true);
  w.nisha  = W('Nisha Rathod',   '9824100104', 'Anand',     'Lambhvel Road',  ['Cleaning', 'Pest Control'],        'approved', 'Deep cleaning and pest treatment with a trained two-person team. Eco-safe chemicals, pet friendly.', 300, false);
  w.rahul  = W('Rahul Chauhan',  '9824100105', 'Vadodara',  'Alkapuri',       ['AC Repair', 'Appliance Repair'],   'approved', 'Split and window AC specialist. Gas top-up, PCB repair and annual servicing contracts.', 330, true);
  w.sameer = W('Sameer Qureshi', '9824100106', 'Vadodara',  'Fatehgunj',      ['Painting'],                        'approved', 'Interior and exterior painting. Free colour consultation and furniture covering included.', 150, false);
  w.dinesh = W('Dinesh Barot',   '9824100107', 'Vadodara',  'Gotri',          ['Carpentry', 'Masonry'],            'pending',  'Furniture repair, modular fitting and small civil work. 8 years experience.', 4, true);
  w.priya  = W('Priya Shah',     '9824100108', 'Ahmedabad', 'Satellite',      ['Cleaning'],                        'approved', 'Home and office deep cleaning. Sofa and mattress shampooing available on request.', 280, true);
  w.manoj  = W('Manoj Thakor',   '9824100109', 'Ahmedabad', 'Maninagar',      ['Electrical'],                      'approved', 'Wiring, switchboards and inverter installation. Available on Sundays.', 95, false);
  w.hardik = W('Hardik Joshi',   '9824100110', 'Nadiad',    'College Road',   ['Gardening', 'Moving Help'],        'pending',  'Garden maintenance and shifting help with my own tempo.', 2, true);
  w.faisal = W('Faisal Memon',   '9824100111', 'Ahmedabad', 'Paldi',          ['Vehicle Repair'],                  'rejected', 'Two-wheeler and car breakdown help.', 9, false);
  w.jyoti  = W('Jyoti Vaghela',  '9824100112', 'Anand',     'Mota Bazaar',    ['Painting', 'Cleaning'],            'approved', 'Painting and post-renovation cleanup. Detail-focused, I do not rush a finish.', 70, true);

  const c = {};
  c.riya    = C('Riya Patel',      '9898200201', 'Anand',     'Ganesh Chowk',   180);
  c.mehul   = C('Mehul Desai',     '9898200202', 'Anand',     'Vidyanagar',     120);
  c.anjali  = C('Anjali Trivedi',  '9898200203', 'Vadodara',  'Alkapuri',        90);
  c.sagar   = C('Sagar Bhatt',     '9898200204', 'Ahmedabad', 'Bodakdev',        60);
  c.pooja   = C('Pooja Nair',      '9898200205', 'Vadodara',  'Karelibaug',      45);
  c.jignesh = C('Jignesh Parmar',  '9898200206', 'Nadiad',    'Station Road',    30);
  c.hetal   = C('Hetal Modi',      '9898200207', 'Ahmedabad', 'Vastrapur',       25);

  /* --- jobs --- */
  function mkJob(o) {
    const job = Object.assign({
      id: 'JOB-' + (++db.seq.job),
      workerId: null, price: null, budget: null, urgent: false, sos: false,
      videoUrl: null, confirmedAt: null, assignedAt: null, startedAt: null,
      completedAt: null, cancelledAt: null, cancelReason: null, timeline: []
    }, o);
    if (!job.timeline.length) job.timeline.push({ text: 'Job posted', at: job.createdAt });
    db.jobs.push(job);
    return job;
  }

  const cap = t => Math.min(t, now - MIN);

  function mkQuote(job, worker, price, etaMin, note, status, at) {
    const q = {
      id: uid('q'), jobId: job.id, workerId: worker.id, price, etaMin,
      note: note || '', status: status || 'Pending', createdAt: cap(at || (job.createdAt + between(4, 90) * MIN))
    };
    db.quotes.push(q);
    return q;
  }

  function assign(job, worker, quote, atOffset) {
    job.workerId = worker.id;
    job.price = quote.price;
    job.status = 'Assigned';
    job.assignedAt = cap(quote.createdAt + (atOffset || 20 * MIN));
    quote.status = 'Accepted';
    db.quotes.filter(q => q.jobId === job.id && q.id !== quote.id).forEach(q => { q.status = 'Declined'; });
    job.timeline.push({ text: 'Quote from ' + worker.name + ' accepted at ' + money(quote.price), at: job.assignedAt });
    return job;
  }

  function progress(job, startAt) {
    job.status = 'InProgress';
    job.startedAt = cap(startAt);
    job.timeline.push({ text: 'Worker started the job', at: job.startedAt });
  }

  function complete(job, doneAt, confirmAt) {
    job.status = 'Completed';
    job.completedAt = cap(doneAt);
    job.timeline.push({ text: 'Worker marked the job complete', at: job.completedAt });
    if (confirmAt) {
      job.confirmedAt = cap(confirmAt);
      job.timeline.push({ text: 'Client confirmed the work and released ' + money(job.price), at: job.confirmedAt });
    }
  }

  function review(job, stars, text) {
    const at = cap((job.confirmedAt || job.completedAt) + 30 * MIN);
    db.reviews.push({ id: uid('r'), jobId: job.id, workerId: job.workerId, clientId: job.clientId, stars, text, at });
    job.timeline.push({ text: 'Client left a ' + stars + '-star review', at });
  }

  function chat(job, pairs) {
    let t = (job.assignedAt || job.createdAt) + 5 * MIN;
    pairs.forEach(p => {
      t += between(2, 25) * MIN;
      db.messages.push({ id: uid('m'), jobId: job.id, fromId: p[0], text: p[1], at: cap(t) });
    });
  }

  /* Riya's story */
  const j1 = mkJob({ clientId: c.riya.id, title: 'Kitchen tap leaking badly', skill: 'Plumbing', city: 'Anand', area: 'Ganesh Chowk',
    desc: 'The mixer tap under the kitchen sink has been dripping for three days and now water is pooling in the cabinet. The shut-off valve is stiff so it may need replacing too.',
    budget: 500, when: 'asap', status: 'Pending', createdAt: now - 42 * MIN });
  mkQuote(j1, w.kiran, 450, 30, 'Price includes a new washer and cartridge. I have the part in the van.', 'Pending', now - 31 * MIN);
  mkQuote(j1, w.vipul, 520, 15, 'Can be there in fifteen minutes, I am two streets away.', 'Pending', now - 24 * MIN);
  mkQuote(j1, w.bhavesh, 600, 180, '', 'Pending', now - 11 * MIN);

  const j2 = mkJob({ clientId: c.riya.id, title: 'Ceiling fan making a grinding noise', skill: 'Electrical', city: 'Anand', area: 'Ganesh Chowk',
    desc: 'Bedroom fan has started grinding on speeds 4 and 5. Runs fine on low. Fan is about six years old.',
    budget: 400, when: 'today', status: 'Pending', createdAt: now - 2 * DAY - 3 * HOUR });
  const q2 = mkQuote(j2, w.arjun, 380, 60, 'Sounds like a dry bearing. If the winding is gone I will tell you before doing any work.', 'Pending', now - 2 * DAY - 2 * HOUR);
  mkQuote(j2, w.bhavesh, 500, 1440, '', 'Pending', now - 2 * DAY - 90 * MIN);
  assign(j2, w.arjun, q2);
  chat(j2, [[c.riya.id, 'Hi, will you need to take the fan down completely?'],
            [w.arjun.id, 'Most likely yes, but I will refit it the same visit. Please keep a chair or ladder handy.'],
            [c.riya.id, 'Done. See you at 4.']]);

  const j3 = mkJob({ clientId: c.riya.id, title: 'Regrout bathroom floor tiles', skill: 'Masonry', city: 'Anand', area: 'Ganesh Chowk',
    desc: 'Grout between the floor tiles in the main bathroom has gone black and is crumbling in two corners. Around 40 sq ft.',
    budget: 1500, when: 'week', status: 'Pending', createdAt: now - 5 * DAY });
  const q3 = mkQuote(j3, w.vipul, 1400, 1440, 'Two-day job — grout removal on day one, sealing on day two.', 'Pending', now - 5 * DAY + 2 * HOUR);
  assign(j3, w.vipul, q3);
  progress(j3, now - 26 * HOUR);

  const j4 = mkJob({ clientId: c.riya.id, title: 'Deep clean 2BHK before guests arrive', skill: 'Cleaning', city: 'Anand', area: 'Ganesh Chowk',
    desc: 'Full deep clean — kitchen degreasing, two bathrooms, balcony and all windows. Family visiting this weekend.',
    budget: 1200, when: 'tomorrow', status: 'Pending', createdAt: now - 8 * DAY });
  const q4 = mkQuote(j4, w.nisha, 1250, 1440, 'Team of two, about five hours. Cleaning material included.', 'Pending', now - 8 * DAY + 3 * HOUR);
  assign(j4, w.nisha, q4);
  progress(j4, now - 7 * DAY);
  complete(j4, now - 7 * DAY + 5 * HOUR, null);

  const j5 = mkJob({ clientId: c.riya.id, title: 'Replace bedroom switchboard', skill: 'Electrical', city: 'Anand', area: 'Ganesh Chowk',
    desc: 'Old switchboard sparks when the AC plug goes in. Wants a modular board with a separate AC socket.',
    budget: 700, when: 'asap', urgent: true, status: 'Pending', createdAt: now - 21 * DAY });
  const q5 = mkQuote(j5, w.arjun, 650, 30, 'Modular board plus 16A socket. I will also check the earthing while I am there.', 'Pending', now - 21 * DAY + HOUR);
  assign(j5, w.arjun, q5);
  progress(j5, now - 20 * DAY);
  complete(j5, now - 20 * DAY + 3 * HOUR, now - 20 * DAY + 4 * HOUR);
  review(j5, 5, 'Arrived on time, explained the earthing problem I did not even know about, and cleaned up after. Will book again.');

  const j6 = mkJob({ clientId: c.riya.id, title: 'AC not cooling in the living room', skill: 'AC Repair', city: 'Anand', area: 'Ganesh Chowk',
    desc: 'Split AC blows air but the room never gets cold. Filter was cleaned last month.',
    budget: 900, when: 'asap', status: 'Cancelled', createdAt: now - 30 * DAY,
    cancelledAt: now - 29 * DAY, cancelReason: 'Fixed under the manufacturer warranty' });
  j6.timeline.push({ text: 'Client cancelled: Fixed under the manufacturer warranty', at: now - 29 * DAY });

  /* Arjun's earnings history */
  const arjunTitles = [
    ['Install inverter and battery', 'Electrical', 2400], ['Replace tube lights across flat', 'Electrical', 850],
    ['Washing machine not draining', 'Appliance Repair', 700], ['Fix tripping MCB', 'Electrical', 550],
    ['Microwave stopped heating', 'Appliance Repair', 950], ['Fan regulator replacement', 'Electrical', 300],
    ['Wire new geyser point', 'Electrical', 1100], ['Doorbell and camera wiring', 'Electrical', 620]
  ];
  const arjunClients = [c.mehul, c.riya, c.mehul, c.jignesh, c.mehul, c.riya, c.mehul, c.jignesh];
  arjunTitles.forEach((t, i) => {
    const created = now - (i + 1) * DAY - between(1, 6) * HOUR;
    const job = mkJob({ clientId: arjunClients[i].id, title: t[0], skill: t[1], city: 'Anand', area: pick(['Vidyanagar', 'Ganesh Chowk', 'Mota Bazaar']),
      desc: 'Requested by the client through the app.', budget: t[2] + between(-100, 150), when: 'asap', status: 'Pending', createdAt: created });
    const q = mkQuote(job, w.arjun, t[2], pick([15, 30, 60]), '', 'Pending', created + 40 * MIN);
    assign(job, w.arjun, q);
    progress(job, created + 3 * HOUR);
    complete(job, created + 5 * HOUR, created + 6 * HOUR);
    if (i % 3 !== 1) review(job, i % 5 === 0 ? 4 : 5, pick([
      'Quick and tidy work, fair price.', 'Knew exactly what the problem was within a minute.',
      'Turned up when he said he would. No complaints.', 'Good job, slightly late but he called ahead.'
    ]));
  });

  /* Arjun's live pipeline */
  const ja = mkJob({ clientId: c.mehul.id, title: 'Geyser trips the MCB every time', skill: 'Electrical', city: 'Anand', area: 'Vidyanagar',
    desc: 'The bathroom geyser trips the main MCB within a minute of switching on. Started after last week\'s rain.',
    budget: 800, when: 'asap', urgent: true, status: 'Pending', createdAt: now - 20 * HOUR });
  const qa = mkQuote(ja, w.arjun, 750, 60, 'Likely a shorted heating element. Quote covers testing and element replacement.', 'Pending', now - 19 * HOUR);
  assign(ja, w.arjun, qa);
  chat(ja, [[c.mehul.id, 'Can you come before 11 tomorrow? I leave for work after that.'],
            [w.arjun.id, 'I can be there by 9:30.']]);

  const jb = mkJob({ clientId: c.jignesh.id, title: 'Mixer grinder sparking', skill: 'Appliance Repair', city: 'Anand', area: 'Mota Bazaar',
    desc: 'Mixer sparks near the base when switched on and smells of burning.',
    budget: 500, when: 'today', status: 'Pending', createdAt: now - 3 * HOUR });
  const qb = mkQuote(jb, w.arjun, 480, 30, '', 'Pending', now - 2 * HOUR);
  assign(jb, w.arjun, qb);
  progress(jb, now - 40 * MIN);

  const jc = mkJob({ clientId: c.mehul.id, title: 'Extra plug points in the study', skill: 'Electrical', city: 'Anand', area: 'Vidyanagar',
    desc: 'Need three extra 5A points and one 16A behind the study desk. Casing-capping is fine, no concealed work.',
    budget: 1600, when: 'week', status: 'Pending', createdAt: now - 6 * HOUR });
  mkQuote(jc, w.arjun, 1500, 1440, 'Includes wire, casing and the points themselves.', 'Pending', now - 5 * HOUR);
  mkQuote(jc, w.bhavesh, 1350, 1440, 'I can do it in one visit if the wall is not concealed.', 'Pending', now - 4 * HOUR);

  /* Open jobs for the worker feed */
  const openSeed = [
    [c.riya,    'Bathroom door hinge broken',        'Carpentry',        'Anand',     'Ganesh Chowk',  600,  false],
    [c.mehul,   'Two rooms need repainting',         'Painting',         'Anand',     'Vidyanagar',    9000, false],
    [c.mehul,   'Inverter beeping, not charging',    'Electrical',       'Anand',     'Vidyanagar',    1800, false],
    [c.riya,    'Washing machine drum will not spin','Appliance Repair', 'Anand',     'Ganesh Chowk',  1200, true],
    [c.mehul,   'Add a light point on the staircase','Electrical',       'Anand',     'Vidyanagar',    700,  false],
    [c.riya,    'Chimney suction has dropped off',   'Appliance Repair', 'Anand',     'Ganesh Chowk',  900,  false],
    [c.anjali,  'AC servicing before summer',        'AC Repair',        'Vadodara',  'Alkapuri',      1200, false],
    [c.anjali,  'Cockroaches in the kitchen',        'Pest Control',     'Vadodara',  'Alkapuri',      1500, true],
    [c.pooja,   'Wardrobe shutter came off',         'Carpentry',        'Vadodara',  'Karelibaug',    800,  false],
    [c.pooja,   'Balcony wall seepage',              'Masonry',          'Vadodara',  'Karelibaug',    3500, false],
    [c.sagar,   'Sofa and carpet shampooing',        'Cleaning',         'Ahmedabad', 'Bodakdev',      2200, false],
    [c.sagar,   'Fridge not cooling',                'Appliance Repair', 'Ahmedabad', 'Bodakdev',      1400, true],
    [c.hetal,   'Rewire the kitchen chimney point',  'Electrical',       'Ahmedabad', 'Vastrapur',     900,  false],
    [c.jignesh, 'Lawn overgrown, needs trimming',    'Gardening',        'Nadiad',    'Station Road',  700,  false],
    [c.jignesh, 'Help shifting furniture one floor', 'Moving Help',      'Nadiad',    'Station Road',  1000, false]
  ];
  openSeed.forEach((s, i) => {
    const job = mkJob({ clientId: s[0].id, title: s[1], skill: s[2], city: s[3], area: s[4], budget: s[5], urgent: s[6],
      desc: 'Posted from the ' + s[3] + ' area. Client is flexible on timing but would like it seen to soon.',
      when: s[6] ? 'asap' : pick(['today', 'tomorrow', 'week']), status: 'Pending', createdAt: now - between(1, 40) * HOUR });
    if (i % 3 === 0) {
      const cand = db.users.filter(u => u.role === 'worker' && u.id !== w.arjun.id &&
        u.city === s[3] && (u.skills || []).indexOf(s[2]) >= 0);
      if (cand.length) mkQuote(job, pick(cand), Math.max(100, s[5] - between(50, 200)), pick([30, 60, 180]), '', 'Pending');
    }
  });

  /* Background volume for the admin console */
  const bgClients = [c.anjali, c.sagar, c.pooja, c.jignesh, c.hetal, c.mehul];
  const bgWorkers = [w.rahul, w.sameer, w.priya, w.manoj, w.nisha, w.jyoti, w.kiran, w.hardik];
  const bgTitles = ['Tap replacement', 'Switchboard repair', 'Sofa cleaning', 'AC gas refill', 'Wall painting touch-up',
    'Termite treatment', 'Door lock jammed', 'Chimney servicing', 'Water motor rewinding', 'Bathroom leak'];
  for (let d = 13; d >= 0; d--) {
    const count = between(5, 9);
    for (let k = 0; k < count; k++) {
      const cl = pick(bgClients);
      const pool = bgWorkers.filter(x => x.city === cl.city);
      if (!pool.length) continue;
      const wk = pick(pool);
      const skill = pick(wk.skills);
      const created = now - d * DAY - between(1, 20) * HOUR;
      const price = between(3, 26) * 100;
      const job = mkJob({ clientId: cl.id, title: pick(bgTitles), skill, city: cl.city, area: cl.area,
        desc: 'Standard request logged through the app.', budget: price + between(-100, 200),
        when: pick(['asap', 'today', 'tomorrow', 'week']), status: 'Pending', createdAt: created });
      const roll = rnd();
      if (roll < 0.16) continue;
      const q = mkQuote(job, wk, price, pick([15, 30, 60, 180]), '', 'Pending', created + between(10, 120) * MIN);
      if (roll < 0.26) continue;
      assign(job, wk, q);
      if (roll < 0.36) continue;
      progress(job, created + between(3, 10) * HOUR);
      if (roll < 0.46) continue;
      if (roll < 0.54) {
        job.status = 'Cancelled'; job.cancelledAt = created + 12 * HOUR;
        job.cancelReason = 'Client was unavailable on site';
        job.timeline.push({ text: 'Job cancelled: client was unavailable on site', at: job.cancelledAt });
        continue;
      }
      const doneAt = created + between(5, 14) * HOUR;
      complete(job, doneAt, rnd() < 0.85 ? doneAt + 2 * HOUR : null);
      if (job.confirmedAt && rnd() < 0.72) {
        const stars = rnd() < 0.1 ? between(1, 2) : (rnd() < 0.35 ? 4 : 5);
        review(job, stars, stars <= 2
          ? pick(['Turned up two hours late and left the mess behind.', 'Work came undone within a day. Had to call someone else.'])
          : pick(['Clean work, would call again.', 'Very professional and on time.', 'Solved it quickly, fair price.',
                  'Good work overall, a bit talkative.', 'No complaints at all.']));
      }
    }
  }

  const unreviewed = db.jobs.filter(j => j.status === 'Completed' && j.confirmedAt &&
    j.city !== 'Anand' && !db.reviews.some(r => r.jobId === j.id));
  if (unreviewed[0]) review(unreviewed[0], 2, 'Turned up nearly two hours late and left the mess behind for me to clean up.');
  if (unreviewed[1]) review(unreviewed[1], 1, 'The work came undone within a day and he stopped answering his phone after that.');

  /* Disputes */
  const lowRated = db.reviews.filter(r => r.stars <= 2);
  if (lowRated[0]) {
    const dj = db.jobs.find(j => j.id === lowRated[0].jobId);
    if (dj) {
      const at = cap((dj.confirmedAt || dj.completedAt) + 20 * HOUR);
      db.disputes.push({ id: uid('d'), jobId: dj.id, byId: dj.clientId, byRole: 'client',
        category: 'Work quality was poor', text: 'The job was signed off but the same fault came back the next morning. I would like the worker to return or refund part of the amount.',
        status: 'Open', at, resolution: null, resolvedAt: null });
      dj.timeline.push({ text: 'Client raised a dispute', at });
    }
  }
  db.disputes.push({ id: uid('d'), jobId: j6.id, byId: c.riya.id, byRole: 'client',
    category: 'Something else', text: 'Cancelled this myself once the warranty engineer came — logging it so the cancellation is not held against my account.',
    status: 'Resolved', at: now - 28 * DAY, resolution: 'No fault found on either side. Cancellation cleared from the client record.', resolvedAt: now - 27 * DAY });

  /* Notifications */
  db.notifications.push(
    { id: uid('n'), userId: c.riya.id, text: '3 workers have quoted on “Kitchen tap leaking badly”.', icon: 'fa-file-invoice-dollar', at: now - 11 * MIN, read: false },
    { id: uid('n'), userId: c.riya.id, text: 'Nisha Rathod marked “Deep clean 2BHK” complete — confirm to release payment.', icon: 'fa-circle-check', at: now - 7 * DAY + 5 * HOUR, read: false },
    { id: uid('n'), userId: w.arjun.id, text: 'Mehul Desai accepted your ' + money(750) + ' quote on “Geyser trips the MCB every time”.', icon: 'fa-handshake', at: now - 18 * HOUR, read: false },
    { id: uid('n'), userId: w.arjun.id, text: 'New Electrical job posted in Anand: “Extra plug points in the study”.', icon: 'fa-bell', at: now - 6 * HOUR, read: true }
  );

  /* Logs */
  const nm = id => (db.users.find(u => u.id === id) || { name: 'Removed user' }).name;
  const entries = [];
  const pushLog = (kind, text, actor, at) => entries.push({ id: uid('l'), at, kind, text, actor: actor || null });
  db.users.forEach(u => pushLog('signup', (u.role === 'admin' ? 'Administrator' : u.role === 'worker' ? 'Worker' : 'Client') +
    ' account created: ' + u.name + ' (' + u.city + ').', u.id, u.createdAt));
  db.jobs.forEach(j => {
    pushLog('job', 'Job ' + j.id + ' posted in ' + j.city + ' (' + j.skill + ').', j.clientId, j.createdAt);
    if (j.assignedAt) pushLog('job', j.id + ' assigned to ' + nm(j.workerId) + ' at ' + money(j.price) + '.', j.clientId, j.assignedAt);
    if (j.confirmedAt) pushLog('payment', money(j.price) + ' released on ' + j.id + '.', j.clientId, j.confirmedAt);
    if (j.cancelledAt) pushLog('job', j.id + ' cancelled — ' + (j.cancelReason || 'no reason given') + '.', j.clientId, j.cancelledAt);
  });
  db.quotes.forEach(q => pushLog('quote', nm(q.workerId) + ' quoted ' + money(q.price) + ' on ' + q.jobId + '.', q.workerId, q.createdAt));
  db.reviews.forEach(r => pushLog('review', r.stars + '-star review left on ' + r.jobId + '.', r.clientId, r.at));
  db.disputes.forEach(d => {
    pushLog('dispute', 'Dispute opened on ' + d.jobId + ' — ' + d.category + '.', d.byId, d.at);
    if (d.resolvedAt) pushLog('dispute', 'Dispute on ' + d.jobId + ' resolved.', admin1.id, d.resolvedAt);
  });
  pushLog('verification', 'Faisal Memon rejected — ID document was unreadable.', admin1.id, now - 8 * DAY);
  pushLog('sos', 'Emergency SOS broadcast tested in Anand.', admin1.id, now - 12 * DAY);
  pushLog('system', 'Demo data seeded — ' + db.users.length + ' users, ' + db.jobs.length + ' jobs.', admin1.id, now);
  entries.sort((a, b) => b.at - a.at);
  db.logs = entries.slice(0, 250);

  return db;
}

