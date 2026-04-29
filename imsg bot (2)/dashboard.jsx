// dashboard.jsx — ReelVault dashboard screens (library, detail, memory, reminders)

const SaveCard = ({ save, onClick, dense = false }) => (
  <div onClick={onClick} style={{
    cursor: 'pointer', position: 'relative',
    display: 'flex', flexDirection: 'column', gap: 8,
  }}>
    <Thumb seed={save.seed} platform={save.plat} label={save.dur} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 1px' }}>
      <div style={{
        fontSize: dense ? 12 : 13, color: RV.text, lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', fontWeight: 450,
      }}>{save.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
        <Mono style={{ color: RV.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {save.cat}
        </Mono>
        <span style={{ color: RV.text4 }}>·</span>
        <Mono style={{ color: RV.text3 }}>{save.ago}</Mono>
      </div>
    </div>
  </div>
);

const SidebarItem = ({ cat, active, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '7px 10px', borderRadius: 5,
    background: active ? RV.panel : 'transparent',
    border: '1px solid', borderColor: active ? RV.edge2 : 'transparent',
    color: active ? RV.text : RV.text2, cursor: 'pointer', textAlign: 'left',
    fontFamily: 'inherit', fontSize: 13,
    transition: 'background 0.12s',
  }}>
    <Icon name={cat.icon} size={14} color={active ? RV.lime : RV.text3}/>
    <span style={{ flex: 1 }}>{cat.name}</span>
    <Mono style={{ fontSize: 10, color: RV.text3 }}>{cat.count}</Mono>
  </button>
);

const DashboardLibrary = ({ density = 'grid', activeCat = 'All', searchQuery = '' }) => {
  const filtered = activeCat === 'All' ? SAVES : SAVES.filter(s => s.cat === activeCat);
  const cols = density === 'grid' ? 4 : (density === 'dense' ? 5 : 3);
  return (
    <div style={{
      width: 1280, height: 820, background: RV.ink,
      color: RV.text, fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRadius: 8, border: `1px solid ${RV.edge}`,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 20px', borderBottom: `1px solid ${RV.edge}`,
        background: RV.vault,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: RV.lime, color: RV.limeInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, letterSpacing: -0.3,
            fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          }}>r</div>
          <span style={{ fontSize: 18, fontWeight: 500, color: RV.text, fontFamily: '"Instrument Serif", serif', letterSpacing: -0.3 }}>
            reelvault
          </span>
        </div>

        {/* Search */}
        <div style={{
          flex: 1, maxWidth: 540,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 6,
          background: RV.panel, border: `1px solid ${RV.edge2}`,
        }}>
          <Icon name="search" size={14} color={RV.text3}/>
          <span style={{ flex: 1, fontSize: 13, color: searchQuery ? RV.text : RV.text3 }}>
            {searchQuery || 'try “that ramen spot in nyc” or “quick weeknight dinners”'}
          </span>
          <Tag tone="ghost" style={{ fontSize: 9 }}>⌘K</Tag>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Stats strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: RV.text3, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: RV.ok }}/>
            <Mono>bot online</Mono>
          </div>
          <Mono style={{ color: RV.text2 }}>247 saves</Mono>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #C45A6B, #C49A3A)',
            border: `1px solid ${RV.edge2}`,
          }}/>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 220, borderRight: `1px solid ${RV.edge}`,
          padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4,
          background: RV.vault,
        }}>
          <div style={{ fontSize: 11, color: RV.text3, padding: '0 10px 8px', fontWeight: 500 }}>
            Categories
          </div>
          {CATS.map(c => (
            <SidebarItem key={c.name} cat={c} active={c.name === activeCat}/>
          ))}

          <div style={{ height: 16 }}/>
          <div style={{ fontSize: 11, color: RV.text3, padding: '0 10px 8px', fontWeight: 500 }}>
            Your stuff
          </div>
          {[
            { icon: 'clock', name: 'Reminders',  count: 4 },
            { icon: 'brain', name: 'Memory',     count: 86 },
            { icon: 'spark', name: 'Clusters',   count: 12 },
            { icon: 'user',  name: 'Profile',    count: null },
          ].map(c => (
            <SidebarItem key={c.name} cat={c}/>
          ))}

          <div style={{ flex: 1 }}/>

          {/* Channel status */}
          <div style={{
            padding: 10, borderRadius: 6,
            background: RV.panel, border: `1px solid ${RV.edge}`,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 10, color: RV.text3, fontWeight: 500, marginBottom: 2 }}>Connected to</div>
            {[
              { lab: 'iMessage',  ok: true, sub: '+1 786 213 9361' },
              { lab: 'Instagram', ok: true, sub: '@you' },
              { lab: 'TikTok',    ok: false, sub: 'reconnect' },
            ].map(ch => (
              <div key={ch.lab} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: ch.ok ? RV.ok : RV.warn }}/>
                <span style={{ color: RV.text2, flex: 1 }}>{ch.lab}</span>
                <Mono style={{ color: RV.text4, fontSize: 9 }}>{ch.sub}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
          {/* Title strip */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: RV.text3 }}>
                Your library → {activeCat}
              </div>
              <h1 style={{
                margin: '6px 0 6px', fontSize: 42, fontWeight: 400, letterSpacing: -1.4,
                color: RV.text, fontFamily: '"Instrument Serif", "Times New Roman", serif',
              }}>
                everything <span style={{ fontStyle: 'italic', color: RV.lime }}>worth</span> remembering.
              </h1>
              <div style={{ fontSize: 14, color: RV.text2, maxWidth: 520, lineHeight: 1.55 }}>
                {filtered.length} reels saved · ur last one was 2 hours ago.
              </div>
            </div>

            {/* Density toggle + sort */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{
                display: 'flex', padding: 3, borderRadius: 6,
                background: RV.panel, border: `1px solid ${RV.edge2}`,
              }}>
                {['grid', 'cozy', 'list'].map((d, i) => {
                  const dKey = ['grid', 'dense', 'list'][i];
                  return (
                  <div key={d} style={{
                    padding: '5px 12px', borderRadius: 4, fontSize: 12,
                    background: dKey === density ? RV.lime : 'transparent',
                    color: dKey === density ? RV.limeInk : RV.text3,
                    cursor: 'pointer', fontWeight: 500,
                  }}>{d}</div>
                  );
                })}
              </div>
              <button style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 12,
                background: RV.text, color: RV.ink, border: 'none',
                fontWeight: 500, cursor: 'pointer',
              }}>+ add a reel</button>
            </div>
          </div>

          {/* Recent activity strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
            padding: '10px 14px', borderRadius: 6,
            background: 'linear-gradient(90deg, rgba(212,255,63,0.06), transparent)',
            border: `1px solid rgba(212,255,63,0.15)`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4,
              background: RV.lime, color: RV.limeInk,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="waveform" size={12}/>
            </div>
            <div style={{ flex: 1, fontSize: 13, color: RV.text }}>
              cooking up <span style={{ color: RV.lime, fontStyle: 'italic', fontFamily: '"Instrument Serif", serif', fontSize: 15 }}>“how to make perfect risotto”</span>
              <span style={{ color: RV.text3 }}> · listening through it now</span>
            </div>
            <div style={{
              width: 140, height: 3, borderRadius: 2,
              background: RV.edge2, overflow: 'hidden',
            }}>
              <div style={{ width: '34%', height: '100%', background: RV.lime }}/>
            </div>
            <span style={{ fontSize: 11, color: RV.text3 }}>34%</span>
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: density === 'list'
              ? '1fr'
              : `repeat(${cols}, 1fr)`,
            gap: density === 'list' ? 8 : 18,
          }}>
            {density === 'list' ? (
              filtered.map(s => <ListRow key={s.id} save={s}/>)
            ) : (
              filtered.map(s => <SaveCard key={s.id} save={s} dense={density === 'dense'}/>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ListRow = ({ save }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px', borderRadius: 6,
    border: `1px solid ${RV.edge}`, background: RV.vault,
  }}>
    <Thumb seed={save.seed} platform={save.plat} aspect="1/1" style={{ width: 56, flexShrink: 0, borderRadius: 4 }}/>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: RV.text, marginBottom: 2 }}>{save.title}</div>
      <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
        <Mono style={{ color: RV.text3 }}>{save.cat.toUpperCase()}</Mono>
        <span style={{ color: RV.text4 }}>·</span>
        <Mono style={{ color: RV.text3 }}>{save.dur}</Mono>
        <span style={{ color: RV.text4 }}>·</span>
        {save.tags.map(t => (
          <Mono key={t} style={{ color: RV.text3 }}>#{t}</Mono>
        ))}
      </div>
    </div>
    <Mono style={{ fontSize: 10, color: RV.text4 }}>{save.ago}</Mono>
    <Icon name="chevR" size={14} color={RV.text4}/>
  </div>
);

Object.assign(window, { DashboardLibrary, SaveCard, SidebarItem, ListRow });
