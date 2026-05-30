/* wire.jsx — runtime infrastructure: persistence, GitHub sync, Excalidraw, helpers.
   This file declares no React components — only window.Store, window.GitHub,
   window.Excal, window.fofTime, and window.WORDS_OF. Loaded first. */

/* ─────────────────────────────────────────────
   Storage. window.storage (artifact host) → IndexedDB → in-memory fallback.
   ───────────────────────────────────────────── */
(function () {
  const hasArtifact = typeof window.storage === 'object' && typeof window.storage.get === 'function';

  let dbPromise;
  const openDB = () => dbPromise || (dbPromise = new Promise((res, rej) => {
    const r = indexedDB.open('fofcorn', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  }));
  const idbTx = (mode) => openDB().then(d => d.transaction('kv', mode).objectStore('kv'));

  const idb = {
    async get(k) {
      const s = await idbTx('readonly');
      return new Promise(r => { const q = s.get(k); q.onsuccess = () => r(q.result ?? null); q.onerror = () => r(null); });
    },
    async set(k, v) {
      const s = await idbTx('readwrite');
      return new Promise(r => { const q = s.put(v, k); q.onsuccess = () => r(); q.onerror = () => r(); });
    },
    async del(k) {
      const s = await idbTx('readwrite');
      return new Promise(r => { const q = s.delete(k); q.onsuccess = () => r(); q.onerror = () => r(); });
    },
    async listKeys(prefix) {
      const s = await idbTx('readonly');
      return new Promise(r => {
        const out = []; const q = s.openKeyCursor();
        q.onsuccess = () => { const c = q.result; if (c) { if (!prefix || String(c.key).startsWith(prefix)) out.push(c.key); c.continue(); } else r(out); };
        q.onerror = () => r(out);
      });
    },
  };

  const artifact = hasArtifact ? {
    async get(k) { try { const r = await window.storage.get(k); return r ? r.value : null; } catch (_) { return null; } },
    async set(k, v) { try { await window.storage.set(k, v, false); } catch (_) {} },
    async del(k)    { try { await window.storage.delete(k, false); } catch (_) {} },
    async listKeys(p) { try { const r = await window.storage.list(p, false); return r ? r.keys : []; } catch (_) { return []; } },
  } : null;

  const backend = artifact || idb;

  window.Store = {
    mode: artifact ? 'artifact' : 'indexeddb',
    _pending: null,
    _saveTimer: null,

    async loadAll() {
      try {
        const raw = await backend.get('fc_root');
        if (raw) {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      } catch (e) {
        console.error('[Store] Failed to load data from IndexedDB. Database may be corrupted.', e);
      }
      return null;
    },
    
    async saveAll(state) {
      const stamped = Object.assign({}, state, { _savedAt: Date.now() });
      try {
        await backend.set('fc_root', JSON.stringify(stamped));
      } catch (e) {
        console.error('[Store] Failed to save data to IndexedDB. Storage limit may be reached.', e);
      }
    },

    async getBody(id) {
      try {
        const r = await backend.get('fc_body_' + id);
        if (!r) return null;
        return typeof r === 'string' ? JSON.parse(r) : r;
      } catch (e) { 
        console.error(`[Store] Failed to parse body for note ${id}`, e);
        return null; 
      }
    },
    
    async setBody(id, body) { 
      try {
        await backend.set('fc_body_' + id, JSON.stringify(body || {})); 
      } catch (e) {
        console.error(`[Store] Failed to save body for note ${id}`, e);
      }
    },
    
    async delBody(id) { 
      try {
        await backend.del('fc_body_' + id); 
      } catch(e) {
        console.error(`[Store] Failed to delete body for note ${id}`, e);
      }
    },

    queueSave(state, delay) {
      this._pending = state;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => { this.flush(); }, delay == null ? 350 : delay);
    },

    flush() {
      clearTimeout(this._saveTimer);
      if (!this._pending) return Promise.resolve();
      const state = this._pending;
      this._pending = null;
      return this.saveAll(state);
    },
  };
})();


/* ─────────────────────────────────────────────
   Time helpers used by the UI.
   ───────────────────────────────────────────── */
window.fofTime = (function () {
  const PRETTY_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  function relativeShort(then, now) {
    now = now || Date.now();
    const diff = Math.max(0, now - then);
    const s  = Math.floor(diff / 1000);
    const m  = Math.floor(s / 60);
    const h  = Math.floor(m / 60);
    const d  = Math.floor(h / 24);
    if (s < 8)        return 'now';
    if (m < 1)        return s + 's';
    if (m < 60)       return m + 'm';
    if (h < 24)       return h + 'h';
    if (d < 7)        return d + 'd';
    const dt = new Date(then);
    return dt.getDate() + ' ' + PRETTY_MONTHS[dt.getMonth()];
  }

  function pretty(then) {
    if (!then) return '';
    const dt = new Date(then);
    const d  = dt.getDate();
    const m  = PRETTY_MONTHS[dt.getMonth()];
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return d + ' ' + m + ', ' + hh + ':' + mm;
  }

  function dateHeader(then) {
    if (!then) return '';
    const dt = new Date(then);
    const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dt.getDay()];
    const mo  = ['January','February','March','April','May','June','July','August','September','October','November','December'][dt.getMonth()];
    return day + ' · ' + dt.getDate() + ' ' + mo + ' ' + dt.getFullYear();
  }

  return { relativeShort, pretty, dateHeader };
})();


/* ─────────────────────────────────────────────
   Word counter
   ───────────────────────────────────────────── */
