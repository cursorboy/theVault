// detail.jsx — save detail + memory inspector + reminders

const SaveDetail = () => {
  const save = SAVES[1]; // ichiran ramen
  return (
    <div style={{
      width: 1280, height: 820, background: RV.ink, color: RV.text,
      fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
      borderRadius: 8, border: `1px solid ${RV.edge}`, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* breadcrumb bar */}
      <div style={{
        padding: '14px 28px', borderBottom: `1px solid ${RV.edge}`,
        background: RV.vault, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 12, color: RV.text3 }}>
          Your library <span style={{ color: RV.text4 }}>→</span> Places to eat <span style={{ color: RV.text4 }}>→</span> <span style={{ color: RV.text }}>{save.title}</span>
        </span>
        <div style={{ flex: 1 }}/>
        <Tag tone="ig">instagram</Tag>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '420px 1fr', gap: 0 }}>
        {/* left: thumb + meta */}
        <div style={{ padding: '28px', borderRight: `1px solid ${RV.edge}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Thumb seed={2} platform="instagram" label="1:12" aspect="9/16" style={{ borderRadius: 8 }}>
            {/* play overlay */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="play" size={20} color="#fff"/>
              </div>
            </div>
          </Thumb>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              flex: 1, padding: '10px', borderRadius: 6, border: `1px solid ${RV.edge2}`,
              background: RV.panel, color: RV.text, cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="arrow" size={12}/> open original
            </button>
            <button style={{
              padding: '10px 14px', borderRadius: 6, border: `1px solid ${RV.edge2}`,
              background: RV.panel, color: RV.text2, cursor: 'pointer',
            }}>
              <Icon name="bell" size={14}/>
            </button>
            <button style={{
              padding: '10px 14px', borderRadius: 6, border: `1px solid ${RV.edge2}`,
              background: RV.panel, color: RV.text2, cursor: 'pointer',
            }}>
              <Icon name="fork" size={14}/>
            </button>
          </div>

          {/* meta block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Saved from', '@nyceatswithjess'],
              ['Type', 'Instagram reel · 1:12'],
              ['Where it goes', 'Places to eat'],
              ['Part of', 'Your NYC dinner spots (12)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 12 }}>
                <span style={{ color: RV.text3 }}>{k}</span>
                <span style={{ color: RV.text, textAlign: 'right', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* tags */}
          <div>
            <div style={{ fontSize: 12, color: RV.text3, marginBottom: 8, fontWeight: 500 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['nyc', 'ramen', 'midtown', 'late-night', 'tonkotsu', 'date-night'].map(t => (
                <span key={t} style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 999,
                  background: RV.panel, border: `1px solid ${RV.edge}`, color: RV.text2,
                }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* right: content */}
        <div style={{ padding: '28px 36px', overflow: 'auto' }}>
          <div style={{ fontSize: 11, color: RV.text3, fontWeight: 500, letterSpacing: 0.2 }}>The gist</div>
          <h1 style={{
            margin: '8px 0 0', fontSize: 44, fontWeight: 400, letterSpacing: -1.4, lineHeight: 1.05,
            color: RV.text, fontFamily: '"Instrument Serif", serif',
          }}>
            ichiran ramen, midtown.<br/>
            <span style={{ color: RV.text3, fontStyle: 'italic' }}>solo booths, tonkotsu, open till 4am.</span>
          </h1>

          <div style={{ marginTop: 20, fontSize: 15, color: RV.text2, lineHeight: 1.6, maxWidth: 600 }}>
            jess walks through her go-to ichiran in midtown. she shows the solo-booth flavor card,
            tells you to get the kaedama (noodle refill, don't skip), and warns about the line
            after 11pm. she calls it a late-night solo move, not a group spot.
          </div>

          {/* action items */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 13, color: RV.text3, fontWeight: 500, marginBottom: 12 }}>
              Things to do, if you want
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { txt: 'try ichiran midtown next time u\'re in nyc late', done: false },
                { txt: 'order tonkotsu w/ kaedama upgrade', done: false },
                { txt: 'avoid 11pm–1am for the line', done: true },
              ].map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: RV.vault, border: `1px solid ${RV.edge}`, borderRadius: 6,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 3,
                    border: `1.5px solid ${a.done ? RV.lime : RV.edge2}`,
                    background: a.done ? RV.lime : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {a.done && <Icon name="check" size={10} color={RV.limeInk}/>}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: a.done ? RV.text3 : RV.text, textDecoration: a.done ? 'line-through' : 'none' }}>
                    {a.txt}
                  </span>
                  <button style={{
                    fontSize: 12, padding: '4px 12px', borderRadius: 999,
                    background: 'transparent', border: `1px solid ${RV.edge2}`,
                    color: RV.text2, cursor: 'pointer',
                  }}>remind me</button>
                </div>
              ))}
            </div>
          </div>

          {/* transcript */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: RV.text3, fontWeight: 500 }}>
                What jess actually says
              </span>
              <div style={{ flex: 1, height: 1, background: RV.edge }}/>
            </div>
            <div style={{
              fontSize: 14, color: RV.text2, lineHeight: 1.75,
              fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
              padding: '20px 22px', background: RV.panel,
              border: `1px solid ${RV.edge}`, borderRadius: 8,
              maxHeight: 220, overflow: 'auto',
            }}>
              “okay so if you're ever in nyc and it's like past midnight and you don't wanna deal
              with people, <span style={{ color: RV.lime, fontWeight: 500, fontStyle: 'normal', fontFamily: 'inherit' }}>ichiran in midtown</span> is the move. it's that ramen spot where you sit in a solo booth,
              they hand you this paper menu, you check off exactly how rich you want the broth,
              the spice level, the noodle firmness. you push it through this little curtain and the
              ramen comes out, you don't see anyone, it's kinda perfect honestly. get the kaedama
              add-on, that's the noodle refill, do not skip it...”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MemoryInspector = () => {
  const memories = [
    { kind: 'fact',       imp: 9, txt: 'lives in nyc, brooklyn area', src: '14 conversations · 8 saves', age: '6mo' },
    { kind: 'preference', imp: 8, txt: 'prefers casual solo dining over group reservations', src: 'extracted from 3 saves', age: '2mo' },
    { kind: 'goal',       imp: 7, txt: 'training for first half marathon, target sub-2hr', src: 'set 4 weeks ago', age: '1mo' },
    { kind: 'preference', imp: 7, txt: 'mostly vegetarian, eats fish occasionally', src: 'recipes pattern + 2 chats', age: '3mo' },
    { kind: 'project',    imp: 6, txt: 'building a tiny vector db in rust on weekends', src: '4 saves clustered', age: '3w' },
    { kind: 'fact',       imp: 6, txt: 'birthday is in march', src: 'mentioned in chat 2024-12-08', age: '4mo' },
    { kind: 'trait',      imp: 5, txt: 'asks for clarification before acting (cautious)', src: 'behavioral pattern', age: '5mo' },
    { kind: 'relationship', imp: 5, txt: 'partner "sam" — gets restaurant recs together', src: 'mentioned 6x', age: '4mo' },
  ];
  const kindColor = { fact: RV.accent2, preference: '#7A8A4E', goal: '#B8743A', project: '#8A6478', trait: '#A85A5A', relationship: '#5C8A6E' };
  return (
    <div style={{
      width: 1280, height: 820, background: RV.ink, color: RV.text,
      fontFamily: '"Inter", system-ui', borderRadius: 8, border: `1px solid ${RV.edge}`,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '24px 28px', borderBottom: `1px solid ${RV.edge}`, background: RV.vault }}>
        <div style={{ fontSize: 11, color: RV.text3, marginBottom: 4 }}>What I remember</div>
        <h1 style={{
          margin: '0 0 6px', fontSize: 38, fontWeight: 400, lineHeight: 1.05,
          fontFamily: '"Instrument Serif", serif', letterSpacing: -1.2,
        }}>
          things i’ve picked up about <span style={{ fontStyle: 'italic', color: RV.lime }}>you</span>.
        </h1>
        <div style={{ fontSize: 13, color: RV.text2 }}>
          86 little notes so far. tap any to edit or forget.
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden' }}>
        {/* left: memories list */}
        <div style={{ padding: '20px 28px', overflow: 'auto' }}>
          {/* filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {['all', 'facts', 'preferences', 'goals', 'projects', 'people'].map((k, i) => (
              <button key={k} style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                background: i === 0 ? RV.text : 'transparent',
                color: i === 0 ? RV.ink : RV.text2,
                border: `1px solid ${i === 0 ? RV.text : RV.edge2}`,
                fontWeight: 500,
              }}>{k}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {memories.map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', background: RV.panel,
                border: `1px solid ${RV.edge}`, borderRadius: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 999,
                      color: kindColor[m.kind], background: 'rgba(0,0,0,0.04)',
                      border: `1px solid ${RV.edge}`, fontWeight: 500,
                    }}>{m.kind}</span>
                  </div>
                  <div style={{ fontSize: 14, color: RV.text }}>{m.txt}</div>
                  <div style={{ fontSize: 11, color: RV.text3, marginTop: 4 }}>{m.src} · learned {m.age} ago</div>
                </div>
                <button style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${RV.edge2}`, color: RV.text3,
                }}>forget</button>
              </div>
            ))}
          </div>
        </div>

        {/* right: profile + stats */}
        <div style={{ borderLeft: `1px solid ${RV.edge}`, padding: '20px 24px', overflow: 'auto', background: RV.vault }}>
          <div style={{ fontSize: 12, color: RV.text3, marginBottom: 10, fontWeight: 500 }}>About you</div>
          <div style={{
            padding: 18, borderRadius: 8, background: RV.panel, border: `1px solid ${RV.edge}`,
            fontSize: 13, color: RV.text2, lineHeight: 1.7,
          }}>
            {[
              ['name', 'Alex'],
              ['lives in', 'Brooklyn, NY'],
              ['into', 'food, running, side projects'],
              ['eats', 'mostly pescatarian'],
              ['tone', 'casual, keep it short'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: RV.text3, minWidth: 70 }}>{k}</span>
                <span style={{ color: RV.text, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 24 }}/>

          <div style={{ fontSize: 12, color: RV.text3, marginBottom: 10, fontWeight: 500 }}>The last 30 days</div>
          {[
            ['reels saved', '47'],
            ['chats with me', '218'],
            ['new things i learned', '23'],
            ['reminders that fired', '12'],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 0',
              borderBottom: `1px solid ${RV.edge}`, fontSize: 13,
            }}>
              <span style={{ color: RV.text2 }}>{k}</span>
              <span style={{ color: RV.text, fontWeight: 500 }}>{v}</span>
            </div>
          ))}

          <div style={{ height: 24 }}/>

          <div style={{ fontSize: 12, color: RV.text3, marginBottom: 10, fontWeight: 500 }}>Privacy</div>
          <div style={{
            padding: 16, borderRadius: 8, background: RV.panel, border: `1px solid ${RV.edge}`,
            fontSize: 13, color: RV.text2, lineHeight: 1.55,
          }}>
            none of this leaves your vault. delete a memory and it's gone, no copies. you can wipe everything from <span style={{ color: RV.lime, fontWeight: 500 }}>settings</span> anytime.
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SaveDetail, MemoryInspector });
