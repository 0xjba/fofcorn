/* data.jsx — first-run seed: ONE rich demo of each note type, in ONE
   collection. The point is a showcase — every formatting capability of the
   editor is visible somewhere across these three notes.

   Once the user creates real notes, this seed is never used again. */

window.FOFCORN_DATA = (() => {

  /* A small abstract landscape, kept as an inline SVG data-URL so the demo
     is self-contained and offline-friendly. */
  const SCENE_SVG =
    "data:image/svg+xml," +
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 120'%3E" +
    "%3Crect width='320' height='120' fill='%23fbf2d8'/%3E" +
    "%3Cpath d='M0 75 Q80 55 160 70 T320 65 L320 120 L0 120Z' fill='%237aa977' opacity='.30'/%3E" +
    "%3Cpath d='M0 90 Q80 75 160 88 T320 85 L320 120 L0 120Z' fill='%234d6042' opacity='.45'/%3E" +
    "%3Cline x1='0' y1='100' x2='320' y2='100' stroke='%232e57b8' stroke-width='.6' opacity='.4'/%3E" +
    "%3Cline x1='0' y1='106' x2='320' y2='106' stroke='%232e57b8' stroke-width='.6' opacity='.4'/%3E" +
    "%3Cg transform='translate(200 56)' fill='%2315110d'%3E" +
      "%3Cpath d='M0 14 Q5 10 15 12 L20 6 L24 0 L26 3 L22 8 L18 14 L24 22 L4 22Z'/%3E" +
      "%3Cline x1='6' y1='22' x2='4' y2='40' stroke='%2315110d' stroke-width='1.4'/%3E" +
      "%3Cline x1='14' y1='22' x2='12' y2='40' stroke='%2315110d' stroke-width='1.4'/%3E" +
    "%3C/g%3E" +
    "%3Cpath d='M20 105 L18 90 M25 105 L23 88 M30 105 L29 92' stroke='%234d6042' stroke-width='1.4' fill='none'/%3E" +
    "%3Cpath d='M275 105 L273 95 M280 105 L278 88 M285 105 L283 90' stroke='%234d6042' stroke-width='1.4' fill='none'/%3E" +
    "%3C/svg%3E";

  /* ───── ONE collection ───── */
  const COLLECTIONS = [
    {
      id: 'favourite',
      roman: 'I',
      name: 'Favourite',
      color: '#4d6042',
      description: 'Your favourite Stickies, Notebooks & Scratchpads.',
    },
  ];

  /* ───── ONE rich sticky ─────
     Demonstrates: bold, italic, underline, highlight, bulleted list,
     to-do (mixed done/not), blockquote, inline link, inline image. */
  const STICKY_BODY = `
    <p>Came back with three. The two chanterelles obvious. The third — <strong>yellow gills, apricot in the nose</strong>, smaller cap than the others, set apart from them under a beech.</p>
    <p>Left on the porch table for <em>M.</em> on Sunday. <u>Note to ask</u> whether the apricot smell is reliable as an identifier or whether I am romanticising it.</p>
    <p>Highlights to come back to: <mark>apricot scent</mark>, yellow gills, beech-tree association.</p>
    <ul>
      <li>Chanterelle (confirmed)</li>
      <li>Chanterelle (confirmed)</li>
      <li>Unknown — for M. to look at.</li>
    </ul>
    <blockquote>"The third has the smell of an apricot — which means either it is a chanterelle, or it is romanticising itself for me."</blockquote>
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Leave on porch table.</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Confirm ID with M.</p></div></li>
    </ul>
    <p>Reference: <a href="https://www.mushroomexpert.com/cantharellus_cibarius.html" target="_blank" rel="noopener">chanterelle field-guide page</a>.</p>
  `;

  /* ───── ONE rich notebook with three pages ─────
     Demonstrates HED/SUB/stand-first/body, multi-page navigation, every
     paragraph variant the body editor supports (headers, code block, image,
     divider, link, list, etc.). */
  const NOTEBOOK_PAGES = [
    {
      id: 'cover',
      title: 'Cover',
      kicker: 'Favourite · started 11·iii·24',
      hed: 'Field notebook',
      sub: 'A working record of the wood behind the house.',
      standFirst: 'Begun the second spring after we moved out here. To be kept until the back of it.',
      body: `
        <p>This is the long-form half of the journal. Stickies are for quick observations — <em>a single sighting, a list, a thought caught in passing</em>. The notebook is for the recurring things, the questions that keep returning over weeks.</p>
        <p>Pages are not chronological. They are by subject. Loose dates sit at the top of each page, like the headline of a newspaper.</p>
        <hr/>
        <p>Try the page-turn at the bottom corners. The toolbar above the page covers everything in here — headings, italics, highlights, lists, to-dos, blockquotes, code, images, sketches, links. Tap a target pill (<strong>HED</strong>, <strong>SUB</strong>, <strong>BOD</strong>) to switch which element on the page the toolbar acts on.</p>
      `,
    },
    {
      id: 'heron',
      title: 'A heron, returned',
      kicker: 'Page II · 4·v·26 · 06:14',
      hed: 'A heron, returned —',
      sub: 'and the question of its limp.',
      standFirst: 'Standing in the shallows past the old culvert, motionless for eleven minutes — the same bird, the third Friday in succession.',
      body: `
        <p>I have, with some reluctance, started a list. <strong>Three sightings</strong>, three Fridays, three early mornings — the same heron, in the same shallows past the old culvert, with the same uncertain weight on the left leg. The leg is worse than April.</p>
        <p>It is the second of these things — <em>the limp</em> — that brings me back. A heron is a patient bird and a patient bird in pain is something <mark>you ought to look at carefully and not at length</mark>, and not return to without cause. Cause, in this case, is the matter of the 2024 logs.</p>
        <blockquote>"One does not write about a bird three weeks in succession without preparing to be wrong about the bird."</blockquote>
        <h3>The view, at six</h3>
        <p><img src="${SCENE_SVG}" alt="Reeds, the bend in the river, and a heron at the far edge — line illustration" style="max-width:100%; border-radius:4px"/></p>
        <p>The shallows past the old culvert. The heron stands where the bank undercuts. The reeds are taller than April.</p>
        <h3>What I checked against the logs</h3>
        <p>Same field-mark on the right shoulder. Same approach line from the south reeds. Compare with the November 2024 entry: <code>logs/2024-11-08.md</code>.</p>
        <ul>
          <li>11 minutes motionless on 4 May.</li>
          <li>8 minutes on 26 April.</li>
          <li>14 minutes on 18 April — the first sighting.</li>
        </ul>
        <p>Reference for the limp diagnosis: <a href="https://www.rspb.org.uk/birds-and-wildlife/grey-heron" target="_blank" rel="noopener">RSPB grey heron notes</a>.</p>
      `,
    },
    {
      id: 'returns',
      title: 'To return to',
      kicker: 'Page III · running list',
      hed: 'A list of returns.',
      sub: 'Things to come back to, in their own time.',
      standFirst: 'Open-ended. To be re-read on the first cold morning of October.',
      body: `
        <ul>
          <li>The heron — once more, in the autumn.</li>
          <li>The oak — photograph against the 2024 image, in October.</li>
          <li>The beavers — the new bend, after the first big rain.</li>
          <li>The unnamed mushroom — written confirmation from M.</li>
        </ul>
        <h3>And to plan</h3>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Visit the old culvert in October.</p></div></li>
          <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Photograph the oak from the same angle as the 2024 photograph.</p></div></li>
          <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Re-read this list on the first cold morning.</p></div></li>
        </ul>
      `,
    },
  ];

  /* ───── ONE scratchpad ─────
     Excalidraw starts empty so the engine's own toolbar is the first thing
     the user sees. The title and stand-first are filled in so the right
     panel shows real content. */
  const SCRATCHPAD_SCENE = { elements: [], appState: { viewBackgroundColor: '#ffffff' } };

  const NOTES = [
    {
      id: 'demo-sticky',
      col: 'favourite',
      type: 'sticky',
      title: 'Mushroom haul, saturday.',
      pinned: true,
      color: 'ochre',
      tags: ['mushroom', 'saturday', 'forest'],
      linked: ['demo-notebook'],
      standFirst: 'Two chanterelles. One unknown — left at the porch for M. on Sunday.',
      body: STICKY_BODY,
    },
    {
      id: 'demo-notebook',
      col: 'favourite',
      type: 'notebook',
      title: 'Field notebook',
      subtitle: 'A working record of the wood behind the house.',
      pinned: true,
      color: 'cream',
      tags: ['notebook', 'field', 'observations'],
      linked: ['demo-sticky', 'demo-scratchpad'],
      standFirst: 'Sightings, second-thoughts, and the recurring questions.',
      pages: NOTEBOOK_PAGES,
      openPage: 1,
    },
    {
      id: 'demo-scratchpad',
      col: 'favourite',
      type: 'scratchpad',
      title: 'Trail map — north loop',
      pinned: false,
      color: 'slate',
      tags: ['trail', 'map', 'sketch'],
      linked: ['demo-notebook'],
      standFirst: 'Rough sketch of the route past the old culvert and around the back of the pond.',
      scene: SCRATCHPAD_SCENE,
    },
  ];

  return { COLLECTIONS, NOTES };
})();
