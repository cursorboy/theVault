// reelvault.jsx — dashboard + iMessage flows for ReelVault
// Built on the dark "vault" aesthetic spec. Mono-leaning type, chroma-restrained,
// punchy lime accent. Components are exported to window for cross-script use.

// Warm, editorial, "private notebook" palette. Paper-cream base, ink primary,
// deep ink-teal accent. Lifestyle/magazine, NOT techy.
const RV = {
  // surface scale — paper tones
  ink:        '#F5F0E8',  // page bg (paper cream)
  vault:      '#EFE8DC',  // panel bg (warm cream)
  panel:      '#FBF7F0',  // raised cards (lighter than page)
  edge:       '#E4DCCC',  // subtle border
  edge2:      '#D2C7B2',  // visible border
  // type — warm dark inks
  text:       '#1F1B14',  // primary (deep brown-black)
  text2:      '#5A5142',  // secondary
  text3:      '#8C8470',  // tertiary
  text4:      '#B5AC95',  // quaternary
  // accents — deep ink-teal
  lime:       '#1E4D54',  // primary accent — deep teal/petrol (var name kept for compat)
  limeSoft:   '#3D7079',
  limeInk:    '#F5F0E8',  // cream text on accent
  accent2:    '#7A4E2E',  // warm sienna for secondary highlights
  // platform tints (muted)
  ig:         '#C44A6B',
  tt:         '#3DB8B2',
  ttPink:     '#E0506E',
  // status
  warn:       '#C68A2E',
  err:        '#B84A3F',
  // semantic
  ok:         '#5C8A4E',
};

// ─── primitives ────────────────────────────────────────────────────────
const Mono = ({ children, style, ...p }) => (
  <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", monospace', ...style }} {...p}>{children}</span>
);

const Tag = ({ children, tone = 'default', style }) => {
  const tones = {
    default: { bg: 'transparent', bd: RV.edge2, fg: RV.text2 },
    lime:    { bg: RV.lime, bd: RV.lime, fg: RV.limeInk },
    ig:      { bg: 'rgba(196,74,107,0.10)', bd: 'rgba(196,74,107,0.28)', fg: '#A83C5C' },
    tt:      { bg: 'rgba(61,184,178,0.10)', bd: 'rgba(61,184,178,0.28)', fg: '#2C8985' },
    ghost:   { bg: RV.panel, bd: RV.edge, fg: RV.text3 },
    accent:  { bg: 'rgba(30,77,84,0.08)', bd: 'rgba(30,77,84,0.30)', fg: RV.lime },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 3,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10, fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase',
      background: tones.bg, border: `1px solid ${tones.bd}`, color: tones.fg,
      ...style,
    }}>{children}</span>
  );
};

