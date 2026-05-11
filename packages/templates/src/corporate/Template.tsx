import type { TemplateProps } from '@codevena/cvmake-schema';
import type { ReactElement } from 'react';
import { formatDateRange } from '../utils/dates.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function CorporateTemplate({ data, locale, labels }: TemplateProps): ReactElement {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const p = data.personal;
  const contacts = p.contacts;

  return (
    <article className="corporate">
      <div className="corporate__page">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="corporate__header">
          <div className="corporate__header-text">
            <h1 className="corporate__name">
              {p.firstName} {p.lastName}
            </h1>
            {p.title && <p className="corporate__title">{p.title}</p>}
            <div className="corporate__contacts">
              {contacts.email && <span className="corporate__contact-item">{contacts.email}</span>}
              {contacts.phone && <span className="corporate__contact-item">{contacts.phone}</span>}
              {contacts.location && (
                <span className="corporate__contact-item">{contacts.location}</span>
              )}
              {contacts.website && (
                <span className="corporate__contact-item">
                  {contacts.website.replace(/^https?:\/\//, '')}
                </span>
              )}
              {contacts.github && (
                <span className="corporate__contact-item">github.com/{contacts.github}</span>
              )}
              {contacts.linkedin && (
                <span className="corporate__contact-item">linkedin.com/in/{contacts.linkedin}</span>
              )}
            </div>
          </div>

          {/* Photo only — no initials circle per brief */}
          {p.photo && (
            <img className="corporate__photo" src={p.photo} alt={`${p.firstName} ${p.lastName}`} />
          )}
        </header>

        {/* ── Sections (in resolved order) ──────────────────────────── */}
        {sections.map((section) => {
          if (section === 'summary' && data.summary) {
            return (
              <section className="corporate__section" key="summary">
                <h2 className="corporate__section-heading">{labels.summary}</h2>
                <p className="corporate__summary">{data.summary}</p>
              </section>
            );
          }

          if (section === 'experience' && data.experience.length > 0) {
            return (
              <section className="corporate__section" key="experience">
                <h2 className="corporate__section-heading">{labels.experience}</h2>
                {data.experience.map((e, i) => (
                  <div className="corporate__row" key={`exp-${e.company}-${i}`}>
                    <div className="corporate__row-date">
                      {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                    </div>
                    <div className="corporate__row-body">
                      <div className="corporate__entry-primary">
                        {e.title} <span className="corporate__entry-company">· {e.company}</span>
                      </div>
                      {e.location && <div className="corporate__entry-location">{e.location}</div>}
                      {e.bullets.length > 0 && (
                        <ul className="corporate__bullets">
                          {e.bullets.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            );
          }

          if (section === 'education' && data.education.length > 0) {
            return (
              <section className="corporate__section" key="education">
                <h2 className="corporate__section-heading">{labels.education}</h2>
                {data.education.map((e, i) => (
                  <div className="corporate__row" key={`edu-${e.institution}-${i}`}>
                    <div className="corporate__row-date">
                      {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                    </div>
                    <div className="corporate__row-body">
                      <div className="corporate__entry-primary">
                        {e.degree}{' '}
                        <span className="corporate__entry-company">· {e.institution}</span>
                      </div>
                      {e.location && <div className="corporate__entry-location">{e.location}</div>}
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="corporate__bullets">
                          {e.bullets.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            );
          }

          if (section === 'skills' && data.skills) {
            const hasCategorized =
              data.skills.categorized && Object.keys(data.skills.categorized).length > 0;
            const hasStack = data.skills.stack && data.skills.stack.length > 0;
            if (!hasCategorized && !hasStack) return null;

            return (
              <section className="corporate__section" key="skills">
                <h2 className="corporate__section-heading">{labels.skills}</h2>
                {hasCategorized ? (
                  <div>
                    {Object.entries(data.skills.categorized!).map(([group, items]) => (
                      <div className="corporate__skills-group" key={group}>
                        <span className="corporate__skills-label">{group}: </span>
                        <span className="corporate__skills-items">{items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="corporate__skills-flat">{data.skills!.stack!.join(', ')}</p>
                )}
              </section>
            );
          }

          if (section === 'languages' && data.languages && data.languages.length > 0) {
            return (
              <section className="corporate__section" key="languages">
                <h2 className="corporate__section-heading">{labels.languages}</h2>
                <div className="corporate__languages">
                  {data.languages.map((l) => (
                    <span className="corporate__language-item" key={l.name}>
                      {l.name}
                      {(l.label ?? l.level) && (
                        <span className="corporate__language-level"> — {l.label ?? l.level}</span>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}

        {/* ── Custom sections ───────────────────────────────────────── */}
        {data.customSections?.map((cs) => (
          <section className="corporate__section" key={cs.id}>
            <h2 className="corporate__section-heading">{cs.title}</h2>
            {cs.items.map((it, i) => (
              <div className="corporate__row" key={i}>
                <div className="corporate__row-date">{it.date ?? ''}</div>
                <div className="corporate__row-body">
                  <div className="corporate__entry-primary">{it.title}</div>
                  {it.subtitle && <div className="corporate__entry-location">{it.subtitle}</div>}
                  {it.description && (
                    <p className="corporate__summary" style={{ marginTop: '3pt' }}>
                      {it.description}
                    </p>
                  )}
                  {it.bullets && it.bullets.length > 0 && (
                    <ul className="corporate__bullets">
                      {it.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
