/* onboarding.jsx — wired four-step setup, REPO FIRST.
   Step 1: configure & create the repo on github.com (no token needed yet)
   Step 2: create a fine-grained token scoped to that repo, paste & verify
   Step 3: encrypt the token and set sync preferences 
   Step 4: install PWA / App experience */

function parseRepoInfo(input) {
  const parts = input.trim().replace(/\.git\/?$/, '').replace(/\/$/, '').split('/');
  if (parts.length >= 2) return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
  return { owner: '', repo: input.trim() };
}

window.OnboardingView = function OnboardingView({ onComplete, onSkip }) {
  const [step, setStep] = React.useState(1);
  const [installPrompt, setInstallPrompt] = React.useState(null);

  /* ── step 4 completion payloads ── */
  const [finalPatch, setFinalPatch] = React.useState(null);
  const [finalToken, setFinalToken] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* ── repo (step 1) ── */
  const [repoMode, setRepoMode]         = React.useState('create');
  const [repoName, setRepoName]         = React.useState('fofcorn-notes');
  const [repoDesc, setRepoDesc]         = React.useState('My fofcorn notes database');
  const [isPrivate, setIsPrivate]       = React.useState(true);
  const [repoUrl, setRepoUrl]           = React.useState('');
  const [branch, setBranch]             = React.useState('main');

  /* ── token (step 2) ── */
  const [token, setToken]               = React.useState('');
  const [user, setUser]                 = React.useState(null);
  const [connectError, setConnectError] = React.useState(null);
  const [busy, setBusy]                 = React.useState(false);

  /* ── sync & security (step 3) ── */
  const [pin, setPin]                   = React.useState('');
  const [autoSync, setAutoSync]         = React.useState(true);

  const { owner: parsedOwner, repo: parsedRepo } = parseRepoInfo(repoUrl);
  
  const effectiveOwnerName = repoMode === 'create' ? (user ? user.login : '<your-username>') : (parsedOwner || (user ? user.login : '<owner>'));
  const effectiveRepoName  = repoMode === 'create' ? repoName.trim() : parsedRepo;

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--ink)', background: 'var(--paper3)',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, outline: 'none', boxSizing: 'border-box', color: 'var(--ink)',
  };
  const primaryBtn = (disabled) => ({
    background: disabled ? 'var(--paper2)' : 'var(--red)', color: disabled ? 'var(--ink3)' : '#fff',
    border: '1px solid ' + (disabled ? 'var(--line)' : 'var(--red)'), padding: '10px 22px',
    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase',
    cursor: disabled ? 'default' : 'pointer',
  });
  const ghostBtn = {
    background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink2)',
    padding: '10px 16px', fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 11.5, fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer',
  };

  const newRepoUrl = 'https://github.com/new?name=' + encodeURIComponent(repoName.trim()) + '&description=' + encodeURIComponent(repoDesc.trim()) + '&visibility=' + (isPrivate ? 'private' : 'public');
  const newTokenUrl = 'https://github.com/settings/personal-access-tokens/new?name=' + encodeURIComponent('fofcorn-' + (effectiveRepoName || 'notes'));

  const connect = async () => {
    if (!token.trim()) return;
    setBusy(true); setConnectError(null);
    try {
      const u = await window.GitHub.whoami(token.trim());
      
      let ownerToCheck = repoMode === 'create' ? u.login : parsedOwner;
      const repoToCheck  = repoMode === 'create' ? repoName.trim() : parsedRepo;

      // Auto-fill owner if they only pasted the repo name
      if (repoMode === 'existing' && !ownerToCheck) {
         ownerToCheck = u.login;
         setRepoUrl(`github.com/${u.login}/${repoToCheck}`);
      }

      if (!ownerToCheck || !repoToCheck) throw new Error('Missing repo details. Go back to step 1.');
      await window.GitHub.getRepo(token.trim(), ownerToCheck, repoToCheck);
      setUser(u);
      setStep(3);
    } catch (e) {
      setConnectError('Token rejected or repo not found. Ensure the token is scoped to ' + effectiveRepoName);
    } finally { setBusy(false); }
  };

  const proceedToInstall = async () => {
    if (pin.length < 4) return;
    setBusy(true);
    const rawToken = token.trim();
    const encryptedToken = await window.fcCrypto.encrypt(rawToken, pin);
    
    setFinalPatch({
      github: {
        encryptedToken,
        owner: effectiveOwnerName,
        repo: effectiveRepoName,
        branch: (branch || 'main').trim(),
        login: user ? user.login : null,
      },
      autoSync,
    });
    setFinalToken(rawToken);
    
    setBusy(false);
    setStep(4);
  };

  const handleFinishOnboarding = () => {
    onComplete(finalPatch, finalToken);
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      handleFinishOnboarding();
    }
  };

  const nextDisabled = step === 1 && (repoMode === 'create' ? !repoName.trim() : !parsedRepo.trim());

  return (
    <BroadShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 40, position: 'relative' }}>
        <button onClick={onSkip} style={{ position: 'absolute', top: 22, right: 30, background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.12em', cursor: 'pointer' }}>skip for now ›</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <PopcornIcon size={42} />
            <span className="brod-disp" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1 }}>fofcorn</span>
          </div>
          <div className="page" style={{ width: '100%', padding: '30px 38px', background: 'var(--paper3)' }}>
            <div className="kicker">Setup · {step} of 4</div>
            <h1 className="brod-disp" style={{ margin: '6px 0 6px', fontSize: 30, fontWeight: 800, fontStyle: 'italic', lineHeight: 1.1 }}>
              {step === 1 ? <>Pick a GitHub repo to <span style={{ color: 'var(--red)' }}>store your notes</span>.</>
              : step === 2 ? <>Create a token <span style={{ color: 'var(--red)' }}>scoped to that repo</span>.</>
              : step === 3 ? <>Set a PIN <span style={{ color: 'var(--red)' }}>for your notes</span>.</>
              : <>Install fofcorn <span style={{ color: 'var(--red)' }}>as an app</span>.</>}
            </h1>
            <hr className="rule-red-1" style={{ margin: '18px 0' }} />

            <div style={{ display: 'flex', gap: 18, marginBottom: 22, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 600 }}>
              {[['1','Repo'], ['2','Token'], ['3','PIN'], ['4','App']].map(([n, l]) => (
                <span key={n} style={{ color: step >= +n ? 'var(--red)' : 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', color: step >= +n ? '#fff' : 'var(--ink3)', border: '1px solid currentColor', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", backgroundColor: step >= +n ? 'var(--red)' : 'transparent' }}>{step > +n ? '✓' : n}</span>
                  {l}
                </span>
              ))}
            </div>

            {step === 1 && (
              <div>
                <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--ink)' }}>
                  {[['create', 'Create new repo'], ['existing', 'Use existing repo']].map(([k, l]) => (
                    <button key={k} onClick={() => setRepoMode(k)} style={{ flex: 1, padding: '10px', border: 'none', background: repoMode === k ? 'var(--ink)' : 'transparent', color: repoMode === k ? 'var(--paper3)' : 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{l}</button>
                  ))}
                </div>
                {repoMode === 'create' ? (
                  <div>
                    <div className="brod-body" style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 14, lineHeight: 1.55, fontStyle: 'italic' }}>The repo is created first on github.com — then, in the next step, a token scoped to just this repo.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
                      <div><label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Repo name</label><input value={repoName} onChange={e => setRepoName(e.target.value)} placeholder="fofcorn-notes" style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                      {[['public', false], ['private', true]].map(([l, v]) => (
                        <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><input type="radio" checked={isPrivate === v} onChange={() => setIsPrivate(v)} style={{ accentColor: 'var(--red)' }} /><span className="brod-body" style={{ fontSize: 13.5 }}>{l}</span></label>
                      ))}
                    </div>
                    <a href={newRepoUrl} target="_blank" rel="noopener" style={{ textDecoration: 'none', display: 'inline-block' }}><button style={ghostBtn} disabled={!repoName.trim()}>↗ Open new-repo page on GitHub</button></a>
                    
                    <div className="brod-sans" style={{ fontSize: 14, color: 'var(--red)', marginTop: 12, fontWeight: 600, letterSpacing: '.02em' }}>
                      Important: Toggle "Add a README" to On, then click create repository.
                    </div>

                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr .35fr', gap: 12 }}>
                      <div><label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Repository URL</label><input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="github.com/user/repo" style={inputStyle} /></div>
                      <div><label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Branch</label><input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" style={inputStyle} /></div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 22, alignItems: 'center' }}>
                  <button onClick={() => setStep(2)} disabled={nextDisabled} style={primaryBtn(nextDisabled)}>Next ›</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="brod-body" style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 14, lineHeight: 1.55, fontStyle: 'italic' }}>
                  A fine-grained token, scoped to <strong className="brod-mono" style={{ fontStyle:'normal', color:'var(--ink)' }}>{effectiveRepoName || 'your repo'}</strong> only. Follow the four steps below on GitHub, then paste the token here.
                </div>

                <a href={newTokenUrl} target="_blank" rel="noopener" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
                  <button style={ghostBtn}>↗ Open GitHub token settings</button>
                </a>

                <div style={{ border: '1px solid var(--line)', background: 'var(--paper2)', padding: '12px 14px', marginBottom: 16 }}>
                  <div className="kicker" style={{ marginBottom: 8 }}>On the GitHub page</div>
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {[
                      { l:'A', t:<>Set <strong>Expiration</strong> to <span className="brod-mono" style={{ color:'var(--ink)' }}>No expiration</span>.</> },
                      { l:'B', t:<>Set <strong>Repository access</strong> to <span className="brod-mono" style={{ color:'var(--ink)' }}>Only select repositories</span>, then pick <span className="brod-mono" style={{ color:'var(--red)', fontWeight:600 }}>{effectiveRepoName || 'your repo'}</span> from the dropdown.</> },
                      { l:'C', t:<>Under <strong>Permissions</strong> click <span className="brod-mono" style={{ color:'var(--ink)' }}>Add permissions</span>, choose <span className="brod-mono" style={{ color:'var(--ink)' }}>Contents</span>, and change Access from <em>Read-only</em> to <span className="brod-mono" style={{ color:'var(--red)', fontWeight:600 }}>Read and write</span>.</> },
                      { l:'D', t:<>Click <strong>Generate token</strong> at the bottom, copy it, and paste below.</> },
                    ].map(({ l, t }) => (
                      <li key={l} style={{ display:'flex', gap:12, padding:'7px 0', borderBottom:'1px dotted var(--line)', alignItems:'flex-start' }}>
                        <span className="brod-mono" style={{ flex:'0 0 auto', width:22, height:22, borderRadius:'50%', background:'var(--red)', color:'#fff', display:'inline-grid', placeItems:'center', fontSize:11, fontWeight:600 }}>{l}</span>
                        <span className="brod-body" style={{ fontSize:13, color:'var(--ink2)', lineHeight:1.5, paddingTop:2 }}>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Personal access token</label>
                <input type="password" value={token} onChange={e => { setToken(e.target.value); setConnectError(null); }} placeholder="github_pat_…" style={inputStyle} onKeyDown={e => { if (e.key === 'Enter' && token.trim() && !busy) connect(); }} />
                {connectError && <div className="brod-mono" style={{ marginTop: 10, fontSize: 11.5, color: 'var(--red)' }}>● {connectError}</div>}
                
                <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
                  <button onClick={() => setStep(1)} style={ghostBtn}>‹ back</button>
                  <button onClick={connect} disabled={!token.trim() || busy} style={primaryBtn(!token.trim() || busy)}>{busy ? 'Verifying…' : 'Connect & verify'}</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="brod-body" style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 14, lineHeight: 1.55 }}>
                  Pick a 4-digit PIN to lock your app. You'll need this PIN to read and sync your notes next time.
                </div>
                
                <label className="kicker" style={{ display: 'block', marginBottom: 4 }}>4-Digit PIN</label>
                <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" maxLength={4} style={{ ...inputStyle, width: '120px', letterSpacing: '4px', textAlign: 'center', fontSize: 18 }} />

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: 14, border: '1px solid var(--line)', background: 'var(--paper2)', marginTop: 18 }}>
                  <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} style={{ marginTop: 4, accentColor: 'var(--red)' }} />
                  <div>
                    <div className="brod-disp" style={{ fontSize: 18, fontWeight: 700 }}>Auto-sync</div>
                    <div className="brod-body" style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 3, lineHeight: 1.5 }}>Pull when fofcorn opens, push a few seconds after each edit.</div>
                  </div>
                </label>

                <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
                  <button onClick={() => setStep(2)} style={ghostBtn}>‹ back</button>
                  <button onClick={proceedToInstall} disabled={pin.length < 4 || busy} style={primaryBtn(pin.length < 4 || busy)}>{busy ? 'Saving...' : 'Next ›'}</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="brod-body" style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 14, lineHeight: 1.55 }}>
                  For the best experience, install fofcorn to your device. It works offline, opens in its own window, and feels like a native app.
                </div>
                
                {installPrompt ? (
                  <div style={{ padding: '18px', background: 'var(--paper2)', border: '1px solid var(--line)', marginBottom: 18, textAlign: 'center' }}>
                    <button onClick={handleInstall} style={primaryBtn(false)}>Install App</button>
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: 'var(--paper2)', border: '1px solid var(--line)', marginBottom: 18 }}>
                    <ul className="brod-body" style={{ fontSize: 13, margin: 0, paddingLeft: 18, color: 'var(--ink2)', lineHeight: 1.7 }}>
                      <li><strong>iOS / iPad:</strong> Tap Share, then "Add to Home Screen"</li>
                      <li><strong>Desktop:</strong> Click the install icon in your address bar (if available)</li>
                      <li><strong>Android:</strong> Tap the browser menu, then "Install app"</li>
                    </ul>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
                  <span style={{ flex: 1 }}></span>
                  <button onClick={handleFinishOnboarding} style={primaryBtn(false)}>Open fofcorn ›</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BroadShell>
  );
};
