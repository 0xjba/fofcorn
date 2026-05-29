/* sticky.jsx — Sticky editor.
   Body uses tiptap (window.RichEditor) with a hard character limit so a
   sticky stays a sticky and not a notebook. Peek stickies are draggable. */

const STICKY_COLORS = ['cream', 'sage', 'rose', 'slate', 'ochre', 'blush'];
const STICKY_MAX_CHARS = 600;

const DEFAULT_PEEKS = [
  { x: 360,  y: -10,  rot: -2.4 },
  { x: -300, y: 90,   rot: 1.6  },
  { x: 290,  y: 360,  rot: -1.2 },
];

window.StickyView = function StickyView({ note, collections, notes, onBack, onUpdateNote, onDeleteNote, onOpenNote, onNavigate, onSaveNow, searchQuery, onSearchChange, onAddCollection, onOpenSettings, github, onSyncAll, onSyncOne }) {
  const col = collections.find(c => c.id === note.col);
  const cssVar = (k) => 'var(--note-' + k + ')';

  const setTags = (tags) => onUpdateNote({ ...note, tags });
  const setColor = (color) => onUpdateNote({ ...note, color });
  const togglePin = () => onUpdateNote({ ...note, pinned: !note.pinned });

  const linkANote = async () => {
    const id = await window.openNotePicker(notes, { excludeIds: [note.id, ...(note.linked || [])] });
    if (!id) return;
    onUpdateNote({ ...note, linked: [...(note.linked || []), id] });
  };

  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const onBodyChange = (html) => onUpdateNote({ ...note, body: html });

  const editor = window.useFofcornEditor({
    content: note.body,
    onChange: onBodyChange,
    maxChars: STICKY_MAX_CHARS,
    placeholder: 'Jot a quick note…',
  });

  const onSketch = async () => {
    const out = await window.Excal.openDialog();
    if (!out || !editor) return;
    const safe = btoa(unescape(encodeURIComponent(JSON.stringify(out.scene))));
    editor.chain().focus().insertContent('<p><img class="drawing" src="' + out.png + '" data-scene="' + safe + '"></p>').run();
  };

  const others = notes
    .filter(n => n.col === note.col && n.type === 'sticky' && n.id !== note.id)
    .slice(0, 3);

  const [positions, setPositions] = React.useState({});
  const [draggingId, setDraggingId] = React.useState(null);
  React.useEffect(() => { setPositions({}); }, [note.id]);
  const posOf = (id, i) => positions[id] || DEFAULT_PEEKS[i] || { x: 0, y: 0, rot: 0 };

  const startDrag = (id, i, e) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    const initial = posOf(id, i);
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    setDraggingId(id);
    
    const onMove = (ev) => {
      if (Math.abs(ev.clientX - sx) > 4 || Math.abs(ev.clientY - sy) > 4) moved = true;
      setPositions(p => ({ ...p, [id]: { ...initial, x: initial.x + (ev.clientX - sx), y: initial.y + (ev.clientY - sy) } }));
    };
    
    const onUp = (ev) => {
      setDraggingId(null);
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      if (!moved) onOpenNote(id);
    };
    
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  };

  return (
    <BroadShell>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar view={{ kind:'collection', collectionId: note.col }} collections={collections} notes={notes} onNavigate={onNavigate} onSelectCollection={(id) => onNavigate({ kind:'collection', collectionId:id })} onAddCollection={onAddCollection} searchQuery={searchQuery} onSearchChange={onSearchChange} onOpenSettings={onOpenSettings} github={github} onSyncAll={onSyncAll} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          <EditorTopbarWithDelete
            crumb={(col?.name || 'Collection').toUpperCase() + ' · STICKY'}
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

          <RichToolbar editor={editor} compact onSketch={onSketch} />

          <div style={{ flex: 1, padding: '24px 28px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 308px', gap: 24, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, overflowY: 'auto' }}>

              {others.map((o, i) => {
                const p = posOf(o.id, i);
                const isDragging = draggingId === o.id;
                return (
                  <div key={o.id}
                    onPointerDown={(e) => startDrag(o.id, i, e)}
                    style={{
                      position: 'absolute', left: '50%', top: '50%',
                      transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rot}deg) scale(0.36)`,
                      width: 480, padding: '20px 22px 16px', background: cssVar(o.color),
                      border: '1px solid var(--ink)',
                      boxShadow: isDragging ? '10px 10px 0 rgba(21,17,13,.22)' : '4px 4px 0 rgba(21,17,13,.12)',
                      opacity: isDragging ? 1 : .9,
                      zIndex: isDragging ? 3 : 1,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      transition: isDragging ? 'none' : 'box-shadow .15s, opacity .15s',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', pointerEvents: 'none' }}>
                      <span className="kicker">STICKY · {col?.name}</span>
                      <span className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{o.created}</span>
                    </div>
                    <div className="brod-disp" style={{ margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.01em', fontStyle: 'italic', pointerEvents: 'none' }}>{o.title || 'Untitled'}</div>
                    <hr style={{ width: 44, margin: '2px 0', border: 'none', borderTop: '2px solid var(--red)', pointerEvents: 'none' }} />
                    {o.standFirst && (
                      <div className="brod-body" style={{ paddingLeft: 12, borderLeft: '2px solid var(--red)', fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink2)', pointerEvents: 'none' }}>{o.standFirst}</div>
                    )}
                    <div className="ProseMirror brod-body" style={{ fontSize: 14, lineHeight: 1.6, pointerEvents: 'none', whiteSpace: 'normal' }} dangerouslySetInnerHTML={{ __html: o.body || '' }} />
                  </div>
                );
              })}

              <div style={{
                position: 'relative', margin: 'auto',
                width: 480, padding: '20px 22px 16px', background: cssVar(note.color),
                border: '1px solid var(--ink)', boxShadow: '8px 8px 0 rgba(21,17,13,.16)',
                zIndex: 2, transform: 'rotate(-.5deg)',
                display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="kicker">STICKY · {col?.name}</span>
                  <span className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{note.created}</span>
                </div>

                <h2
                  className="brod-disp"
                  contentEditable suppressContentEditableWarning
                  key={'st-' + note.id}
                  onBlur={e => onUpdateNote({ ...note, title: e.currentTarget.textContent })}
                  style={{ outline: 'none', margin: '0', fontSize: 28, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.01em', fontStyle: 'italic' }}
                >{note.title || 'Untitled'}</h2>

                <hr style={{ width: 44, margin: '2px 0', border: 'none', borderTop: '2px solid var(--red)' }} />

                <div
                  className="brod-body"
                  contentEditable suppressContentEditableWarning
                  key={'sf-' + note.id}
                  onBlur={e => onUpdateNote({ ...note, standFirst: e.currentTarget.textContent })}
                  style={{ outline: 'none', paddingLeft: 12, borderLeft: '2px solid var(--red)', fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink2)' }}
                >{note.standFirst || 'Add a one-line summary…'}</div>

                <div className="brod-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <RichBody editor={editor} content={note.body} maxChars={STICKY_MAX_CHARS} />
                </div>

                {note.pinned && (
                  <div style={{ position:'absolute', top: 10, right: 12, width: 16, height: 16, borderRadius: '50%', background: 'var(--red)', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.18), 0 1px 2px rgba(21,17,13,.4)' }} />
                )}
              </div>
            </div>

            <aside style={{ borderLeft: '1px solid var(--line)', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', minHeight: 0 }}>

              <div>
                <div className="kicker">Color</div>
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {STICKY_COLORS.map(c => (
                    <div key={c} className={'swatch' + (note.color===c?' on':'')} style={{ background: cssVar(c) }} onClick={() => setColor(c)} title={c} />
                  ))}
                </div>
                <div className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 4, letterSpacing: '.08em' }}>{note.color} — selected</div>
              </div>

              <div>
                <div className="kicker">Tags</div>
                <div style={{ marginTop: 6 }}>
                  <TagRow tags={note.tags || []} onChange={setTags} />
                </div>
              </div>

              <div>
                <div className="kicker">Collection</div>
                <div className="brod-body" style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink)', cursor:'pointer' }} onClick={() => onNavigate({ kind:'collection', collectionId: note.col })}>
                  <span className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)', marginRight: 8 }}>{col?.roman}.</span>{col?.name}
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
                  <button className="tag-add" style={{ marginTop: 8 }} onClick={linkANote}>+ link a note</button>
                </div>
              </div>

              <div>
                <div className="kicker">Metadata</div>
                <table className="brod-mono" style={{ width: '100%', marginTop: 6, fontSize: 11, color: 'var(--ink2)', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Created</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.created}</td></tr>
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Edited</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.edited}</td></tr>
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Words</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.words}</td></tr>
                    <tr><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Pinned</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{note.pinned ? '✓' : '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </BroadShell>
  );
};