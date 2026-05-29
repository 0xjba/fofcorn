/* notebook.jsx — Notebook editor.
   Each page fills its grid cell perfectly with equal margins. When a page's
   body fills up, new content spills onto the next page (created if needed).
   Bottom-corner flips and the right-rail buttons move between pages. */

const FLIP_MS = 540;

window.NotebookView = function NotebookView({ note, collections, notes, onBack, onUpdateNote, onDeleteNote, onOpenNote, onNavigate, onSaveNow, searchQuery, onSearchChange, onAddCollection, onOpenSettings, github, onSyncAll, onSyncOne }) {
  const initialPage = Math.min(note.openPage ?? 0, (note.pages || []).length - 1);
  const [pageIdx, setPageIdx] = React.useState(Math.max(0, initialPage));
  const [flipping, setFlipping] = React.useState(null);
  const [autoFocusEnd, setAutoFocusEnd] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const pages = note.pages || [];
  const page  = pages[pageIdx];
  const col   = collections.find(c => c.id === note.col);

  const setTags    = (tags) => onUpdateNote({ ...note, tags });
  const togglePin  = ()     => onUpdateNote({ ...note, pinned: !note.pinned });

  const updatePage = (idx, patch) => {
    const newPages = pages.map((p, i) => i === idx ? { ...p, ...patch } : p);
    onUpdateNote({ ...note, pages: newPages, openPage: idx });
  };

  const editor = window.useFofcornEditor({
    content: page ? (page.body || '') : '',
    onChange: (html) => updatePage(pageIdx, { body: html }),
    placeholder: 'Write on this page. When it fills, the text spills onto the next page.',
  });

  const onBodyOverflow = (movedHtml, remainHtml) => {
    const cur = pageIdx, nextIdx = pageIdx + 1;
    const newPages = pages.slice();
    newPages[cur] = { ...newPages[cur], body: remainHtml };
    if (nextIdx >= newPages.length) {
      newPages.push({
        id: 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        title: 'Untitled',
        kicker: 'Page ' + window.romanize(newPages.length + 1),
        hed: 'Untitled', sub: '', standFirst: '',
        body: movedHtml,
      });
    } else {
      newPages[nextIdx] = { ...newPages[nextIdx], body: movedHtml + (newPages[nextIdx].body || '') };
    }
    onUpdateNote({ ...note, pages: newPages, openPage: nextIdx });
    setAutoFocusEnd(true);
    setPageIdx(nextIdx);
  };

  const onSketch = async () => {
    const out = await window.Excal.openDialog();
    if (!out || !editor) return;
    const safe = btoa(unescape(encodeURIComponent(JSON.stringify(out.scene))));
    editor.chain().focus().insertContent('<p><img class="drawing" src="' + out.png + '" data-scene="' + safe + '"></p>').run();
  };

  const goTo = (next) => {
    if (flipping) return;
    if (next < 0 || next >= pages.length) return;
    const dir = next > pageIdx ? 'next' : 'prev';
    setFlipping(dir);
    if (dir === 'next') setPageIdx(next);
    setTimeout(() => {
      if (dir === 'prev') setPageIdx(next);
      setFlipping(null);
    }, FLIP_MS);
  };
  const addPageAndAdvance = () => {
    if (flipping) return;
    const newPage = {
      id: 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title: 'Untitled',
      kicker: 'Page ' + window.romanize(pages.length + 1),
      hed: 'Untitled', sub: '', standFirst: '',
      body: '',
    };
    const newPages = [...pages, newPage];
    onUpdateNote({ ...note, pages: newPages, openPage: newPages.length - 1 });
    setPageIdx(newPages.length - 1);
  };
  const deleteCurrentPage = async () => {
    if (pages.length < 2) return;
    const ok = await window.openConfirmDialog({
      title: 'Delete this page?',
      message: 'The page and its contents are removed from the notebook. The other pages stay.',
      ok: 'Delete page',
      danger: true,
    });
    if (!ok) return;
    const newPages = pages.filter((_, i) => i !== pageIdx);
    const newIdx = Math.max(0, pageIdx - 1);
    onUpdateNote({ ...note, pages: newPages, openPage: newIdx });
    setPageIdx(newIdx);
  };

  const isBlankPage = (p) => {
    if (!p) return false;
    const body = (p.body || '').replace(/<[^>]*>/g, '').replace(/\u00a0/g, ' ').trim();
    const hed  = (p.hed || '').trim();
    return body === '' && (hed === '' || hed === 'Untitled') && !(p.sub || '').trim() && !(p.standFirst || '').trim();
  };

  const addPage = () => {
    if (flipping) return;
    const lastIdx = pages.length - 1;
    if (lastIdx >= 0 && isBlankPage(pages[lastIdx])) { setPageIdx(lastIdx); return; }
    addPageAndAdvance();
  };

  const handleNext = () => {
    if (flipping) return;
    if (pageIdx < pages.length - 1) { goTo(pageIdx + 1); return; }
    if (!isBlankPage(pages[pageIdx])) addPageAndAdvance();
  };
  const handlePrev = () => {
    if (flipping) return;
    if (pageIdx <= 0) return;
    if (pageIdx === pages.length - 1 && pages.length > 1 && isBlankPage(pages[pageIdx])) {
      const newPages = pages.slice(0, pages.length - 1);
      const newIdx = pageIdx - 1;
      onUpdateNote({ ...note, pages: newPages, openPage: newIdx });
      setPageIdx(newIdx);
      return;
    }
    goTo(pageIdx - 1);
  };

  const handleBack = () => {
    let end = pages.length;
    while (end > 1 && isBlankPage(pages[end - 1])) end--;
    if (end < pages.length) {
      onUpdateNote({ ...note, pages: pages.slice(0, end), openPage: Math.min(note.openPage ?? 0, end - 1) });
    }
    onBack && onBack();
  };

  const linkANote = async () => {
    const id = await window.openNotePicker(notes, { excludeIds: [note.id, ...(note.linked || [])] });
    if (!id) return;
    onUpdateNote({ ...note, linked: [...(note.linked || []), id] });
  };

  React.useEffect(() => {
    if (!autoFocusEnd) return;
    const t = setTimeout(() => setAutoFocusEnd(false), 80);
    return () => clearTimeout(t);
  }, [autoFocusEnd]);

  return (
    <BroadShell>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar view={{ kind:'collection', collectionId: note.col }} collections={collections} notes={notes} onNavigate={onNavigate} onSelectCollection={(id) => onNavigate({ kind:'collection', collectionId:id })} onAddCollection={onAddCollection} searchQuery={searchQuery} onSearchChange={onSearchChange} onOpenSettings={onOpenSettings} github={github} onSyncAll={onSyncAll} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          <EditorTopbarWithDelete
            crumb={(col?.name || 'Collection').toUpperCase() + ' · ' + (note.title || 'Untitled').toUpperCase()}
            onBack={handleBack}
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

          <RichToolbar editor={editor} onSketch={onSketch} />

          <div style={{ flex: 1, padding: '24px 28px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 308px', gap: 24, minHeight: 0, overflow: 'hidden' }}>

            <div style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex' }}>

              <div className="nb-frame" style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: 'var(--paper3)',
                border: '1px solid var(--ink)',
                boxShadow: '6px 6px 0 rgba(21,17,13,.10)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <div key={'page-' + (page ? page.id : pageIdx)} style={{ padding: '24px 32px 14px', display: 'flex', flexDirection: 'column' }}>
                  <PageHead
                    page={page}
                    onHedBlur={(v) => updatePage(pageIdx, { hed: v })}
                    onSubBlur={(v) => updatePage(pageIdx, { sub: v })}
                  />
                </div>

                <div
                  style={{ padding: '0 32px 8px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                  onClick={(e) => { if (e.target === e.currentTarget && editor) editor.commands.focus('end'); }}
                >
                  <RichBody
                    editor={editor}
                    content={page ? (page.body || '') : ''}
                    onOverflow={onBodyOverflow}
                    autoFocusAtEnd={autoFocusEnd}
                  />
                </div>

                <div style={{
                  padding: '4px 32px 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="brod-mono" style={{ fontSize: 9.5, color: 'var(--ink3)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                    page {window.romanize(pageIdx+1)} of {window.romanize(pages.length)}
                  </span>
                </div>

                {pageIdx > 0 && (
                  <button onClick={handlePrev} aria-label="previous page"
                    style={{ position: 'absolute', left: 0, bottom: 0, width: 38, height: 38, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', zIndex: 8 }}>
                    <svg width="38" height="38" viewBox="0 0 38 38">
                      <polygon points="0,0 0,38 38,38" fill="rgba(21,17,13,.05)" stroke="rgba(21,17,13,.18)" strokeWidth="1" strokeLinejoin="round" />
                      <polyline points="16,22 9,26 16,30" fill="none" stroke="rgba(21,17,13,.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                <button onClick={handleNext} aria-label={pageIdx < pages.length - 1 ? 'next page' : 'new page'}
                  style={{ position: 'absolute', right: 0, bottom: 0, width: 38, height: 38, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', zIndex: 8 }}>
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <polygon points="38,0 38,38 0,38" fill="rgba(21,17,13,.05)" stroke="rgba(21,17,13,.18)" strokeWidth="1" strokeLinejoin="round" />
                    <polyline points="22,22 29,26 22,30" fill="none" stroke="rgba(21,17,13,.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {flipping && (
                <div className={'flip-leaf ' + flipping}>
                  <div className="face" style={{ padding: '24px 32px 14px', overflow: 'hidden', height: '100%' }}>
                    <PageHead page={page} readOnly />
                  </div>
                  <div className="face back" style={{ padding: '24px 32px 14px' }}>
                    <div className="brod-mono" style={{ fontSize: 10.5, color: 'var(--ink3)', letterSpacing: '.16em' }}>— turning —</div>
                  </div>
                </div>
              )}
            </div>

            <aside style={{ borderLeft: '1px solid var(--line)', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', minHeight: 0 }}>

              <div>
                <div className="kicker">Pages</div>
                <div className="brod-mono" style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 6 }}>
                  page {pageIdx + 1} of {pages.length}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="tag-add" onClick={addPage}>+ add page</button>
                  <button className="tag-add" onClick={deleteCurrentPage} disabled={pages.length < 2} style={pages.length < 2 ? { opacity: .4 } : null}>− delete page</button>
                </div>
              </div>

              <div>
                <div className="kicker">Linked notes</div>
                <div style={{ marginTop: 6 }}>
                  {(note.linked || []).map(lid => {
                    const ln = notes.find(n => n.id === lid);
                    if (!ln) return null;
                    return (
                      <div key={lid} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, padding: '8px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => onOpenNote(lid)}>
                        <span className="kicker dim" style={{ fontSize: 9.5, color: 'var(--ink3)' }}>{ln.type.toUpperCase()}</span>
                        <span className="brod-body" style={{ fontSize: 13, lineHeight: 1.3 }}>{ln.title}</span>
                        <span className="brod-mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{ln.edited || ln.created}</span>
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
                    <tr style={{ borderBottom: '1px dotted var(--line)' }}><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Pages</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>{pages.length}</td></tr>
                    <tr><td style={{ padding: '5px 0', color: 'var(--ink3)' }}>Color</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink)' }}>✦ {note.color}</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="kicker">Tags</div>
                <div style={{ marginTop: 6 }}>
                  <TagRow tags={note.tags || []} onChange={setTags} />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </BroadShell>
  );
};

function PageHead({ page, readOnly, onHedBlur, onSubBlur }) {
  if (!page) return null;
  const hed = page.hed || 'Untitled';
  const sub = page.sub || '';
  return (
    <article>
      {readOnly ? (
        <h1 className="brod-disp" style={{ margin: 0, fontSize: 36, lineHeight: 1.04, letterSpacing: '-.015em', fontWeight: 800, fontStyle: 'italic' }}>{hed}</h1>
      ) : (
        <h1
          className="brod-disp" contentEditable suppressContentEditableWarning
          onBlur={e => onHedBlur && onHedBlur(e.currentTarget.textContent)}
          style={{ outline:'none', margin: 0, fontSize: 36, lineHeight: 1.04, letterSpacing: '-.015em', fontWeight: 800, fontStyle: 'italic' }}
        >{hed}</h1>
      )}

      {readOnly ? (
        sub && <h2 className="brod-disp" style={{ margin: '4px 0 0', fontSize: 18, lineHeight: 1.18, fontWeight: 400, color: 'var(--ink2)' }}>{sub}</h2>
      ) : (
        <h2
          className="brod-disp" contentEditable suppressContentEditableWarning
          onBlur={e => onSubBlur && onSubBlur(e.currentTarget.textContent)}
          style={{ outline:'none', margin: '4px 0 0', fontSize: 18, lineHeight: 1.18, fontWeight: 400, color: 'var(--ink2)' }}
        >{sub}</h2>
      )}
    </article>
  );
}