/* settings.jsx — GitHub settings + sync actions modal.
   Opened from the sidebar's "GitHub · Sync ›" link. Lets the user
   re-connect with a different token, change repo, push, pull, toggle
   auto-sync — without re-running onboarding from scratch. */

function parseRepoInfo(input) {
  const parts = input.trim().replace(/\.git\/?$/, '').replace(/\/$/, '').split('/');
  if (parts.length >= 2) return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
  return { owner: '', repo: input.trim() };
}

window.SettingsModal = function SettingsModal({ settings, sessionToken, onSave, onClose, onPushAll, onPullAll }) {
  const g = (settings && settings.github) || { owner: '', repo: '', branch: 'main' };

  // Use the decrypted session token for the UI if it exists
  const [token, setToken]     = React.useState(sessionToken || '');
  const [pin, setPin]         = React.useState('');
  
  // Combine owner and repo into a single viewable URL string
  const [repoUrl, setRepoUrl] = React.useState(g.owner && g.repo ? `github.com/${g.owner}/${g.repo}` : '');
  const [branch, setBranch]   = React.useState(g.branch || 'main');
  const [autoSync, setAutoSync] = React.useState(settings && settings.autoSync !== false);
  const [user, setUser]       = React.useState(g.login || null);
  const [busy, setBusy]       = React.useState(false);
  const [logLines, setLog]    = React.useState([]);

  const log = (m) => setLog(L => [...L, m]);

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--ink)',
    background: 'var(--paper3)', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12.5, outline: 'none', color: 'var(--ink)', boxSizing: 'border-box',
  };

  const { owner, repo } = parseRepoInfo(repoUrl);

  const hasChanges = 
    token.trim() !== (sessionToken || '') ||
    owner !== (g.owner || '') ||
    repo !== (g.repo || '') ||
    branch.trim() !== (g.branch || 'main') ||
    autoSync !== (settings && settings.autoSync !== false);

  const canSave = hasChanges && (!token.trim() || token.trim() === sessionToken || pin.length >= 4);
  const isSyncReady = token.trim() && owner && repo;

  const connect = async () => {
    setBusy(true); setUser(null); log('Connecting…');
    try {
      const u = await window.GitHub.whoami(token.trim());
      setUser(u);
      
      // Auto-fill owner if they only entered the repo name
      if (!owner && repo) {
        setRepoUrl(`github.com/${u.login}/${repo}`);
      }
      
      log('ok · connected as ' + u.login);
    } catch (e) {
      log('err · ' + (e.message || 'token rejected'));
    } finally { setBusy(false); }
  };

  const save = async () => {
    const rawToken = token.trim();
    
    if (rawToken && rawToken !== sessionToken && pin.length < 4) {
      log('err · A 4-digit PIN is required to save a new token.');
      return;
    }

    setBusy(true);
    let encryptedToken = g.encryptedToken;
    
    if (rawToken && rawToken !== sessionToken && pin.length >= 4) {
      log('Encrypting new token...');
      encryptedToken = await window.fcCrypto.encrypt(rawToken, pin);
    } else if (!rawToken) {
      encryptedToken = '';
    }
    
    onSave({
      github: { encryptedToken, owner: owner || (user ? user.login : ''), repo, branch: branch.trim() || 'main', login: user ? user.login : g.login },
      autoSync,
    }, rawToken);
    
    setBusy(false);
  };

  const push = async () => {
    setBusy(true); log('Building commit…');
    try {
      const r = await onPushAll(log);
      log('done · ' + r.count + ' files, ' + r.commit.slice(0, 7));
    } catch (e) { log('err · ' + (e.message || 'push failed')); }
    finally { setBusy(false); }
  };

  const pull = async () => {
    setBusy(true); log('Reading latest commit…');
    try {
      const r = await onPullAll(log);
      log('done · pulled ' + r.notes.length + ' notes');
    } catch (e) { log('err · ' + (e.message || 'pull failed')); }
    finally { setBusy(false); }
  };

  return (
    <div
      onClick={e => { if (e.target.dataset.bg) onClose(); }}
      data-bg="1"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(21,17,13,.42)', zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div className="brod" style={{
        background: 'var(--paper3)', border: '1px solid var(--ink)', width: 'min(520px, 96vw)',
        height: 'auto', 
        maxHeight: '90vh', overflowY: 'auto',
        padding: '20px 22px 18px', boxShadow: '8px 8px 0 rgba(21,17,13,.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8 }}>
          <span className="kicker">Settings · Sync</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <hr className="rule-red-1" style={{ margin: '0 0 12px' }} />

        <h2 className="brod-disp" style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, fontStyle: 'italic' }}>
          Your repo is the database.
        </h2>

        {user && (
          <div className="brod-mono" style={{ fontSize: 11.5, color: 'var(--ink2)', marginBottom: 12, marginTop: 12 }}>
            <span style={{ color: 'var(--red)' }}>●</span> connected as <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{user.login}</span>
          </div>
        )}

        <label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Personal access token</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="password" value={token} onChange={e => setToken(e.target.value)}
            placeholder="github_pat_…" style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={connect} disabled={!token.trim() || busy}
            style={{
              padding: '0 14px', border: '1px solid var(--ink)', background: 'var(--ink)',
              color: 'var(--paper3)', fontFamily: 'inherit', fontSize: 10.5, fontWeight: 600,
              letterSpacing: '.14em', textTransform: 'uppercase', 
              cursor: (!token.trim() || busy) ? 'default' : 'pointer',
              opacity: (!token.trim() || busy) ? 0.5 : 1
            }}
          >verify</button>
        </div>

        {token !== sessionToken && (
          <div style={{ marginBottom: 12, padding: '10px', border: '1px dashed var(--red)', background: 'var(--paper2)' }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 4 }}>New Token PIN (Required)</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" maxLength={4} style={{ ...inputStyle, width: '100px', letterSpacing: '4px', textAlign: 'center' }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr .4fr', gap: 8, marginBottom: 12 }}>
          <div><label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Repository URL</label><input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="github.com/owner/repo" style={inputStyle} /></div>
          <div><label className="kicker" style={{ display: 'block', marginBottom: 4 }}>Branch</label><input value={branch} onChange={e => setBranch(e.target.value)} style={inputStyle} /></div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} style={{ accentColor: 'var(--red)' }} />
          <span className="brod-body" style={{ fontSize: 13, color: 'var(--ink2)' }}>Auto-sync — pull on open, push a few seconds after edits.</span>
        </label>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button 
            onClick={save} 
            disabled={busy || !canSave} 
            className="chip" 
            style={{ padding: '7px 14px', opacity: (busy || !canSave) ? 0.5 : 1, cursor: (busy || !canSave) ? 'default' : 'pointer' }}
          >
            {hasChanges ? 'save' : 'saved ✓'}
          </button>
          <button 
            onClick={push} 
            disabled={busy || !isSyncReady} 
            className="chip red" 
            style={{ 
              padding: '7px 14px', 
              opacity: (busy || !isSyncReady) ? 0.4 : 1, 
              filter: (busy || !isSyncReady) ? 'grayscale(1)' : 'none', 
              cursor: (busy || !isSyncReady) ? 'default' : 'pointer' 
            }}
          >
            ↑ push now
          </button>
          <button 
            onClick={pull} 
            disabled={busy || !isSyncReady} 
            className="chip" 
            style={{ padding: '7px 14px', opacity: (busy || !isSyncReady) ? 0.5 : 1, cursor: (busy || !isSyncReady) ? 'default' : 'pointer' }}
          >
            ↓ pull now
          </button>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} className="chip ghost" style={{ padding: '7px 12px' }}>close</button>
        </div>

        {logLines.length > 0 && (
          <div style={{
            background: 'var(--paper2)', border: '1px solid var(--line)', padding: '8px 10px',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--ink2)',
            maxHeight: 130, overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.55,
          }}>
            {logLines.join('\n')}
          </div>
        )}
      </div>
    </div>
  );
};