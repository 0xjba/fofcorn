/* main.jsx — wired App root.
   Loads state from Store on boot. Saves on every change (debounced).
   Auto-syncs to GitHub when configured. Routes to onboarding / editor / library. */

const { useState, useEffect, useRef, useCallback } = React;

function App() {
  const [booted, setBooted]           = useState(false);
  const [collections, setCollections] = useState([]);
  const [notes, setNotes]             = useState([]);
  const [settings, setSettings]       = useState({ onboarded: false, autoSync: true, github: { encryptedToken:'', owner:'', repo:'', branch:'main' } });
  
  // Initialize from sessionStorage so refreshes don't lock the app
  const [sessionToken, setSessionToken] = useState(() => sessionStorage.getItem('fc_session_token') || null);
  
  const [view, setView]               = useState({ kind: 'home' });
  const [tab,  setTab]                = useState('sticky');
  const [openNoteId, setOpenNoteId]   = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleUnlock = (token) => {
    sessionStorage.setItem('fc_session_token', token);
    setSessionToken(token);
  };

  /* ─── boot ─── */
  useEffect(() => {
    (async () => {
      const saved = await window.Store.loadAll();
      if (saved && saved.notes && saved.notes.length) {
        setCollections(saved.collections || []);
        setNotes(saved.notes || []);
        setSettings(Object.assign({ onboarded: false, autoSync: true, github: { encryptedToken:'', owner:'', repo:'', branch:'main' } }, saved.settings || {}));
      } else {
        const seed = window.FOFCORN_DATA || { COLLECTIONS: [], NOTES: [] };
        const now = Date.now();
        const seedNotes = (seed.NOTES || []).map((n, i) => {
          const created = n.createdAt || (now - (i * 3 + 2) * 60 * 60 * 1000);
          const updated = n.updatedAt || (now - (i * 90 + 4) * 60 * 1000);
          const out = Object.assign({}, n, {
            createdAt: created, updatedAt: updated, _dirty: true,
            edited:  n.edited  || window.fofTime.relativeShort(updated),
            created: n.created || window.fofTime.pretty(created),
          });
          if (!out.words) out.words = window.WORDS_OF(out);
          return out;
        });
        setCollections(seed.COLLECTIONS || []);
        setNotes(seedNotes);
      }
      setBooted(true);
    })();
  }, []);

  /* ─── persist on every change ─── */
  useEffect(() => {
    if (!booted) return;
    window.Store.queueSave({ collections, notes, settings });
  }, [collections, notes, settings, booted]);

  /* ─── auto-sync push ─── */
  const autoPushRef = useRef(null);
  useEffect(() => {
    if (!booted || !settings.autoSync || !sessionToken) return;
    const hasDirty = notes.some(n => n._dirty);
    if (!hasDirty) return;

    clearTimeout(autoPushRef.current);
    autoPushRef.current = setTimeout(() => { pushAllSilent(); }, 3500);
    return () => clearTimeout(autoPushRef.current);
  }, [notes, collections, sessionToken]);

  /* ─── auto-sync pull on boot ─── */
  const pulledOnceRef = useRef(false);
  useEffect(() => {
    if (!booted || pulledOnceRef.current || !settings.autoSync || !sessionToken) return;
    pulledOnceRef.current = true;
    pullAllSilent();
  }, [booted, settings, sessionToken]);

  /* ─── push/pull logic ─── */
  const pushAll = useCallback(async (onLog) => {
    if (!sessionToken) throw new Error("App is locked.");
    const dirtyNotes = notes.filter(n => n._dirty);
    if (dirtyNotes.length === 0) {
      if (onLog) onLog("Everything is already up to date.");
      return { count: 0, commit: "skipped" };
    }

    const getBody = async (id) => {
      const n = notes.find(x => x.id === id);
      return n ? extractBody(n) : null;
    };
    
    const authSettings = { ...settings, github: { ...settings.github, token: sessionToken } };
    const res = await window.GitHub.pushAll(authSettings, { collections, notes: dirtyNotes, settings }, getBody, onLog);
    
    setNotes(prev => prev.map(n => ({ ...n, _dirty: false })));
    return res;
  }, [collections, notes, settings, sessionToken]);

  const pullAll = useCallback(async (onLog) => {
    if (!sessionToken) throw new Error("App is locked.");
    const authSettings = { ...settings, github: { ...settings.github, token: sessionToken } };
    const r = await window.GitHub.pullAll(authSettings, onLog);
    if (r.collections) setCollections(r.collections);
    if (r.notes && r.notes.length) {
      const rehydrated = r.notes.map(meta => {
        const body = r.bodies[meta.id] || {};
        return Object.assign({}, meta, body, { _dirty: false });
      });
      setNotes(prev => {
        const map = new Map(prev.map(n => [n.id, n]));
        rehydrated.forEach(n => map.set(n.id, n));
        return Array.from(map.values());
      });
    }
    return r;
  }, [settings, sessionToken]);

  // Unified two-way sync
  const fullSync = useCallback(async (onLog) => {
    if (!sessionToken) throw new Error("App is locked.");
    if (onLog) onLog('↓ Pulling remote changes...');
    try {
      await pullAll(onLog);
    } catch(e) {
      if (onLog) onLog('Pull skipped or failed: ' + e.message);
    }
    if (onLog) onLog('↑ Pushing local changes...');
    return await pushAll(onLog);
  }, [pullAll, pushAll, sessionToken]);

  const pushOne = useCallback(async (theNote, onLog) => {
    if (!sessionToken) throw new Error("App is locked.");
    const col = collections.find(c => c.id === theNote.col) || null;
    const authSettings = { ...settings, github: { ...settings.github, token: sessionToken } };
    const res = await window.GitHub.pushOne(authSettings, theNote, col, extractBody(theNote), onLog);
    
    setNotes(prev => prev.map(n => n.id === theNote.id ? { ...n, _dirty: false } : n));
    return res;
  }, [collections, settings, sessionToken]);

  const retryRef = useRef(null);
  const pushAllSilent = useCallback(() => {
    if (!sessionToken) return Promise.resolve();
    clearTimeout(retryRef.current);
    return pushAll().catch(() => { 
      retryRef.current = setTimeout(() => pushAllSilent(), 10000); 
      throw new Error('Push failed, queued retry.');
    });
  }, [pushAll, sessionToken]);
  const pullAllSilent = () => { pullAll().catch(() => {}); };

  /* ─── durability & unsynced tab lock ─── */
  useEffect(() => {
    const flush = () => { window.Store.flush(); };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', flush); };
  }, []);

  useEffect(() => {
    const hasUnsynced = sessionToken && notes.some(n => n._dirty);
    if (!hasUnsynced) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; 
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [notes, sessionToken]);

  /* ─── view actions ─── */
  const navigate = (v) => { setOpenNoteId(null); setView(v); setTab(pickDefaultTab(notes, v)); };
  const selectCollection = (id) => navigate({ kind: 'collection', collectionId: id });
  const openNote = (id) => { if (notes.find(n => n.id === id)) setOpenNoteId(id); };
  const backFromEditor = () => setOpenNoteId(null);

  /* ─── note CRUD ─── */
  const updateNote = useCallback((n) => {
    const next = Object.assign({}, n);
    next.updatedAt = Date.now();
    next.edited    = window.fofTime.relativeShort(next.updatedAt);
    next.words     = window.WORDS_OF(next);
    next._dirty    = true;
    setNotes(prev => prev.map(x => x.id === next.id ? next : x));
  }, []);

  const newNote = () => {
    const colId = view.kind === 'collection' ? view.collectionId : (collections[0] && collections[0].id);
    const now   = Date.now();
    const id    = 't-' + now.toString(36) + Math.random().toString(36).slice(2, 5);
    const stickyColors = ['cream', 'sage', 'rose', 'slate', 'ochre', 'blush'];
    const colorFor = { sticky: stickyColors[Math.floor(Math.random() * stickyColors.length)], notebook: 'cream', scratchpad: 'slate' };
    const n = {
      id, col: colId, type: tab, title: 'Untitled', subtitle: '', pinned: false, color: colorFor[tab],
      createdAt: now, updatedAt: now, created: window.fofTime.pretty(now), edited: 'now',
      words: 0, tags: [], linked: [], standFirst: '', body: '', _dirty: true
    };
    if (tab === 'notebook') {
      n.pages = [{ id: 'p-' + now.toString(36), title: 'Untitled', kicker: 'Page I', hed: 'Untitled', sub: '', standFirst: '', body: '<p>Write here…</p>' }];
      n.openPage = 0;
    } else if (tab === 'scratchpad') {
      n.scene = { elements: [], appState: {} };
    }
    setNotes(prev => [n, ...prev]);
    setOpenNoteId(id);
  };

  const deleteNote = (id) => {
    // Grab the note details before it is destroyed so GitHub knows what to delete
    const theNote = notes.find(n => n.id === id);
    const theCol = collections.find(c => c.id === (theNote ? theNote.col : null));

    // 1. Optimistic Local UI Deletion
    setNotes(prev => prev.filter(n => n.id !== id));
    if (openNoteId === id) setOpenNoteId(null);
    window.Store.delBody(id).catch(() => {});

    // 2. Fire-and-forget remote Auto-Sync
    if (sessionToken && theNote) {
      const authSettings = { ...settings, github: { ...settings.github, token: sessionToken } };
      window.GitHub.deleteOne(authSettings, theNote, theCol)
        .catch(err => console.error("Failed to delete from GitHub", err));
    }
  };

  /* ─── collections ─── */
  const addCollection = (name) => {
    const id = 'c-' + Date.now().toString(36);
    const roman = window.romanize(collections.length + 1);
    const palette = ['#7aa977','#2e57b8','#b89456','#4d6042','#b71f1f','#dc9a98','#a98352','#5b6f8a'];
    const color = palette[collections.length % palette.length];
    setCollections(prev => [...prev, { id, roman, name, color, description: 'A new collection — add a description.' }]);
    navigate({ kind: 'collection', collectionId: id });
  };
  const updateCollection = (id, patch) => {
    setCollections(prev => prev.map(c => c.id === id ? Object.assign({}, c, patch) : c));
  };

  const saveSettings = (patch) => {
    setSettings(prev => Object.assign({}, prev, patch, { onboarded: true }));
  };

  const onSearchChange = (q) => {
    setSearchQuery(q);
    if (q && openNoteId) setOpenNoteId(null);
  };

  /* ─── render ─── */
  if (!booted) {
    return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#efe5d0', fontFamily:'IBM Plex Mono, monospace', fontSize: 11, color: '#807464', letterSpacing: '.16em' }}>loading…</div>;
  }

  if (!settings.onboarded) {
    return (
      <OnboardingView
        onComplete={(patch, rawToken) => { 
          saveSettings(patch || {}); 
          if (rawToken) handleUnlock(rawToken);
        }}
        onSkip={() => saveSettings({})}
      />
    );
  }

  if (settings.github && settings.github.encryptedToken && !sessionToken) {
    return <window.LockView encryptedToken={settings.github.encryptedToken} onUnlock={handleUnlock} />;
  }

  const injectedGithub = settings.github ? { ...settings.github, token: sessionToken } : {};
  const sb = { searchQuery, onSearchChange, onAddCollection: addCollection, onOpenSettings: () => setShowSettings(true), github: injectedGithub, onSyncAll: fullSync };
  const note = openNoteId ? notes.find(n => n.id === openNoteId) : null;

  let view$ = null;
  if (note) {
    const common = { note, collections, notes, onBack: backFromEditor, onUpdateNote: updateNote, onDeleteNote: deleteNote, onOpenNote: openNote, onNavigate: navigate, onSaveNow: pushAllSilent, onSyncOne: pushOne, ...sb };
    if (note.type === 'notebook')   view$ = <NotebookView   key={note.id} {...common} />;
    else if (note.type === 'sticky')     view$ = <StickyView     key={note.id} {...common} />;
    else if (note.type === 'scratchpad') view$ = <ScratchpadView key={note.id} {...common} />;
  } else {
    view$ = (
      <LibraryView
        view={view} collections={collections} notes={notes}
        tab={tab} onTab={setTab}
        onOpenNote={openNote} onNewNote={newNote}
        onNavigate={navigate} onSelectCollection={selectCollection}
        onUpdateCollection={updateCollection}
        {...sb}
      />
    );
  }

  return (
    <>
      {view$}
      {showSettings && (
        <SettingsModal
          settings={settings}
          sessionToken={sessionToken}
          onSave={(patch, newToken) => { 
            saveSettings(patch); 
            if (newToken) {
              handleUnlock(newToken);
            } else if (newToken === '') {
              sessionStorage.removeItem('fc_session_token');
              setSessionToken(null);
            }
            setShowSettings(false); 
          }}
          onClose={() => setShowSettings(false)}
          onPushAll={pushAll}
          onPullAll={pullAll}
        />
      )}
    </>
  );
}

function extractBody(n) {
  if (n.type === 'notebook') return { pages: n.pages, openPage: n.openPage };
  if (n.type === 'scratchpad') return { scene: n.scene };
  return { body: n.body, standFirst: n.standFirst };
}

function pickDefaultTab(notes, view) {
  let scoped = notes;
  if (view.kind === 'collection') scoped = notes.filter(n => n.col === view.collectionId);
  else if (view.kind === 'pinned') scoped = notes.filter(n => n.pinned);
  const counts = {
    sticky:     scoped.filter(n => n.type === 'sticky').length,
    notebook:   scoped.filter(n => n.type === 'notebook').length,
    scratchpad: scoped.filter(n => n.type === 'scratchpad').length,
  };
  let best = 'sticky', bestN = -1;
  for (const k of ['sticky', 'notebook', 'scratchpad']) {
    if (counts[k] > bestN) { best = k; bestN = counts[k]; }
  }
  return best;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
