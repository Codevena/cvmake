import type { TemplateProps } from '@codevena/forq-schema';
import { formatDateRange } from '../utils/dates.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function EditorialTemplate({ data, palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const hasPhoto = Boolean(data.personal.photo);

  // Collect inline contacts for the masthead byline
  const contactParts: string[] = [];
  if (data.personal.contacts.email) contactParts.push(data.personal.contacts.email);
  if (data.personal.contacts.phone) contactParts.push(data.personal.contacts.phone);
  if (data.personal.contacts.location) contactParts.push(data.personal.contacts.location);
  if (data.personal.contacts.website) contactParts.push(data.personal.contacts.website);
  if (data.personal.contacts.github)
    contactParts.push(`github.com/${data.personal.contacts.github}`);
  if (data.personal.contacts.linkedin)
    contactParts.push(`linkedin.com/in/${data.personal.contacts.linkedin}`);

  return (
    <article className="editorial">
      <div className="editorial__page">
        {/* Magazine-cover masthead (page 1 only): photo on the left,
            name + title + contacts on the right.
            When no photo, masthead collapses to single column with
            an accent top-bar. */}
        <header
          className={
            hasPhoto
              ? 'editorial__masthead editorial__masthead--with-photo'
              : 'editorial__masthead editorial__masthead--no-photo'
          }
        >
          {hasPhoto ? (
            <div className="editorial__masthead-photo">
              <img
                className="editorial__masthead-img"
                src={data.personal.photo}
                alt={`${data.personal.firstName} ${data.personal.lastName}`}
              />
            </div>
          ) : (
            <div className="editorial__masthead-bar" aria-hidden="true" />
          )}

          <div className="editorial__masthead-text">
            <h1 className="editorial__name">
              {data.personal.firstName} {data.personal.lastName}
            </h1>
            {data.personal.title && <div className="editorial__title">{data.personal.title}</div>}
            {contactParts.length > 0 && (
              <div className="editorial__contacts">
                {contactParts.map((part, i) => (
                  <span className="editorial__contact-item" key={i}>
                    {part}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Body: 2-column newspaper grid.
            <main> is used so the shared pdf.ts spacer-injection
            walker can find this as the paginating container and
            inject ~16pt top breathing-space on page 2+. */}
        <main className="editorial__body">
          {/* Summary spans full width with drop-cap */}
          {sections.includes('summary') && data.summary && (
            <div className="editorial__summary-wrap">
              <h2 className="editorial__section-heading">{labels.summary}</h2>
              <p className="editorial__summary-text">{data.summary}</p>
            </div>
          )}

          {sections.map((section) => {
            if (section === 'summary') {
              // Already rendered above full-width
              return null;
            }

            if (section === 'experience' && data.experience.length > 0) {
              return (
                <section className="editorial__section editorial__section--full" key="experience">
                  <h2 className="editorial__section-heading">{labels.experience}</h2>
                  {data.experience.map((e, i) => (
                    <div className="editorial__entry" key={`${e.company}-${i}`}>
                      <div className="editorial__entry-head">
                        <div className="editorial__entry-byline">
                          {e.title} — {e.company}
                        </div>
                        <div className="editorial__entry-date">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      <div className="editorial__entry-title">{e.company}</div>
                      {e.location && <div className="editorial__entry-location">{e.location}</div>}
                      {e.bullets.length > 0 && (
                        <ul className="editorial__bullets">
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
                <section className="editorial__section" key="education">
                  <h2 className="editorial__section-heading">{labels.education}</h2>
                  {data.education.map((e, i) => (
                    <div className="editorial__entry" key={`${e.institution}-${i}`}>
                      <div className="editorial__entry-head">
                        <div className="editorial__entry-byline">
                          {e.degree} — {e.institution}
                        </div>
                        <div className="editorial__entry-date">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      <div className="editorial__entry-title">{e.institution}</div>
                      {e.location && <div className="editorial__entry-location">{e.location}</div>}
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="editorial__bullets">
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

            if (
              section === 'skills' &&
              data.skills &&
              (data.skills.categorized || data.skills.stack)
            ) {
              return (
                <section className="editorial__section" key="skills">
                  <h2 className="editorial__section-heading">{labels.skills}</h2>
                  {data.skills.categorized
                    ? Object.entries(data.skills.categorized).map(([group, items]) => (
                        <div className="editorial__skills-group" key={group}>
                          <div className="editorial__skills-group-label">{group}</div>
                          <div className="editorial__skills-items">{items.join(' · ')}</div>
                        </div>
                      ))
                    : data.skills.stack && (
                        <div className="editorial__skills-items">
                          {data.skills.stack.join(' · ')}
                        </div>
                      )}
                </section>
              );
            }

            if (section === 'languages' && data.languages && data.languages.length > 0) {
              return (
                <section className="editorial__section" key="languages">
                  <h2 className="editorial__section-heading">{labels.languages}</h2>
                  <div className="editorial__lang-list">
                    {data.languages.map((l) => (
                      <div className="editorial__lang-item" key={l.name}>
                        <span>{l.name}</span>
                        <span className="editorial__lang-level">{l.label ?? l.level}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            return null;
          })}

          {/* Custom sections */}
          {data.customSections?.map((cs) => (
            <section className="editorial__section" key={cs.id}>
              <h2 className="editorial__section-heading">{cs.title}</h2>
              {cs.items.map((it, i) => (
                <div className="editorial__custom-entry" key={i}>
                  <div className="editorial__custom-title">{it.title}</div>
                  {it.subtitle && <div className="editorial__custom-subtitle">{it.subtitle}</div>}
                  {it.description && <p className="editorial__custom-desc">{it.description}</p>}
                  {it.bullets && (
                    <ul className="editorial__bullets">
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
