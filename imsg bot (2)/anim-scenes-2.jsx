// anim-scenes-2.jsx — additional demo scenes for the ReelVault film.

const VAULT2 = {
  ink: '#F5F0E8', vault: '#EFE8DC', panel: '#FBF7F0',
  edge: '#E4DCCC', edge2: '#D2C7B2',
  text: '#1F1B14', text2: '#5A5142', text3: '#8C8470', text4: '#B5AC95',
  teal: '#1E4D54', tealSoft: '#3D7079', sienna: '#7A4E2E',
  ig: '#C44A6B', tt: '#3DB8B2', warn: '#C68A2E',
};

const PaperBg2 = ({ tone = VAULT2.ink, children }) => (
  <div style={{ position: 'absolute', inset: 0, background: tone, overflow: 'hidden' }}>
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
// Scene 4.5 — TWO WAYS IN: web app vs iMessage bot, side by side
// ───────────────────────────────────────────────────────────────────────
function Scene_TwoWays() {
  const { localTime } = useSprite();
  const labelOp = animate({ from: 0, to: 1, start: 0, end: 0.6 })(localTime);
  const headOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);
  const headY = animate({ from: 30, to: 0, start: 0.2, end: 0.8, ease: Easing.easeOutCubic })(localTime);

  // Both surfaces fade in at slightly different times so the eye follows
  const webOp = animate({ from: 0, to: 1, start: 1.0, end: 1.6, ease: Easing.easeOutCubic })(localTime);
  const webY = animate({ from: 30, to: 0, start: 1.0, end: 1.6, ease: Easing.easeOutCubic })(localTime);
  const phoneOp = animate({ from: 0, to: 1, start: 1.4, end: 2.0, ease: Easing.easeOutCubic })(localTime);
  const phoneY = animate({ from: 30, to: 0, start: 1.4, end: 2.0, ease: Easing.easeOutCubic })(localTime);

  // Save action lights up on both at t=3.0
  const savePulse = animate({ from: 0, to: 1, start: 3.0, end: 3.4 })(localTime);
  const decay = localTime > 3.4 ? Math.max(0, 1 - (localTime - 3.4) / 1.5) : savePulse;

  return (
    <PaperBg2 tone={VAULT2.vault}>
      {/* Top label + headline */}
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
          color: VAULT2.text3, letterSpacing: 3, textTransform: 'uppercase',
          opacity: labelOp, marginBottom: 18,
        }}>
          two ways in. one vault.
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontSize: 92, lineHeight: 1.0,
          color: VAULT2.text, letterSpacing: -3, fontWeight: 400,
          opacity: headOp, transform: `translateY(${headY}px)`,
        }}>
          text it. <span style={{ fontStyle: 'italic', color: VAULT2.teal }}>or</span> open it.
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 320, bottom: 80, left: 80, right: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80,
      }}>
        {/* LEFT: browser window */}
        <div style={{
          flex: 1, maxWidth: 760, opacity: webOp,
          transform: `translateY(${webY}px)`,
        }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
            color: VAULT2.text3, letterSpacing: 2, textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            on the web
          </div>
          <div style={{
            background: VAULT2.panel, border: `1.5px solid ${VAULT2.edge2}`,
            borderRadius: 10, overflow: 'hidden',
            boxShadow: `0 30px 60px rgba(0,0,0,0.08), 0 0 0 ${4 * decay}px rgba(30,77,84,${0.18 * decay})`,
          }}>
            {/* chrome */}
            <div style={{
              padding: '10px 14px', borderBottom: `1px solid ${VAULT2.edge}`,
              background: VAULT2.vault, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {['#E26B5A', '#D9A949', '#5C8A4E'].map(c => (
                <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }}/>
              ))}
              <div style={{
                flex: 1, marginLeft: 14, padding: '4px 12px',
                background: VAULT2.panel, border: `1px solid ${VAULT2.edge}`, borderRadius: 5,
                fontSize: 11, color: VAULT2.text3, fontFamily: '"JetBrains Mono", monospace',
              }}>reelvault.app/save</div>
            </div>
            {/* body */}
            <div style={{ padding: '36px 40px' }}>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontSize: 36,
                color: VAULT2.text, letterSpacing: -1, lineHeight: 1.1, fontWeight: 400,
              }}>
                paste a link, drop a file, <span style={{ fontStyle: 'italic', color: VAULT2.teal }}>or just keep scrolling.</span>
              </div>
              {/* paste box */}
              <div style={{
                marginTop: 28, padding: '18px 20px',
                background: VAULT2.vault, border: `2px dashed ${VAULT2.edge2}`,
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ fontSize: 22, color: VAULT2.text3 }}>+</div>
                <div style={{
                  flex: 1, fontSize: 14, color: VAULT2.text2,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  instagram.com/reel/C9k...<span style={{ color: VAULT2.teal, opacity: Math.floor(localTime * 2) % 2 }}>|</span>
                </div>
                <div style={{
                  padding: '8px 14px', borderRadius: 6, fontSize: 12,
                  background: savePulse > 0.5 ? VAULT2.teal : VAULT2.text,
                  color: VAULT2.ink, fontWeight: 500,
                  transition: 'background 0.3s',
                }}>save it</div>
              </div>
              {/* ghost rows */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '10px 12px', background: VAULT2.vault,
                    border: `1px solid ${VAULT2.edge}`, borderRadius: 8,
                  }}>
                    <div style={{ width: 38, height: 38, borderRadius: 5, background: ['#3a2a30','#5a4030','#304a55'][i] }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: VAULT2.text }}>{['ichiran ramen, midtown','crispy gnocchi sheet pan','20-min beginner pilates'][i]}</div>
                      <div style={{ fontSize: 10, color: VAULT2.text3, marginTop: 2, fontFamily: '"JetBrains Mono", monospace' }}>
                        saved 2h ago
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: phone with imessage */}
        <div style={{
          width: 360, opacity: phoneOp,
          transform: `translateY(${phoneY}px)`,
        }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
            color: VAULT2.text3, letterSpacing: 2, textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            in your texts
          </div>
          <div style={{
            background: '#000', borderRadius: 44, padding: 12,
            boxShadow: `0 30px 60px rgba(0,0,0,0.18), 0 0 0 ${4 * decay}px rgba(30,77,84,${0.18 * decay})`,
            height: 700,
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: 32,
              background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
              {/* status */}
              <div style={{
                height: 38, padding: '14px 28px 0', display: 'flex',
                justifyContent: 'space-between', fontSize: 12, color: '#fff', fontWeight: 600,
              }}>
                <span>9:41</span>
                <span style={{ fontSize: 9 }}>● ● ●</span>
              </div>
              {/* contact */}
              <div style={{ padding: '6px 0 12px', textAlign: 'center', borderBottom: '0.5px solid #1c1c1e' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: VAULT2.teal,
                  margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"Instrument Serif", serif', fontSize: 22,
                  fontStyle: 'italic', color: VAULT2.ink,
                }}>r</div>
                <div style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>vault</div>
              </div>
              {/* messages */}
              <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
                  <div style={{
                    background: 'linear-gradient(180deg, #2c2c2e, #1c1c1e)',
                    border: '1px solid #38383a', borderRadius: 14, padding: 6, width: 170,
                  }}>
                    <div style={{
                      width: '100%', height: 160, borderRadius: 9,
                      background: 'linear-gradient(135deg, hsl(20,35%,18%), hsl(280,30%,22%))',
                      position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 6,
                    }}>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        @nyceatswithjess
                      </div>
                      <div style={{
                        position: 'absolute', top: 6, left: 6,
                        background: 'rgba(0,0,0,0.5)', borderRadius: 3,
                        padding: '1px 5px', fontSize: 7, color: '#fff',
                      }}>instagram.com/reel</div>
                    </div>
                  </div>
                </div>
                <div style={{
                  alignSelf: 'flex-start', maxWidth: '82%',
                  opacity: savePulse,
                }}>
                  <div style={{
                    background: '#1c1c1e', borderRadius: 14, padding: '8px 12px',
                    fontSize: 11, color: '#fff', lineHeight: 1.4,
                  }}>
                    saved to <span style={{ color: VAULT2.tealSoft, fontWeight: 600 }}>places to eat</span> ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* center connector — the same vault */}
        {localTime > 2.6 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: animate({ from: 0, to: 1, start: 2.6, end: 3.2 })(localTime),
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: VAULT2.ink, border: `1.5px solid ${VAULT2.edge2}`,
            borderRadius: 999, padding: '14px 22px',
          }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
              color: VAULT2.text3, letterSpacing: 2, textTransform: 'uppercase',
            }}>same vault</div>
            <div style={{
              fontFamily: '"Instrument Serif", serif', fontSize: 28,
              fontStyle: 'italic', color: VAULT2.teal, lineHeight: 1, letterSpacing: -0.5,
            }}>↔</div>
          </div>
        )}
      </div>
    </PaperBg2>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene B — WEEKLY DIGEST: sunday morning recap text
