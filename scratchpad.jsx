/* scratchpad.jsx — Excalidraw canvas with fofcorn chrome.
   Visual structure preserved exactly. The placeholder is replaced by a
   real Excalidraw mount whose scene saves back to note.scene on every change. */

window.ScratchpadView = function ScratchpadView({ note, collections, notes, onBack, onUpdateNote, onDeleteNote, onOpenNote, onNavigate, onSaveNow, searchQuery, onSearchChange, onAddCollection, onOpenSettings, github, onSyncAll, onSyncOne }) {
  const col = collections.find(c => c.id === note.col);
  const setTags = (tags) => onUpdateNote({ ...note, tags });
  const togglePin = () => onUpdateNote({ ...note, pinned: !note.pinned });

  const hostRef = React.useRef(null);
  const noteRef = React.useRef(note);
  React.useEffect(() => { noteRef.current = note; }, [note]);

  const [strokeCount, setStrokeCount] = React.useState((note.scene && note.scene.elements ? note.scene.elements.filter(e => !e.isDeleted).length : 0));
  const [loadError, setLoadError]     = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const saveTimerRef = React.useRef(null);
  const onSceneChange = React.useCallback((scene) => {
    setStrokeCount(scene.elements ? scene.elements.filter(e => !e.isDeleted).length : 0);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onUpdateNote({ ...noteRef.current, scene });
    }, 350);
  }, [onUpdateNote]);

  React.useEffect(() => {
    if (!hostRef.current) return;
    let unmount = null;
    let killed = false;
    (async () => {
      try {
        unmount = await window.Excal.mount(hostRef.current, note.scene || { elements: [], appState: {} }, onSceneChange);
        if (killed && unmount) unmount();
      } catch (e) {
        setLoadError(true);
      }
    })();
    return () => { killed = true; if (unmount) try { unmount(); } catch (_) {} };
  }, [note.id]);

  const exportPNG = async () => {
    try {
      const Ex  = await import('https://esm.sh/@excalidraw/excalidraw@0.18.1?external=react,react-dom');
      const sc  = noteRef.current.scene || { elements: [], appState: {}, files: undefined };
      const blob = await Ex.exportToBlob({
        elements: sc.elements || [],
        appState: Object.assign({ exportBackground: true, viewBackgroundColor: '#ffffff' }, sc.appState || {}),
        files: sc.files, mimeType: 'image/png', exportPadding: 16,
      });
      downloadBlob(blob, (note.title || 'scratchpad') + '.png');
    } catch (e) { /* swallow */ }
  };
  const exportSVG = async () => {
    try {
      const Ex  = await import('https://esm.sh/@excalidraw/excalidraw@0.18.1?external=react,react-dom');
      const sc  = noteRef.current.scene || { elements: [], appState: {}, files: undefined };
      const svgEl = await Ex.exportToSvg({
        elements: sc.elements || [],
        appState: Object.assign({ exportBackground: true, viewBackgroundColor: '#ffffff' }, sc.appState || {}),
        files: sc.files, exportPadding: 16,
      });
      const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' });
      downloadBlob(blob, (note.title || 'scratchpad') + '.svg');
    } catch (e) {}
  };
  const exportExcalidraw = () => {
    const sc = noteRef.current.scene || { elements: [], appState: {}, files: {} };
    const file = { type: 'excalidraw', version: 2, source: 'fofcorn', elements: sc.elements || [], appState: sc.appState || {}, files: sc.files || {} };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    downloadBlob(blob, (note.title || 'scratchpad') + '.excalidraw');
  };

  return (
    <BroadShell>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar view={{ kind:'collection', collectionId: note.col }} collections={collections} notes={notes} onNavigate={onNavigate} onSelectCollection={(id) => onNavigate({ kind:'collection', collectionId:id })} onAddCollection={onAddCollection} searchQuery={searchQuery} onSearchChange={onSearchChange} onOpenSettings={onOpenSettings} github={github} onSyncAll={onSyncAll} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          <EditorTopbarWithDelete
            crumb={(col?.name || 'Collection').toUpperCase() + ' · SCRATCHPAD'}
            onBack={onBack}
            onTogglePin={togglePin}
            pinned={note.pinned}
            onSave={onSaveNow || (() => {})}
            savedAt={note.edited || 'now'}
            syncedAt={'…'}
            confirmingDelete={confirmingDelete}
            onAskDelete={() => setConfirmingDelete(true)}
            onConfirmDelete={() => { setConfirmingDelete(false); onDeleteNote && onDeleteNote(note.id); }}
            onCancelDelete={() => setConfirmingDelete(false)}
          />

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 26px 10px', borderBottom: '1px solid var(--ink)', gap: 18 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                className="brod-disp" contentEditable suppressContentEditableWarning key={'sc-' + note.id}
                onBlur={e => onUpdateNote({ ...note, title: e.currentTarget.textContent })}
                style={{ outline:'none', margin: 0, fontSize: 34, lineHeight: 1.05, letterSpacing: '-.01em', fontWeight: 800, fontStyle: 'italic' }}
              >{note.title || 'Untitled'}</h1>
              <div
                className="brod-body" contentEditable suppressContentEditableWarning key={'sf-' + note.id}
                onBlur={e => onUpdateNote({ ...note, standFirst: e.currentTarget.textContent })}
                style={{ outline: 'none', marginTop: 6, paddingLeft: 12, borderLeft: '2px solid var(--red)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: 'var(--ink2)', maxWidth: 720 }}
              >{note.standFirst || 'Add a one-line description…'}</div>
            </div>
            <div className="brod-mono" style={{ fontSize: 11, color: 'var(--ink2)', letterSpacing: '.1em' }}>
              <span style={{ color: 'var(--red)' }}>●</span> autosaved · drawing engine handles undo/redo
            </div>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', minHeight: 0 }}>

            <div style={{ padding: '18px 22px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {loadError ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', border: '1px solid var(--ink)', boxShadow: '6px 6px 0 rgba(21,17,13,.10)',
                  color: 'var(--ink2)', padding: 30, textAlign: 'center', gap: 10,
                }}>
                  <div className="brod-mono" style={{ fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--red)' }}>Drawing engine offline</div>
                  <div className="brod-body" style={{ fontSize: 13, fontStyle: 'italic', maxWidth: 360 }}>
                    Excalidraw could not load. It needs to fetch from esm.sh — works in a real browser; sandboxed previews may block it.
                  </div>
                </div>
              ) : (
                <div ref={hostRef} style={{
                  flex: 1, position: 'relative', minHeight: 0,
                  background: '#ffffff',
                  border: '1px solid var(--ink)',
                  boxShadow: '6px 6px 0 rgba(21,17,13,.10)',
                  overflow: 'hidden',
                }} />
              )}

              <div className="brod-mono" style={{ marginTop: 8, fontSize: 10.5, color: 'var(--ink3)', display: 'flex', justifyContent: 'space-between', letterSpacing: '.1em' }}>
                <span>scratch · drag, draw, paste · {strokeCount} elements</span>
                <span>autosaved locally · {note.edited || 'now'}</span>
              </div>
            </div>

            <aside style={{ borderLeft: '1px solid var(--line)', padding: '18px 18px 18px 22px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', minHeight: 0 }}>

              <div>
                <div className="kicker">Collection</div>
                <div className="brod-body" style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink)', cursor:'pointer' }} onClick={() => onNavigate({ kind:'collection', collectionId: note.col })}>
                  <span className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)', marginRight: 8 }}>{col?.roman}.</span>{col?.name}
                </div>
              </div>

              <div>
                <div className="kicker">Tags</div>
                <div style={{ marginTop: 6 }}>
                  <TagRow tags={note.tags || []} onChange={setTags} />
                </div>
              </div>

              <div>
                <div className="kicker">Linked</div>
                <div style={{ marginTop: 6 }}>
                  {(note.linked || []).map(lid => {
                    const ln = notes.find(n => n.id === lid);
                    if (!ln) return null;
                    return (
                      <div key={lid} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', cursor:'pointer' }} onClick={() => onOpenNote(lid)}>
                        <div className="kicker dim" style={{ fontSize: 9.5 }}>{ln.type.toUpperCase()}</div>
                        <div className="brod-body" style={{ fontSize: 13, lineHeight: 1.3 }}>{ln.title}</div>
                        <div className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{ln.edited || ln.created}</div>
                      </div>
                    );
                  })}
                  {(!note.linked || note.linked.length === 0) && (
                    <div className="brod-body" style={{ fontSize: 12, fontStyle:'italic', color: 'var(--ink3)' }}>None yet.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="kicker">Metadata</div>
                <table className="brod-mono" style={{ width: '100%', marginTop: 6, fontSize: 11, color: 'var(--ink2)', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Created</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.created}</td></tr>
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Edited</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.edited}</td></tr>
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Elements</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{strokeCount}</td></tr>
                    <tr><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Pinned</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.pinned ? '✓' : '—'}</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="kicker">Export</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <button className="ic-btn" onClick={exportPNG}>PNG</button>
                  <button className="ic-btn" onClick={exportSVG}>SVG</button>
                  <button className="ic-btn" onClick={exportExcalidraw}>.excalidraw</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </BroadShell>
  );
};

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}