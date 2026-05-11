import type { TemplateProps } from '@codevena/cvmake-schema';
import type { ReactElement } from 'react';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function BauhausTemplate({ data, locale, labels }: TemplateProps): ReactElement {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const p = data.personal;
  const c = p.contacts;

  return (
    <article className="bauhaus">
      <div className="bauhaus__circle" aria-hidden="true" />
      <div className="bauhaus__triangle" aria-hidden="true" />

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="bauhaus__head">
        <div className="bauhaus__head-text">
          <h1 className="bauhaus__name">
            {p.firstName} {p.lastName}
          </h1>
          {p.title && <div className="bauhaus__role">{p.title}</div>}

          <div className="bauhaus__contact">
            {c.location && <span className="bauhaus__contact-item">{c.location}</span>}
            {c.email && (
              <span className="bauhaus__contact-item">
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </span>
            )}
            {c.phone && <span className="bauhaus__contact-item">{c.phone}</span>}
            {c.website && (
              <span className="bauhaus__contact-item">
                <a href={c.website}>{c.website.replace(/^https?:\/\//, '')}</a>
              </span>
            )}
            {c.linkedin && (
              <span className="bauhaus__contact-item">
                <a href={`https://linkedin.com/in/${c.linkedin}`}>linkedin.com/in/{c.linkedin}</a>
              </span>
            )}
            {c.github && (
              <span className="bauhaus__contact-item">
                <a href={`https://github.com/${c.github}`}>github.com/{c.github}</a>
              </span>
            )}
          </div>
        </div>

        {p.photo ? (
          <img className="bauhaus__photo" src={p.photo} alt={`${p.firstName} ${p.lastName}`} />
        ) : (
          <div className="bauhaus__initials" aria-hidden="true">
            {initials(p.firstName, p.lastName)}
          </div>
        )}
      </header>

      {/* ── Sections (resolved order) ─────────────────────────────── */}
      {sections.map((section) => {
        if (section === 'summary' && data.summary) {
          return (
            <section className="bauhaus__section" key="summary">
              <h4>{labels.summary}</h4>
              <p className="bauhaus__summary">{data.summary}</p>
            </section>
          );
        }

        if (section === 'experience' && data.experience.length > 0) {
          return (
            <section className="bauhaus__section" key="experience">
              <h4>{labels.experience}</h4>
              {data.experience.map((e, i) => (
                <div className="bauhaus__item" key={`exp-${e.company}-${i}`}>
                  <div className="bauhaus__item-title">
                    {e.title} · {e.company}
                  </div>
                  <div className="bauhaus__item-meta">
                    {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                    {e.location ? ` · ${e.location}` : ''}
                  </div>
                  {e.bullets.length > 0 && (
                    <ul>
                      {e.bullets.map((b, j) => (
                        <li key={`${b.slice(0, 20)}-${j}`}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          );
        }

        if (section === 'education' && data.education.length > 0) {
          return (
            <section className="bauhaus__section" key="education">
              <h4>{labels.education}</h4>
              {data.education.map((e, i) => (
                <div className="bauhaus__item" key={`edu-${e.institution}-${i}`}>
                  <div className="bauhaus__item-title">
                    {e.degree} · {e.institution}
                  </div>
                  <div className="bauhaus__item-meta">
                    {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                  </div>
                  {e.bullets && e.bullets.length > 0 && (
                    <ul>
                      {e.bullets.map((b, j) => (
                        <li key={`${b.slice(0, 20)}-${j}`}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          );
        }

        if (section === 'skills' && data.skills) {
          const categorized = data.skills.categorized;
          const stack = data.skills.stack;
          const hasCategorized = categorized && Object.keys(categorized).length > 0;
          const hasStack = stack && stack.length > 0;
          if (!hasCategorized && !hasStack) return null;

          return (
            <section className="bauhaus__section" key="skills">
              <h4>{labels.skills}</h4>
              {hasCategorized && categorized ? (
                <div className="bauhaus__skills">
                  {Object.entries(categorized).map(([group, items]) => (
                    <div key={group}>
                      <b>{group}</b> — {items.join(', ')}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="bauhaus__skills-flat">{stack?.join(' · ')}</p>
              )}
            </section>
          );
        }

        if (section === 'languages' && data.languages && data.languages.length > 0) {
          return (
            <section className="bauhaus__section" key="languages">
              <h4>{labels.languages}</h4>
              <div className="bauhaus__languages">
                {data.languages.map((l, i) => (
                  <span key={l.name}>
                    {i > 0 ? ' · ' : ''}
                    {l.name} {l.label ?? l.level}
                  </span>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* ── Custom sections ──────────────────────────────────────── */}
      {data.customSections?.map((cs) => (
        <section className="bauhaus__section" key={cs.id}>
          <h4>{cs.title}</h4>
          {cs.items.map((it, i) => (
            <div className="bauhaus__item" key={`${it.title}-${i}`}>
              <div className="bauhaus__item-title">{it.title}</div>
              {(it.subtitle || it.date) && (
                <div className="bauhaus__item-meta">
                  {it.subtitle}
                  {it.subtitle && it.date ? ' · ' : ''}
                  {it.date}
                </div>
              )}
              {it.description && <p className="bauhaus__summary">{it.description}</p>}
              {it.bullets && it.bullets.length > 0 && (
                <ul>
                  {it.bullets.map((b, j) => (
                    <li key={`${b.slice(0, 20)}-${j}`}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
