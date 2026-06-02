// Template metadata — single source of truth for the showcase grid.
const TEMPLATES = [
  {
    id: 'classic-serif',
    name: 'Classic Serif',
    blurb: 'Traditional résumé, serif typography.',
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    blurb: 'Maximum whitespace, quiet hierarchy.',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    blurb: 'Restrained single-column for formal roles.',
  },
  {
    id: 'creative-accent',
    name: 'Creative Accent',
    blurb: 'Colored sidebar, modern sans-serif.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    blurb: 'Magazine-style with strong typography.',
  },
  {
    id: 'academic',
    name: 'Academic',
    blurb: 'Two-column publication layout.',
  },
  {
    id: 'tech-dev',
    name: 'Tech / Dev',
    blurb: 'Code-style accents for engineers.',
  },
  {
    id: 'monochrome-dark',
    name: 'Monochrome Dark',
    blurb: 'High-contrast dark theme.',
  },
  {
    id: 'swiss',
    name: 'Swiss / International',
    blurb: 'Strict grid, Helvetica, red accent. Pure information design.',
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    blurb: 'Geometric shapes, primary palette, Futura. Joyful structure.',
  },
  {
    id: 'noir',
    name: 'Noir',
    blurb: 'Cinematic high-contrast — black canvas, cream serif, gold accent.',
  },
  {
    id: 'magazine',
    name: 'Editorial Magazine',
    blurb: 'Luxe display serif, italic, generous whitespace. Vogue-feel.',
  },
];

function renderTemplateGrid() {
  const grid = document.getElementById('template-grid');
  if (!grid) return;

  // All template cards live in the #templates section which is ~2 viewports
  // below the fold (on both desktop and mobile — the hero + collage section
  // come first). Marking any of them `eager` / `fetchpriority="high"`
  // measurably HURT Lighthouse LCP (3.6 s → 5.3 s) because the browser
  // prioritised the off-screen card AVIFs over the font + CSS resources
  // that the actually-visible hero text was waiting on. Default
  // `loading="lazy"` is correct here; the new AVIF/WebP byte savings still
  // halve the eventual scroll-into-view load.
  const html = TEMPLATES.map((t) => {
    return `
      <button
        type="button"
        class="template-card group flex flex-col overflow-hidden rounded-xl border border-ink-line bg-ink text-left shadow-card transition hover:-translate-y-1 hover:border-sand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand"
        data-template="${t.id}"
        data-name="${t.name}"
        aria-label="Preview ${t.name}"
      >
        <div class="aspect-[1/1.414] overflow-hidden bg-ink-soft">
          <picture>
            <source srcset="screenshots/${t.id}.avif" type="image/avif" />
            <source srcset="screenshots/${t.id}.webp" type="image/webp" />
            <img
              src="screenshots/${t.id}.png"
              alt="${t.name} template preview"
              loading="lazy"
              decoding="async"
              width="1242"
              height="1754"
              class="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.02]"
            />
          </picture>
        </div>
        <div class="flex flex-1 flex-col gap-1 border-t border-ink-line bg-ink-soft/60 p-4">
          <span class="font-display text-base font-medium text-parchment">${t.name}</span>
          <span class="text-xs text-parchment/60">${t.blurb}</span>
        </div>
      </button>
    `;
  }).join('');

  grid.innerHTML = html;

  for (const card of grid.querySelectorAll('.template-card')) {
    card.addEventListener('click', () => {
      const id = card.dataset.template;
      const name = card.dataset.name;
      if (id && name) openLightbox(id, name);
    });
  }
}

function openLightbox(templateId, templateName) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  if (!lightbox || !img || !caption) return;

  // Prefer WebP for the lightbox — it's the single dynamically-swapped <img>
  // (not a <picture>) so we just pick one efficient format. WebP is in
  // Safari 14+, Firefox 65+, all Chromium for years; ~98% of real browsers.
  img.src = `screenshots/${templateId}.webp`;
  img.alt = `${templateName} template, full preview`;
  caption.textContent = `${templateName} · template id "${templateId}"`;
  lightbox.classList.remove('hidden');
  lightbox.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.classList.add('hidden');
  lightbox.classList.remove('flex');
  document.body.style.overflow = '';
}

function wireLightboxControls() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close');
  if (!lightbox || !closeBtn) return;

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
}

function loadUmami() {
  const cfg = window.CVMAKE_UMAMI;
  if (!cfg || !cfg.src || !cfg.websiteId || cfg.websiteId === 'WEBSITE_ID_PLACEHOLDER') return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = cfg.src;
  s.dataset.websiteId = cfg.websiteId;
  document.head.appendChild(s);
}

function track(event, props) {
  try {
    window.umami?.track(event, props);
  } catch {
    // never let analytics break user interaction
  }
}

function wireCtaTracking() {
  // Track every CTA click in nav / hero / footer with the visible button label
  // so the dashboard shows which copy converts (Open editor vs Browse templates
  // vs GitHub etc.). Generic enough that future CTAs auto-track without code
  // changes — just add `data-cta="<label>"` to the new element.
  for (const el of document.querySelectorAll('[data-cta]')) {
    el.addEventListener('click', () => {
      track('showcase.cta_click', { cta: el.dataset.cta });
    });
  }
}

function wireCopyButtons() {
  // Progressive-enhancement copy button on every <pre data-copy> block.
  // The button only appears on hover/focus-within of the wrapping `group`
  // ancestor; on touch it stays visible via the active style.
  for (const pre of document.querySelectorAll('pre[data-copy]')) {
    const wrapper = pre.parentElement;
    if (!wrapper) continue;
    if (!wrapper.classList.contains('relative')) wrapper.classList.add('relative');
    if (!wrapper.classList.contains('group')) wrapper.classList.add('group');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.textContent = 'Copy';
    btn.className =
      'absolute right-2 top-2 rounded-md bg-ink/80 px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-parchment/60 opacity-0 transition-opacity hover:bg-ink hover:text-parchment group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100';

    let restoreTimer = null;
    const restoreLabel = (label) => {
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('text-sand');
        restoreTimer = null;
      }, 1400);
      btn.textContent = label;
    };

    btn.addEventListener('click', async () => {
      // Prefer an explicit `data-copy-text` (a single runnable command) over the
      // rendered text — terminal blocks include a `$` prompt and fake output
      // that is not pasteable.
      const explicit = pre.getAttribute('data-copy-text');
      const text = (explicit ?? pre.textContent ?? '').trim();
      try {
        await navigator.clipboard.writeText(text);
        track('showcase.code_copy', { length: text.length });
        btn.classList.add('text-sand');
        restoreLabel('Copied');
      } catch {
        restoreLabel('Error');
      }
    });

    wrapper.appendChild(btn);
  }
}

function animateTerminal() {
  // Cycle the template name in the hero terminal preview to show off the
  // "switch by changing one line" claim. Static if the user prefers reduced
  // motion — respects the OS / browser accessibility setting via matchMedia.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.getElementById('terminal-template');
  if (!el) return;
  // Templates picked to give maximum visual variety in the rotation — same
  // selection as the hero collage so the brand story stays consistent.
  const names = ['classic-serif', 'swiss', 'bauhaus', 'noir', 'modern-minimal'];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % names.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = names[i];
      el.style.opacity = '1';
    }, 200);
  }, 2400);
}

document.addEventListener('DOMContentLoaded', () => {
  loadUmami();
  renderTemplateGrid();
  wireLightboxControls();
  wireCtaTracking();
  wireCopyButtons();
  animateTerminal();
});
