// Shared chrome: CSS, Shell, Sidebar, Topbar pieces.

const BROAD_CSS = `
  .brod { --paper:#efe5d0; --paper2:#f7efde; --paper3:#fbf5e6; --ink:#15110d; --ink2:#3a3026; --ink3:#807464;
          --line:rgba(21,17,13,.18); --line2:rgba(21,17,13,.10); --line3:rgba(21,17,13,.06);
          --red:#b71f1f; --redInk:#8a1717;
          --note-cream:#fbf2d8; --note-sage:#dde6d2; --note-rose:#f0d8d4; --note-slate:#d7dde2; --note-ochre:#f1e0b2; --note-blush:#ecd9c8;
          font-family:'IBM Plex Sans', system-ui, sans-serif; color:var(--ink); background:var(--paper); height:100vh; overflow:hidden; }
  .brod * { box-sizing:border-box; }
  .brod-disp { font-family:'Playfair Display', 'Times New Roman', serif; }
  .brod-body { font-family:'IBM Plex Serif', Georgia, serif; }
  .brod-sans { font-family:'IBM Plex Sans', sans-serif; }
  .brod-mono { font-family:'IBM Plex Mono', monospace; }

  .brod .kicker      { font-family:'IBM Plex Sans', sans-serif; font-size:10.5px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--red); }
  .brod .kicker.ink  { color:var(--ink); }
  .brod .kicker.dim  { color:var(--ink2); }
  .brod .rule        { border:none; border-top:1px solid var(--ink); }
  .brod .rule-thin   { border:none; border-top:1px solid var(--line); }
  .brod .rule-red    { border:none; border-top:3px solid var(--red); }
  .brod .rule-red-1  { border:none; border-top:1px solid var(--red); }

  .brod .nav-row {
    display:flex; align-items:baseline; justify-content:space-between;
    padding:6px 0; font-family:'IBM Plex Serif', serif; font-size:14px;
    border-bottom:1px dotted var(--line); cursor:pointer; user-select:none;
  }
  .brod .nav-row:hover { color: var(--redInk); }
  .brod .nav-row.active { color:var(--red); font-weight:700; }
  .brod .nav-row .cnt { font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--ink3); }
  .brod .nav-row.active .cnt { color: var(--red); }

  .brod .tab { padding: 6px 0; font-size: 11px; font-weight: 600; letter-spacing:.22em; text-transform:uppercase; color:var(--ink2); border-bottom: 2px solid transparent; margin-right: 22px; cursor:pointer; user-select:none; background:none; border-left:none; border-right:none; border-top:none; font-family:inherit; }
  .brod .tab:hover { color:var(--ink); }
  .brod .tab.active { color:var(--ink); border-bottom-color: var(--red); }
  .brod .tab .ct { font-family:'IBM Plex Mono', monospace; font-weight:400; color:var(--ink3); margin-left:5px; letter-spacing:.05em; }
  .brod .tab.active .ct { color: var(--ink); }
  .brod .tab:disabled { color:var(--ink3); opacity:.5; cursor:default; }

  .brod .chip {
    display:inline-flex; align-items:center; gap:6px;
    border:1px solid var(--ink); padding: 3px 9px; font-size: 11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
    background: transparent; cursor:pointer; user-select:none; color: inherit; font-family: inherit;
  }
  .brod button.chip { color: var(--ink); }
  .brod .chip.solid { background:var(--ink); color:var(--paper2); }
  .brod .chip.red { background:var(--red); color:#fff; border-color:var(--red); }
  .brod .chip.ghost { border-color:var(--line); color:var(--ink2); font-weight:500; }
  .brod .chip:hover { filter: brightness(.96); }

  .brod .clip-cell { padding: 14px 16px 14px; position: relative; overflow: hidden; background: transparent; cursor: pointer; user-select: none; }
  .brod .clip-cell:hover { background: var(--paper2); }
  .brod .clip-cell.active { background: var(--paper2); }
  .brod .clip-cell .clip-title { font-family:'Playfair Display', serif; font-weight: 700; font-size: 19px; line-height: 1.12; letter-spacing:-.005em; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .brod .clip-cell .clip-stand { font-family:'IBM Plex Serif', serif; font-style:italic; font-size: 13px; line-height:1.5; color: var(--ink2); margin-top: 6px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .brod .clip-cell .clip-foot { position: absolute; left: 16px; right: 16px; bottom: 12px; display: flex; justify-content: space-between; font-family:'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--ink3); }

  .brod .page { background: var(--paper3); border: 1px solid var(--ink); box-shadow: 6px 6px 0 rgba(21,17,13,.10); }
  .brod .drop-cap::first-letter {
    font-family:'Playfair Display', serif; font-weight: 800; font-style: italic;
    float: left; font-size: 64px; line-height: .82; margin: 6px 8px 0 0; color: var(--red);
  }

  .brod .curl-corner { position:absolute; bottom:0; right:0; width:88px; height:88px; pointer-events:none; }
  .brod .curl-corner > div {
    position:absolute; right:0; bottom:0; width:88px; height:88px;
    background:#e9dec0; clip-path: polygon(100% 0, 100% 100%, 0 100%);
    box-shadow: inset 5px 5px 0 rgba(255,255,255,.20), -5px -5px 14px rgba(21,17,13,.22);
    border-top:1px solid var(--ink2); border-left:1px solid var(--ink2);
  }

  .brod .ts-tile {
    padding: 6px 0 5px; min-width: 44px; text-align: center;
    border-right: 1px solid var(--line);
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px;
    color: var(--ink); cursor:pointer; background: transparent; border-top:none; border-bottom:none; border-left: none; font-family:inherit;
  }
  .brod .ts-tile:hover { background: var(--paper2); }
  .brod .ts-tile.active { background: var(--ink); color: var(--paper3); }
  .brod .ts-tile .g { font-family:'Playfair Display', serif; font-size: 15px; line-height: 1; font-weight: 700; }
  .brod .ts-tile .g.it { font-style: italic; }
  .brod .ts-tile .g.un { text-decoration: underline; text-underline-offset: 2px; }
  .brod .ts-tile .l { font-family:'IBM Plex Mono', monospace; font-size: 8.5px; letter-spacing:.12em; opacity:.7; }
  .brod .ts-group { display:flex; border-left: 1px solid var(--line); }
  .brod .ts-group:first-child { border-left:none; }

  .brod .tag-chip {
    display: inline-flex; align-items: center; gap: 4px;
    border: 1px solid var(--line); padding: 2px 8px; font-size: 11px; font-weight: 500;
    color: var(--ink2); background: transparent; cursor: default; font-family:'IBM Plex Mono', monospace; letter-spacing:.04em;
  }
  .brod .tag-chip:hover { color: var(--ink); border-color: var(--ink2); }
  .brod .tag-chip .x { color: var(--ink3); cursor: pointer; padding: 0 2px; font-size: 13px; line-height: 1; }
  .brod .tag-chip .x:hover { color: var(--red); }
  .brod .tag-add {
    display: inline-flex; align-items: center; gap: 4px;
    border: 1px dashed var(--ink3); padding: 2px 8px; font-size: 11px;
    color: var(--ink3); background: transparent; cursor: pointer;
    font-family:'IBM Plex Mono', monospace; letter-spacing:.04em;
  }
  .brod .tag-add:hover { color: var(--red); border-color: var(--red); }
  .brod .tag-input {
    border: 1px solid var(--red); padding: 2px 8px; font-size: 11px; outline: none; background: var(--paper3);
    font-family:'IBM Plex Mono', monospace; color: var(--ink); width: 100px;
  }

  .brod .titlebar-input {
    background: transparent; border: none; outline: none; font: inherit; color: inherit; width: 100%; padding: 0;
  }

  /* page flip animation */
  @keyframes flipNext {
    0%   { transform: rotateY(0deg);     box-shadow: 14px 0 30px -12px rgba(21,17,13,.5); }
    100% { transform: rotateY(-178deg);  box-shadow: 14px 0 30px -12px rgba(21,17,13,.0); }
  }
  @keyframes flipPrev {
    0%   { transform: rotateY(-178deg);  box-shadow: 14px 0 30px -12px rgba(21,17,13,.0); }
    100% { transform: rotateY(0deg);     box-shadow: 14px 0 30px -12px rgba(21,17,13,.5); }
  }
  .brod .flip-leaf {
    position:absolute; inset:0; transform-style:preserve-3d; transform-origin: left center;
    z-index: 9; pointer-events: none;
  }
  .brod .flip-leaf.next { animation: flipNext .72s cubic-bezier(.42,0,.18,1) forwards; }
  .brod .flip-leaf.prev { animation: flipPrev .72s cubic-bezier(.42,0,.18,1) forwards; }
  .brod .flip-leaf .face { position:absolute; inset:0; backface-visibility:hidden; overflow:hidden; background: var(--paper3); border: 1px solid var(--ink); }
  .brod .flip-leaf .face.back { transform: rotateY(180deg); background: #ede2c2; }

  /* fade utility kept but applied via attribute so React remounts don't strand it */
  .brod [data-anim="fade-in"] { animation: fadeIn .25s ease both; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }

  .brod ::selection { background: rgba(183,31,31,.18); }

  .brod input[type="text"], .brod textarea { font-family: inherit; }

  .brod .swatch { aspect-ratio: 1; border: 1px solid var(--line); cursor: pointer; }
  .brod .swatch.on { border: 1.5px solid var(--ink); box-shadow: 2px 2px 0 rgba(21,17,13,.15); }

  .brod .ic-btn {
    background: transparent; border: 1px solid var(--line); padding: 4px 8px;
    font-family:'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--ink2); cursor: pointer; letter-spacing: .1em;
  }
  .brod .ic-btn:hover { color: var(--ink); border-color: var(--ink2); }
  .brod .ic-btn.on { background: var(--ink); color: var(--paper3); border-color: var(--ink); }

  /* ─── tiptap — bare minimum so the engine works.
     No fonts, sizes, colors, borders, or backgrounds added by us — content
     inherits whatever the surrounding sticky / notebook page already says. ─── */
  .brod .ProseMirror { outline: none; }
  .brod .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder); color: var(--ink3); float: left; height: 0;
    pointer-events: none; font-style: italic;
  }
  /* paragraphs */
  .brod .ProseMirror p { margin: 0 0 .55em; }
  .brod .ProseMirror > :last-child { margin-bottom: 0; }
  /* headings (HED / SUB tiles map to h1 / h2) */
  .brod .ProseMirror h1 { font-family:'Playfair Display', serif; font-weight: 800; font-style: italic; font-size: 27px; line-height: 1.1; letter-spacing: -.01em; margin: .65em 0 .28em; }
  .brod .ProseMirror h2 { font-family:'Playfair Display', serif; font-weight: 700; font-size: 21px; line-height: 1.15; margin: .65em 0 .28em; }
  .brod .ProseMirror h3 { font-family:'IBM Plex Sans', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing:.14em; text-transform: uppercase; color: var(--ink2); margin: .9em 0 .3em; }
  /* lists */
  .brod .ProseMirror ul, .brod .ProseMirror ol { margin: .45em 0; padding-left: 1.4em; }
  .brod .ProseMirror li { margin: .18em 0; }
  .brod .ProseMirror li > p { margin: 0; }
  /* blockquote */
  .brod .ProseMirror blockquote { margin: .7em 0; padding: .05em 0 .05em 14px; border-left: 2px solid var(--red); color: var(--ink2); font-style: italic; }
  /* code */
  .brod .ProseMirror code { font-family:'IBM Plex Mono', monospace; font-size: .88em; background: rgba(21,17,13,.07); padding: 1px 5px; border-radius: 2px; }
  .brod .ProseMirror pre { margin: .7em 0; padding: 12px 14px; background: rgba(21,17,13,.05); border: 1px solid var(--line); font-family:'IBM Plex Mono', monospace; font-size: 12.5px; line-height: 1.5; overflow-x: auto; }
  .brod .ProseMirror pre code { background: none; padding: 0; font-size: inherit; }
  /* rule, links, highlight, images */
  .brod .ProseMirror hr { border: none; border-top: 1px solid var(--ink); margin: 1.1em 0; }
  .brod .ProseMirror a { color: var(--red); text-decoration: underline; text-underline-offset: 2px; }
  .brod .ProseMirror mark { background: #ffe08a; border-radius: 1px; padding: 0 2px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .brod .ProseMirror img { display: block; max-width: 100%; height: auto; margin: .6em 0; border: 1px solid var(--line); }
  /* to-do list — checkbox aligned to the first text line */
  .brod .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; margin: .45em 0; }
  .brod .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; margin: .25em 0; }
  .brod .ProseMirror ul[data-type="taskList"] li > label { flex: 0 0 auto; margin: 0; user-select: none; display: inline-flex; align-items: center; height: 1.5em; line-height: 1; }
  .brod .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] { margin: 0; cursor: pointer; }
  .brod .ProseMirror ul[data-type="taskList"] li > div { flex: 1 1 auto; min-width: 0; }
  .brod .ProseMirror ul[data-type="taskList"] li > div > p { margin: 0; }
  .brod .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; opacity: .55; }
`;