window.WORDS_OF = function WORDS_OF(note) {
  const parts = [];
  if (!note) return 0;
  parts.push(note.title || '', note.subtitle || '', note.standFirst || '');
  if (note.type === 'notebook') {
    (note.pages || []).forEach(p => parts.push(p.title || '', p.hed || '', p.sub || '', p.standFirst || '', p.body || ''));
  } else {
    parts.push(note.body || '');
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = parts.join(' ');
  const txt = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  if (!txt) return 0;
  return txt.split(' ').filter(Boolean).length;
};


/* ─────────────────────────────────────────────
   String slugifier
   ───────────────────────────────────────────── */
window.slugify = function slugify(text) {
  return (text || '').toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};


/* ─────────────────────────────────────────────
   GitHub Git Data API client with Sequential Locking
   ───────────────────────────────────────────── */
window.GitHub = (function () {
  const base = 'https://api.github.com';
  const u2b = (s) => btoa(unescape(encodeURIComponent(s)));
  const b2u = (s) => decodeURIComponent(escape(atob((s || '').replace(/\s/g, ''))));

  // The Lock: Forces all GitHub API calls to wait in a queue to prevent 422 Race Conditions
  let gitQueue = Promise.resolve();
  function enqueue(task) {
    const p = gitQueue.then(task, task); // run task even if previous failed
    gitQueue = p.catch(() => {}); // prevent unhandled rejections from halting the queue
    return p;
  }

  function headers(token) {
    return {
      'Authorization': 'Bearer ' + token,
      'Accept':        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async function call(token, method, path, body) {
    const r = await fetch(base + path, {
      method,
      headers: headers(token),
      cache: 'no-store', // This stops the browser from reusing old branch SHAs!
      body: body ? JSON.stringify(body) : undefined,
    });
    return r;
  }

  async function whoami(token) {
    if (!token) throw new Error('No token');
    const r = await call(token, 'GET', '/user');
    if (!r.ok) throw new Error('Token rejected (' + r.status + ').');
    return await r.json();
  }

  async function createRepo(token, { name, isPrivate }) {
    const r = await call(token, 'POST', '/user/repos', {
      name, private: !!isPrivate, auto_init: true,
      description: 'fofcorn notes',
    });
    if (!r.ok) {
      let body = null; try { body = await r.json(); } catch (_) {}
      const ghMsg = (body && body.message) || '';
      let msg = 'Could not create repository (' + r.status + ').';
      if (r.status === 422) msg = 'A repo with that name already exists. Pick another.';
      else if (r.status === 403 && /not accessible by personal access token/i.test(ghMsg))
        msg = 'Your token can’t create new repos. Create one on github.com instead, then use "Use existing repo".';
      throw new Error(msg);
    }
    return await r.json();
  }

  async function getRepo(token, owner, repo) {
    const r = await call(token, 'GET', '/repos/' + owner + '/' + repo);
    if (!r.ok) throw new Error('Repo not found (' + r.status + ').');
    return await r.json();
  }

  async function pushAll(settings, state, getBody, onLog) {
    return enqueue(async () => {
      const log = (m) => { try { onLog && onLog(m); } catch (_) {} };
      const { token, owner, repo, branch } = settings.github;
      if (!token || !owner || !repo) throw new Error('GitHub not configured.');
      const br = branch || 'main';

      let baseCommit = null, baseTree = null, parents = [];
      const refRes = await call(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${br}`);
      if (refRes.ok) {
        baseCommit = (await refRes.json()).object.sha;
        parents    = [baseCommit];
        baseTree   = (await (await call(token, 'GET', `/repos/${owner}/${repo}/git/commits/${baseCommit}`)).json()).tree.sha;
      }

      const treeEntries = [];
      for (const n of state.notes) {
        const body = await getBody(n.id);
        const payload = JSON.stringify({ meta: n, body: body || {} }, null, 2);
        const blob = await call(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, { content: u2b(payload), encoding: 'base64' });
        if (!blob.ok) { log('blob failed for ' + (n.title || n.id)); continue; }
        const colSlug = window.slugify((state.collections.find(c => c.id === n.col) || {}).name || 'uncategorised');
        const ext = n.type === 'scratchpad' ? '.json' : '.json';
        treeEntries.push({
          path: `notes/${colSlug}/${window.slugify(n.title || n.id)}-${n.id.slice(-6)}${ext}`,
          mode: '100644', type: 'blob', sha: (await blob.json()).sha,
        });
        log('staged ' + (n.title || n.id));
      }

      const safeSettings = Object.assign({}, state.settings, {
        github: Object.assign({}, state.settings.github, { token: undefined }),
      });
      const indexBlob = await call(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
        content: u2b(JSON.stringify({ collections: state.collections, settings: safeSettings }, null, 2)),
        encoding: 'base64',
      });
      if (indexBlob.ok) {
        treeEntries.push({ path: 'fofcorn-index.json', mode: '100644', type: 'blob', sha: (await indexBlob.json()).sha });
      }

      const tr = await call(token, 'POST', `/repos/${owner}/${repo}/git/trees`,
        baseTree ? { base_tree: baseTree, tree: treeEntries } : { tree: treeEntries });
      if (!tr.ok) throw new Error('Tree failed (' + tr.status + ').');

      const cm = await call(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
        message: 'fofcorn: sync ' + new Date().toISOString(),
        tree: (await tr.json()).sha,
        parents,
      });
      if (!cm.ok) throw new Error('Commit failed (' + cm.status + ').');
      const newSha = (await cm.json()).sha;

      const ref = refRes.ok
        ? await call(token, 'PATCH', `/repos/${owner}/${repo}/git/refs/heads/${br}`, { sha: newSha })
        : await call(token, 'POST',  `/repos/${owner}/${repo}/git/refs`, { ref: 'refs/heads/' + br, sha: newSha });
      if (!ref.ok) throw new Error('Ref update failed (' + ref.status + ').');

      log('pushed ' + treeEntries.length + ' files in one commit.');
      return { count: treeEntries.length, commit: newSha };
    });
  }

  async function pullAll(settings, onLog) {
    return enqueue(async () => {
      const log = (m) => { try { onLog && onLog(m); } catch (_) {} };
      const { token, owner, repo, branch } = settings.github;
      if (!token || !owner || !repo) throw new Error('GitHub not configured.');
      const br = branch || 'main';

      const refRes = await call(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${br}`);
      if (!refRes.ok) throw new Error('No branch yet — push first.');
      const commitSha = (await refRes.json()).object.sha;
      const commit    = await (await call(token, 'GET', `/repos/${owner}/${repo}/git/commits/${commitSha}`)).json();
      const treeRes   = await call(token, 'GET', `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
      if (!treeRes.ok) throw new Error('Tree fetch failed (' + treeRes.status + ').');
      const tree = (await treeRes.json()).tree || [];

      let collections = null;
      const notes = [], bodies = {};

      for (const e of tree) {
        if (e.type !== 'blob') continue;
        if (e.path === 'fofcorn-index.json') {
          const j = await (await call(token, 'GET', `/repos/${owner}/${repo}/git/blobs/${e.sha}`)).json();
          try {
            const obj = JSON.parse(b2u(j.content));
            if (obj.collections) collections = obj.collections;
          } catch (_) {}
          continue;
        }
        if (!e.path.startsWith('notes/') || !e.path.endsWith('.json')) continue;
        const j = await (await call(token, 'GET', `/repos/${owner}/${repo}/git/blobs/${e.sha}`)).json();
        try {
          const obj = JSON.parse(b2u(j.content));
          if (obj.meta && obj.meta.id) {
            notes.push(obj.meta);
            bodies[obj.meta.id] = obj.body || {};
            log('pulled ' + (obj.meta.title || obj.meta.id));
          }
        } catch (_) {}
      }

      return { collections, notes, bodies, commit: commitSha };
    });
  }

  async function pushOne(settings, note, collection, body, onLog) {
    return enqueue(async () => {
      const log = (m) => { try { onLog && onLog(m); } catch (_) {} };
      const { token, owner, repo, branch } = settings.github;
      if (!token || !owner || !repo) throw new Error('GitHub not configured.');
      const br = branch || 'main';

      let baseTree = null, parents = [];
      const refRes = await call(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${br}`);
      if (refRes.ok) {
        const baseCommit = (await refRes.json()).object.sha;
        parents  = [baseCommit];
        baseTree = (await (await call(token, 'GET', `/repos/${owner}/${repo}/git/commits/${baseCommit}`)).json()).tree.sha;
      }

      const payload = JSON.stringify({ meta: note, body: body || {} }, null, 2);
      const blob = await call(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, { content: u2b(payload), encoding: 'base64' });
      if (!blob.ok) throw new Error('Blob failed (' + blob.status + ').');
      const colSlug = window.slugify((collection || {}).name || 'uncategorised');
      const path = `notes/${colSlug}/${window.slugify(note.title || note.id)}-${note.id.slice(-6)}.json`;
      const treeEntries = [{ path, mode: '100644', type: 'blob', sha: (await blob.json()).sha }];

      const tr = await call(token, 'POST', `/repos/${owner}/${repo}/git/trees`,
        baseTree ? { base_tree: baseTree, tree: treeEntries } : { tree: treeEntries });
      if (!tr.ok) throw new Error('Tree failed (' + tr.status + ').');

      const cm = await call(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
        message: 'fofcorn: update ' + (note.title || note.id),
        tree: (await tr.json()).sha, parents,
      });
      if (!cm.ok) throw new Error('Commit failed (' + cm.status + ').');
      const newSha = (await cm.json()).sha;

      const ref = refRes.ok
        ? await call(token, 'PATCH', `/repos/${owner}/${repo}/git/refs/heads/${br}`, { sha: newSha })
        : await call(token, 'POST',  `/repos/${owner}/${repo}/git/refs`, { ref: 'refs/heads/' + br, sha: newSha });
      if (!ref.ok) throw new Error('Ref update failed (' + ref.status + ').');

      log('committed ' + path);
      return { path, commit: newSha };
    });
  }

  // Auto-Sync deletion handler (adds `sha: null` to tree)
  async function deleteOne(settings, note, collection, onLog) {
    return enqueue(async () => {
      const log = (m) => { try { onLog && onLog(m); } catch (_) {} };
      const { token, owner, repo, branch } = settings.github;
      if (!token || !owner || !repo) throw new Error('GitHub not configured.');
      const br = branch || 'main';

      let baseTree = null, parents = [];
      const refRes = await call(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${br}`);
      if (!refRes.ok) return; // If branch doesn't exist, there is nothing to delete
      
      const baseCommit = (await refRes.json()).object.sha;
      parents = [baseCommit];
      baseTree = (await (await call(token, 'GET', `/repos/${owner}/${repo}/git/commits/${baseCommit}`)).json()).tree.sha;

      const colSlug = window.slugify((collection || {}).name || 'uncategorised');
      const path = `notes/${colSlug}/${window.slugify(note.title || note.id)}-${note.id.slice(-6)}.json`;

      const treeEntries = [{ path, mode: '100644', type: 'blob', sha: null }];

      const tr = await call(token, 'POST', `/repos/${owner}/${repo}/git/trees`, { base_tree: baseTree, tree: treeEntries });
      if (!tr.ok) throw new Error('Tree failed (' + tr.status + ').');

      const cm = await call(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
        message: 'fofcorn: delete ' + (note.title || note.id),
        tree: (await tr.json()).sha, parents,
      });
      if (!cm.ok) throw new Error('Commit failed (' + cm.status + ').');
      
      const newSha = (await cm.json()).sha;
      const ref = await call(token, 'PATCH', `/repos/${owner}/${repo}/git/refs/heads/${br}`, { sha: newSha });
      if (!ref.ok) throw new Error('Ref update failed (' + ref.status + ').');

      log('deleted ' + path);
      return { path, commit: newSha };
    });
  }

  return { whoami, createRepo, getRepo, pushAll, pushOne, pullAll, deleteOne };
})();


/* ─────────────────────────────────────────────
   Excalidraw bridge
   ───────────────────────────────────────────── */
window.Excal = (function () {
  const EXCALI_VER = '0.18.1';
  let _modPromise = null;

  function loadExcalidraw() {
    if (_modPromise) return _modPromise;
    _modPromise = import('https://esm.sh/@excalidraw/excalidraw@' + EXCALI_VER + '?external=react,react-dom');
    return _modPromise;
  }

  async function mount(host, scene, onChange) {
    host.innerHTML = '<div class="excali-spin" style="display:flex;align-items:center;justify-content:center;height:100%;color:#807464;font-family:IBM Plex Mono;font-size:11px;letter-spacing:.18em;">loading excalidraw…</div>';
    let Ex;
    try { Ex = await loadExcalidraw(); }
    catch (e) {
      host.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#807464;font-family:IBM Plex Mono;font-size:11px;text-align:center;padding:24px;line-height:1.6;letter-spacing:.1em;">drawing engine could not load.<br>needs network access to esm.sh.</div>';
      throw e;
    }
    host.innerHTML = '';
    const apiRef = { current: null };
    const root = window.ReactDOM.createRoot(host);
    const el = window.React.createElement(Ex.Excalidraw, {
      initialData: {
        elements: (scene && scene.elements) || [],
        appState: Object.assign({ viewBackgroundColor: '#ffffff' }, (scene && scene.appState) || {}),
        files: (scene && scene.files) || undefined,
        scrollToContent: true,
      },
      excalidrawAPI: (api) => { apiRef.current = api; },
      onChange: (elements, appState) => {
        if (!onChange) return;
        const files = apiRef.current ? apiRef.current.getFiles() : undefined;
        onChange({
          elements,
          appState: { viewBackgroundColor: appState.viewBackgroundColor, gridModeEnabled: appState.gridModeEnabled },
          files,
        });
      },
    });
    root.render(el);
    return () => { try { root.unmount(); } catch (_) {} };
  }

  function openDialog(initialScene) {
    return new Promise(async (resolve, reject) => {
      const overlay = document.createElement('div');
      overlay.className = 'brod';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(21,17,13,.42);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:IBM Plex Sans,system-ui,sans-serif;';
      overlay.innerHTML = `
        <div style="background:#fbf5e6;border:1px solid #15110d;width:min(1080px,96vw);height:min(88vh,820px);box-shadow:8px 8px 0 rgba(21,17,13,.16);display:flex;flex-direction:column;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #15110d;">
            <span style="font-family:IBM Plex Sans;font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#b71f1f;">SKETCH · EXCALIDRAW</span>
            <div style="display:flex;gap:10px;">
              <button data-act="cancel" style="font-family:inherit;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:5px 12px;border:1px solid rgba(21,17,13,.18);background:transparent;cursor:pointer;color:#3a3026;">cancel</button>
              <button data-act="insert" style="font-family:inherit;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:5px 14px;border:1px solid #b71f1f;background:#b71f1f;color:#fff;cursor:pointer;">↑ insert</button>
            </div>
          </div>
          <div data-host style="flex:1;min-height:0;"></div>
        </div>`;
      document.body.appendChild(overlay);
      const host = overlay.querySelector('[data-host]');

      let unmount = null; let api = null; let Ex = null;
      try { Ex = await loadExcalidraw(); }
      catch (e) { host.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:IBM Plex Mono;font-size:11px;color:#807464;letter-spacing:.1em;">drawing engine could not load.</div>'; }

      if (Ex) {
        const root = window.ReactDOM.createRoot(host);
        const el = window.React.createElement(Ex.Excalidraw, {
          initialData: initialScene || { elements: [], appState: { viewBackgroundColor: '#ffffff' } },
          excalidrawAPI: (a) => { api = a; },
        });
        root.render(el);
        unmount = () => { try { root.unmount(); } catch (_) {} };
      }

      const close = () => { if (unmount) unmount(); document.body.removeChild(overlay); };
      overlay.querySelector('[data-act=cancel]').onclick = () => { close(); resolve(null); };
      overlay.querySelector('[data-act=insert]').onclick = async () => {
        if (!api || !Ex) { close(); resolve(null); return; }
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files    = api.getFiles();
        if (!elements.length) { close(); resolve(null); return; }
        try {
          const blob = await Ex.exportToBlob({
            elements,
            appState: Object.assign({}, appState, { exportBackground: true, viewBackgroundColor: '#ffffff' }),
            files, mimeType: 'image/png', exportPadding: 16,
          });
          const png = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
          const scene = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files };
          close();
          resolve({ png, scene });
        } catch (e) {
          close(); reject(e);
        }
      };
      overlay.addEventListener('click', e => { if (e.target === overlay) { close(); resolve(null); } });
    });
  }

  return { mount, openDialog };
})();


/* EditorTopbarWithDelete */
window.EditorTopbarWithDelete = function EditorTopbarWithDelete(props) {
  const { confirmingDelete, onAskDelete, onConfirmDelete, onCancelDelete, tools } = props;
  const extra = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {tools}
      {confirmingDelete ? (
        <>
          <span className="brod-mono" style={{ fontSize: 10.5, color: 'var(--red)', letterSpacing: '.08em' }}>really delete?</span>
          <button className="chip" style={{ padding: '2px 8px', fontSize: 10, borderColor: 'var(--red)', color: 'var(--red)' }} onClick={onConfirmDelete}>yes, delete</button>
          <button className="chip ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={onCancelDelete}>cancel</button>
        </>
      ) : (
        <button className="chip ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={onAskDelete} title="Delete this note">✕ delete</button>
      )}
    </span>
  );
  return window.React.createElement(window.EditorTopbar, Object.assign({}, props, { extra }));
};

/* ─────────────────────────────────────────────
   Twitter oEmbed Node & React Component
   ───────────────────────────────────────────── */
window.TwitterCardComponent = function TwitterCardComponent({ url }) {
  const R = window.React;
  const [html, setHtml] = R.useState(null);
  const [loading, setLoading] = R.useState(true);
  const [error, setError] = R.useState(false);

  R.useEffect(() => {
    let mounted = true;
    if (!url) {
      if (mounted) { setError(true); setLoading(false); }
      return;
    }
    const fetchEmbed = async () => {
      try {
        const oembedUrl = 'https://publish.twitter.com/oembed?url=' + encodeURIComponent(url) + '&omit_script=1&dnt=true';
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(oembedUrl);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('Failed to fetch oembed');
        const data = await res.json();
        if (mounted) {
          setHtml(data.html);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    fetchEmbed();
    return () => { mounted = false; };
  }, [url]);

  R.useEffect(() => {
    if (html) {
      if (!window.twttr) {
        const s = document.createElement('script');
        s.src = 'https://platform.twitter.com/widgets.js';
        s.async = true;
        document.head.appendChild(s);
      } else if (window.twttr.widgets) {
        window.twttr.widgets.load();
      }
    }
  }, [html]);

  if (loading) {
    return R.createElement('div', {
      style: { padding: '24px', margin: '14px 0', border: '1px solid var(--line)', background: 'var(--paper2)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--ink3)', textAlign: 'center', letterSpacing: '.06em' }
    }, 'Fetching X/Twitter card…');
  }

  // Fallback for broken/invalid URLs so it doesn't leave an empty gray box
  if (error || !url) {
    return R.createElement('div', {
      style: { margin: '14px 0', padding: '14px 18px', border: '1px solid var(--line)', background: 'var(--paper2)', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }
    }, 
      R.createElement('span', { style: { color: 'var(--red)', fontWeight: 600 } }, '✕'),
      R.createElement('a', { href: url || '#', target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 2 } }, url || 'Invalid Twitter Link')
    );
  }

  return R.createElement('div', {
    style: { display: 'flex', justifyContent: 'center', margin: '14px 0' },
    dangerouslySetInnerHTML: { __html: html }
  });
};

function getTwitterCardExt() {
  if (window.TwitterCardExt) return window.TwitterCardExt;
  
  window.TwitterCardExt = window.tiptap.Image.extend({
    name: 'twitterCard',
    inline: false,
    group: 'block',
    atom: true,         // Tells Tiptap this is a single solid block, preventing cursor traps!
    draggable: true,
    
    addAttributes() {
      return { 
        url: { default: null } 
      };
    },
    
    parseHTML() { 
      return [{ 
        tag: 'div[data-twitter-card]',
        getAttrs: dom => ({ url: dom.getAttribute('data-url') }) 
      }]; 
    },
    
    renderHTML({ HTMLAttributes }) { 
      return ['div', { 'data-twitter-card': '', 'data-url': HTMLAttributes.url }]; 
    },
    
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement('div');
        dom.contentEditable = 'false';
        dom.style.userSelect = 'none';
        
        const root = window.ReactDOM.createRoot(dom);
        root.render(window.React.createElement(window.TwitterCardComponent, { url: node.attrs.url }));
        
        return {
          dom,
          destroy: () => setTimeout(() => root.unmount(), 0),
          ignoreMutation: () => true,
          stopEvent: () => true, // Prevents Tiptap from swallowing clicks inside the Twitter iframe
        };
      };
    }
  });
  return window.TwitterCardExt;
}


/* ─────────────────────────────────────────────
   Tiptap glue
   ───────────────────────────────────────────── */
window.useFofcornEditor = function useFofcornEditor(opts) {
  const R = window.React;
  const tt = window.tiptap;
  const { useEditor, StarterKit, Underline, Link, Image, Highlight, TaskList, TaskItem, Placeholder, CharacterCount } = tt;

  const onChangeRef = R.useRef(opts.onChange);
  const onUpdateRef = R.useRef(opts.onUpdate);
  onChangeRef.current = opts.onChange;
  onUpdateRef.current = opts.onUpdate;

  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    Image.configure({ inline: false }),
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: opts.placeholder || '' }),
    getTwitterCardExt(),
  ];
  if (opts.maxChars) extensions.push(CharacterCount.configure({ limit: opts.maxChars }));

  return useEditor({
    extensions,
    content: opts.content || '',
    onUpdate: ({ editor }) => {
      if (onChangeRef.current) onChangeRef.current(editor.getHTML());
      if (onUpdateRef.current) onUpdateRef.current(editor);
    },
    editorProps: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        const twRegex = /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/\d+(?:\?.*)?$/i;
        if (text && twRegex.test(text.trim())) {
          const url = text.trim();
          const { schema, tr } = view.state;
          if (schema.nodes.twitterCard) {
            const node = schema.nodes.twitterCard.create({ url });
            let newTr = tr.replaceSelectionWith(node);
            
            // Automatically add an empty paragraph if pasted at the very end 
            if (newTr.selection.to === newTr.doc.content.size) {
              const p = schema.nodes.paragraph.create();
              newTr = newTr.insert(newTr.selection.to, p);
            }
            
            view.dispatch(newTr);
            return true;
          }
        }
        return false;
      }
    }
  });
};

window.RichBody = function RichBody({ editor, content, maxHeight, onOverflow, autoFocusAtEnd, maxChars, showCount }) {
  const R = window.React;
  const tt = window.tiptap;
  const wrapRef = R.useRef(null);
  const overflowFiringRef = R.useRef(false);

  R.useEffect(() => {
    if (!editor) return;
    if (content == null) return;
    const cur = editor.getHTML();
    const isEmpty = (h) => !h || h === '<p></p>';
    if (cur === content || (isEmpty(cur) && isEmpty(content))) return;
    editor.commands.setContent(content, false);
    if (autoFocusAtEnd) setTimeout(() => { try { editor.commands.focus('end'); } catch (_) {} }, 0);
  }, [editor, content]);

  R.useEffect(() => {
    if (!editor || !autoFocusAtEnd) return;
    const t = setTimeout(() => { try { editor.commands.focus('end'); } catch (_) {} }, 30);
    return () => clearTimeout(t);
  }, [editor]);

  const checkRef = R.useRef(null);
  R.useEffect(() => {
    if (!editor || !onOverflow) { checkRef.current = null; return; }
    const check = () => {
      if (overflowFiringRef.current) return;
      if (!wrapRef.current || editor.isDestroyed) return;
      const dom = editor.view.dom;
      const limit = wrapRef.current.clientHeight - 4;
      if (limit <= 0) return;
      if (dom.scrollHeight <= limit) return;
      const { state } = editor;
      if (state.doc.childCount < 2) return;
      const lastNode = state.doc.lastChild;
      const lastStart = state.doc.content.size - lastNode.nodeSize;
      const ser = tt.DOMSerializer.fromSchema(state.schema);
      const movedDiv = document.createElement('div');
      movedDiv.appendChild(ser.serializeFragment(state.doc.slice(lastStart, state.doc.content.size).content));
      const remainDiv = document.createElement('div');
      remainDiv.appendChild(ser.serializeFragment(state.doc.slice(0, lastStart).content));
      overflowFiringRef.current = true;
      try { onOverflow(movedDiv.innerHTML, remainDiv.innerHTML); } catch (_) {}
      setTimeout(() => { overflowFiringRef.current = false; }, 120);
    };
    checkRef.current = check;
    const handler = () => requestAnimationFrame(check);
    editor.on('update', handler);
    const t = setTimeout(() => requestAnimationFrame(check), 80);
    return () => { editor.off('update', handler); clearTimeout(t); checkRef.current = null; };
  }, [editor, onOverflow]);

  R.useEffect(() => {
    if (!checkRef.current) return;
    const t = setTimeout(() => { if (checkRef.current) requestAnimationFrame(checkRef.current); }, 80);
    return () => clearTimeout(t);
  }, [content]);

  if (!editor) {
    return R.createElement('div', { style: { padding: 6, color: 'var(--ink3)', fontFamily: 'IBM Plex Mono', fontSize: 10.5 } }, 'loading editor…');
  }

  const usedChars = editor.storage.characterCount ? editor.storage.characterCount.characters() : 0;
  const wrapStyle = onOverflow
    ? { flex: 1, minHeight: 0, overflow: 'hidden' }
    : (maxHeight ? { height: maxHeight + 'px', overflow: 'hidden' } : null);

  return R.createElement(R.Fragment, null,
    R.createElement('div', {
      ref: wrapRef,
      style: wrapStyle,
    }, R.createElement(tt.EditorContent, { editor })),
    (maxChars && showCount !== false) ? R.createElement('div', {
      className: 'brod-mono',
      style: { fontSize: 10, color: usedChars >= maxChars ? 'var(--red)' : 'var(--ink3)', letterSpacing: '.08em', textAlign: 'right', marginTop: 4 },
    }, usedChars + ' / ' + maxChars) : null,
  );
};


window.RichEditor = function RichEditor(props) {
  const editor = window.useFofcornEditor({
    content: props.content,
    onChange: props.onChange,
    placeholder: props.placeholder,
    maxChars: props.maxChars,
  });
  return window.React.createElement(window.RichBody, {
    editor,
    content: props.content,
    maxHeight: props.maxHeight,
    onOverflow: props.onOverflow,
    autoFocusAtEnd: props.autoFocusAtEnd,
    maxChars: props.maxChars,
  });
};


window.HighlightSwatch = function HighlightSwatch({ editor }) {
  const R = window.React;
  const [open, setOpen] = R.useState(false);
  const wrapRef = R.useRef(null);

  R.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const COLORS = [
    { name: 'yellow', c: '#ffe08a' },
    { name: 'pink',   c: '#ffb3c1' },
    { name: 'blue',   c: '#a9d6ff' },
    { name: 'green',  c: '#b8e6b8' },
  ];
  const active = editor.isActive('highlight');

  return R.createElement('div', { ref: wrapRef, style: { position: 'relative', display: 'flex' } },
    R.createElement('button', {
      className: 'ts-tile' + (active ? ' active' : ''),
      title: 'Highlight',
      onMouseDown: e => e.preventDefault(),
      onClick: e => { e.preventDefault(); setOpen(o => !o); },
    },
      R.createElement('span', { className: 'g', style: { background: '#ffe08a', borderRadius: '1px', padding: '0 3px', color: '#15110d' } }, 'H'),
      R.createElement('span', { className: 'l' }, 'mark'),
    ),
    open && R.createElement('div', {
      onMouseDown: e => e.preventDefault(),
      style: {
        position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 1,
        background: 'var(--paper3)', border: '1px solid var(--ink)',
        boxShadow: '4px 4px 0 rgba(21,17,13,.16)', padding: 6, display: 'flex', gap: 5,
      },
    },
      COLORS.map(sw => R.createElement('button', {
        key: sw.name, title: sw.name,
        onClick: e => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: sw.c }).run(); setOpen(false); },
        style: { width: 20, height: 20, border: '1px solid var(--ink)', background: sw.c, cursor: 'pointer', padding: 0 },
      })),
      R.createElement('button', {
        title: 'remove highlight',
        onClick: e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setOpen(false); },
        style: { width: 20, height: 20, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--ink3)', fontSize: 13, lineHeight: 1 },
      }, '\u00d7'),
    ),
  );
};


window.RichToolbar = function RichToolbar({ editor, compact, onSketch }) {
  if (!editor) return null;
  const R = window.React;
  const [, force] = R.useState(0);

  R.useEffect(() => {
    if (!editor) return;
    const tick = () => force(x => x + 1);
    editor.on('selectionUpdate', tick);
    editor.on('transaction', tick);
    return () => { editor.off('selectionUpdate', tick); editor.off('transaction', tick); };
  }, [editor]);

  const fileInputRef = R.useRef(null);

  const onLink = async () => {
    const sel = editor.state.selection;
    const hasSel = !sel.empty;
    const selText = hasSel ? editor.state.doc.textBetween(sel.from, sel.to, ' ') : '';
    const existing = editor.getAttributes('link').href || '';
    const result = await window.openLinkDialog({ hasSelection: hasSel, defaultText: selText, defaultUrl: existing });
    if (!result) return;
    if (hasSel) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: result.url }).run();
    } else {
      const label = (result.text && result.text.trim()) ? result.text.trim() : result.url;
      const safeUrl = result.url.replace(/"/g, '&quot;');
      const safeLabel = label.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
      editor.chain().focus().insertContent('<a href="' + safeUrl + '">' + safeLabel + '</a>').run();
    }
  };
  const onImage = () => fileInputRef.current && fileInputRef.current.click();
  const onImageChosen = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const url = await window.downscaleImage(f);
    editor.chain().focus().setImage({ src: url }).run();
  };

  const MONO = "'IBM Plex Mono', monospace";
  const SANS = "'IBM Plex Sans', sans-serif";

  const Tile = ({ on, title, minWidth, gClass, gStyle, glyph, label, onClick }) =>
    R.createElement('button', {
      className: 'ts-tile' + (on ? ' active' : ''),
      title,
      style: minWidth ? { minWidth } : null,
      onMouseDown: e => e.preventDefault(),
      onClick: e => { e.preventDefault(); if (onClick) onClick(); },
    },
      R.createElement('span', { className: 'g' + (gClass ? ' ' + gClass : ''), style: gStyle || null }, glyph),
      label ? R.createElement('span', { className: 'l' }, label) : null,
    );

  const Group = (key, tiles) => R.createElement('div', { key, className: 'ts-group' }, tiles.filter(Boolean));

  const groups = [];

  if (!compact) {
    groups.push(Group('hsb', [
      R.createElement(Tile, { key: 'hed', on: editor.isActive('heading', { level: 1 }), title: 'Headline', glyph: 'HED', label: 'title', onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() }),
      R.createElement(Tile, { key: 'sub', on: editor.isActive('heading', { level: 2 }), title: 'Deck',     glyph: 'SUB', label: 'deck',  onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() }),
      R.createElement(Tile, { key: 'h3',  on: editor.isActive('heading', { level: 3 }), title: 'Section heading', glyph: 'H3', label: 'head', onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() }),
      R.createElement(Tile, { key: 'bod', on: editor.isActive('paragraph'),             title: 'Body',     glyph: 'BOD', label: 'body',  onClick: () => editor.chain().focus().setParagraph().run() }),
    ]));
  }

  groups.push(Group('fmt', [
    R.createElement(Tile, { key: 'b', on: editor.isActive('bold'),      minWidth: 38, gStyle: { fontWeight: 900 },                title: 'Bold',          glyph: 'B', onClick: () => editor.chain().focus().toggleBold().run() }),
    R.createElement(Tile, { key: 'i', on: editor.isActive('italic'),    minWidth: 38, gClass: 'it',                              title: 'Italic',        glyph: 'I', onClick: () => editor.chain().focus().toggleItalic().run() }),
    R.createElement(Tile, { key: 'u', on: editor.isActive('underline'), minWidth: 38, gClass: 'un',                              title: 'Underline',     glyph: 'U', onClick: () => editor.chain().focus().toggleUnderline().run() }),
    !compact && R.createElement(Tile, { key: 's', on: editor.isActive('strike'), minWidth: 38, gStyle: { textDecoration: 'line-through' }, title: 'Strikethrough', glyph: 'S', onClick: () => editor.chain().focus().toggleStrike().run() }),
  ]));

  groups.push(Group('blk', [
    R.createElement(Tile, { key: 'ul', on: editor.isActive('bulletList'),  title: 'Bullet list',   glyph: '\u2022', label: 'list',  onClick: () => editor.chain().focus().toggleBulletList().run() }),
    !compact && R.createElement(Tile, { key: 'ol', on: editor.isActive('orderedList'), gStyle: { fontFamily: MONO }, title: 'Numbered list', glyph: '1.', label: 'num', onClick: () => editor.chain().focus().toggleOrderedList().run() }),
    R.createElement(Tile, { key: 'tl', on: editor.isActive('taskList'),    title: 'To-do',         glyph: '\u2610', label: 'todo',  onClick: () => editor.chain().focus().toggleTaskList().run() }),
    R.createElement(Tile, { key: 'q',  on: editor.isActive('blockquote'),  title: 'Quote',         glyph: '\u201c', label: 'quote', onClick: () => editor.chain().focus().toggleBlockquote().run() }),
    !compact && R.createElement(Tile, { key: 'ic', on: editor.isActive('code'),      gStyle: { fontFamily: MONO, fontSize: 13 }, title: 'Inline code', glyph: '</>', label: 'code',  onClick: () => editor.chain().focus().toggleCode().run() }),
    !compact && R.createElement(Tile, { key: 'cb', on: editor.isActive('codeBlock'), gStyle: { fontFamily: MONO, fontSize: 13 }, title: 'Code block',  glyph: '{\u2009}', label: 'block', onClick: () => editor.chain().focus().toggleCodeBlock().run() }),
    !compact && R.createElement(Tile, { key: 'hr', title: 'Divider', glyph: '\u2014', label: 'rule', onClick: () => editor.chain().focus().setHorizontalRule().run() }),
    !compact && R.createElement(window.HighlightSwatch, { key: 'hl', editor }),
  ]));

  groups.push(Group('ins', [
    R.createElement(Tile, { key: 'im', gStyle: { fontFamily: SANS }, title: 'Image', glyph: '\u25a3', label: 'image', onClick: onImage }),
    onSketch ? R.createElement(Tile, { key: 'sk', title: 'Sketch', glyph: '\u270e', label: 'sketch', onClick: onSketch }) : null,
    R.createElement(Tile, { key: 'a', on: editor.isActive('link'), gStyle: { fontFamily: SANS }, title: 'URL', glyph: '\u21cc', label: 'url', onClick: onLink }),
  ]));

  return R.createElement('div', {
    style: { display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--ink)', background: 'var(--paper2)' },
  },
    groups,
    R.createElement('span', { style: { flex: 1, borderLeft: '1px solid var(--line)' } }),
    R.createElement('input', { ref: fileInputRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onImageChosen }),
  );
};


/* ─────────────────────────────────────────────
   Small imperative dialogs — link, confirm.
   ───────────────────────────────────────────── */
(function () {
  const PAPER3 = '#fbf5e6', INK = '#15110d', INK2 = '#3a3026', INK3 = '#807464',
        LINE  = 'rgba(21,17,13,.18)', RED = '#b71f1f', PAPER2 = '#f7efde';

  function mkOverlay() {
    const ov = document.createElement('div');
    ov.className = 'brod';
    ov.style.cssText =
      'position:fixed;inset:0;background:rgba(21,17,13,.42);z-index:1000;' +
      'display:flex;align-items:center;justify-content:center;padding:24px;' +
      "font-family:'IBM Plex Sans',system-ui,sans-serif;";
    return ov;
  }
  function mkBox(width) {
    const b = document.createElement('div');
    b.style.cssText =
      'background:' + PAPER3 + ';border:1px solid ' + INK + ';width:min(' + width + 'px,96vw);' +
      'box-shadow:8px 8px 0 rgba(21,17,13,.16);padding:20px 22px 18px;box-sizing:border-box;';
    return b;
  }
  const KICKER =
    "font-family:'IBM Plex Sans';font-size:10.5px;font-weight:600;letter-spacing:.22em;" +
    'text-transform:uppercase;color:' + RED + ';';
  const INPUT =
    'width:100%;padding:9px 11px;border:1px solid ' + INK + ';background:' + PAPER3 + ';' +
    "font-family:'IBM Plex Mono';font-size:13px;outline:none;color:" + INK + ';' +
    'box-sizing:border-box;margin-top:4px;';
  const BTN_RED =
    'border:1px solid ' + RED + ';background:' + RED + ';color:#fff;' +
    "font-family:'IBM Plex Sans';font-size:10.5px;font-weight:600;letter-spacing:.16em;" +
    'text-transform:uppercase;padding:9px 18px;cursor:pointer;';
  const BTN_INK =
    'border:1px solid ' + INK + ';background:' + INK + ';color:' + PAPER3 + ';' +
    "font-family:'IBM Plex Sans';font-size:10.5px;font-weight:600;letter-spacing:.16em;" +
    'text-transform:uppercase;padding:9px 18px;cursor:pointer;';
  const BTN_GHOST =
    'border:1px solid ' + LINE + ';background:transparent;color:' + INK2 + ';' +
    "font-family:'IBM Plex Sans';font-size:10.5px;font-weight:600;letter-spacing:.16em;" +
    'text-transform:uppercase;padding:9px 18px;cursor:pointer;';

  window.openLinkDialog = function openLinkDialog(opts) {
    opts = opts || {};
    const hasSelection = !!opts.hasSelection;
    return new Promise((resolve) => {
      const ov  = mkOverlay();
      const box = mkBox(420);
      box.innerHTML =
        '<div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:8px">' +
          '<span style="' + KICKER + '">Insert link</span>' +
          '<button data-cx style="background:none;border:none;color:' + INK3 + ';font-size:18px;cursor:pointer;line-height:1">×</button>' +
        '</div>' +
        '<hr style="border:none;border-top:1px solid ' + RED + ';margin:0 0 12px">' +
        '<div style="font-family:\'Playfair Display\';font-size:21px;font-weight:800;font-style:italic;line-height:1.15;margin:0 0 6px">' +
          (hasSelection
            ? 'Wrap the selected text<br>in a link.'
            : 'Insert a link.') +
        '</div>' +
        '<div style="font-family:\'IBM Plex Serif\';font-size:12.5px;color:' + INK2 + ';margin-bottom:14px;line-height:1.5;font-style:italic">' +
          (hasSelection ? 'Paste the URL it should point to.'
                        : 'A label is what the reader sees; the URL is where it points.') +
        '</div>' +
        '<label style="' + KICKER + ';display:block">URL</label>' +
        '<input data-url type="url" placeholder="https://…" style="' + INPUT + '">' +
        (hasSelection ? '' :
          '<label style="' + KICKER + ';display:block;margin-top:10px">Label</label>' +
          '<input data-text placeholder="visible text" style="' + INPUT + '">'
        ) +
        '<div style="display:flex;gap:10px;margin-top:16px;align-items:center">' +
          '<button data-ok style="' + BTN_RED + '">↑ insert</button>' +
          '<button data-cancel style="' + BTN_GHOST + '">cancel</button>' +
          '<span style="flex:1"></span>' +
          '<span style="font-family:\'IBM Plex Mono\';font-size:10px;color:' + INK3 + ';letter-spacing:.08em">enter to insert · esc to cancel</span>' +
        '</div>';
      ov.appendChild(box);
      document.body.appendChild(ov);

      const urlInput  = box.querySelector('[data-url]');
      const textInput = box.querySelector('[data-text]');
      if (urlInput && opts.defaultUrl) urlInput.value = opts.defaultUrl;
      if (textInput && opts.defaultText) textInput.value = opts.defaultText;
      setTimeout(() => urlInput && urlInput.focus(), 30);

      const close = (val) => { document.body.removeChild(ov); resolve(val); };
      const accept = () => {
        const url = urlInput ? urlInput.value.trim() : '';
        if (!url) { urlInput && urlInput.focus(); return; }
        const text = textInput ? textInput.value.trim() : '';
        close({ url, text });
      };

      box.querySelector('[data-ok]').onclick     = accept;
      box.querySelector('[data-cancel]').onclick = () => close(null);
      box.querySelector('[data-cx]').onclick     = () => close(null);
      ov.addEventListener('click', e => { if (e.target === ov) close(null); });
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); accept(); }
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
      });
    });
  };

  window.openConfirmDialog = function openConfirmDialog(opts) {
    opts = opts || {};
    const title   = opts.title   || 'Are you sure?';
    const message = opts.message || '';
    const okLabel = opts.ok      || 'Confirm';
    const cancelLabel = opts.cancel || 'Cancel';
    const danger  = !!opts.danger;
    return new Promise((resolve) => {
      const ov  = mkOverlay();
      const box = mkBox(400);
      const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
      box.innerHTML =
        '<div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:8px">' +
          '<span style="' + KICKER + '">Confirm</span>' +
          '<button data-cx style="background:none;border:none;color:' + INK3 + ';font-size:18px;cursor:pointer;line-height:1">×</button>' +
        '</div>' +
        '<hr style="border:none;border-top:1px solid ' + RED + ';margin:0 0 12px">' +
        '<div style="font-family:\'Playfair Display\';font-size:23px;font-weight:800;font-style:italic;line-height:1.15;margin:0 0 8px">' +
          esc(title) +
        '</div>' +
        (message
          ? '<div style="font-family:\'IBM Plex Serif\';font-size:13px;color:' + INK2 + ';margin-bottom:18px;line-height:1.55;font-style:italic">' +
              esc(message) +
            '</div>'
          : '<div style="margin-bottom:12px"></div>'
        ) +
        '<div style="display:flex;gap:10px;align-items:center">' +
          '<button data-ok style="' + (danger ? BTN_RED : BTN_INK) + '">' + esc(okLabel) + '</button>' +
          '<button data-cancel style="' + BTN_GHOST + '">' + esc(cancelLabel) + '</button>' +
          '<span style="flex:1"></span>' +
          '<span style="font-family:\'IBM Plex Mono\';font-size:10px;color:' + INK3 + ';letter-spacing:.08em">enter · esc</span>' +
        '</div>';
      ov.appendChild(box);
      document.body.appendChild(ov);

      const close = (v) => { document.body.removeChild(ov); resolve(v); };
      const okBtn = box.querySelector('[data-ok]');
      okBtn.onclick = () => close(true);
      box.querySelector('[data-cancel]').onclick = () => close(false);
      box.querySelector('[data-cx]').onclick     = () => close(false);
      ov.addEventListener('click', e => { if (e.target === ov) close(false); });
      setTimeout(() => okBtn.focus(), 30);
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); close(true); }
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
      });
    });
  };

  window.openNotePicker = function openNotePicker(notes, opts) {
    opts = opts || {};
    const exclude = new Set(opts.excludeIds || []);
    const list = (notes || []).filter(n => !exclude.has(n.id));
    return new Promise((resolve) => {
      const ov  = mkOverlay();
      const box = mkBox(460);
      box.innerHTML =
        '<div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:8px">' +
          '<span style="' + KICKER + '">Link a note</span>' +
          '<button data-cx style="background:none;border:none;color:' + INK3 + ';font-size:18px;cursor:pointer;line-height:1">×</button>' +
        '</div>' +
        '<hr style="border:none;border-top:1px solid ' + RED + ';margin:0 0 12px">' +
        '<div style="font-family:\'Playfair Display\';font-size:21px;font-weight:800;font-style:italic;line-height:1.15;margin:0 0 10px">' +
          'Cite another note.</div>' +
        '<input data-q placeholder="search notes\u2026" style="' + INPUT + '">' +
        '<div data-rows style="margin-top:10px;max-height:46vh;overflow:auto;border-top:1px solid ' + LINE + '"></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">' +
          '<button data-cancel style="' + BTN_GHOST + '">Cancel</button>' +
        '</div>';
      ov.appendChild(box);
      document.body.appendChild(ov);

      const rows = box.querySelector('[data-rows]');
      const q    = box.querySelector('[data-q]');
      const close = (v) => { document.body.removeChild(ov); resolve(v); };

      const render = (term) => {
        const t = (term || '').trim().toLowerCase();
        const matches = list.filter(n => !t || (n.title || '').toLowerCase().includes(t));
        rows.innerHTML = '';
        if (matches.length === 0) {
          const empty = document.createElement('div');
          empty.style.cssText = "font-family:'IBM Plex Serif',serif;font-style:italic;font-size:13px;color:" + INK3 + ';padding:12px 2px;';
          empty.textContent = list.length === 0 ? 'No other notes to link yet.' : 'No matches.';
          rows.appendChild(empty);
          return;
        }
        matches.forEach(n => {
          const row = document.createElement('button');
          row.style.cssText =
            'display:block;width:100%;text-align:left;background:transparent;border:none;' +
            'border-bottom:1px solid ' + LINE + ';padding:9px 4px;cursor:pointer;font-family:inherit;color:' + INK + ';';
          row.onmouseenter = () => { row.style.background = PAPER2; };
          row.onmouseleave = () => { row.style.background = 'transparent'; };
          row.innerHTML =
            '<div style="' + KICKER + 'color:' + INK3 + ';font-size:9px">' + (n.type || '').toUpperCase() + '</div>' +
            '<div style="font-family:\'IBM Plex Serif\',serif;font-size:14px;line-height:1.3;margin-top:1px">' +
              ((n.title || 'Untitled').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]))) + '</div>';
          row.onclick = () => close(n.id);
          rows.appendChild(row);
        });
      };
      render('');

      q.oninput = () => render(q.value);
      box.querySelector('[data-cancel]').onclick = () => close(null);
      box.querySelector('[data-cx]').onclick     = () => close(null);
      ov.addEventListener('click', e => { if (e.target === ov) close(null); });
      setTimeout(() => q.focus(), 30);
      box.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(null); } });
    });
  };
})();

window.downscaleImage = function downscaleImage(file, max, quality) {
  max = max || 1500; quality = quality == null ? 0.82 : quality;
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      const s = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * s); h = Math.round(h * s);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
    };
    img.onerror = rej;
    img.src = url;
  });
};
