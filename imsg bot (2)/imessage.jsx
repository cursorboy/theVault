// imessage.jsx — iMessage chat mockups for ReelVault flows

const Bubble = ({ from = 'them', children, tail = true, sub, withLink, thumb }) => {
  const isMe = from === 'me';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      gap: 2, marginBottom: 3,
    }}>
      <div style={{
        maxWidth: '78%', padding: thumb ? '8px 8px 10px' : '7px 12px',
        borderRadius: 18, fontSize: 14.5, lineHeight: 1.32,
        background: isMe ? '#2C8CFF' : '#262629',
        color: isMe ? '#fff' : '#F4F4F0',
        position: 'relative',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        wordBreak: 'break-word',
      }}>
        {thumb && (
          <div style={{ marginBottom: 6 }}>
            <Thumb seed={thumb.seed} platform={thumb.plat} label={thumb.dur} aspect="9/16"
              style={{ borderRadius: 12, width: 180 }}/>
          </div>
        )}
        <div style={{ padding: thumb ? '0 4px' : 0 }}>{children}</div>
        {withLink && (
          <div style={{
            marginTop: 6, padding: '8px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 5, background: RV.lime, color: RV.limeInk,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14,
            }}>R</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{withLink.title}</div>
              <div style={{ fontSize: 10.5, opacity: 0.6 }}>{withLink.host}</div>
            </div>
            <Icon name="chevR" size={14} color={isMe ? 'rgba(255,255,255,0.5)' : RV.text3}/>
          </div>
        )}
      </div>
      {sub && (
        <div style={{
          fontSize: 10, color: '#8a8a90', marginTop: 1, padding: '0 6px',
          fontFamily: '-apple-system, system-ui',
        }}>{sub}</div>
      )}
    </div>
  );
};

const TypingBubble = () => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
    <div style={{
      padding: '12px 14px', borderRadius: 18, background: '#262629',
      display: 'flex', gap: 4,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#888',
          opacity: 0.4 + (i === 1 ? 0.3 : 0),
        }}/>
      ))}
    </div>
  </div>
);

const SystemNote = ({ children }) => (
  <div style={{
    textAlign: 'center', fontSize: 10.5, color: '#76767c',
    padding: '12px 0 8px', fontWeight: 500,
    fontFamily: '-apple-system, system-ui',
  }}>{children}</div>
);

