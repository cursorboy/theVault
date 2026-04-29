// anim-scenes.jsx — scenes for the ReelVault product film.
// Uses Stage / Sprite / useSprite / useTime / Easing / interpolate / animate
// (all globals from animations.jsx).

const VAULT = {
  ink:    '#F5F0E8',
  vault:  '#EFE8DC',
  panel:  '#FBF7F0',
  edge:   '#E4DCCC',
  edge2:  '#D2C7B2',
  text:   '#1F1B14',
  text2:  '#5A5142',
  text3:  '#8C8470',
  text4:  '#B5AC95',
  teal:   '#1E4D54',
  tealSoft: '#3D7079',
  sienna: '#7A4E2E',
  ig:     '#C44A6B',
  tt:     '#3DB8B2',
  warn:   '#C68A2E',
};

// Reusable stage background — adds paper texture
const PaperBg = ({ tone = VAULT.ink, children }) => (
  <div style={{
    position: 'absolute', inset: 0, background: tone,
    overflow: 'hidden',
  }}>
    {/* subtle paper noise via radial gradients */}
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(circle at 20% 30%, rgba(0,0,0,0.025), transparent 50%),
                   radial-gradient(circle at 80% 70%, rgba(0,0,0,0.02), transparent 50%)`,
      pointerEvents: 'none',
    }}/>
    {children}
  </div>
);

// ───────────────────────────────────────────────────────────────────────
// Scene 01 — HOOK: "your saves are a graveyard"
// ───────────────────────────────────────────────────────────────────────
function Scene01_Hook() {
  const { localTime, progress } = useSprite();

  const line1Op = animate({ from: 0, to: 1, start: 0.3, end: 1.0, ease: Easing.easeOutCubic })(localTime);
  const line2Op = animate({ from: 0, to: 1, start: 1.2, end: 1.9, ease: Easing.easeOutCubic })(localTime);
  const line2Slide = animate({ from: 24, to: 0, start: 1.2, end: 1.9, ease: Easing.easeOutCubic })(localTime);
  const cursorBlink = Math.floor(localTime * 2) % 2;

  // Exit fade
  const exitOp = localTime > 3.6 ? 1 - clamp((localTime - 3.6) / 0.6, 0, 1) : 1;

  return (
    <PaperBg tone={VAULT.ink}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        opacity: exitOp,
      }}>
        <div style={{
          fontSize: 22, color: VAULT.text3, fontFamily: '"JetBrains Mono", monospace',
          marginBottom: 28, letterSpacing: 4, textTransform: 'uppercase',
          opacity: line1Op,
        }}>
          a short film about
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 180, lineHeight: 0.95, color: VAULT.text,
          letterSpacing: -6, fontWeight: 400, textAlign: 'center',
          opacity: line2Op, transform: `translateY(${line2Slide}px)`,
        }}>
          everything you<br/>
          <span style={{ fontStyle: 'italic', color: VAULT.teal }}>almost</span> remembered
          <span style={{ opacity: cursorBlink, color: VAULT.teal }}>.</span>
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 02 — GRAVEYARD: phone with tons of saved reels piling up
// ───────────────────────────────────────────────────────────────────────
function Scene02_Graveyard() {
  const { localTime } = useSprite();
  const entryOp = animate({ from: 0, to: 1, start: 0, end: 0.6 })(localTime);

  // counter ticks up from 0 to 847
  const counter = Math.floor(animate({
    from: 0, to: 847, start: 0.4, end: 4.0, ease: Easing.easeOutQuart,
  })(localTime));

  // 12 reel thumbnails cascading into a phone screen
  const reels = Array.from({ length: 18 }, (_, i) => i);

  return (
    <PaperBg tone={VAULT.vault}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 100,
        opacity: entryOp,
      }}>
        {/* left: phone */}
        <div style={{
          width: 380, height: 780, background: '#000', borderRadius: 48,
          padding: 14, position: 'relative',
          boxShadow: '0 40px 80px rgba(0,0,0,0.25), 0 0 0 2px #2a2620',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden',
            background: '#0a0a0b', position: 'relative',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2,
            paddingTop: 50,
          }}>
            {/* notch */}
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              width: 110, height: 32, background: '#000', borderRadius: 20, zIndex: 5,
            }}/>
            {reels.map(i => {
              const delay = 0.3 + i * 0.12;
              const op = animate({ from: 0, to: 1, start: delay, end: delay + 0.3 })(localTime);
              const ty = animate({ from: -30, to: 0, start: delay, end: delay + 0.3, ease: Easing.easeOutCubic })(localTime);
              const hue = (i * 47 + 200) % 360;
              return (
                <div key={i} style={{
                  aspectRatio: '9/16', background: `hsl(${hue}, 30%, ${15 + (i % 3) * 8}%)`,
                  position: 'relative', opacity: op, transform: `translateY(${ty}px)`,
                  display: 'flex', alignItems: 'flex-end', padding: 4,
                }}>
                  <div style={{
                    width: '100%', height: 4, background: 'rgba(255,255,255,0.15)',
                  }}/>
                  <div style={{
                    position: 'absolute', top: 4, left: 4,
                    fontSize: 8, color: 'rgba(255,255,255,0.5)',
                  }}>▶</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* right: stat overlay */}
        <div style={{ maxWidth: 700 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 18, color: VAULT.text3, letterSpacing: 3,
            textTransform: 'uppercase', marginBottom: 24,
            opacity: animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime),
          }}>
            the average person has
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 280, lineHeight: 0.9, color: VAULT.text,
            letterSpacing: -8, fontWeight: 400,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {counter.toLocaleString()}
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 56, color: VAULT.text2, marginTop: 16,
            fontStyle: 'italic', letterSpacing: -1.5,
            opacity: animate({ from: 0, to: 1, start: 2.5, end: 3.2 })(localTime),
          }}>
            saved reels they will <span style={{ color: VAULT.teal }}>never</span> see again.
          </div>
          <div style={{
            fontSize: 18, color: VAULT.text3, marginTop: 24,
            fontFamily: '"JetBrains Mono", monospace',
            opacity: animate({ from: 0, to: 1, start: 4.0, end: 4.8 })(localTime),
          }}>
            * we made this number up. but you know it's right.
          </div>
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 03 — PIVOT: "what if you just texted them somewhere?"
// ───────────────────────────────────────────────────────────────────────
function Scene03_Pivot() {
  const { localTime } = useSprite();
  const op = animate({ from: 0, to: 1, start: 0, end: 0.6 })(localTime);
  const exitOp = localTime > 3.5 ? 1 - clamp((localTime - 3.5) / 0.5, 0, 1) : 1;

  // word-by-word reveal
  const words = ['what', 'if', 'you', 'just\u2026', 'texted', 'them', 'somewhere?'];
  return (
    <PaperBg tone={VAULT.ink}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        opacity: op * exitOp, padding: '0 200px',
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 160, lineHeight: 1.05, color: VAULT.text,
          letterSpacing: -4, fontWeight: 400, textAlign: 'center',
          maxWidth: 1500,
        }}>
          {words.map((w, i) => {
            const delay = 0.2 + i * 0.18;
            const wOp = animate({ from: 0, to: 1, start: delay, end: delay + 0.4, ease: Easing.easeOutCubic })(localTime);
            const wY = animate({ from: 30, to: 0, start: delay, end: delay + 0.4, ease: Easing.easeOutCubic })(localTime);
            const isAccent = w === 'texted' || w === 'somewhere?';
            return (
              <span key={i} style={{
                display: 'inline-block', opacity: wOp,
                transform: `translateY(${wY}px)`,
                marginRight: 24, fontStyle: isAccent ? 'italic' : 'normal',
                color: isAccent ? VAULT.teal : VAULT.text,
              }}>{w}</span>
            );
          })}
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 04 — TEXT BOT: iMessage flow showing save + summary
// ───────────────────────────────────────────────────────────────────────
function Scene04_TextBot() {
  const { localTime } = useSprite();

  // bubble timings
  const b1 = animate({ from: 0, to: 1, start: 0.5, end: 1.0, ease: Easing.easeOutBack })(localTime);
  const b1y = animate({ from: 20, to: 0, start: 0.5, end: 1.0, ease: Easing.easeOutCubic })(localTime);

  const typing = animate({ from: 0, to: 1, start: 1.4, end: 2.0 })(localTime);
  const typingOp = localTime > 3.0 ? 1 - clamp((localTime - 3.0) / 0.3, 0, 1) : typing;

  const b2 = animate({ from: 0, to: 1, start: 3.2, end: 3.7, ease: Easing.easeOutBack })(localTime);
  const b2y = animate({ from: 20, to: 0, start: 3.2, end: 3.7, ease: Easing.easeOutCubic })(localTime);

  const b3 = animate({ from: 0, to: 1, start: 4.5, end: 5.0, ease: Easing.easeOutBack })(localTime);
  const b3y = animate({ from: 20, to: 0, start: 4.5, end: 5.0, ease: Easing.easeOutCubic })(localTime);

  const b4 = animate({ from: 0, to: 1, start: 6.0, end: 6.5, ease: Easing.easeOutBack })(localTime);
  const b4y = animate({ from: 20, to: 0, start: 6.0, end: 6.5, ease: Easing.easeOutCubic })(localTime);

  const labelOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  return (
    <PaperBg tone={VAULT.vault}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 120,
      }}>
        {/* left: explanation */}
        <div style={{ width: 520, opacity: labelOp }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 16,
            color: VAULT.text3, letterSpacing: 3, textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            so we built this
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 96, lineHeight: 1.0, color: VAULT.text,
            letterSpacing: -3, fontWeight: 400,
          }}>
            you share a reel.<br/>
            <span style={{ fontStyle: 'italic', color: VAULT.teal }}>we remember it</span> for you.
          </div>
          <div style={{
            fontSize: 22, color: VAULT.text2, marginTop: 32,
            lineHeight: 1.55, maxWidth: 480,
          }}>
            no app to download. just send it to a phone number, like a friend who actually has their stuff together.
          </div>
        </div>

        {/* right: iMessage on phone */}
        <div style={{
          width: 420, height: 850, background: '#000', borderRadius: 52,
          padding: 14, boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
          position: 'relative',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden',
            background: '#000', position: 'relative',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* status bar */}
            <div style={{
              height: 50, paddingTop: 18, display: 'flex',
              justifyContent: 'space-between', padding: '18px 36px 0',
              fontSize: 14, color: '#fff', fontWeight: 600,
            }}>
              <span>9:41</span>
              <span style={{ fontSize: 11 }}>● ● ●</span>
            </div>
            {/* header */}
            <div style={{
              padding: '8px 0 14px', textAlign: 'center',
              borderBottom: '0.5px solid #1c1c1e',
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: VAULT.teal, margin: '0 auto 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Instrument Serif", serif', fontSize: 26,
                fontStyle: 'italic', color: VAULT.ink, fontWeight: 400,
              }}>r</div>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>vault</div>
              <div style={{ fontSize: 9, color: '#8e8e93' }}>+1 (415) 555-VLT</div>
            </div>
            {/* messages */}
            <div style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* outgoing: shared reel */}
              <div style={{
                alignSelf: 'flex-end', maxWidth: '78%',
                opacity: b1, transform: `translateY(${b1y}px)`,
              }}>
                <div style={{
                  background: 'linear-gradient(180deg, #2c2c2e, #1c1c1e)',
                  border: '1px solid #38383a',
                  borderRadius: 18, padding: 8, width: 200,
                }}>
                  <div style={{
                    width: '100%', height: 200, borderRadius: 12,
                    background: 'linear-gradient(135deg, hsl(20, 35%, 18%), hsl(280, 30%, 22%))',
                    position: 'relative',
                    display: 'flex', alignItems: 'flex-end', padding: 8,
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                      @nyceatswithjess<br/>
                      <span style={{ opacity: 0.7 }}>ichiran ramen, midtown 🍜</span>
                    </div>
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: 'rgba(0,0,0,0.5)', borderRadius: 4,
                      padding: '2px 6px', fontSize: 8, color: '#fff',
                    }}>instagram.com/reel</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#8e8e93', padding: '4px 4px 0' }}>
                    instagram reel · 1:12
                  </div>
                </div>
              </div>

              {/* typing indicator */}
              {localTime > 1.4 && localTime < 3.2 && (
                <div style={{
                  alignSelf: 'flex-start', opacity: typingOp,
                  background: '#1c1c1e', borderRadius: 18,
                  padding: '10px 14px', display: 'flex', gap: 4,
                }}>
                  {[0, 1, 2].map(i => {
                    const t = (localTime * 2 + i * 0.3) % 1.5;
                    const o = t < 0.5 ? 0.4 + t : t < 1 ? 0.4 + (1 - t) : 0.4;
                    return <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#8e8e93', opacity: o,
                    }}/>;
                  })}
                </div>
              )}

              {/* bot reply 1 */}
              <div style={{
                alignSelf: 'flex-start', maxWidth: '80%',
                opacity: b2, transform: `translateY(${b2y}px)`,
              }}>
                <div style={{
                  background: '#1c1c1e', borderRadius: 18,
                  padding: '10px 14px', fontSize: 13, color: '#fff', lineHeight: 1.4,
                }}>
                  got it. <span style={{ color: VAULT.tealSoft }}>ichiran ramen</span>, midtown nyc.
                </div>
              </div>

              {/* bot reply 2 (longer) */}
              <div style={{
                alignSelf: 'flex-start', maxWidth: '85%',
                opacity: b3, transform: `translateY(${b3y}px)`,
              }}>
                <div style={{
                  background: '#1c1c1e', borderRadius: 18,
                  padding: '10px 14px', fontSize: 12.5, color: '#fff', lineHeight: 1.45,
                }}>
                  solo booths, tonkotsu, open till 4am. saved to your <span style={{ color: VAULT.tealSoft, fontWeight: 600 }}>places to eat</span>.
                </div>
              </div>

              {/* user follow up */}
              <div style={{
                alignSelf: 'flex-end', maxWidth: '70%',
                opacity: b4, transform: `translateY(${b4y}px)`,
              }}>
                <div style={{
                  background: '#0a84ff', borderRadius: 18,
                  padding: '10px 14px', fontSize: 13, color: '#fff',
                }}>
                  remind me next time i'm in nyc
                </div>
              </div>
            </div>
            {/* input bar */}
            <div style={{
              padding: '8px 14px 24px',
              borderTop: '0.5px solid #1c1c1e',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <div style={{
                flex: 1, height: 28, borderRadius: 14,
                border: '0.5px solid #38383a', background: 'transparent',
              }}/>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#1c1c1e',
              }}/>
            </div>
          </div>
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 05 — LIBRARY: cream paper UI populates with cards
// ───────────────────────────────────────────────────────────────────────
function Scene05_Library() {
  const { localTime } = useSprite();

  const titleOp = animate({ from: 0, to: 1, start: 0, end: 0.7 })(localTime);
  const titleY = animate({ from: 30, to: 0, start: 0, end: 0.7, ease: Easing.easeOutCubic })(localTime);

  // Build a 4x3 grid of save cards
  const cards = Array.from({ length: 12 }, (_, i) => {
    const seeds = [
      { plat: 'ig', cat: 'recipes', title: 'crispy gnocchi sheet pan', tone: '#5a4030' },
      { plat: 'ig', cat: 'places', title: 'ichiran ramen, midtown', tone: '#3a2a30' },
      { plat: 'tt', cat: 'workouts', title: '20-min beginner pilates', tone: '#304a55' },
      { plat: 'ig', cat: 'recipes', title: 'one-pot orzo with feta', tone: '#604030' },
      { plat: 'tt', cat: 'travel', title: 'lisbon hidden viewpoints', tone: '#3a4a3a' },
      { plat: 'ig', cat: 'home', title: 'closet organization hack', tone: '#4a4045' },
      { plat: 'tt', cat: 'recipes', title: 'green goddess dressing', tone: '#3a4a30' },
      { plat: 'ig', cat: 'places', title: 'best espresso in soho', tone: '#3a2a20' },
      { plat: 'ig', cat: 'goals', title: 'half marathon training', tone: '#2a3a45' },
      { plat: 'tt', cat: 'recipes', title: 'ginger chicken meatballs', tone: '#5a3525' },
      { plat: 'ig', cat: 'projects', title: 'rust vector db tutorial', tone: '#2a2a35' },
      { plat: 'tt', cat: 'home', title: 'tiny apartment plants', tone: '#3a4a2a' },
    ];
    return seeds[i];
  });

  return (
    <PaperBg tone={VAULT.ink}>
      <div style={{ position: 'absolute', inset: '60px 100px' }}>
        {/* Top label */}
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
          color: VAULT.text3, letterSpacing: 3, textTransform: 'uppercase',
          opacity: titleOp,
        }}>
          your library
        </div>
        {/* Headline */}
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 110, lineHeight: 1.0, color: VAULT.text,
          letterSpacing: -3.5, fontWeight: 400, marginTop: 12,
          opacity: titleOp, transform: `translateY(${titleY}px)`,
        }}>
          everything <span style={{ fontStyle: 'italic', color: VAULT.teal }}>worth</span> remembering.
        </div>
        <div style={{
          fontSize: 22, color: VAULT.text2, marginTop: 18, maxWidth: 700,
          opacity: animate({ from: 0, to: 1, start: 0.6, end: 1.2 })(localTime),
        }}>
          one tap to save. organized for you. searchable by what it actually is.
        </div>

        {/* Grid */}
        <div style={{
          marginTop: 50, display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)', gap: 16,
        }}>
          {cards.map((c, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const delay = 1.2 + (col * 0.08) + (row * 0.15);
            const op = animate({ from: 0, to: 1, start: delay, end: delay + 0.5, ease: Easing.easeOutCubic })(localTime);
            const ty = animate({ from: 40, to: 0, start: delay, end: delay + 0.5, ease: Easing.easeOutCubic })(localTime);
            const sc = animate({ from: 0.92, to: 1, start: delay, end: delay + 0.5, ease: Easing.easeOutCubic })(localTime);

            // platform tint
            const pColor = c.plat === 'ig' ? VAULT.ig : VAULT.tt;
            return (
              <div key={i} style={{
                background: VAULT.panel, border: `1px solid ${VAULT.edge}`,
                borderRadius: 12, overflow: 'hidden',
                opacity: op, transform: `translateY(${ty}px) scale(${sc})`,
                aspectRatio: '3/4',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* thumb */}
                <div style={{
                  flex: 1, background: c.tone, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    fontSize: 9, color: '#fff', fontFamily: '"JetBrains Mono", monospace',
                    background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: 1,
                  }}>{c.plat === 'ig' ? 'IG' : 'TT'}</div>
                  <div style={{
                    position: 'absolute', bottom: 8, left: 8,
                    fontSize: 8, color: 'rgba(255,255,255,0.85)',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>0:{(28 + i * 7) % 60}s</div>
                </div>
                {/* meta */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{
                    fontSize: 9, color: pColor, fontWeight: 600, letterSpacing: 1,
                    textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace',
                  }}>{c.cat}</div>
                  <div style={{
                    fontSize: 13, color: VAULT.text, fontWeight: 500, marginTop: 4,
                    lineHeight: 1.25,
                  }}>{c.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 06 — SEARCH: type a query, results filter down
// ───────────────────────────────────────────────────────────────────────
function Scene06_Search() {
  const { localTime } = useSprite();
  const query = 'that ramen spot in nyc';
  const typed = Math.floor(animate({
    from: 0, to: query.length, start: 0.5, end: 2.8, ease: Easing.linear,
  })(localTime));
  const typedText = query.slice(0, typed);
  const cursor = Math.floor(localTime * 2) % 2;

  // filter happens at t=3.0 — keep only 3 cards
  const filterT = animate({ from: 0, to: 1, start: 3.0, end: 3.8, ease: Easing.easeInOutCubic })(localTime);

  const cards = Array.from({ length: 12 }, (_, i) => i);
  const matches = [1, 7, 5]; // which indices match

  return (
    <PaperBg tone={VAULT.ink}>
      <div style={{ position: 'absolute', inset: '70px 120px' }}>
        {/* search bar */}
        <div style={{
          maxWidth: 900, margin: '0 auto',
          opacity: animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime),
        }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
            color: VAULT.text3, letterSpacing: 3, textTransform: 'uppercase',
            marginBottom: 14, textAlign: 'center',
          }}>
            search by what it actually is
          </div>
          <div style={{
            background: VAULT.panel, border: `2px solid ${VAULT.edge2}`,
            borderRadius: 16, padding: '24px 32px', display: 'flex',
            alignItems: 'center', gap: 16,
            boxShadow: filterT > 0 ? `0 0 0 4px rgba(30, 77, 84, ${0.15 * (1 - filterT)})` : 'none',
          }}>
            <div style={{ fontSize: 28, color: VAULT.text3 }}>⌕</div>
            <div style={{
              flex: 1, fontFamily: '"Instrument Serif", serif',
              fontSize: 42, color: VAULT.text, letterSpacing: -1,
              fontStyle: 'italic',
            }}>
              {typedText}
              <span style={{ opacity: cursor, color: VAULT.teal }}>|</span>
            </div>
          </div>
        </div>

        {/* results grid */}
        <div style={{
          marginTop: 60, display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)', gap: 16,
          maxWidth: 1500, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {cards.map(i => {
            const col = i % 6;
            const initOp = animate({ from: 0, to: 1, start: 0.3 + col * 0.06, end: 0.3 + col * 0.06 + 0.4 })(localTime);

            // Once filtered: matches stay full opacity, others fade to 0.08
            const isMatch = matches.includes(i);
            const filteredOp = isMatch ? 1 : 0.08;
            const finalOp = initOp * (1 - filterT) + filteredOp * filterT;

            // Matches grow slightly when filtered
            const matchScale = isMatch ? 1 + filterT * 0.06 : 1;

            const tones = ['#3a2a30', '#5a4030', '#3a2a20', '#604030', '#3a4a3a', '#4a4045', '#3a2a30', '#3a2a25', '#2a3a45', '#5a3525', '#2a2a35', '#3a4a2a'];
            return (
              <div key={i} style={{
                background: VAULT.panel, border: `1px solid ${isMatch && filterT > 0.5 ? VAULT.teal : VAULT.edge}`,
                borderRadius: 12, overflow: 'hidden',
                opacity: finalOp, transform: `scale(${matchScale})`,
                aspectRatio: '3/4',
                transition: 'border-color 0.3s',
              }}>
                <div style={{ flex: 1, height: '70%', background: tones[i] }}/>
                <div style={{ padding: '8px 10px', height: '30%' }}>
                  <div style={{ fontSize: 9, color: VAULT.text3, fontFamily: '"JetBrains Mono", monospace' }}>
                    {isMatch ? 'places · nyc' : '...'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* bottom callout */}
        {localTime > 4.0 && (
          <div style={{
            marginTop: 50, textAlign: 'center',
            opacity: animate({ from: 0, to: 1, start: 4.0, end: 4.5 })(localTime),
          }}>
            <div style={{
              fontFamily: '"Instrument Serif", serif', fontSize: 56,
              color: VAULT.text, letterSpacing: -1.5, fontWeight: 400,
            }}>
              found <span style={{ color: VAULT.teal, fontStyle: 'italic' }}>3 things</span>. you didn't even use the right words.
            </div>
          </div>
        )}
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 07 — MEMORY: things the bot has picked up about you
// ───────────────────────────────────────────────────────────────────────
function Scene07_Memory() {
  const { localTime } = useSprite();

  const memories = [
    { kind: 'fact', txt: 'lives in brooklyn, ny', age: '6mo' },
    { kind: 'preference', txt: 'mostly pescatarian, eats fish occasionally', age: '3mo' },
    { kind: 'goal', txt: 'training for first half marathon, target sub-2hr', age: '1mo' },
    { kind: 'project', txt: 'building a tiny vector db in rust on weekends', age: '3w' },
    { kind: 'preference', txt: 'prefers casual solo dining over big group reservations', age: '2mo' },
    { kind: 'people', txt: 'partner sam — they pick restaurants together', age: '4mo' },
  ];

  const kindColor = {
    fact: VAULT.teal, preference: VAULT.sienna,
    goal: VAULT.warn, project: '#8A6478', people: '#5C8A6E',
  };

  return (
    <PaperBg tone={VAULT.vault}>
      <div style={{ position: 'absolute', inset: '70px 120px', display: 'flex', gap: 80 }}>
        {/* left: title */}
        <div style={{ flex: 1, paddingTop: 60 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
            color: VAULT.text3, letterSpacing: 3, textTransform: 'uppercase',
            opacity: animate({ from: 0, to: 1, start: 0, end: 0.5 })(localTime),
          }}>
            it learns you
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 100, lineHeight: 1.0, color: VAULT.text,
            letterSpacing: -3, fontWeight: 400, marginTop: 14,
            opacity: animate({ from: 0, to: 1, start: 0.1, end: 0.7 })(localTime),
            transform: `translateY(${animate({ from: 30, to: 0, start: 0.1, end: 0.7, ease: Easing.easeOutCubic })(localTime)}px)`,
          }}>
            the more you<br/>
            send, the more<br/>
            it <span style={{ fontStyle: 'italic', color: VAULT.teal }}>knows you.</span>
          </div>
          <div style={{
            fontSize: 22, color: VAULT.text2, marginTop: 30, lineHeight: 1.55, maxWidth: 540,
            opacity: animate({ from: 0, to: 1, start: 1.0, end: 1.6 })(localTime),
          }}>
            so when you ask <span style={{ fontStyle: 'italic', color: VAULT.text }}>"that ramen place"</span>, it doesn't ask <span style={{ fontStyle: 'italic' }}>which one.</span>
          </div>
        </div>

        {/* right: memories cascading in */}
        <div style={{ flex: 1, paddingTop: 60, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {memories.map((m, i) => {
            const delay = 1.5 + i * 0.4;
            const op = animate({ from: 0, to: 1, start: delay, end: delay + 0.5, ease: Easing.easeOutCubic })(localTime);
            const tx = animate({ from: 40, to: 0, start: delay, end: delay + 0.5, ease: Easing.easeOutCubic })(localTime);
            return (
              <div key={i} style={{
                background: VAULT.panel, border: `1px solid ${VAULT.edge}`,
                borderRadius: 10, padding: '18px 22px',
                opacity: op, transform: `translateX(${tx}px)`,
              }}>
                <div style={{
                  display: 'inline-block', fontSize: 11,
                  padding: '3px 10px', borderRadius: 999,
                  color: kindColor[m.kind], background: 'rgba(0,0,0,0.04)',
                  border: `1px solid ${VAULT.edge}`, fontWeight: 500,
                  marginBottom: 8,
                }}>{m.kind}</div>
                <div style={{ fontSize: 18, color: VAULT.text, lineHeight: 1.35 }}>
                  {m.txt}
                </div>
                <div style={{
                  fontSize: 12, color: VAULT.text3, marginTop: 6,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  learned {m.age} ago
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 08 — REMINDER: "hey, you saved that pottery class"
// ───────────────────────────────────────────────────────────────────────
function Scene08_Reminder() {
  const { localTime } = useSprite();

  const labelOp = animate({ from: 0, to: 1, start: 0, end: 0.5 })(localTime);
  const phoneOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8, ease: Easing.easeOutCubic })(localTime);
  const phoneScale = animate({ from: 0.95, to: 1, start: 0.2, end: 0.8, ease: Easing.easeOutCubic })(localTime);

  // Notification slides in from top at t=1.5
  const notifY = animate({ from: -100, to: 0, start: 1.5, end: 2.1, ease: Easing.easeOutBack })(localTime);
  const notifOp = animate({ from: 0, to: 1, start: 1.5, end: 2.1 })(localTime);

  // Subtle bounce/buzz at t=2.5
  const buzz = localTime > 2.5 && localTime < 3.0
    ? Math.sin((localTime - 2.5) * 60) * 4 * (1 - (localTime - 2.5) / 0.5)
    : 0;

  return (
    <PaperBg tone={VAULT.ink}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 100,
      }}>
        <div style={{ width: 600, opacity: labelOp }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
            color: VAULT.text3, letterSpacing: 3, textTransform: 'uppercase',
            marginBottom: 18,
          }}>
            and it remembers, even when you forget
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 84, lineHeight: 1.05, color: VAULT.text,
            letterSpacing: -2.5, fontWeight: 400,
          }}>
            <span style={{ fontStyle: 'italic', color: VAULT.teal }}>"hey,</span> you said<br/>
            you wanted to do<br/>
            this on a sunday.<span style={{ fontStyle: 'italic', color: VAULT.teal }}>"</span>
          </div>
          <div style={{
            fontSize: 22, color: VAULT.text2, marginTop: 48, lineHeight: 1.55, maxWidth: 520,
            opacity: animate({ from: 0, to: 1, start: 3.0, end: 3.6 })(localTime),
          }}>
            ask it to remind you. set a recurrence. or just trust it to nudge you when the moment fits.
          </div>
        </div>

        {/* phone */}
        <div style={{
          width: 380, height: 780, background: '#000', borderRadius: 48,
          padding: 14, position: 'relative',
          opacity: phoneOp,
          transform: `scale(${phoneScale}) translateX(${buzz}px)`,
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden',
            background: 'linear-gradient(180deg, #1a1814 0%, #0a0a0b 100%)',
            position: 'relative',
          }}>
            {/* lock screen time */}
            <div style={{
              position: 'absolute', top: 80, left: 0, right: 0,
              textAlign: 'center', color: '#fff',
            }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Sunday, March 9</div>
              <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 88, fontWeight: 300, letterSpacing: -3 }}>10:42</div>
            </div>

            {/* notification */}
            <div style={{
              position: 'absolute', top: 280, left: 16, right: 16,
              transform: `translateY(${notifY}px)`,
              opacity: notifOp,
            }}>
              <div style={{
                background: 'rgba(40,40,42,0.9)', backdropFilter: 'blur(20px)',
                borderRadius: 18, padding: 14,
                display: 'flex', gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: VAULT.teal,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                  fontSize: 22, color: VAULT.ink,
                }}>r</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2,
                  }}>
                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>vault</span>
                    <span>now</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 2 }}>
                    that pottery class
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35 }}>
                    you saved it 3 weeks ago and said you wanted to do it on a sunday. it's sunday.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene 09 — CLOSE: logo + tagline + phone number
// ───────────────────────────────────────────────────────────────────────
function Scene09_Close() {
  const { localTime } = useSprite();

  const op1 = animate({ from: 0, to: 1, start: 0, end: 0.6 })(localTime);
  const sealScale = animate({ from: 0.7, to: 1, start: 0, end: 0.8, ease: Easing.easeOutBack })(localTime);
  const op2 = animate({ from: 0, to: 1, start: 0.8, end: 1.4 })(localTime);
  const op3 = animate({ from: 0, to: 1, start: 1.5, end: 2.1 })(localTime);
  const op4 = animate({ from: 0, to: 1, start: 2.5, end: 3.1 })(localTime);

  return (
    <PaperBg tone={VAULT.ink}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* seal */}
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: VAULT.teal, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          opacity: op1, transform: `scale(${sealScale})`,
          boxShadow: `0 0 0 8px ${VAULT.ink}, 0 0 0 9px ${VAULT.edge2}`,
        }}>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 100, fontStyle: 'italic',
            color: VAULT.ink, fontWeight: 400, lineHeight: 1,
            marginTop: -4,
          }}>r</div>
        </div>

        {/* wordmark */}
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 200, lineHeight: 1, color: VAULT.text,
          letterSpacing: -8, fontWeight: 400, marginTop: 32,
          opacity: op2,
        }}>
          reelvault
        </div>

        {/* tagline */}
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 48, lineHeight: 1.2, color: VAULT.text2,
          letterSpacing: -1, fontStyle: 'italic',
          marginTop: 24, opacity: op3, textAlign: 'center',
        }}>
          a vault for the things you almost forgot.
        </div>

        {/* phone number CTA */}
        <div style={{
          marginTop: 80, opacity: op4,
          display: 'flex', alignItems: 'center', gap: 24,
          padding: '18px 32px', borderRadius: 999,
          background: VAULT.panel, border: `1.5px solid ${VAULT.edge2}`,
        }}>
          <span style={{
            fontSize: 16, color: VAULT.text3,
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: 2, textTransform: 'uppercase',
          }}>text the vault</span>
          <span style={{ width: 1, height: 24, background: VAULT.edge2 }}/>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 26, color: VAULT.teal, fontWeight: 600,
            letterSpacing: 1,
          }}>+1 (415) 555-VLT</span>
        </div>
      </div>
    </PaperBg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Export to window
// ───────────────────────────────────────────────────────────────────────
Object.assign(window, {
  Scene01_Hook, Scene02_Graveyard, Scene03_Pivot, Scene04_TextBot,
  Scene05_Library, Scene06_Search, Scene07_Memory, Scene08_Reminder, Scene09_Close,
});