// SVG icons — single stroke, 1.5
const Icon = ({ name, size = 16, color = 'currentColor', style }) => {
  const paths = {
    search:  <><circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/></>,
    grid:    <><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></>,
    list:    <><path d="M2 4h12M2 8h12M2 12h12"/></>,
    bell:    <><path d="M4 7a4 4 0 018 0v3l1 2H3l1-2V7z"/><path d="M6 13a2 2 0 004 0"/></>,
    user:    <><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></>,
    brain:   <><path d="M5 3a2 2 0 00-2 2 2 2 0 00-1 2c0 1 .5 1.5 1 2-.5.5-1 1-1 2a2 2 0 002 2 2 2 0 002 2h2V3H5z"/><path d="M11 3a2 2 0 012 2 2 2 0 011 2c0 1-.5 1.5-1 2 .5.5 1 1 1 2a2 2 0 01-2 2 2 2 0 01-2 2H9V3h2z"/></>,
    plus:    <><path d="M8 3v10M3 8h10"/></>,
    arrow:   <><path d="M3 8h10M9 4l4 4-4 4"/></>,
    play:    <><path d="M5 3l8 5-8 5z" fill="currentColor"/></>,
    clock:   <><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></>,
    settings:<><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4"/></>,
    spark:   <><path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z" fill="currentColor"/></>,
    fork:    <><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="8" cy="13" r="1.5"/><path d="M4 4.5v3a2 2 0 002 2h4a2 2 0 002-2v-3M8 9.5v2"/></>,
    pin:     <><path d="M8 2l2 4 3 1-2 2 .5 4L8 11l-3.5 2L5 9 3 7l3-1z"/></>,
    food:    <><path d="M3 6c0-2 2-4 5-4s5 2 5 4M3 6h10v1c0 2.5-2 4.5-5 4.5S3 9.5 3 7V6z"/><path d="M5 11.5l-1 2.5M11 11.5l1 2.5"/></>,
    place:   <><path d="M8 14s5-4 5-8a5 5 0 00-10 0c0 4 5 8 5 8z"/><circle cx="8" cy="6" r="1.5"/></>,
    fitness: <><path d="M3 7v2M5 5v6M7 4v8M11 4v8M13 5v6M15 7v2"/></>,
    code:    <><path d="M5 4l-3 4 3 4M11 4l3 4-3 4"/></>,
    cart:    <><path d="M2 3h2l1.5 8h7L14 5H4.5"/><circle cx="6" cy="13.5" r="1"/><circle cx="12" cy="13.5" r="1"/></>,
    book:    <><path d="M2 3h5a2 2 0 012 2v9a2 2 0 00-2-2H2V3zM14 3H9a2 2 0 00-2 2v9a2 2 0 012-2h5V3z"/></>,
    folder:  <><path d="M2 4a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/></>,
    chev:    <><path d="M4 6l4 4 4-4"/></>,
    chevR:   <><path d="M6 4l4 4-4 4"/></>,
    msg:     <><path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H8l-3 2v-2H4a2 2 0 01-2-2V4z"/></>,
    phone:   <><rect x="4" y="1.5" width="8" height="13" rx="1.5"/><circle cx="8" cy="12" r="0.5" fill="currentColor"/></>,
    link:    <><path d="M6 8a3 3 0 003 3l2-2a3 3 0 00-3-3M10 8a3 3 0 00-3-3l-2 2a3 3 0 003 3"/></>,
    eye:     <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></>,
    check:   <><path d="M3 8l3 3 7-7"/></>,
    x:       <><path d="M4 4l8 8M12 4l-8 8"/></>,
    dot:     <><circle cx="8" cy="8" r="3" fill="currentColor"/></>,
    flame:   <><path d="M8 2c2 3 4 5 4 8a4 4 0 01-8 0c0-2 1-3 2-4 0 2 2 2 2 0 0-2-1-2 0-4z"/></>,
    waveform:<><path d="M2 8h2M5 5v6M8 3v10M11 5v6M14 8h-2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {paths[name]}
    </svg>
  );
};

// Thumbnail placeholder — generates a deterministic gradient + pseudo-content
// so saves look populated without real images.
const Thumb = ({ seed = 0, label, platform = 'tiktok', aspect = '9/16', children, style }) => {
  // Warm, lifestyle thumbnail palettes — sun-faded, magazine-ish.
  const palettes = [
    ['#3A2418', '#A05A2E', '#E9B888'], // sun-baked amber/cooking
    ['#283A24', '#5A7A48', '#C4D49A'], // sage/fitness
    ['#1F2A38', '#4A6080', '#B8C8DC'], // dusk blue/places
    ['#3A1F26', '#A04858', '#F2B8B8'], // rose/food
    ['#1F3236', '#467077', '#A8C8C8'], // seafoam/work
    ['#382818', '#8A6028', '#E8C888'], // gold/shopping
    ['#2E2438', '#6A4878', '#C8A8D4'], // mauve/recipes
    ['#2E2A24', '#5A5044', '#B8AC9C'], // taupe/other
  ];
  const p = palettes[seed % palettes.length];
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(155deg, ${p[0]} 0%, ${p[1]} 60%, ${p[2]} 130%)`,
      aspectRatio: aspect, borderRadius: 6, ...style,
    }}>
      {/* film-grain noise */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.18,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 0.5px, transparent 0.5px)',
        backgroundSize: '3px 3px',
      }}/>
      {/* simulated shapes */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '50%', aspectRatio: '1', borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${p[2]}, transparent 70%)`,
          opacity: 0.7, filter: 'blur(8px)',
        }}/>
      </div>
      {/* corner platform mark */}
      <div style={{ position: 'absolute', top: 6, left: 6 }}>
        <Tag tone={platform === 'instagram' ? 'ig' : 'tt'} style={{ fontSize: 9, padding: '1px 5px' }}>
          {platform === 'instagram' ? 'IG' : 'TT'}
        </Tag>
      </div>
      {/* duration */}
      {label && (
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          padding: '2px 5px', borderRadius: 3, color: '#fff',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        }}>{label}</div>
      )}
      {children}
    </div>
  );
};