let _cssInjected = false;

window.BroadShell = function BroadShell({ children }) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.innerHTML = BROAD_CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }
  
  return (
    <div className="brod">
      {children}
    </div>
  );
};

window.PopcornIcon = function PopcornIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-label="fofcorn" style={{ flex: '0 0 auto', display: 'block' }}>
      {/* the popped cluster — cream and butter circles */}
      <circle cx="8"  cy="10" r="5.4" fill="#fbf2d8" stroke="#15110d" strokeWidth="1.1"/>
      <circle cx="17" cy="8"  r="4.8" fill="#fff3c4" stroke="#15110d" strokeWidth="1.1"/>
      <circle cx="18" cy="15" r="4.8" fill="#fbf2d8" stroke="#15110d" strokeWidth="1.1"/>
      <circle cx="10" cy="17" r="4.3" fill="#fff3c4" stroke="#15110d" strokeWidth="1.1"/>
      {/* the kernel base/core */}
      <circle cx="13" cy="13" r="2.4" fill="#e2a73a" stroke="#15110d" strokeWidth="1.1"/>
    </svg>
  );
};

window.romanize = function romanize(n) {
  const map = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
  ];
  let r = '';
  for (const [v, s] of map) while (n >= v) { r += s; n -= v; }
  return r;
};

