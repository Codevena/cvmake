import type { TemplateProps } from '@codevena/forq-schema';
import { formatDateRange } from '../utils/dates.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

function isUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://');
}

export function AcademicTemplate({ data, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const { personal } = data;

  // Build inline contacts list
  const contactItems: string[] = [];
  if (personal.contacts.email) contactItems.push(personal.contacts.email);
  if (personal.contacts.phone) contactItems.push(personal.contacts.phone);
  if (personal.contacts.location) contactItems.push(personal.contacts.location);
  if (personal.contacts.website) contactItems.push(personal.contacts.website);
  if (personal.contacts.github) contactItems.push(`github.com/${personal.contacts.github}`);
  if (personal.contacts.linkedin)
    contactItems.push(`linkedin.com/in/${personal.contacts.linkedin}`);

  return (
    <article className="academic">
      <div className="academic__page">
        {/* ── Header ── */}
        <header className="academic__header">
          <h1 className="academic__name">
            {personal.firstName} {personal.lastName}
          </h1>
          {personal.title && <p className="academic__title">{personal.title}</p>}
          {contactItems.length > 0 && (
            <p className="academic__contacts">
              {contactItems.map((item, i) => (
                <span className="academic__contacts-item" key={i}>
                  {item}
                </span>
              ))}
            </p>
          )}
        </header>

        {/* ── Main sections ── */}
        {sections.map((section) => {
          if (section === 'summary' && data.summary) {
            return (
              <section className="academic__section academic__summary" key="summary">
                <h2 className="academic__section-title">{labels.summary}</h2>
                <p>{data.summary}</p>
              </section>
            );
          }

          if (section === 'experience' && data.experience.length > 0) {
            return (
              <section className="academic__section" key="experience">
                <h2 className="academic__section-title">{labels.experience}</h2>
                {data.experience.map((e, i) => (
                  <div className="academic__entry" key={`${e.company}-${i}`}>
                    <div className="academic__entry-date">
                      {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                    </div>
                    <div className="academic__entry-body">
                      <div>
                        <span className="academic__entry-role">{e.title}</span>
                        {' — '}
                        <span className="academic__entry-org">{e.company}</span>
                      </div>
                      {e.location && <div className="academic__entry-location">{e.location}</div>}
                      {e.bullets.length > 0 && (
                        <ul className="academic__entry-bullets">
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
              <section className="academic__section" key="education">
                <h2 className="academic__section-title">{labels.education}</h2>
                {data.education.map((e, i) => (
                  <div className="academic__entry" key={`${e.institution}-${i}`}>
                    <div className="academic__entry-date">
                      {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                    </div>
                    <div className="academic__entry-body">
                      <div>
                        <span className="academic__entry-role">{e.degree}</span>
                        {' — '}
                        <span className="academic__entry-org">{e.institution}</span>
                      </div>
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="academic__entry-bullets">
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

          if (
            section === 'skills' &&
            data.skills &&
            (data.skills.categorized || data.skills.stack)
          ) {
            return (
              <section className="academic__section" key="skills">
                <h2 className="academic__section-title">{labels.skills}</h2>
                {data.skills.categorized
                  ? Object.entries(data.skills.categorized).map(([group, items]) => (
                      <div className="academic__skills-group" key={group}>
                        <span className="academic__skills-label">{group}</span>
                        <span className="academic__skills-items">{items.join(', ')}</span>
                      </div>
                    ))
                  : data.skills.stack && (
                      <div className="academic__skills-group">
                        <span className="academic__skills-label" />
                        <span className="academic__skills-items">
                          {data.skills.stack.join(', ')}
                        </span>
                      </div>
                    )}
              </section>
            );
          }

          if (section === 'languages' && data.languages && data.languages.length > 0) {
            return (
              <section className="academic__section" key="languages">
                <h2 className="academic__section-title">{labels.languages}</h2>
                <p className="academic__languages">
                  {data.languages.map((l) => `${l.name} (${l.label ?? l.level})`).join(', ')}
                </p>
              </section>
            );
          }

          return null;
        })}

        {/* ── Custom sections (publications, awards, etc.) ── */}
        {data.customSections?.map((cs) => (
          <section className="academic__section" key={cs.id}>
            <h2 className="academic__section-title">{cs.title}</h2>
            {cs.items.map((it, i) => (
              <div className="academic__custom-entry" key={i}>
                <div className="academic__custom-title">{it.title}</div>
                {it.subtitle && (
                  <div className="academic__custom-subtitle">
                    {isUrl(it.subtitle) ? (
                      <a
                        className="academic__custom-link"
                        href={it.subtitle}
                        rel="noopener noreferrer"
                      >
                        {it.subtitle}
                      </a>
                    ) : (
                      it.subtitle
                    )}
                  </div>
                )}
                {it.description && <p className="academic__custom-desc">{it.description}</p>}
                {it.bullets && (
                  <ul className="academic__custom-bullets">
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
