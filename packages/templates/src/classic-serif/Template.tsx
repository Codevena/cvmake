import type { TemplateProps } from '@codevena/forq-schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function ClassicSerifTemplate({ data, palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  return (
    <article className="classic-serif">
      <div className="classic-serif__page">
        <aside className="classic-serif__sidebar">
          {data.personal.photo ? (
            <img
              className="classic-serif__photo"
              src={data.personal.photo}
              alt={`${data.personal.firstName} ${data.personal.lastName}`}
            />
          ) : (
            <div className="classic-serif__initials" aria-hidden>
              {initials(data.personal.firstName, data.personal.lastName)}
            </div>
          )}

          <section className="classic-serif__section">
            <h2>{labels.personalData}</h2>
            <dl className="classic-serif__contacts">
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

          {data.skills && (data.skills.categorized || data.skills.stack) && (
            <section className="classic-serif__section">
              <h2>{labels.skills}</h2>
              {data.skills.categorized &&
                Object.entries(data.skills.categorized).map(([group, items]) => (
                  <div className="classic-serif__skills-group" key={group}>
                    <h3>{group}</h3>
                    <div>{items.join(' · ')}</div>
                  </div>
                ))}
              {data.skills.stack && !data.skills.categorized && (
                <div>{data.skills.stack.join(' · ')}</div>
              )}
            </section>
          )}

          {data.languages && data.languages.length > 0 && (
            <section className="classic-serif__section">
              <h2>{labels.languages}</h2>
              <ul>
                {data.languages.map((l) => (
                  <li key={l.name}>
                    {l.name} — {l.label ?? l.level}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <main className="classic-serif__main">
          <header>
            <h1 className="classic-serif__name">
              {data.personal.firstName} {data.personal.lastName}
            </h1>
            {data.personal.title && <p className="classic-serif__title">{data.personal.title}</p>}
          </header>

          {sections.map((section) => {
            if (section === 'summary' && data.summary) {
              return (
                <section className="classic-serif__section" key="summary">
                  <h2>{labels.summary}</h2>
                  <p>{data.summary}</p>
                </section>
              );
            }
            if (section === 'experience' && data.experience.length > 0) {
              return (
                <section className="classic-serif__section" key="experience">
                  <h2>{labels.experience}</h2>
                  {data.experience.map((e, i) => (
                    <div className="classic-serif__exp" key={`${e.company}-${i}`}>
                      <div className="classic-serif__exp-head">
                        <div className="classic-serif__exp-title">
                          {e.title} · {e.company}
                        </div>
                        <div className="classic-serif__exp-meta">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.location && <div className="classic-serif__exp-meta">{e.location}</div>}
                      {e.bullets.length > 0 && (
                        <ul className="classic-serif__bullets">
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
                <section className="classic-serif__section" key="education">
                  <h2>{labels.education}</h2>
                  {data.education.map((e, i) => (
                    <div className="classic-serif__exp" key={`${e.institution}-${i}`}>
                      <div className="classic-serif__exp-head">
                        <div className="classic-serif__exp-title">
                          {e.degree} · {e.institution}
                        </div>
                        <div className="classic-serif__exp-meta">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="classic-serif__bullets">
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

          {data.customSections?.map((cs) => (
            <section className="classic-serif__section" key={cs.id}>
              <h2>{cs.title}</h2>
              {cs.items.map((it, i) => (
                <div className="classic-serif__exp" key={i}>
                  <div className="classic-serif__exp-title">{it.title}</div>
                  {it.subtitle && <div className="classic-serif__exp-meta">{it.subtitle}</div>}
                  {it.description && <p>{it.description}</p>}
                  {it.bullets && (
                    <ul className="classic-serif__bullets">
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