/* ─────────────────────────────────────────────
   Sidebar — reusable, drives navigation.
   ───────────────────────────────────────────── */
window.Sidebar = function Sidebar({ view, collections, notes, onNavigate, onSelectCollection, onAddCollection, searchQuery, onSearchChange, onOpenSettings, github, onSyncAll }) {
  const pinnedCount = notes.filter(n => n.pinned).length;
  const allCount = notes.length;

  const isView = (k) => view.kind === k;
  const isCollection = (id) => view.kind === 'collection' && view.collectionId === id;

  const sortedByUpdate = notes
    .filter(n => n.updatedAt)
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const startOfToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
  const todayNotes = sortedByUpdate.filter(n => n.updatedAt >= startOfToday);
  
  // Only display notes actually modified today to ensure activity timestamps don't look old/outdated
  const activity = todayNotes.slice(0, 3).map(n => ({
    t: window.fofTime.relativeShort(n.updatedAt),
    k: n.pinned ? 'pinned' : 'saved',
    what: (n.title || 'Untitled').replace(/[.\s—]+$/, ''),
    id: n.id,
  }));

  const todayLabel = window.fofTime.dateHeader(Date.now());

  return (
    <aside style={{ width: 252, background: 'var(--paper2)', borderRight: '1px solid var(--ink)', padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', minWidth: 252 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, cursor: 'pointer' }} onClick={() => onNavigate({ kind: 'home' })}>
        <PopcornIcon size={26} />
        <span className="brod-disp" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-.01em' }}>fofcorn</span>
      </div>

      <div className="brod-body" style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink2)', paddingBottom: 10 }}>
        {todayLabel}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', paddingBottom: 10 }}>
        <input
          type="text"
          value={searchQuery || ''}
          placeholder="search notes…"
          onChange={e => onSearchChange(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px 7px 28px',
            background: 'var(--paper3)', border: '1px solid var(--line)',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, outline: 'none', color: 'var(--ink)',
            letterSpacing: '.02em', boxSizing: 'border-box',
          }}
        />
        <svg width="12" height="12" viewBox="0 0 16 16" style={{ position: 'absolute', left: 10, top: 9 }}>
          <circle cx="7" cy="7" r="5" fill="none" stroke="#807464" strokeWidth="1.5"/>
          <line x1="11" y1="11" x2="15" y2="15" stroke="#807464" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{ position: 'absolute', right: 8, top: 8, background:'none', border:'none', padding:0, color:'var(--ink3)', cursor:'pointer', fontSize:14, lineHeight:1 }}
            aria-label="clear search"
          >×</button>
        )}
      </div>

      <hr className="rule-red-1" style={{ margin: 0 }} />

      <div style={{ padding: '12px 0 12px', borderBottom: '1px solid var(--ink)' }}>
        <div className="kicker">Today</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <span className="brod-disp" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{todayNotes.length}</span>
          <span className="brod-body" style={{ fontSize: 12.5, color: 'var(--ink2)' }}>notes touched</span>
        </div>
        <div className="brod-mono" style={{ fontSize: 10.5, marginTop: 8, lineHeight: 1.7, color: 'var(--ink2)' }}>
          {activity.length === 0 && (
            <div style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>— nothing yet —</div>
          )}
          {activity.map((a, i) => (
            <div key={a.id}>
              {i===0 ? <span style={{ color: 'var(--red)' }}>●</span> : <span style={{ color: 'var(--ink3)' }}>○</span>}
              {' '}{a.t}&nbsp;&nbsp;<span style={{ color: 'var(--ink)' }}>{a.k}</span> &ldquo;{a.what}&rdquo;
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 0 4px' }}>
        <div className="kicker ink">Library</div>
        <div style={{ marginTop: 4 }}>
          {[
            { k:'home',   n:'Home',      c:''  },
            { k:'recent', n:'Recent',    c:''  },
            { k:'pinned', n:'Pinned',    c: pinnedCount },
            { k:'all',    n:'All notes', c: allCount },
          ].map(it => (
            <div key={it.k} className={'nav-row' + (isView(it.k)?' active':'')} onClick={() => onNavigate({ kind: it.k })}>
              <span>{isView(it.k)?'▸ ':'   '}{it.n}</span>
              <span className="cnt">{it.c}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 0 4px' }}>
        <div className="kicker ink">Collections</div>
        <div style={{ marginTop: 4 }}>
          {collections.map(c => {
            const ct = notes.filter(n => n.col === c.id).length;
            const a = isCollection(c.id);
            return (
              <div key={c.id} className={'nav-row' + (a?' active':'')} onClick={() => onSelectCollection(c.id)}>
                <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    width: 11, height: 11, background: c.color || '#807464',
                    border: '1px solid var(--ink)', display: 'inline-block', flex: '0 0 auto',
                    boxShadow: a ? '1px 1px 0 rgba(21,17,13,.25)' : 'none',
                  }} />
                  <span>{c.name}</span>
                </span>
                <span className="cnt">{ct}</span>
              </div>
            );
          })}
          <NewCollectionRow onAdd={onAddCollection} />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '10px 0 0', borderTop: '1px solid var(--ink)' }}>
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex', width: '100%', alignItems: 'baseline', justifyContent: 'space-between',
            background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit', color: 'inherit',
          }}
        >
          <span className="kicker">Settings ›</span>
          {(() => {
            const g = github || {};
            const connected = !!(g.token && g.owner && g.repo);
            return (
              <span className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
                {connected ? ((g.branch || 'main') + ' · synced') : 'not connected'}
              </span>
            );
          })()}
        </button>
        {(() => {
          const g = github || {};
          const connected = !!(g.token && g.owner && g.repo);
          if (!connected) {
            return (
              <div className="brod-mono" style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.6 }}>
                <span style={{ color: 'var(--ink3)' }}>○</span> Local only — connect a repo
              </div>
            );
          }
          return (
            <>
              <div className="brod-mono" style={{ fontSize: 10.5, color: 'var(--ink2)', marginTop: 2, lineHeight: 1.6 }}>
                <span style={{ color: 'var(--red)' }}>●</span> {g.owner}/{g.repo}
              </div>
              <SyncAllButton onSyncAll={onSyncAll} />
            </>
          );
        })()}
      </div>
    </aside>
  );
};

