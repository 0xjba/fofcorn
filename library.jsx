// Library view — Home / Recent / Pinned / All / per-Collection.
// Filters notes by view + active type tab. Click card to open.

window.LibraryView = function LibraryView({ view, collections, notes, tab, onTab, onOpenNote, onNewNote, onNavigate, onSelectCollection, searchQuery, onSearchChange, onAddCollection, onOpenSettings, onUpdateCollection, github, onSyncAll }) {
  const gridRef = React.useRef(null);
  const [cols, setCols] = React.useState(3);

  // Filter notes by view
  let scoped = notes.slice();
  let title = 'Home', subtitle = '';
  let crumb = 'Library';

  // Search overrides scope.
  const searching = !!(searchQuery && searchQuery.trim());
  if (searching) {
    const q = searchQuery.trim().toLowerCase();
    scoped = scoped.filter(n => {
      const hay = (n.title || '') + ' ' + (n.standFirst || '') + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ');
      return hay.toLowerCase().includes(q);
    });
    title = 'Search';
    crumb = 'Library · Search';
    subtitle = 'Results for “' + searchQuery.trim() + '” — across every collection and note type.';
  } else if (view.kind === 'collection') {
    const c = collections.find(c => c.id === view.collectionId);
    scoped = scoped.filter(n => n.col === view.collectionId);
    title = c ? c.name : 'Collection';
    crumb = 'Collections · ' + (c?c.name:'') + (c?.color ? '' : '');
    subtitle = c?.description || '';
  } else if (view.kind === 'home') {
    title = 'Home'; crumb = 'Library';
    subtitle = 'Everything across collections, newest first.';
    scoped.sort((a,b) => sortKey(b) - sortKey(a));
  } else if (view.kind === 'recent') {
    title = 'Recent'; crumb = 'Library · Recent';
    subtitle = 'What you have edited in the last few days.';
    scoped.sort((a,b) => sortKey(b) - sortKey(a));
  } else if (view.kind === 'pinned') {
    title = 'Pinned'; crumb = 'Library · Pinned';
    scoped = scoped.filter(n => n.pinned);
    subtitle = 'Notes you wanted to keep within reach.';
  } else if (view.kind === 'all') {
    title = 'All notes'; crumb = 'Library · All';
    subtitle = 'Every note in fofcorn — across every collection.';
  }

  // Count by type within scope (so tab counts reflect the active view)
  const counts = {
    sticky:     scoped.filter(n => n.type === 'sticky').length,
    notebook:   scoped.filter(n => n.type === 'notebook').length,
    scratchpad: scoped.filter(n => n.type === 'scratchpad').length,
  };

  // Filter by active tab
  const items = scoped.filter(n => n.type === tab);

  // Display label
  const typeLabel = { sticky:'Stickies', notebook:'Notebooks', scratchpad:'Scratchpads' };
  const newLabel  = { sticky:'sticky', notebook:'notebook', scratchpad:'scratchpad' };

  // Responsive Grid Observer
  React.useEffect(() => {
    if (!gridRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      let c = 1;
      if (tab === 'sticky') { c = w > 850 ? 4 : w > 600 ? 3 : w > 400 ? 2 : 1; }
      else if (tab === 'notebook') { c = w > 850 ? 3 : w > 550 ? 2 : 1; }
      else if (tab === 'scratchpad') { c = w > 750 ? 2 : 1; }
      setCols(c);
    });
    obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, [tab]);

  return (
    <BroadShell>
      <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
        <Sidebar view={view} collections={collections} notes={notes} onNavigate={onNavigate} onSelectCollection={onSelectCollection} onAddCollection={onAddCollection} searchQuery={searchQuery} onSearchChange={onSearchChange} onOpenSettings={onOpenSettings} github={github} onSyncAll={onSyncAll} />
        <main ref={gridRef} style={{ flex: 1, padding: '14px 26px 22px', overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
            <span className="brod-mono" style={{ fontSize: 10.5, color: 'var(--ink2)', letterSpacing: '.16em', textTransform: 'uppercase' }}>{crumb}</span>
            <span className="brod-mono" style={{ fontSize: 10.5, color: 'var(--ink3)', letterSpacing: '.14em' }}>{scoped.length} notes</span>
          </div>

          {/* masthead */}
          <div style={{ padding: '14px 0 10px', borderBottom: '3px solid var(--ink)' }}>
            {view.kind === 'collection' ? (
              <CollectionMasthead
                collection={collections.find(c => c.id === view.collectionId)}
                onUpdate={onUpdateCollection}
              />
            ) : (
              <>
                <h1 className="brod-disp" style={{ margin: 0, fontSize: 62, fontWeight: 800, letterSpacing: '-.015em', lineHeight: 1 }}>
                  {renderTitle(title)}
                </h1>
                {subtitle && <div className="brod-body" style={{ fontStyle: 'italic', fontSize: 15, marginTop: 6, color: 'var(--ink2)', maxWidth: 640 }}>{subtitle}</div>}
              </>
            )}
          </div>

    {/* tabs + sort + new */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 6px', borderBottom: '1px solid var(--ink)', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {[
                ['sticky','Stickies'], ['notebook','Notebooks'], ['scratchpad','Scratchpads']
              ].map(([k, l]) => (
                <button key={k} className={'tab' + (tab===k?' active':'')} onClick={() => onTab(k)}>
                  {l}<span className="ct">{counts[k]}</span>
                </button>
              ))}
            </div>
            <span style={{ flex: 1 }} />
            <button className="chip red" onClick={onNewNote}>＋ new {newLabel[tab]}</button>
          </div>

          {/* classifieds grid */}
          {items.length === 0 ? (
            <div className="brod-body" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink3)', fontStyle: 'italic', borderBottom: '1px solid var(--line)' }}>
              {searching
                ? <>No matches for “{searchQuery.trim()}” in {typeLabel[tab].toLowerCase()}.</>
                : <>No {typeLabel[tab].toLowerCase()} here yet — start the first one.</>}
            </div>
          ) : (() => {
            const aspectMap = { sticky: '1 / 1', notebook: '6 / 7', scratchpad: '3 / 2' };
            const aspect = aspectMap[tab];
            const remainder = items.length % cols;
            const fillerCount = remainder === 0 ? 0 : cols - remainder;
            const fillers = Array.from({ length: fillerCount }, (_, i) => ({ _filler: true, id: 'f-'+i }));
            const all = items.concat(fillers);
            const lastRowStart = all.length - cols;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {all.map((c, i) => {
                  if (c._filler) {
                    return (
                      <div key={c.id} style={{
                        aspectRatio: aspect,
                        background: cardBackground(c, i, cols),
                        borderRight: ((i%cols)===cols-1) ? 'none' : '1px solid var(--line)',
                        borderBottom: (i < lastRowStart) ? '1px solid var(--ink)' : 'none',
                      }} />
                    );
                  }
                  return (
                    <div key={c.id}
                      className={'clip-cell' + (c.pinned?' active':'')}
                      style={{
                        aspectRatio: aspect,
                        background: cardBackground(c, i, cols),
                        borderRight: ((i%cols)===cols-1) ? 'none' : '1px solid var(--line)',
                        borderBottom: (i < lastRowStart) ? '1px solid var(--ink)' : 'none',
                      }}
                      onClick={() => onOpenNote(c.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span className="kicker" style={{ color: kickerColor(c.type) }}>
                          {c.type.toUpperCase()}
                          {c.type === 'notebook' && c.pages ? (
                            <span style={{ color: 'var(--ink3)', marginLeft: 8, fontWeight: 500 }}>· {c.pages.length} pages</span>
                          ) : null}
                        </span>
                        {c.pinned && <span style={{ width: 8, height: 8, background: 'var(--red)', borderRadius: '50%' }} />}
                      </div>
                      <div className="clip-title" style={{ marginTop: 6 }}>{c.title}</div>
                      <div className="clip-stand">{c.standFirst}</div>
                      <div className="clip-foot">
                        <span>{c.edited || c.created}</span>
                        <span>{cardMeta(c)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </main>
      </div>
    </BroadShell>
  );
};

function cardBackground(n, i, cols) {
  const row = Math.floor(i / cols), col = i % cols;
  const isAlt = (row + col) % 2 === 0;

  // Filler cells maintain the distinctly visible checkerboard
  if (n._filler) {
    return isAlt ? 'rgba(21,17,13,.04)' : 'rgba(21,17,13,.09)';
  }
  
  // Stickies always use their assigned vibrant colors
  if (n.type === 'sticky' && n.color) {
    return 'var(--note-' + n.color + ')';
  }
  
  // Pinned items get the brightest warm paper highlight to stand out from the checkerboard
  if (n.pinned) return 'var(--paper3)';
  
  // Notebooks and Scratchpads use a much clearer checkerboard contrast
  // using 4% and 9% ink opacity so they cleanly pop off the background
  return isAlt ? 'rgba(21,17,13,.04)' : 'rgba(21,17,13,.09)';
}

function CollectionMasthead({ collection, onUpdate }) {
  if (!collection) return null;
  return (
    <>
      <h1
        className="brod-disp"
        contentEditable
        suppressContentEditableWarning
        key={'cm-t-' + collection.id}
        onBlur={e => {
          const v = e.currentTarget.textContent.trim();
          if (v && v !== collection.name) onUpdate && onUpdate(collection.id, { name: v });
        }}
        style={{ outline: 'none', margin: 0, fontSize: 62, fontWeight: 800, letterSpacing: '-.015em', lineHeight: 1 }}
      >{collection.name}</h1>
      <div
        className="brod-body"
        contentEditable
        suppressContentEditableWarning
        key={'cm-s-' + collection.id}
        onBlur={e => {
          const v = e.currentTarget.textContent.trim();
          if (v !== (collection.description || '')) onUpdate && onUpdate(collection.id, { description: v });
        }}
        data-empty={!collection.description ? 'true' : 'false'}
        style={{ outline: 'none', fontStyle: 'italic', fontSize: 15, marginTop: 6, color: 'var(--ink2)', maxWidth: 640 }}
      >{collection.description || 'Add a one-line description…'}</div>
    </>
  );
}

function renderTitle(t) {
  const parts = t.split(' ');
  if (parts.length === 1) return <span>{t}.</span>;
  return <><span style={{ fontStyle: 'italic' }}>{parts[0]}</span>{' ' + parts.slice(1).join(' ')}.</>;
}

function kickerColor(type) {
  return type === 'notebook' ? 'var(--red)' : type === 'sticky' ? 'var(--ink)' : 'var(--ink2)';
}

function cardMeta(n) {
  if (n.type === 'notebook') return (n.linked && n.linked.length ? n.linked.length + ' linked' : 'notebook');
  if (n.type === 'sticky')   return (n.words ? n.words + ' w' : 'sticky');
  return 'sketch';
}

function sortKey(n) {
  const s = (n.edited || '') + ' ' + (n.created || '');
  if (/06:|today|2m|14m/.test(s)) return 100;
  if (/1h|3 may|may/.test(s))     return 80;
  if (/apr/.test(s))              return 50;
  return 10;
}
