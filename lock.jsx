// Lock screen — decrypt the GitHub token with a 4-digit PIN.
// Broadsheet vocabulary: masthead, wax-seal motif, display type, typeset keypad.

const LOCK_CSS = `
  @keyframes lockShake {
    0%,100% { transform: translateX(0); }
    15% { transform: translateX(-9px); }
    30% { transform: translateX(8px); }
    45% { transform: translateX(-6px); }
    60% { transform: translateX(5px); }
    75% { transform: translateX(-3px); }
  }
  .lock-shake { animation: lockShake .45s ease both; }
  @keyframes pinPop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .pin-fill { animation: pinPop .18s ease both; }
  .lock-key {
    border: 1px solid var(--ink); background: var(--paper3);
    font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 600; color: var(--ink);
    cursor: pointer; user-select: none; height: 56px;
    display: flex; align-items: center; justify-content: center;
    transition: background .08s, transform .08s;
  }
  .lock-key:hover { background: var(--paper2); }
  .lock-key:active { background: var(--ink); color: var(--paper3); transform: translateY(1px); }
  .lock-key.fn { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .12em; color: var(--ink2); }
`;

window.LockView = function LockView({ encryptedToken, onUnlock }) {
  const [pin, setPin] = React.useState('');
  const [state, setState] = React.useState('idle'); // idle | wrong | ok
  const [attempts, setAttempts] = React.useState(0);

  const press = (d) => {
    if (state === 'ok' || state === 'wrong') return; // block input while animating
    setState('idle');
    setPin(p => (p.length >= 4 ? p : p + d));
  };
  const back = () => { setState('idle'); setPin(p => p.slice(0, -1)); };
  const clear = () => { setState('idle'); setPin(''); };

  // ── Real Web Crypto Decryption ──
  const submit = React.useCallback(async (value) => {
    if (value.length !== 4) return;
    try {
      const decrypted = await window.fcCrypto.decrypt(encryptedToken, value);
      setState('ok');
      setTimeout(() => onUnlock && onUnlock(decrypted), 620);
    } catch (err) {
      setState('wrong');
      setAttempts(a => a + 1);
      setTimeout(() => { setPin(''); setState('idle'); }, 520);
    }
  }, [encryptedToken, onUnlock]);

  // Auto-submit on the 4th digit.
  React.useEffect(() => {
    if (pin.length === 4 && state === 'idle') submit(pin);
  }, [pin, submit, state]);

  // Physical keyboard support.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Escape') clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cells = [0,1,2,3].map(i => {
    const filled = i < pin.length;
    return (
      <div key={i} style={{
        width: 54, height: 64, border: '1px solid var(--ink)',
        background: state==='ok' ? 'var(--ink)' : 'var(--paper3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: i===pin.length && state!=='ok' ? 'inset 0 -3px 0 var(--red)' : 'none',
        transition: 'background .3s',
      }}>
        {filled && (
          <span className="pin-fill" style={{
            width: 12, height: 12, borderRadius: '50%',
            background: state==='ok' ? 'var(--paper3)' : state==='wrong' ? 'var(--red)' : 'var(--ink)',
          }} />
        )}
      </div>
    );
  });

  const statusLine = () => {
    if (state === 'ok')    return <span style={{ color: 'var(--ink)' }}>● &nbsp;Unlocked — opening your notes…</span>;
    if (state === 'wrong') return <span style={{ color: 'var(--red)' }}>✕ &nbsp;Wrong PIN. {attempts >= 2 ? 'Try again, carefully.' : 'Try again.'}</span>;
    return <span style={{ color: 'var(--ink3)' }}>○ &nbsp;Locked</span>;
  };

  return (
    <BroadShell>
      <style dangerouslySetInnerHTML={{ __html: LOCK_CSS }} />
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative' }}>

        {/* faint full-bleed masthead behind the card */}
        <div className="brod-disp" aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          textAlign: 'center', fontSize: '17vw', fontWeight: 800, lineHeight: .9,
          color: 'rgba(21,17,13,.035)', letterSpacing: '-.02em', userSelect: 'none', pointerEvents: 'none',
          marginTop: '2vh',
        }}>fofcorn</div>

        <div className={state==='wrong' ? 'lock-shake' : ''} style={{ position: 'relative', width: 380 }}>
          {/* the sealed card */}
          <div className="page" style={{ padding: '26px 30px 30px', background: 'var(--paper3)' }}>

            {/* masthead row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '3px double var(--ink)' }}>
              <PopcornIcon size={26} />
              <span className="brod-disp" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1 }}>fofcorn</span>
              <span style={{ flex: 1 }} />
            </div>

            {/* kicker + headline */}
            <div style={{ paddingTop: 16 }}>
              <div className="kicker">Locked</div>
              <h1 className="brod-disp" style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 800, fontStyle: 'italic', lineHeight: 1.05 }}>
                Unlock your <span style={{ color: 'var(--red)' }}>notes.</span>
              </h1>
              <div className="brod-body" style={{ fontStyle: 'italic', fontSize: 13.5, marginTop: 6, color: 'var(--ink2)', lineHeight: 1.5 }}>
                Enter your four-digit PIN to unlock fofcorn on this device.
              </div>
            </div>

            {/* PIN cells */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '22px 0 14px' }}>
              {cells}
            </div>

            {/* status line */}
            <div className="brod-mono" style={{ fontSize: 10.5, textAlign: 'center', letterSpacing: '.06em', minHeight: 16 }}>
              {statusLine()}
            </div>

            {/* keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 18 }}>
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} className="lock-key" onClick={() => press(d)}>{d}</button>
              ))}
              <button className="lock-key fn" onClick={clear}>CLR</button>
              <button className="lock-key" onClick={() => press('0')}>0</button>
              <button className="lock-key fn" onClick={back}>⌫</button>
            </div>

            {/* footer */}
            <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="brod-mono" style={{ fontSize: 9.5, color: 'var(--ink3)', letterSpacing: '.1em' }}>fofcorn</span>
            </div>
          </div>

          {/* offset drop-shadow plate (broadsheet print feel) */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'transparent', zIndex: -1 }} />
        </div>
      </div>
    </BroadShell>
  );
};