window.SyncAllButton = function SyncAllButton({ onSyncAll }) {
  const [state, setState] = React.useState('idle'); 
  const run = async () => {
    if (!onSyncAll || state === 'syncing') return;
    setState('syncing');
    try { await onSyncAll(); setState('done'); setTimeout(() => setState('idle'), 2500); }
    catch (_) { setState('err'); setTimeout(() => setState('idle'), 3500); }
  };
  const labels = { idle: '⇪ sync all', syncing: 'syncing…', done: 'all synced ✓', err: 'failed — retry' };
  return (
    <button
      className="tag-add" onClick={run} disabled={state === 'syncing'}
      style={{ marginTop: 8, width: '100%', color: state === 'err' ? 'var(--red)' : undefined }}
    >{labels[state]}</button>
  );
};

function NewCollectionRow({ onAdd }) {
  const [adding, setAdding] = React.useState(false);
  const [val, setVal] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { if (adding && ref.current) ref.current.focus(); }, [adding]);

  const commit = () => {
    const v = val.trim();
    if (v) onAdd && onAdd(v);
    setVal(''); setAdding(false);
  };
  const cancel = () => { setVal(''); setAdding(false); };

  if (!adding) {
    return (
      <div className="nav-row" style={{ color: 'var(--ink3)', fontStyle: 'italic', cursor: 'pointer' }} onClick={() => setAdding(true)}>
        <span>＋ new collection</span><span className="cnt"></span>
      </div>
    );
  }
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px dotted var(--line)', display:'flex', gap: 6, alignItems:'center' }}>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        placeholder="collection name…"
        style={{
          flex: 1, padding: '4px 6px', border: '1px solid var(--red)', background: 'var(--paper3)',
          fontFamily: "'IBM Plex Serif', serif", fontSize: 13.5, outline: 'none', color: 'var(--ink)',
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// The updated EditorTopbar with direct Save Button Feedback
// ────────────────────────────────────────────────────────
window.EditorTopbar = function EditorTopbar({ crumb, onBack, onTogglePin, pinned, onSave, savedAt, syncedAt, extra }) {
  const [saveState, setSaveState] = React.useState('idle'); // idle | saving | saved | err

  const handleSave = async () => {
    if (saveState === 'saving' || !onSave) return;
    setSaveState('saving');
    try {
      await onSave();
      setSaveState('saved');
    } catch (e) {
      setSaveState('err');
    }
    setTimeout(() => setSaveState('idle'), 2500);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '10px 22px 8px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="chip ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={onBack}>← back</button>
        <span className="brod-mono" style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--ink2)' }}>{crumb}</span>
        {extra}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="brod-mono" style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '.1em' }}>saved {savedAt}</span>
        <span style={{ width: 1, height: 12, background: 'var(--line)' }} />
        <span className="brod-mono" style={{ fontSize: 11, letterSpacing: '.1em' }}>
          <span style={{ color: 'var(--red)' }}>●</span> synced {syncedAt}
        </span>
        <button className={'chip' + (pinned?' solid':'')} style={{ padding: '3px 9px' }} onClick={onTogglePin}>
          {pinned ? '★ pinned' : '☆ pin'}
        </button>
        <button 
          className="chip red" 
          style={{ 
            padding: '3px 9px', 
            opacity: saveState === 'saving' ? 0.6 : 1,
            cursor: saveState === 'saving' ? 'default' : 'pointer'
          }} 
          onClick={handleSave}
          disabled={saveState === 'saving'}
        >
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved ✓' : saveState === 'err' ? 'failed ✕' : '↑ save'}
        </button>
      </div>
    </div>
  );
};

window.TagRow = function TagRow({ tags, onChange }) {
  const [adding, setAdding] = React.useState(false);
  const [val, setVal] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { if (adding && ref.current) ref.current.focus(); }, [adding]);

  const commit = () => {
    const v = val.trim().replace(/^#/, '');
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setVal(''); setAdding(false);
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {tags.map(t => (
        <span key={t} className="tag-chip">
          #{t}
          <span className="x" title="remove tag" onClick={() => onChange(tags.filter(x => x !== t))}>×</span>
        </span>
      ))}
      {adding ? (
        <input
          ref={ref}
          className="tag-input"
          value={val}
          placeholder="tag…"
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setVal(''); setAdding(false); }
          }}
        />
      ) : (
        <button className="tag-add" onClick={() => setAdding(true)}>＋ tag</button>
      )}
    </div>
  );
};
