import type { TemplateProps } from '@cvmake/schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function TechDevTemplate({ data, palette: _palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const p = data.personal;
  const contacts = p.contacts;

  // Build terminal prompt: "> firstname@company:~$ whoami"
  const promptUser = p.firstName.toLowerCase();
  const promptHost = contacts.github ?? contacts.website?.replace(/^https?:\/\//, '').split('/')[0] ?? 'dev';
  const terminalPrompt = `> ${promptUser}@${promptHost}:~$ whoami`;

  return (
    <article className="tech-dev">
      <div className="tech-dev__page">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="tech-dev__sidebar">
          {/* Photo or initials */}
          {p.photo ? (
            <img
              className="tech-dev__photo"
              src={p.photo}
              alt={`${p.firstName} ${p.lastName}`}
            />
          ) : (
            <div className="tech-dev__initials" aria-hidden="true">
              {initials(p.firstName, p.lastName)}
            </div>
          )}

          {/* Contact section */}
          <section className="tech-dev__sidebar-section">
            <h2>// contact</h2>
            <ul className="tech-dev__contact-list">
              {contacts.email && (
                <li>
                  <span className="tech-dev__contact-key">email: </span>
                  <span className="tech-dev__contact-val">{contacts.email}</span>
                </li>
              )}
              {contacts.phone && (
                <li>
                  <span className="tech-dev__contact-key">phone: </span>
                  <span className="tech-dev__contact-val">{contacts.phone}</span>
                </li>
              )}
              {contacts.location && (
                <li>
                  <span className="tech-dev__contact-key">location: </span>
                  <span className="tech-dev__contact-val">{contacts.location}</span>
                </li>
              )}
              {contacts.website && (
                <li>
                  <span className="tech-dev__contact-key">web: </span>
                  <span className="tech-dev__contact-val">
                    {contacts.website.replace(/^https?:\/\//, '')}
                  </span>
                </li>
              )}
              {contacts.github && (
                <li>
                  <span className="tech-dev__contact-key">github: </span>
                  <span className="tech-dev__contact-val">{contacts.github}</span>
                </li>
              )}
              {contacts.linkedin && (
                <li>
                  <span className="tech-dev__contact-key">linkedin: </span>
                  <span className="tech-dev__contact-val">{contacts.linkedin}</span>
                </li>
              )}
            </ul>
          </section>

          {/* Skills section */}
          {data.skills && (data.skills.categorized ?? data.skills.stack) && (
            <section className="tech-dev__sidebar-section">
              <h2>// skills</h2>
              {data.skills.categorized
                ? Object.entries(data.skills.categorized).map(([group, items]) => (
                    <div className="tech-dev__skills-group" key={group}>
                      <span className="tech-dev__skills-group-name">{group}</span>
                      <span className="tech-dev__skills-array">
                        [{items.join(', ')}]
                      </span>
                    </div>
                  ))
                : data.skills.stack && (
                    <div className="tech-dev__skills-group">
                      <span className="tech-dev__skills-array">
                        [{data.skills.stack.join(', ')}]
                      </span>
                    </div>
                  )}
            </section>
          )}

          {/* Languages section */}
          {data.languages && data.languages.length > 0 && (
            <section className="tech-dev__sidebar-section">
              <h2>// languages</h2>
              <ul className="tech-dev__lang-list">
                {data.languages.map((l) => (
                  <li key={l.name}>
                    {l.name}
                    <span className="tech-dev__lang-sep">//</span>
                    <span className="tech-dev__lang-level">{l.label ?? l.level}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* ── Main column ─────────────────────────────────────── */}
        <main className="tech-dev__main">
          {/* Terminal prompt header */}
          <p className="tech-dev__terminal-prompt">{terminalPrompt}</p>

          {/* Name + title */}
          <header>
            <h1 className="tech-dev__name">
              {p.firstName} {p.lastName}
            </h1>
            {p.title && (
              <p className="tech-dev__title">{p.title}</p>
            )}
          </header>

          {/* Sections in resolved order */}
          {sections.map((section) => {
            if (section === 'summary' && data.summary) {
              return (
                <section className="tech-dev__section" key="summary">
                  <h2 className="tech-dev__section-heading">// {labels.summary.toLowerCase()}</h2>
                  <p className="tech-dev__summary">{data.summary}</p>
                </section>
              );
            }

            if (section === 'experience' && data.experience.length > 0) {
              return (
                <section className="tech-dev__section" key="experience">
                  <h2 className="tech-dev__section-heading">// {labels.experience.toLowerCase()}</h2>
                  {data.experience.map((e, i) => (
                    <div className="tech-dev__entry" key={`exp-${e.company}-${i}`}>
                      <div className="tech-dev__entry-head">
                        <div className="tech-dev__entry-title-row">
                          <span className="tech-dev__entry-company-tag">
                            #{e.company.toLowerCase().replace(/\s+/g, '')}
                          </span>
                          <span className="tech-dev__entry-role">{e.title}</span>
                        </div>
                        <div className="tech-dev__entry-date">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.location && (
                        <div className="tech-dev__entry-location">{e.location}</div>
                      )}
                      {e.bullets.length > 0 && (
                        <ul className="tech-dev__bullets">
                          {e.bullets.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {e.tags && e.tags.length > 0 && (
                        <div className="tech-dev__entry-tags">
                          [{e.tags.join(', ')}]
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              );
            }

            if (section === 'education' && data.education.length > 0) {
              return (
                <section className="tech-dev__section" key="education">
                  <h2 className="tech-dev__section-heading">// {labels.education.toLowerCase()}</h2>
                  {data.education.map((e, i) => (
                    <div className="tech-dev__entry" key={`edu-${e.institution}-${i}`}>
                      <div className="tech-dev__edu-head">
                        <div className="tech-dev__edu-degree">{e.degree}</div>
                        <div className="tech-dev__entry-date">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      <div className="tech-dev__edu-institution">{e.institution}</div>
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="tech-dev__bullets">
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

            return null;
          })}

          {/* Custom sections */}
          {data.customSections?.map((cs) => (
            <section className="tech-dev__section" key={cs.id}>
              <h2 className="tech-dev__section-heading">// {cs.title.toLowerCase()}</h2>
              {cs.items.map((it, i) => (
                <div className="tech-dev__custom-entry" key={i}>
                  <div className="tech-dev__custom-title">{it.title}</div>
                  {it.subtitle && (
                    <div className="tech-dev__custom-subtitle">{it.subtitle}</div>
                  )}
                  {it.description && (
                    <p className="tech-dev__custom-desc">{it.description}</p>
                  )}
                  {it.bullets && it.bullets.length > 0 && (
                    <ul className="tech-dev__bullets">
                      {it.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </article>
  );
}
