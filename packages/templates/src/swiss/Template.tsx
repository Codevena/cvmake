import type { TemplateProps } from '@codevena/cvmake-schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function SwissTemplate({ data, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const year = new Date().getFullYear().toString().slice(-2);

  const hasContacts =
    !!data.personal.contacts.email ||
    !!data.personal.contacts.phone ||
    !!data.personal.contacts.location ||
    !!data.personal.contacts.linkedin ||
    !!data.personal.contacts.github ||
    !!data.personal.contacts.website ||
    !!data.personal.birthDate;

  const hasLanguages =
    sections.includes('languages') && !!data.languages && data.languages.length > 0;
  const hasEducation = sections.includes('education') && data.education.length > 0;
  const hasSkills =
    sections.includes('skills') &&
    !!data.skills &&
    (!!data.skills.categorized || !!data.skills.stack);

  return (
    <article className="swiss">
      <header className="swiss__head">
        <div className="swiss__num">
          N<span className="swiss__num-accent">o.</span>
          <br />
          {year}
        </div>
        <div>
          <h1 className="swiss__name">
            {data.personal.firstName}
            <br />
            {data.personal.lastName}
          </h1>
          {(data.personal.title || data.personal.contacts.location) && (
            <div className="swiss__role">
              {data.personal.title}
              {data.personal.title && data.personal.contacts.location ? ' · ' : ''}
              {data.personal.contacts.location}
            </div>
          )}
        </div>
      </header>

      <aside className="swiss__aside">
        {data.personal.photo ? (
          <img
            className="swiss__photo"
            src={data.personal.photo}
            alt={`${data.personal.firstName} ${data.personal.lastName}`}
          />
        ) : (
          <div className="swiss__initials" aria-hidden>
            {initials(data.personal.firstName, data.personal.lastName)}
          </div>
        )}

        {hasContacts && (
          <>
            <span className="swiss__lbl">{labels.personalData}</span>
            {data.personal.contacts.email && <div>{data.personal.contacts.email}</div>}
            {data.personal.contacts.phone && <div>{data.personal.contacts.phone}</div>}
            {data.personal.contacts.linkedin && (
              <div>linkedin.com/in/{data.personal.contacts.linkedin}</div>
            )}
            {data.personal.contacts.github && <div>github.com/{data.personal.contacts.github}</div>}
            {data.personal.contacts.website && <div>{data.personal.contacts.website}</div>}
            {data.personal.birthDate && <div>{data.personal.birthDate}</div>}
          </>
        )}

        {hasLanguages && (
          <>
            <span className="swiss__lbl">{labels.languages}</span>
            <ul>
              {data.languages?.map((l) => (
                <li key={l.name}>
                  {l.name} · {l.label ?? l.level}
                </li>
              ))}
            </ul>
          </>
        )}

        {hasEducation && (
          <>
            <span className="swiss__lbl">{labels.education}</span>
            {data.education.map((e) => (
              <div key={`${e.institution}-${e.startDate}`}>
                <div>{e.degree}</div>
                <div>
                  {`${e.institution} · ${formatDateRange(e.startDate, e.endDate, locale, labels.present)}`}
                </div>
              </div>
            ))}
          </>
        )}

        {hasSkills && (
          <>
            <span className="swiss__lbl">{labels.skills}</span>
            {data.skills?.categorized
              ? Object.entries(data.skills.categorized).map(([group, items]) => (
                  <div key={group}>
                    {group}: {items.join(', ')}
                  </div>
                ))
              : data.skills?.stack && <div>{data.skills.stack.join(', ')}</div>}
          </>
        )}
      </aside>

      <main className="swiss__main">
        {sections.map((section) => {
          if (section === 'summary' && data.summary) {
            return (
              <section className="swiss__section" key="summary">
                <h4>{labels.summary}</h4>
                <p className="swiss__summary">{data.summary}</p>
              </section>
            );
          }
          if (section === 'experience' && data.experience.length > 0) {
            return (
              <section className="swiss__section" key="experience">
                <h4>{labels.experience}</h4>
                {data.experience.map((e, i) => (
                  <div className="swiss__item" key={`${e.company}-${i}`}>
                    <div className="swiss__item-top">
                      <div className="swiss__item-title">{e.title}</div>
                      <div className="swiss__item-dates">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                      </div>
                    </div>
                    <div className="swiss__item-org">
                      {e.company}
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
          return null;
        })}

        {data.customSections?.map((cs) => (
          <section className="swiss__section" key={cs.id}>
            <h4>{cs.title}</h4>
            {cs.items.map((it, i) => (
              <div className="swiss__item" key={`${it.title}-${i}`}>
                <div className="swiss__item-title">{it.title}</div>
                {it.subtitle && <div className="swiss__item-org">{it.subtitle}</div>}
                {it.description && <p>{it.description}</p>}
                {it.bullets && (
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
      </main>
    </article>
  );
}