// ─── data ──────────────────────────────────────────────────────────────
const SAVES = [
  { id: 1, seed: 0, plat: 'tiktok',    cat: 'Recipes',         dur: '0:47', title: 'one-pan miso butter salmon', tags: ['weeknight', 'asian', 'sheetpan'], ago: '2h' },
  { id: 2, seed: 2, plat: 'instagram', cat: 'Places To Eat',   dur: '1:12', title: 'ichiran ramen midtown nyc',   tags: ['nyc', 'ramen', 'late-night'], ago: '5h' },
  { id: 3, seed: 1, plat: 'tiktok',    cat: 'Fitness',         dur: '0:38', title: 'pull-up progression w/o bar', tags: ['calisthenics', 'beginner'], ago: '8h' },
  { id: 4, seed: 4, plat: 'tiktok',    cat: 'Professional',    dur: '2:15', title: 'how to negotiate offers',     tags: ['career', 'salary'], ago: '1d' },
  { id: 5, seed: 6, plat: 'instagram', cat: 'Recipes',         dur: '0:54', title: 'crispy gnocchi w/ brown butter', tags: ['italian', '15min'], ago: '1d' },
  { id: 6, seed: 5, plat: 'tiktok',    cat: 'Shopping',        dur: '0:29', title: 'uniqlo round mini bag haul',  tags: ['accessories'], ago: '2d' },
  { id: 7, seed: 3, plat: 'instagram', cat: 'Places To Eat',   dur: '1:01', title: 'kissa coffee in tokyo guide', tags: ['tokyo', 'coffee'], ago: '2d' },
  { id: 8, seed: 1, plat: 'tiktok',    cat: 'Fitness',         dur: '0:44', title: 'mobility flow before runs',   tags: ['running', 'mobility'], ago: '3d' },
  { id: 9, seed: 4, plat: 'tiktok',    cat: 'Coding Projects', dur: '3:02', title: 'building a tiny vector db',   tags: ['side-project', 'rust'], ago: '4d' },
  { id:10, seed: 0, plat: 'instagram', cat: 'Recipes',         dur: '1:30', title: 'thai basil chicken larb',     tags: ['thai', '20min'], ago: '5d' },
  { id:11, seed: 2, plat: 'tiktok',    cat: 'Things To Do',    dur: '0:51', title: 'sunset spots in LA',          tags: ['la', 'date'], ago: '6d' },
  { id:12, seed: 7, plat: 'instagram', cat: 'Other',           dur: '1:45', title: 'apartment plant care 101',    tags: ['plants', 'home'], ago: '1w' },
];

const CATS = [
  { name: 'All',             icon: 'grid',    count: 247 },
  { name: 'Recipes',         icon: 'food',    count: 64 },
  { name: 'Places To Eat',   icon: 'place',   count: 38 },
  { name: 'Fitness',         icon: 'fitness', count: 29 },
  { name: 'Things To Do',    icon: 'pin',     count: 27 },
  { name: 'Professional',    icon: 'book',    count: 24 },
  { name: 'Coding Projects', icon: 'code',    count: 18 },
  { name: 'Shopping',        icon: 'cart',    count: 31 },
  { name: 'Other',           icon: 'folder',  count: 16 },
];

Object.assign(window, { RV, Mono, Tag, Icon, Thumb, SAVES, CATS });