const ImsgFrame = ({ title, subtitle, children, height = 760 }) => (
  <div style={{
    width: 380, height, background: '#000', borderRadius: 36,
    border: '1px solid #2A2A2A', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, "SF Pro Text", system-ui',
    boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
  }}>
    {/* status bar */}
    <div style={{
      padding: '14px 28px 6px', display: 'flex', justifyContent: 'space-between',
      color: '#fff', fontSize: 14, fontWeight: 600,
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M0 9h2v2H0zM4 7h2v4H4zM8 4h2v7H8zM12 1h2v10h-2z" fill="#fff"/></svg>
        <svg width="14" height="10" viewBox="0 0 14 10"><path d="M7 1.5C9 1.5 10.8 2.2 12.2 3.4l1-1.1C11.5 1 9.4.3 7 .3S2.5 1 0.8 2.3l1 1.1C3.2 2.2 5 1.5 7 1.5z" fill="#fff"/></svg>
        <div style={{ width: 22, height: 10, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 2.5, padding: 1 }}>
          <div style={{ width: '85%', height: '100%', background: '#fff', borderRadius: 1 }}/>
        </div>
      </div>
    </div>
    {/* nav */}
    <div style={{
      padding: '4px 12px 10px', display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '0.5px solid #1a1a1a',
    }}>
      <div style={{ color: '#2C8CFF', fontSize: 26, lineHeight: 1, marginTop: -4 }}>‹</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: -16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', marginBottom: 3,
          background: RV.lime, color: RV.limeInk,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 18,
        }}>R</div>
        <div style={{ fontSize: 11, color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}>
          {title} <span style={{ color: '#888', fontSize: 9 }}>›</span>
        </div>
        {subtitle && <div style={{ fontSize: 9, color: '#76767c' }}>{subtitle}</div>}
      </div>
      <Icon name="phone" size={20} color="#2C8CFF"/>
    </div>
    {/* messages */}
    <div style={{
      flex: 1, padding: '12px 12px 8px', overflowY: 'auto', background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
    {/* compose bar */}
    <div style={{
      padding: '8px 10px 12px', borderTop: '0.5px solid #1a1a1a',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', border: '1px solid #333',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 18,
      }}>+</div>
      <div style={{
        flex: 1, height: 30, borderRadius: 16, border: '1px solid #2a2a2a',
        background: '#0a0a0a', display: 'flex', alignItems: 'center', padding: '0 12px',
        fontSize: 13, color: '#5a5a5e',
      }}>iMessage</div>
      <div style={{ color: '#2C8CFF', fontSize: 18 }}>🎙</div>
    </div>
    {/* home indicator */}
    <div style={{ height: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 8 }}>
      <div style={{ width: 134, height: 5, borderRadius: 3, background: '#fff' }}/>
    </div>
  </div>
);

// Flow 1: save a reel
const ImsgSaveFlow = () => (
  <ImsgFrame title="reelvault" subtitle="iMessage">
    <SystemNote>iMessage · today 11:42</SystemNote>
    <Bubble from="me" thumb={{ seed: 0, plat: 'tiktok', dur: '0:47' }}>
      <span style={{ fontSize: 12, opacity: 0.85 }}>tiktok.com/@chefsteps/...</span>
    </Bubble>
    <Bubble sub="Read 11:42 AM">got it, processing</Bubble>
    <SystemNote>·  ·  ·  47s later</SystemNote>
    <Bubble withLink={{ title: 'one-pan miso butter salmon', host: 'reelvault.app/save/3a89f' }}>
      saved · one-pan miso butter salmon. lowkey the easiest weeknight dinner ngl, sheet pan goes brrr.
      added to recipes
    </Bubble>
    <Bubble>want me to remind u to try this thursday since u said u meal-prep then</Bubble>
    <Bubble from="me">yeah lets do it</Bubble>
    <Bubble>set · thursday 6pm · "make miso butter salmon"</Bubble>
    <TypingBubble/>
  </ImsgFrame>
);

// Flow 2: semantic recall
const ImsgRecallFlow = () => (
  <ImsgFrame title="reelvault" subtitle="iMessage">
    <SystemNote>iMessage · 8:14 PM</SystemNote>
    <Bubble from="me">what was that ramen spot in nyc i saved</Bubble>
    <Bubble sub="Read 8:14 PM"><Mono style={{ fontSize: 11, color: '#888' }}>· searching ur library ·</Mono></Bubble>
    <Bubble withLink={{ title: 'ichiran ramen midtown nyc', host: 'reelvault.app/save/1a89f2' }}>
      ichiran in midtown. solo booth thing, open till 4am, jess said get the kaedama
    </Bubble>
    <Bubble>u saved it 3 weeks ago from @nyceatswithjess</Bubble>
    <Bubble from="me">cool sam wants to go tonight, is it good for 2</Bubble>
    <Bubble>nah it's solo booths, kinda the whole vibe. u prob want totto in midtown west or
      ippudo east village instead</Bubble>
    <Bubble>want me to pull up totto reservations</Bubble>
    <Bubble from="me">yes pls</Bubble>
    <TypingBubble/>
  </ImsgFrame>
);

// Flow 3: account linking
const ImsgLinkFlow = () => (
  <ImsgFrame title="reelvault" subtitle="iMessage">
    <SystemNote>iMessage · today 2:08 PM</SystemNote>
    <Bubble from="me">X4K9P2</Bubble>
    <Bubble sub="Read 2:08 PM">linked · @alexruns on instagram is now connected to this number</Bubble>
    <Bubble>u can fwd reels from ig dm or text em here, same vault either way</Bubble>
    <Bubble>migrated 14 saves from ur ig account</Bubble>
    <SystemNote>·  ·  ·</SystemNote>
    <Bubble from="me">do u remember the workout video i sent on ig last week</Bubble>
    <Bubble withLink={{ title: 'pull-up progression w/o bar', host: 'reelvault.app/save/2c7e1' }}>
      yeah, the doorway pull-up one. u said u wanted to start mondays
    </Bubble>
    <Bubble>still want that reminder</Bubble>
    <Bubble from="me">yes monday 7am</Bubble>
    <Bubble>set · weekly · monday 7am · "doorway pull-ups"</Bubble>
  </ImsgFrame>
);

// Flow 4: confused / asks for clarification
const ImsgClarifyFlow = () => (
  <ImsgFrame title="reelvault" subtitle="iMessage">
    <SystemNote>iMessage · today 9:02 AM</SystemNote>
    <Bubble from="me">remind me about that thing</Bubble>
    <Bubble sub="Read 9:02 AM">which thing, u've got like 3 reminders queued rn</Bubble>
    <Bubble>· miso butter salmon · thu 6pm
{'\n'}· doorway pull-ups · mon 7am
{'\n'}· book totto reservation · sun</Bubble>
    <Bubble from="me">salmon</Bubble>
    <Bubble>cool, u want me to push it earlier or just confirm thursday</Bubble>
    <Bubble from="me">push to wednesday same time</Bubble>
    <Bubble>done · wed 6pm. brain crashed last time u asked this btw, retried, all good now</Bubble>
  </ImsgFrame>
);

Object.assign(window, { Bubble, TypingBubble, SystemNote, ImsgFrame, ImsgSaveFlow, ImsgRecallFlow, ImsgLinkFlow, ImsgClarifyFlow });
