import type { TemplateProps } from '@codevena/cvmake-schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function CreativeAccentTemplate({ data, palette: _palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  // Skills + languages live in the sidebar (right column) so the cream
  // accent column always carries content and the main flow stays compact
  // enough to fit on two pages. Keep them out of the main flow.
  const mainSections = sections.filter((s) => s !== 'skills' && s !== 'languages');

  const hasSkills = !!(data.skills && (data.skills.categorized || data.skills.stack));
  const hasLanguages = !!(data.languages && data.languages.length > 0);

  return (
    <article className="creative-accent">
      <div className="creative-accent__page">
        {/* ── Left: main content column (60 %) ── */}
        <main className="creative-accent__main">
          {/* Name + title header */}
          <header className="creative-accent__header">
            <h1 className="creative-accent__name">
              {data.personal.firstName} {data.personal.lastName}
            </h1>
            {data.personal.title && (
              <p className="creative-accent__job-title">{data.personal.title}</p>
            )}
          </header>

          {/* Dynamic sections (skills + languages handled in sidebar) */}
          {mainSections.map((section) => {
            if (section === 'summary' && data.summary) {
              return (
                <section className="creative-accent__section" key="summary">
                  <h2 className="creative-accent__section-heading">{labels.summary}</h2>
                  <p className="creative-accent__summary-text">{data.summary}</p>
                </section>
              );
            }

            if (section === 'experience' && data.experience.length > 0) {
              return (
                <section className="creative-accent__section" key="experience">
                  <h2 className="creative-accent__section-heading">{labels.experience}</h2>
                  {data.experience.map((e, i) => (
                    <div className="creative-accent__entry" key={`${e.company}-${i}`}>
                      <div className="creative-accent__entry-head">
                        <div className="creative-accent__entry-title">
                          {e.title} · {e.company}
                        </div>
                        <div className="creative-accent__entry-date">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.location && (
                        <div className="creative-accent__entry-subtitle">{e.location}</div>
                      )}
                      {e.bullets.length > 0 && (
                        <ul className="creative-accent__bullets">
                          {e.bullets.map((b, j) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: bullet strings have no stable id; read-only YAML-backed array with fixed order
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {e.tags && e.tags.length > 0 && (
                        <div className="creative-accent__entry-tags">
                          {e.tags.map((tag) => (
                            <span className="creative-accent__pill" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              );
            }

            if (section === 'education' && data.education.length > 0) {
              return (
                <section className="creative-accent__section" key="education">
                  <h2 className="creative-accent__section-heading">{labels.education}</h2>
                  {data.education.map((e, i) => (
                    <div className="creative-accent__entry" key={`${e.institution}-${i}`}>
                      <div className="creative-accent__entry-head">
                        <div className="creative-accent__entry-title">
                          {e.degree} · {e.institution}
                        </div>
                        <div className="creative-accent__entry-date">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.location && (
                        <div className="creative-accent__entry-subtitle">{e.location}</div>
                      )}
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="creative-accent__bullets">
                          {e.bullets.map((b, j) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: bullet strings have no stable id; read-only YAML-backed array with fixed order
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              );
            }

            return null;
          })}

          {/* Custom sections */}
          {data.customSections?.map((cs) => (
            <section className="creative-accent__section" key={cs.id}>
              <h2 className="creative-accent__section-heading">{cs.title}</h2>
              {cs.items.map((it, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: custom section items have no stable id; read-only YAML-backed array with fixed order
                <div className="creative-accent__entry" key={i}>
                  <div className="creative-accent__entry-title">{it.title}</div>
                  {it.subtitle && (
                    <div className="creative-accent__entry-subtitle">{it.subtitle}</div>
                  )}
                  {it.description && <p>{it.description}</p>}
                  {it.bullets && it.bullets.length > 0 && (
                    <ul className="creative-accent__bullets">
                      {it.bullets.map((b, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: bullet strings have no stable id; read-only YAML-backed array with fixed order
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </main>

        {/* ── Right: accent sidebar column (40 %) ── */}
        <aside className="creative-accent__sidebar">
          {/* Photo or initials — full-bleed square, overlaps into main */}
          {data.personal.photo ? (
            <img
              className="creative-accent__photo"
              src={data.personal.photo}
              alt={`${data.personal.firstName} ${data.personal.lastName}`}
            />
          ) : (
            <div className="creative-accent__initials" aria-hidden>
              {initials(data.personal.firstName, data.personal.lastName)}
            </div>
          )}

          <div className="creative-accent__sidebar-content">
            {/* Contact details */}
            <section className="creative-accent__sidebar-section">
              <h2 className="creative-accent__sidebar-heading">{labels.personalData}</h2>
              <dl className="creative-accent__contacts">
                {data.personal.contacts.email && (
                  <>
                    <dt>{labels.email}</dt>
                    <dd>{data.personal.contacts.email}</dd>
                  </>
                )}
                {data.personal.contacts.phone && (
                  <>
                    <dt>{labels.phone}</dt>
                    <dd>{data.personal.contacts.phone}</dd>
                  </>
                )}
                {data.personal.contacts.location && (
                  <>
                    <dt>{labels.location}</dt>
                    <dd>{data.personal.contacts.location}</dd>
                  </>
                )}
                {data.personal.contacts.website && (
                  <>
                    <dt>{labels.website}</dt>
                    <dd>{data.personal.contacts.website}</dd>
                  </>
                )}
                {data.personal.contacts.github && (
                  <>
                    <dt>{labels.github}</dt>
                    <dd>github.com/{data.personal.contacts.github}</dd>
                  </>
                )}
                {data.personal.contacts.linkedin && (
                  <>
                    <dt>{labels.linkedin}</dt>
                    <dd>linkedin.com/in/{data.personal.contacts.linkedin}</dd>
                  </>
                )}
                {data.personal.birthDate && (
                  <>
                    <dt>{labels.birthDate}</dt>
                    <dd>{data.personal.birthDate}</dd>
                  </>
                )}
              </dl>
            </section>

            {/* Skills (in sidebar to balance the 60/40 layout) */}
            {hasSkills && (
              <section className="creative-accent__sidebar-section">
                <h2 className="creative-accent__sidebar-heading">{labels.skills}</h2>
                {data.skills?.categorized
                  ? Object.entries(data.skills.categorized).map(([group, items]) => (
                      <div className="creative-accent__tag-group" key={group}>
                        <div className="creative-accent__tag-group-name">{group}</div>
                        <div className="creative-accent__tags">
                          {items.map((item) => (
                            <span className="creative-accent__pill" key={item}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  : data.skills?.stack && (
                      <div className="creative-accent__tags">
                        {data.skills.stack.map((item) => (
                          <span className="creative-accent__pill" key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
              </section>
            )}

            {/* Languages */}
            {hasLanguages && (
              <section className="creative-accent__sidebar-section">
                <h2 className="creative-accent__sidebar-heading">{labels.languages}</h2>
                <div className="creative-accent__tags">
                  {/* biome-ignore lint/style/noNonNullAssertion: guarded by hasLanguages truthiness check (line 20) */}
                  {data.languages!.map((l) => (
                    <span className="creative-accent__pill" key={l.name}>
                      {l.name} — {l.label ?? l.level}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
