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

  // Above-the-fold rule of thumb for desktop 4-column grid: the first 4
  // cards render in the initial viewport. Eager-load them with fetchpriority
  // high; the rest get the default loading="lazy" + low priority.
  // Mobile (1 col) shows only the very first card above the fold, but
  // eager-loading the next few is still a perf win because they'll be
  // requested as soon as scrolling starts.
  const EAGER_COUNT = 4;
  const html = TEMPLATES.map((t, i) => {
    const eager = i < EAGER_COUNT;
    const loading = eager ? 'eager' : 'lazy';
    const fetchPriority = eager ? 'high' : 'auto';
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
              loading="${loading}"
              fetchpriority="${fetchPriority}"
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

document.addEventListener('DOMContentLoaded', () => {
  loadUmami();
  renderTemplateGrid();
  wireLightboxControls();
  wireCtaTracking();
});
