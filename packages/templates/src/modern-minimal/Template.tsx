import type { ReactElement } from 'react';
import type { TemplateProps } from '@cvmake/schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function ModernMinimalTemplate({
  data,
  locale,
  labels,
}: TemplateProps): ReactElement {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const p = data.personal;
  const contacts = p.contacts;

  return (
    <article className="modern-minimal">
      <div className="modern-minimal__page">
        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="modern-minimal__header">
          <div className="modern-minimal__header-text">
            <h1 className="modern-minimal__name">
              {p.firstName} {p.lastName}
            </h1>
            {p.title && (
              <p className="modern-minimal__title">{p.title}</p>
            )}
            <div className="modern-minimal__contacts">
              {contacts.email && (
                <span className="modern-minimal__contact-item">
                  <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
                </span>
              )}
              {contacts.phone && (
                <span className="modern-minimal__contact-item">
                  {contacts.phone}
                </span>
              )}
              {contacts.location && (
                <span className="modern-minimal__contact-item">
                  {contacts.location}
                </span>
              )}
              {contacts.website && (
                <span className="modern-minimal__contact-item">
                  <a href={contacts.website}>{contacts.website.replace(/^https?:\/\//, '')}</a>
                </span>
              )}
              {contacts.github && (
                <span className="modern-minimal__contact-item">
                  <a href={`https://github.com/${contacts.github}`}>
                    github.com/{contacts.github}
                  </a>
                </span>
              )}
              {contacts.linkedin && (
                <span className="modern-minimal__contact-item">
                  <a href={`https://linkedin.com/in/${contacts.linkedin}`}>
                    linkedin.com/in/{contacts.linkedin}
                  </a>
                </span>
              )}
            </div>
          </div>

          {/* Photo or initials — small, top-right */}
          {p.photo ? (
            <img
              className="modern-minimal__photo"
              src={`/${p.photo}`}
              alt={`${p.firstName} ${p.lastName}`}
            />
          ) : (
            <div className="modern-minimal__initials" aria-hidden="true">
              {initials(p.firstName, p.lastName)}
            </div>
          )}
        </header>

        {/* ── Sections (in resolved order) ─────────────────────────── */}
        {sections.map((section) => {
          if (section === 'summary' && data.summary) {
            return (
              <section className="modern-minimal__section" key="summary">
                <h2 className="modern-minimal__section-heading">{labels.summary}</h2>
                <p className="modern-minimal__summary">{data.summary}</p>
              </section>
            );
          }

          if (section === 'experience' && data.experience.length > 0) {
            return (
              <section className="modern-minimal__section" key="experience">
                <h2 className="modern-minimal__section-heading">{labels.experience}</h2>
                {data.experience.map((e, i) => (
                  <div className="modern-minimal__entry" key={`exp-${e.company}-${i}`}>
                    <div className="modern-minimal__entry-head">
                      <div className="modern-minimal__entry-primary">
                        {e.title}
                        <span className="modern-minimal__entry-company"> · {e.company}</span>
                      </div>
                      <div className="modern-minimal__entry-date">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                      </div>
                    </div>
                    {e.location && (
                      <div className="modern-minimal__entry-location">{e.location}</div>
                    )}
                    {e.bullets.length > 0 && (
                      <ul className="modern-minimal__bullets">
                        {e.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
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
              <section className="modern-minimal__section" key="education">
                <h2 className="modern-minimal__section-heading">{labels.education}</h2>
                {data.education.map((e, i) => (
                  <div className="modern-minimal__entry" key={`edu-${e.institution}-${i}`}>
                    <div className="modern-minimal__entry-head">
                      <div className="modern-minimal__entry-primary">
                        {e.degree}
                        <span className="modern-minimal__entry-company"> · {e.institution}</span>
                      </div>
                      <div className="modern-minimal__entry-date">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                      </div>
                    </div>
                    {e.location && (
                      <div className="modern-minimal__entry-location">{e.location}</div>
                    )}
                    {e.bullets && e.bullets.length > 0 && (
                      <ul className="modern-minimal__bullets">
                        {e.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            );
          }

          if (section === 'skills' && data.skills) {
            const hasCategorized = data.skills.categorized && Object.keys(data.skills.categorized).length > 0;
            const hasStack = data.skills.stack && data.skills.stack.length > 0;
            if (!hasCategorized && !hasStack) return null;

            return (
              <section className="modern-minimal__section" key="skills">
                <h2 className="modern-minimal__section-heading">{labels.skills}</h2>
                {hasCategorized ? (
                  <div className="modern-minimal__skills-grid">
                    {Object.entries(data.skills.categorized!).map(([group, items]) => (
                      <div className="modern-minimal__skills-group" key={group}>
                        <span className="modern-minimal__skills-label">{group}</span>
                        <span className="modern-minimal__skills-items">{items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="modern-minimal__skills-flat">
                    {data.skills!.stack!.join(' · ')}
                  </p>
                )}
              </section>
            );
          }

          if (section === 'languages' && data.languages && data.languages.length > 0) {
            return (
              <section className="modern-minimal__section" key="languages">
                <h2 className="modern-minimal__section-heading">{labels.languages}</h2>
                <div className="modern-minimal__languages">
                  {data.languages.map((l) => (
                    <span className="modern-minimal__language-item" key={l.name}>
                      {l.name}
                      {(l.label ?? l.level) && (
                        <span className="modern-minimal__language-level">
                          {' '}— {l.label ?? l.level}
                        </span>
                      )}
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
          <section className="modern-minimal__section" key={cs.id}>
            <h2 className="modern-minimal__section-heading">{cs.title}</h2>
            {cs.items.map((it, i) => (
              <div className="modern-minimal__entry" key={i}>
                <div className="modern-minimal__entry-head">
                  <div className="modern-minimal__entry-primary">{it.title}</div>
                  {it.date && (
                    <div className="modern-minimal__entry-date">{it.date}</div>
                  )}
                </div>
                {it.subtitle && (
                  <div className="modern-minimal__entry-location">{it.subtitle}</div>
                )}
                {it.description && (
                  <p className="modern-minimal__summary" style={{ marginTop: '4pt' }}>
                    {it.description}
                  </p>
                )}
                {it.bullets && it.bullets.length > 0 && (
                  <ul className="modern-minimal__bullets">
                    {it.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
