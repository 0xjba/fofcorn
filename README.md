# fofcorn

A calm, paper-feeling notes app for your browser. Three kinds of notes, a proper rich-text editor, and your own GitHub repo as the storage — no accounts, no servers, no lock-in.

---

## What it is

fofcorn is a notes app you open in a browser (or install to your home screen as an app). It looks like a printed zine — warm paper tones, serif headlines, mono captions — and it keeps everything on your device. If you want a backup or to sync between machines, you connect your own GitHub repository and every note is saved there as a plain file you own.

---

## The three kinds of notes

**Stickies** — quick, square notes for a single thought. Each one has a title, a one-line summary, and a short body (up to 600 characters). When you open a sticky, the others float around it as little drag-around cards you can nudge into place.

**Notebooks** — longer, multi-page writing. Each page has a headline, a deck (subtitle), and a body. Pages turn like a real notebook with corner flips, and when a page fills up your writing automatically flows onto the next one.

**Scratchpads** — a freeform drawing and diagram canvas (powered by Excalidraw) for sketches, maps, and anything visual.

---

## Writing tools

A typesetter-style toolbar sits above every editor. Notebooks get the full set; stickies get a lean version.

- **Text styles** — bold, italic, underline, strikethrough
- **Structure** — headline, deck, section heading, and body
- **Lists** — bullets, numbered lists, and checkable to-do items
- **Blocks** — quotes, inline code, code blocks, and divider lines
- **Highlight** — mark text in yellow, pink, blue, or green
- **Links** — add a URL to selected text
- **Images** — drop in a picture (automatically resized to keep notes light)
- **Sketch** — open the drawing canvas right inside a note
- - **Tweets** — embedded tweet card automatically

---

## Staying organised

- **Collections** — group related notes together (like folders, but friendlier)
- **Search** — find any note fast from the sidebar
- **Pinning** — keep important notes at the top
- **Tags** — label notes and filter by them
- **Linked notes** — connect one note to another to cite or cross-reference it, from either stickies or notebooks
- **Activity & metadata** — see when a note was created, last edited, its word count, and more

---

## Your data, your repo

fofcorn treats **your GitHub repository as the database**. There's no fofcorn server holding your notes.

- **Local first** — everything saves to your device instantly as you type, even with no internet
- **Connect GitHub (optional)** — paste a personal access token, pick a repo and branch
- **Each note is a plain file** — committed as readable JSON you can open, back up, or move anywhere
- **Sync all** — push everything to your repo in one commit, from the sidebar
- **Sync this note** — commit just the note you're working on, from its side panel
- **Auto-sync** — pull your notes when you open the app, and push a few seconds after you make changes
- **Live status** — the sidebar always shows whether you're connected and which repo you're synced to

Because it's just files in a Git repo, your full history lives in GitHub and you can read or edit your notes with any tool you like.

---

## Built to be reliable

- **Instant local saves** — your writing is written to the browser's durable storage as you type
- **Survives a closed tab** — a snapshot is saved the moment you switch away or close the tab, so the last few keystrokes aren't lost
- **Retrying sync** — if a push to GitHub fails (flaky network, etc.), it keeps retrying instead of silently giving up

> Note: fofcorn is built for one person across their own devices. If you edit the *same* note on two devices while offline, the most recent push wins — there's no automatic merge of conflicting edits.

---

## Works like an app

- **Installable** — add it to your home screen or dock and it opens in its own window
- **Offline-ready** — it loads and works without a connection; sync catches up when you're back online

---

## Getting started

1. Open the app in your browser (it must be served over **http** or **https**, not opened as a local file).
2. Start writing — a new sticky, notebook, or scratchpad is one click away. Everything saves locally right away.
3. *(Optional)* Open **Settings** in the sidebar, paste a GitHub personal access token, choose a repo and branch, and hit **Verify**. From then on your notes back up to your repo.

That's it — write freely, and own everything you write.
