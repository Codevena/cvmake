import type { TemplateProps } from '@codevena/cvmake-schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function MonochromeDarkTemplate({ data, palette: _palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  return (
    <article className="monochrome-dark">
      <div className="monochrome-dark__page">
        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="monochrome-dark__sidebar">
          {/* Photo or Initials */}
          {data.personal.photo ? (
            <img
              className="monochrome-dark__photo"
              src={data.personal.photo}
              alt={`${data.personal.firstName} ${data.personal.lastName}`}
            />
          ) : (
            <div className="monochrome-dark__initials" aria-hidden>
              {initials(data.personal.firstName, data.personal.lastName)}
            </div>
          )}

          {/* Contact details */}
          <section className="monochrome-dark__section">
            <h2>{labels.personalData}</h2>
            <dl className="monochrome-dark__contacts">
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

          {/* Skills */}
          {data.skills && (data.skills.categorized || data.skills.stack) && (
            <section className="monochrome-dark__section">
              <h2>{labels.skills}</h2>
              {data.skills.categorized &&
                Object.entries(data.skills.categorized).map(([group, items]) => (
                  <div className="monochrome-dark__skills-group" key={group}>
                    <h3>{group}</h3>
                    <div className="monochrome-dark__skills-tags">{items.join(' · ')}</div>
                  </div>
                ))}
              {data.skills.stack && !data.skills.categorized && (
                <div className="monochrome-dark__skills-tags">{data.skills.stack.join(' · ')}</div>
              )}
            </section>
          )}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <section className="monochrome-dark__section">
              <h2>{labels.languages}</h2>
              {data.languages.map((lang) => (
                <div className="monochrome-dark__lang-item" key={lang.name}>
                  <span>{lang.name}</span>
                  <span className="monochrome-dark__lang-level">{lang.label ?? lang.level}</span>
                </div>
              ))}
            </section>
          )}
        </aside>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="monochrome-dark__main">
          {/* Header: name + accent underline + job title */}
          <header>
            <h1 className="monochrome-dark__name">
              {data.personal.firstName} {data.personal.lastName}
            </h1>
            <span className="monochrome-dark__name-underline" aria-hidden />
            {data.personal.title && (
              <p className="monochrome-dark__job-title">{data.personal.title}</p>
            )}
          </header>

          {/* Dynamic sections */}
          {sections.map((section) => {
            if (section === 'summary' && data.summary) {
              return (
                <section className="monochrome-dark__section" key="summary">
                  <h2>{labels.summary}</h2>
                  <p>{data.summary}</p>
                </section>
              );
            }

            if (section === 'experience' && data.experience.length > 0) {
              return (
                <section className="monochrome-dark__section" key="experience">
                  <h2>{labels.experience}</h2>
                  {data.experience.map((exp, i) => (
                    <div className="monochrome-dark__entry" key={`${exp.company}-${i}`}>
                      <div className="monochrome-dark__entry-head">
                        <span className="monochrome-dark__entry-title">{exp.title}</span>
                        <span className="monochrome-dark__entry-meta">
                          {formatDateRange(exp.startDate, exp.endDate, locale, labels.present)}
                        </span>
                      </div>
                      <div className="monochrome-dark__entry-org">
                        {exp.company}
                        {exp.location ? ` · ${exp.location}` : ''}
                      </div>
                      {exp.bullets.length > 0 && (
                        <ul className="monochrome-dark__bullets">
                          {exp.bullets.map((bullet, j) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: bullet strings have no stable id; read-only YAML-backed array with fixed order
                            <li key={j}>
                              <span className="monochrome-dark__bullet-marker" aria-hidden>
                                →
                              </span>
                              <span>{bullet}</span>
                            </li>
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
                <section className="monochrome-dark__section" key="education">
                  <h2>{labels.education}</h2>
                  {data.education.map((edu, i) => (
                    <div className="monochrome-dark__entry" key={`${edu.institution}-${i}`}>
                      <div className="monochrome-dark__entry-head">
                        <span className="monochrome-dark__entry-title">{edu.degree}</span>
                        <span className="monochrome-dark__entry-meta">
                          {formatDateRange(edu.startDate, edu.endDate, locale, labels.present)}
                        </span>
                      </div>
                      <div className="monochrome-dark__entry-org">{edu.institution}</div>
                      {edu.bullets && edu.bullets.length > 0 && (
                        <ul className="monochrome-dark__bullets">
                          {edu.bullets.map((bullet, j) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: bullet strings have no stable id; read-only YAML-backed array with fixed order
                            <li key={j}>
                              <span className="monochrome-dark__bullet-marker" aria-hidden>
                                →
                              </span>
                              <span>{bullet}</span>
                            </li>
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
            <section className="monochrome-dark__section" key={cs.id}>
              <h2>{cs.title}</h2>
              {cs.items.map((item, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: custom section items have no stable id; read-only YAML-backed array with fixed order
                <div className="monochrome-dark__custom-entry" key={i}>
                  <div className="monochrome-dark__custom-title">{item.title}</div>
                  {item.subtitle && (
                    <div className="monochrome-dark__custom-subtitle">{item.subtitle}</div>
                  )}
                  {item.description && (
                    <p className="monochrome-dark__custom-desc">{item.description}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="monochrome-dark__bullets">
                      {item.bullets.map((bullet, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: bullet strings have no stable id; read-only YAML-backed array with fixed order
                        <li key={j}>
                          <span className="monochrome-dark__bullet-marker" aria-hidden>
                            →
                          </span>
                          <span>{bullet}</span>
                        </li>
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