// ───────────────────────────────────────────────────────────────────────
function Scene_Digest() {
  const { localTime } = useSprite();

  const labelOp = animate({ from: 0, to: 1, start: 0, end: 0.5 })(localTime);
  const headOp = animate({ from: 0, to: 1, start: 0.2, end: 0.9 })(localTime);
  const phoneOp = animate({ from: 0, to: 1, start: 0.4, end: 1.0, ease: Easing.easeOutCubic })(localTime);

  // Bubble sequence
  const bubbleStarts = [1.4, 2.2, 3.0, 3.8, 4.6];

  return (
    <PaperBg2 tone={VAULT2.ink}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 100,
      }}>
        {/* left text */}
        <div style={{ width: 580 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
            color: VAULT2.text3, letterSpacing: 3, textTransform: 'uppercase',
            opacity: labelOp, marginBottom: 18,
          }}>
            sundays at 9am
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif', fontSize: 92, lineHeight: 1.0,
            color: VAULT2.text, letterSpacing: -3, fontWeight: 400, opacity: headOp,
          }}>
            your week,<br/>
            <span style={{ fontStyle: 'italic', color: VAULT2.teal }}>handed back</span> to you.
          </div>
          <div style={{
            fontSize: 22, color: VAULT2.text2, marginTop: 32, lineHeight: 1.55, maxWidth: 520,
            opacity: animate({ from: 0, to: 1, start: 1.5, end: 2.1 })(localTime),
          }}>
            a digest of what you saved, what's still untouched, and one thing it thinks you should actually do.
          </div>
        </div>

        {/* phone */}
        <div style={{
          width: 380, height: 760, background: '#000', borderRadius: 46, padding: 12,
          boxShadow: '0 40px 80px rgba(0,0,0,0.22)', opacity: phoneOp,
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 34,
            background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              height: 40, padding: '14px 28px 0', display: 'flex',
              justifyContent: 'space-between', fontSize: 12, color: '#fff', fontWeight: 600,
            }}>
              <span>9:01</span><span style={{ fontSize: 9 }}>● ● ●</span>
            </div>
            <div style={{ padding: '6px 0 10px', textAlign: 'center', borderBottom: '0.5px solid #1c1c1e' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: VAULT2.teal,
                margin: '0 auto 3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Instrument Serif", serif', fontSize: 22,
                fontStyle: 'italic', color: VAULT2.ink,
              }}>r</div>
              <div style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>vault</div>
            </div>
            <div style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { txt: <>good morning. here's your week.</>, },
                { txt: <>you saved <b style={{ color: VAULT2.tealSoft }}>14 things</b>. mostly recipes (6), a few workouts (3), and that one tax thing you keep putting off.</>, },
                { txt: <><b style={{ color: VAULT2.tealSoft }}>still untouched:</b> 4 places to eat in lisbon. you're going in 3 weeks btw.</>, },
                { txt: <>oh and the <b style={{ color: VAULT2.tealSoft }}>green goddess dressing</b> recipe — you have all the ingredients. takes 8 mins.</>, },
                { txt: <>that's the one i'd pick. happy sunday ✿</>, },
              ].map((b, i) => {
                const delay = bubbleStarts[i];
                const op = animate({ from: 0, to: 1, start: delay, end: delay + 0.4, ease: Easing.easeOutBack })(localTime);
                const ty = animate({ from: 16, to: 0, start: delay, end: delay + 0.4, ease: Easing.easeOutCubic })(localTime);
                return (
                  <div key={i} style={{
                    alignSelf: 'flex-start', maxWidth: '85%',
                    opacity: op, transform: `translateY(${ty}px)`,
                  }}>
                    <div style={{
                      background: '#1c1c1e', borderRadius: 16,
                      padding: '9px 13px', fontSize: 12, color: '#fff', lineHeight: 1.45,
                    }}>{b.txt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PaperBg2>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene C — ASK ANYTHING: chat-style query in the web app
// ───────────────────────────────────────────────────────────────────────
function Scene_Ask() {
  const { localTime } = useSprite();
  const query = "what was that workout from last week?";
  const typed = Math.floor(animate({ from: 0, to: query.length, start: 0.8, end: 3.0 })(localTime));
  const typedTxt = query.slice(0, typed);
  const cursor = Math.floor(localTime * 2) % 2;

  const labelOp = animate({ from: 0, to: 1, start: 0, end: 0.5 })(localTime);
  const winOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  // Answer appears
  const ansOp = animate({ from: 0, to: 1, start: 3.5, end: 4.1 })(localTime);
  const ansY = animate({ from: 14, to: 0, start: 3.5, end: 4.1, ease: Easing.easeOutCubic })(localTime);
  const cardOp = animate({ from: 0, to: 1, start: 4.4, end: 5.0, ease: Easing.easeOutBack })(localTime);
  const cardY = animate({ from: 20, to: 0, start: 4.4, end: 5.0, ease: Easing.easeOutCubic })(localTime);

  return (
    <PaperBg2 tone={VAULT2.vault}>
      <div style={{ position: 'absolute', top: 60, left: 80, right: 80 }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
          color: VAULT2.text3, letterSpacing: 3, textTransform: 'uppercase',
          opacity: labelOp, marginBottom: 12,
        }}>
          ask anything, in your words
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontSize: 84, lineHeight: 1.0,
          color: VAULT2.text, letterSpacing: -2.5, fontWeight: 400,
          opacity: animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime),
        }}>
          you don't have to remember the title. <span style={{ fontStyle: 'italic', color: VAULT2.teal }}>just describe it.</span>
        </div>
      </div>

      {/* chat window */}
      <div style={{
        position: 'absolute', top: 340, bottom: 60, left: 200, right: 200,
        background: VAULT2.panel, border: `1.5px solid ${VAULT2.edge2}`,
        borderRadius: 14, overflow: 'hidden', opacity: winOp,
        boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* header */}
        <div style={{
          padding: '14px 22px', borderBottom: `1px solid ${VAULT2.edge}`,
          display: 'flex', alignItems: 'center', gap: 12, background: VAULT2.vault,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: VAULT2.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Instrument Serif", serif', fontSize: 18,
            fontStyle: 'italic', color: VAULT2.ink,
          }}>r</div>
          <div>
            <div style={{ fontSize: 14, color: VAULT2.text, fontWeight: 500 }}>chat with your vault</div>
            <div style={{ fontSize: 11, color: VAULT2.text3, fontFamily: '"JetBrains Mono", monospace' }}>
              searching across 847 saves
            </div>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, padding: '32px 40px', overflow: 'hidden' }}>
          {/* user message */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <div style={{
              background: VAULT2.text, color: VAULT2.ink, padding: '14px 18px',
              borderRadius: 16, maxWidth: 600, fontSize: 18, lineHeight: 1.5,
              fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
            }}>
              {typedTxt}<span style={{ opacity: cursor }}>|</span>
            </div>
          </div>

          {/* answer */}
          <div style={{
            opacity: ansOp, transform: `translateY(${ansY}px)`,
            display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: VAULT2.teal,
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Instrument Serif", serif', fontSize: 17,
              fontStyle: 'italic', color: VAULT2.ink,
            }}>r</div>
            <div style={{ flex: 1, fontSize: 18, color: VAULT2.text, lineHeight: 1.55 }}>
              the 20-min beginner pilates one from <b>@moveswithmel</b>. you saved it tuesday afternoon and watched 0:18 of it.
            </div>
          </div>

          {/* result card */}
          <div style={{
            marginLeft: 46, opacity: cardOp, transform: `translateY(${cardY}px)`,
            background: VAULT2.vault, border: `1px solid ${VAULT2.edge2}`,
            borderRadius: 10, overflow: 'hidden', display: 'flex', maxWidth: 580,
          }}>
            <div style={{ width: 130, height: 170, background: '#304a55', flexShrink: 0, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 8, left: 8,
                fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.45)',
                padding: '2px 6px', borderRadius: 3, fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase', letterSpacing: 1,
              }}>TT</div>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)', fontSize: 30,
              }}>▶</div>
            </div>
            <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                fontSize: 10, color: VAULT2.tt, fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
              }}>workouts · tiktok</div>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontSize: 22,
                color: VAULT2.text, letterSpacing: -0.5, lineHeight: 1.15,
              }}>
                20-min beginner pilates flow
              </div>
              <div style={{ fontSize: 13, color: VAULT2.text2, lineHeight: 1.4 }}>
                no equipment. mat optional. she focuses on form, not tempo.
              </div>
              <div style={{
                marginTop: 4, fontSize: 11, color: VAULT2.text3,
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                saved tue · 19:47
              </div>
            </div>
          </div>

          {/* follow up */}
          {localTime > 5.4 && (
            <div style={{
              marginTop: 28, marginLeft: 46,
              opacity: animate({ from: 0, to: 1, start: 5.4, end: 6.0 })(localTime),
              fontSize: 16, color: VAULT2.text3, fontStyle: 'italic',
              fontFamily: '"Instrument Serif", serif',
            }}>
              want me to remind you tonight?
            </div>
          )}
        </div>
      </div>
    </PaperBg2>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene D — VOICE NOTE: speak to the bot
// ───────────────────────────────────────────────────────────────────────
function Scene_Voice() {
  const { localTime } = useSprite();
  const labelOp = animate({ from: 0, to: 1, start: 0, end: 0.5 })(localTime);
  const headOp = animate({ from: 0, to: 1, start: 0.1, end: 0.7 })(localTime);
  const headY = animate({ from: 30, to: 0, start: 0.1, end: 0.7, ease: Easing.easeOutCubic })(localTime);
  const phoneOp = animate({ from: 0, to: 1, start: 0.3, end: 0.9 })(localTime);

  // Voice waveform animates t=1.0..3.5
  const wfActive = localTime > 1.0 && localTime < 3.8;

  // Reply text appears at 4.0
  const replyOp = animate({ from: 0, to: 1, start: 4.2, end: 4.8, ease: Easing.easeOutBack })(localTime);
  const replyY = animate({ from: 14, to: 0, start: 4.2, end: 4.8, ease: Easing.easeOutCubic })(localTime);

  return (
    <PaperBg2 tone={VAULT2.ink}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 100,
      }}>
        {/* left */}
        <div style={{ width: 580 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
            color: VAULT2.text3, letterSpacing: 3, textTransform: 'uppercase',
            opacity: labelOp, marginBottom: 18,
          }}>
            even when your hands are full
          </div>
          <div style={{
            fontFamily: '"Instrument Serif", serif', fontSize: 92, lineHeight: 1.0,
            color: VAULT2.text, letterSpacing: -3, fontWeight: 400,
            opacity: headOp, transform: `translateY(${headY}px)`,
          }}>
            <span style={{ fontStyle: 'italic', color: VAULT2.teal }}>just say</span> what<br/>
            you mean.
          </div>
          <div style={{
            fontSize: 22, color: VAULT2.text2, marginTop: 30, lineHeight: 1.55, maxWidth: 480,
            opacity: animate({ from: 0, to: 1, start: 1.0, end: 1.6 })(localTime),
          }}>
            send a voice note from the kitchen, the car, the bottom of your bag — it transcribes, files, replies.
          </div>
        </div>

        {/* phone */}
        <div style={{
          width: 380, height: 760, background: '#000', borderRadius: 46, padding: 12,
          boxShadow: '0 40px 80px rgba(0,0,0,0.22)', opacity: phoneOp,
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 34,
            background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              height: 40, padding: '14px 28px 0', display: 'flex',
              justifyContent: 'space-between', fontSize: 12, color: '#fff', fontWeight: 600,
            }}>
              <span>2:14</span><span style={{ fontSize: 9 }}>● ● ●</span>
            </div>
            <div style={{ padding: '6px 0 10px', textAlign: 'center', borderBottom: '0.5px solid #1c1c1e' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: VAULT2.teal,
                margin: '0 auto 3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Instrument Serif", serif', fontSize: 22,
                fontStyle: 'italic', color: VAULT2.ink,
              }}>r</div>
              <div style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>vault</div>
            </div>

            <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* outgoing voice bubble */}
              <div style={{
                alignSelf: 'flex-end', maxWidth: '85%',
                opacity: animate({ from: 0, to: 1, start: 1.0, end: 1.4 })(localTime),
              }}>
                <div style={{
                  background: '#0a84ff', borderRadius: 18,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  minWidth: 220,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#fff',
                  }}>▶</div>
                  {/* waveform */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 22 }}>
                    {Array.from({ length: 22 }, (_, i) => {
                      const base = 4 + (Math.sin(i * 0.9) + 1) * 6;
                      const live = wfActive ? Math.abs(Math.sin(localTime * 6 + i * 0.4)) * 8 : 0;
                      const h = Math.min(20, base + live);
                      return <div key={i} style={{
                        width: 2, height: h, background: 'rgba(255,255,255,0.85)', borderRadius: 1,
                      }}/>;
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>0:08</div>
                </div>
              </div>

              {/* transcript */}
              <div style={{
                alignSelf: 'flex-end', maxWidth: '82%',
                opacity: animate({ from: 0, to: 1, start: 2.4, end: 3.0 })(localTime),
              }}>
                <div style={{
                  background: '#0a84ff', borderRadius: 18, padding: '8px 13px',
                  fontSize: 12, color: '#fff', lineHeight: 1.4, fontStyle: 'italic',
                }}>
                  remind me to grab oat milk before that dinner thing on saturday
                </div>
              </div>

              {/* bot reply */}
              <div style={{
                alignSelf: 'flex-start', maxWidth: '85%',
                opacity: replyOp, transform: `translateY(${replyY}px)`,
              }}>
                <div style={{
                  background: '#1c1c1e', borderRadius: 18, padding: '10px 14px',
                  fontSize: 12.5, color: '#fff', lineHeight: 1.45,
                }}>
                  done. saturday 4:30pm — <span style={{ color: VAULT2.tealSoft, fontWeight: 600 }}>oat milk</span> before sam's birthday dinner.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PaperBg2>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Scene E — SHARE BACK: forward a vault item to a friend
// ───────────────────────────────────────────────────────────────────────
function Scene_Share() {
  const { localTime } = useSprite();
  const labelOp = animate({ from: 0, to: 1, start: 0, end: 0.5 })(localTime);
  const headOp = animate({ from: 0, to: 1, start: 0.1, end: 0.7 })(localTime);

  // Card flies from left phone (vault) to right phone (friend) at t=2.0..3.5
  const flyT = animate({ from: 0, to: 1, start: 2.2, end: 3.4, ease: Easing.easeInOutCubic })(localTime);
  const cardX = -200 + flyT * 700;
  const cardOp = localTime > 1.4 ? animate({ from: 0, to: 1, start: 1.4, end: 1.9 })(localTime) : 0;
  const cardFadeOut = localTime > 3.3 ? 1 - clamp((localTime - 3.3) / 0.3, 0, 1) : 1;

  // Right phone notification arrives at 3.4
  const notifOp = animate({ from: 0, to: 1, start: 3.4, end: 3.9, ease: Easing.easeOutBack })(localTime);
  const notifY = animate({ from: -16, to: 0, start: 3.4, end: 3.9, ease: Easing.easeOutCubic })(localTime);

  return (
    <PaperBg2 tone={VAULT2.vault}>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
          color: VAULT2.text3, letterSpacing: 3, textTransform: 'uppercase',
          opacity: labelOp, marginBottom: 18,
        }}>
          and when something's actually good
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontSize: 88, lineHeight: 1.0,
          color: VAULT2.text, letterSpacing: -3, fontWeight: 400, opacity: headOp,
        }}>
          send it back out. <span style={{ fontStyle: 'italic', color: VAULT2.teal }}>with context.</span>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 320, bottom: 60, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 280,
        position: 'relative',
      }}>
        {/* LEFT phone (your vault) */}
        <div style={{ width: 340, height: 700, background: '#000', borderRadius: 42, padding: 12 }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 30, background: VAULT2.ink,
            overflow: 'hidden', position: 'relative', padding: '20px 14px',
          }}>
            <div style={{
              fontFamily: '"Instrument Serif", serif', fontSize: 22,
              color: VAULT2.text, letterSpacing: -0.5, marginBottom: 14,
            }}>your vault</div>
            <div style={{
              padding: 10, background: VAULT2.panel, border: `1px solid ${VAULT2.edge}`,
              borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <div style={{ width: 56, height: 70, borderRadius: 5, background: '#5a4030', flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 9, color: VAULT2.ig, fontFamily: '"JetBrains Mono", monospace',
                  textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
                }}>recipes</div>
                <div style={{ fontSize: 13, color: VAULT2.text, fontWeight: 500, marginTop: 2 }}>
                  green goddess dressing
                </div>
                <div style={{ fontSize: 10, color: VAULT2.text3, marginTop: 4 }}>
                  saved last tue
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: VAULT2.teal, color: VAULT2.ink, borderRadius: 8,
              fontSize: 12, fontWeight: 500, textAlign: 'center',
            }}>
              share with sam ↗
            </div>
          </div>
        </div>

        {/* RIGHT phone (friend's iMessage) */}
        <div style={{ width: 340, height: 700, background: '#000', borderRadius: 42, padding: 12 }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 30,
            background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            <div style={{
              padding: '14px 0 10px', textAlign: 'center', borderBottom: '0.5px solid #1c1c1e',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: '#5a4030',
                margin: '0 auto 3px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, color: '#fff',
              }}>S</div>
              <div style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>sam</div>
            </div>

            {/* incoming bubble pre-share */}
            <div style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '78%' }}>
                <div style={{
                  background: '#1c1c1e', borderRadius: 16, padding: '8px 12px',
                  fontSize: 11, color: '#fff', lineHeight: 1.4,
                }}>what was that dressing thing again</div>
              </div>

              {/* the new shared card */}
              <div style={{
                alignSelf: 'flex-end', maxWidth: '85%',
                opacity: notifOp, transform: `translateY(${notifY}px)`,
              }}>
                <div style={{
                  background: 'linear-gradient(180deg, #2c2c2e, #1c1c1e)',
                  border: '1px solid #38383a', borderRadius: 14, padding: 6, width: 200,
                }}>
                  <div style={{
                    width: '100%', height: 100, borderRadius: 9,
                    background: '#5a4030', position: 'relative',
                    display: 'flex', alignItems: 'flex-end', padding: 8,
                  }}>
                    <div style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>
                      green goddess dressing
                    </div>
                  </div>
                  <div style={{ padding: '6px 4px 2px' }}>
                    <div style={{
                      fontSize: 9, color: VAULT2.tealSoft, fontFamily: '"JetBrains Mono", monospace',
                      textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
                    }}>shared from vault</div>
                    <div style={{
                      fontSize: 11, color: '#fff', marginTop: 3,
                      fontStyle: 'italic',
                    }}>
                      "8 mins. you have everything except the herbs."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* flying card overlay */}
        {localTime > 1.4 && localTime < 3.6 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(${-100 + cardX}px, -50%) rotate(${flyT * -8}deg)`,
            opacity: cardOp * cardFadeOut,
            background: VAULT2.panel, border: `1.5px solid ${VAULT2.edge2}`,
            borderRadius: 10, padding: 12, width: 260,
            boxShadow: '0 30px 60px rgba(0,0,0,0.18)',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <div style={{ width: 56, height: 70, borderRadius: 5, background: '#5a4030' }}/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9, color: VAULT2.ig, fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
              }}>recipes</div>
              <div style={{ fontSize: 13, color: VAULT2.text, fontWeight: 500, marginTop: 2 }}>
                green goddess dressing
              </div>
              <div style={{
                fontSize: 10, color: VAULT2.teal, marginTop: 4, fontStyle: 'italic',
                fontFamily: '"Instrument Serif", serif',
              }}>
                with note for sam
              </div>
            </div>
          </div>
        )}
      </div>
    </PaperBg2>
  );
}

Object.assign(window, {
  Scene_TwoWays, Scene_Digest, Scene_Ask, Scene_Voice, Scene_Share,
});
