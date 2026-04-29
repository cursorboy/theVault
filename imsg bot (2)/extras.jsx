// extras.jsx — reminders, onboarding, marketing strip

const RemindersView = () => {
  const upcoming = [
  { when: 'today', time: '6:00 pm', title: 'make miso butter salmon', save: 'one-pan miso butter salmon', cat: 'Recipes', tone: 'lime' },
  { when: 'tomorrow', time: '7:00 am', title: 'doorway pull-up workout', save: 'pull-up progression w/o bar', cat: 'Fitness', tone: 'default' },
  { when: 'sat 6/14', time: '11:00 am', title: 'book totto for sam', save: 'best ramen in nyc', cat: 'Places To Eat', tone: 'default' },
  { when: 'sun 6/15', time: '9:00 am', title: 'mobility flow before run', save: 'mobility flow before runs', cat: 'Fitness', tone: 'default' }];

  const past = [
  { when: 'yesterday', time: '8:00 pm', title: 'try crispy gnocchi recipe', done: true },
  { when: 'mon 6/9', time: '7:00 am', title: 'doorway pull-up workout', done: true },
  { when: 'sun 6/8', time: '2:00 pm', title: 'try kissa coffee tokyo', done: false }];

  return (
    <div style={{
      width: 1280, height: 820, background: RV.ink, color: RV.text,
      fontFamily: '"Inter", system-ui', borderRadius: 8, border: `1px solid ${RV.edge}`,
      overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '20px 28px', borderBottom: `1px solid ${RV.edge}`, background: RV.vault }}>
        <Mono style={{ fontSize: 10, color: RV.text4, letterSpacing: 1 }}>/ reminders</Mono>
        <h1 style={{
          margin: '4px 0 4px', fontSize: 32, fontWeight: 500,
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', letterSpacing: -1
        }}>
          stuff u said u'd actually do.
        </h1>
        <div style={{ fontSize: 12, color: RV.text2 }}>4 upcoming · 28 completed this month · set in chat or here</div>
      </div>

      <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        {/* this week timeline */}
        <Mono style={{ fontSize: 10, color: RV.text4, letterSpacing: 1, display: 'block', marginBottom: 12 }}>
          UPCOMING · 7 DAYS
        </Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {upcoming.map((r, i) =>
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
            background: r.tone === 'lime' ?
            'linear-gradient(90deg, rgba(212,255,63,0.05), transparent 60%)' :
            RV.vault,
            border: `1px solid ${r.tone === 'lime' ? 'rgba(212,255,63,0.2)' : RV.edge}`,
            borderRadius: 6
          }}>
              <div style={{ width: 100, flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: RV.text, fontWeight: 500 }}>{r.when}</div>
                <Mono style={{ fontSize: 11, color: RV.text3 }}>{r.time}</Mono>
              </div>
              <div style={{ width: 1, height: 32, background: RV.edge2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: RV.text, marginBottom: 3 }}>{r.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: RV.text3 }}>
                  <Icon name="link" size={11} />
                  <Mono>tied to · {r.save}</Mono>
                  <span style={{ color: RV.text4 }}>·</span>
                  <Mono style={{ color: RV.text4 }}>{r.cat}</Mono>
                </div>
              </div>
              <button style={{
              fontSize: 11, padding: '6px 10px', borderRadius: 4,
              background: 'transparent', border: `1px solid ${RV.edge2}`,
              color: RV.text2, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace'
            }}>snooze</button>
              <button style={{
              fontSize: 11, padding: '6px 10px', borderRadius: 4,
              background: r.tone === 'lime' ? RV.lime : RV.panel,
              border: 'none', color: r.tone === 'lime' ? RV.limeInk : RV.text2,
              cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500
            }}>done</button>
            </div>
          )}
        </div>

        {/* recurring */}
        <Mono style={{ fontSize: 10, color: RV.text4, letterSpacing: 1, display: 'block', marginBottom: 12 }}>
          RECURRING
        </Mono>
        <div style={{
          padding: '14px 18px', background: RV.vault,
          border: `1px solid ${RV.edge}`, borderRadius: 6, marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{ width: 100 }}>
            <div style={{ fontSize: 13, color: RV.text }}>weekly</div>
            <Mono style={{ fontSize: 11, color: RV.text3 }}>mon 7am</Mono>
          </div>
          <div style={{ width: 1, height: 32, background: RV.edge2 }} />
          <div style={{ flex: 1, fontSize: 14, color: RV.text }}>doorway pull-up workout</div>
          <Tag tone="ghost">12 fired</Tag>
          <Tag tone="ghost">streak 8</Tag>
        </div>

        {/* past */}
        <Mono style={{ fontSize: 10, color: RV.text4, letterSpacing: 1, display: 'block', marginBottom: 12 }}>
          RECENT · DONE
        </Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {past.map((r, i) =>
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '10px 18px',
            borderRadius: 5, opacity: 0.7
          }}>
              <div style={{
              width: 14, height: 14, borderRadius: 3,
              background: r.done ? RV.lime : 'transparent',
              border: `1.5px solid ${r.done ? RV.lime : RV.warn}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {r.done && <Icon name="check" size={9} color={RV.limeInk} />}
              </div>
              <Mono style={{ fontSize: 11, color: RV.text3, width: 100 }}>{r.when} · {r.time}</Mono>
              <div style={{ flex: 1, fontSize: 13, color: RV.text2, textDecoration: r.done ? 'line-through' : 'none' }}>
                {r.title}
              </div>
              <Mono style={{ fontSize: 10, color: r.done ? RV.ok : RV.warn }}>
                {r.done ? '✓ done' : '⏵ skipped'}
              </Mono>
            </div>
          )}
        </div>
      </div>
    </div>);

};

// Marketing / onboarding hero
const Onboarding = () =>
<div style={{
  width: 1280, height: 820, background: RV.ink, color: RV.text,
  fontFamily: '"Inter", system-ui', borderRadius: 8, border: `1px solid ${RV.edge}`,
  overflow: 'hidden', position: 'relative',
  display: 'grid', gridTemplateColumns: '1.1fr 0.9fr'
}}>
    {/* grid bg */}
    <div style={{
    position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
    backgroundImage: `linear-gradient(${RV.edge} 1px, transparent 1px),
                        linear-gradient(90deg, ${RV.edge} 1px, transparent 1px)`,
    backgroundSize: '32px 32px',
    maskImage: 'radial-gradient(ellipse at top right, black, transparent 70%)'
  }} />

    {/* left: hero */}
    <div style={{ padding: '52px 48px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
        <div style={{
        width: 30, height: 30, borderRadius: 6,
        background: RV.lime, color: RV.limeInk,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800
      }}>R</div>
        <Mono style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>REELVAULT</Mono>
        <Tag tone="ghost" style={{ marginLeft: 8 }}>v0.4 · invite-only</Tag>
      </div>

      <div>
        <Tag tone="accent" style={{ fontSize: 10, marginBottom: 24 }}>· now live on imessage, ig, tiktok</Tag>
        <h1 style={{
        margin: 0, fontSize: 88, lineHeight: 0.92, letterSpacing: -3,
        fontFamily: '"Instrument Serif", serif', fontWeight: 400, color: RV.text
      }}>
          ur reels<br />
          <span style={{ fontStyle: 'italic', color: RV.text2 }}>actually</span><br />
          go somewhere<br />
          <span style={{ color: RV.lime, fontStyle: 'italic' }}>now.</span>
        </h1>
        <div style={{ marginTop: 28, fontSize: 16, color: RV.text2, maxWidth: 480, lineHeight: 1.55 }}>
          forward a tiktok, an ig reel, or a tt dm. we transcribe it, summarize it, embed it,
          remember it. then chat about it later like a friend who's seen everything u save.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
          <button style={{
          padding: '12px 18px', background: RV.lime, color: RV.limeInk, border: 'none',
          borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
            text +1 786 213 9361 to start <Icon name="arrow" size={14} />
          </button>
          <button style={{
          padding: '12px 18px', background: 'transparent', color: RV.text, border: `1px solid ${RV.edge2}`,
          borderRadius: 6, fontSize: 13, cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace'
        }}>watch demo</button>
        </div>

        {/* trust strip */}
        <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
          {[
        ['247', 'avg saves /user'],
        ['<2s', 'reply latency'],
        ['86%', 'recall accuracy'],
        ['3', 'channels in one vault']].
        map(([n, l]) =>
        <div key={l}>
              <Mono style={{ fontSize: 28, color: RV.lime, fontWeight: 500, display: 'block' }}>{n}</Mono>
              <Mono style={{ fontSize: 10, color: RV.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{l}</Mono>
            </div>
        )}
        </div>
      </div>
    </div>

    {/* right: phone mock + flow strip */}
    <div style={{
    padding: '52px 48px', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(212,255,63,0.04), transparent 70%)'
  }}>
      <div style={{ transform: 'scale(0.78)', transformOrigin: 'center' }}>
        <ImsgFrame title="reelvault" subtitle="iMessage" height={680}>
          <SystemNote>· today ·</SystemNote>
          <Bubble from="me" thumb={{ seed: 0, plat: 'tiktok', dur: '0:47' }}>
            <span style={{ fontSize: 11, opacity: 0.85 }}>tiktok.com/...</span>
          </Bubble>
          <Bubble>got it, processing</Bubble>
          <Bubble withLink={{ title: 'one-pan miso butter salmon', host: 'reelvault.app/...' }}>
            saved · added to recipes. want a reminder thursday
          </Bubble>
        </ImsgFrame>
      </div>

      {/* annotation arrows */}
      <div style={{
      position: 'absolute', top: 100, right: 50,
      fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
      fontSize: 18, color: RV.text3, maxWidth: 180, textAlign: "center"
    }}>
        no app install.<br />texts u back like a friend.
        <svg width="60" height="40" style={{ display: 'block', marginLeft: 'auto', marginTop: 4 }}>
          <path d="M5 5 Q 30 30, 55 30" stroke={RV.text3} strokeWidth="1" fill="none" strokeDasharray="2 3" />
          <path d="M50 26 L 55 30 L 50 34" stroke={RV.text3} strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  </div>;


Object.assign(window, { RemindersView, Onboarding });