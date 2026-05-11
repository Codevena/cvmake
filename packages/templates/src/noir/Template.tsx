import type { TemplateProps } from '@codevena/cvmake-schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function NoirTemplate({ data, palette: _palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const fullName = `${data.personal.firstName} ${data.personal.lastName}`;

  // Build a small "No. NNN · YYYY" label for the head.
  const year = data.meta.updatedAt
    ? data.meta.updatedAt.slice(0, 4)
    : String(new Date().getFullYear());
  const numLabel = `A profile · No. 026 · ${year}`;

  // Compose role line: title + location separated by a center-dot.
  const roleParts = [data.personal.title, data.personal.contacts.location].filter(
    (s): s is string => Boolean(s && s.length > 0),
  );

  // Compose the cinematic contact line.
  const contactParts: string[] = [];
  if (data.personal.contacts.email) contactParts.push(data.personal.contacts.email);
  if (data.personal.contacts.phone) contactParts.push(data.personal.contacts.phone);
  if (data.personal.contacts.linkedin)
    contactParts.push(`linkedin.com/in/${data.personal.contacts.linkedin}`);
  if (data.personal.contacts.github)
    contactParts.push(`github.com/${data.personal.contacts.github}`);
  if (data.personal.contacts.website) contactParts.push(data.personal.contacts.website);

  return (
    <article className="noir">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="noir__head">
        <div className="noir__head-text">
          <div className="noir__num">{numLabel}</div>
          <h1 className="noir__name">{fullName}</h1>
          {roleParts.length > 0 && <div className="noir__role">{roleParts.join(' · ')}</div>}
        </div>
        {data.personal.photo ? (
          <img className="noir__photo" src={data.personal.photo} alt={fullName} />
        ) : (
          <div className="noir__initials" aria-hidden>
            {initials(data.personal.firstName, data.personal.lastName)}
          </div>
        )}
      </header>

      <div className="noir__rule" />

      {/* ── Contact ───────────────────────────────────────────── */}
      {contactParts.length > 0 && <div className="noir__contact">{contactParts.join('  ·  ')}</div>}

      {/* ── Dynamic sections ──────────────────────────────────── */}
      {sections.map((section) => {
        if (section === 'summary' && data.summary) {
          return (
            <p className="noir__summary" key="summary">
              “{data.summary}”
            </p>
          );
        }

        if (section === 'experience' && data.experience.length > 0) {
          return (
            <section className="noir__section" key="experience">
              <h4>{labels.experience}</h4>
              {data.experience.map((e, i) => {
                const body = e.bullets && e.bullets.length > 0 ? e.bullets.join(' ') : '';
                const org = [e.company, e.location].filter(Boolean).join(' · ');
                return (
                  <div className="noir__item" key={`${e.company}-${i}`}>
                    <div className="noir__item-top">
                      <span className="noir__item-title">{e.title}</span>
                      <span className="noir__item-dates">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                      </span>
                    </div>
                    {org && <div className="noir__item-org">{org}</div>}
                    {body && <p className="noir__item-body">{body}</p>}
                  </div>
                );
              })}
            </section>
          );
        }

        if (section === 'education' && data.education.length > 0) {
          return (
            <section className="noir__section" key="education">
              <h4>{labels.education}</h4>
              {data.education.map((e, i) => {
                const body = e.bullets && e.bullets.length > 0 ? e.bullets.join(' ') : '';
                return (
                  <div className="noir__item" key={`${e.institution}-${i}`}>
                    <div className="noir__item-top">
                      <span className="noir__item-title">{e.degree}</span>
                      <span className="noir__item-dates">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                      </span>
                    </div>
                    <div className="noir__item-org">{e.institution}</div>
                    {body && <p className="noir__item-body">{body}</p>}
                  </div>
                );
              })}
            </section>
          );
        }

        if (section === 'skills' && data.skills && (data.skills.categorized || data.skills.stack)) {
          return (
            <section className="noir__section" key="skills">
              <h4>{labels.skills}</h4>
              <div className="noir__skills">
                {data.skills.categorized
                  ? Object.entries(data.skills.categorized).map(([group, items]) => (
                      <div className="noir__skills-group" key={group}>
                        {group}: {items.join(' · ')}
                      </div>
                    ))
                  : data.skills.stack && <div>{data.skills.stack.join(' · ')}</div>}
              </div>
            </section>
          );
        }

        if (section === 'languages' && data.languages && data.languages.length > 0) {
          return (
            <section className="noir__section" key="languages">
              <h4>{labels.languages}</h4>
              <div className="noir__languages">
                {data.languages.map((l) => `${l.name} ${l.label ?? l.level}`).join(' · ')}
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* ── Custom sections ───────────────────────────────────── */}
      {data.customSections?.map((cs) => (
        <section className="noir__section" key={cs.id}>
          <h4>{cs.title}</h4>
          {cs.items.map((it, i) => {
            const body =
              it.bullets && it.bullets.length > 0 ? it.bullets.join(' ') : (it.description ?? '');
            return (
              <div className="noir__item" key={`${it.title}-${i}`}>
                <div className="noir__item-top">
                  <span className="noir__item-title">{it.title}</span>
                </div>
                {it.subtitle && <div className="noir__item-org">{it.subtitle}</div>}
                {body && <p className="noir__item-body">{body}</p>}
              </div>
            );
          })}
        </section>
      ))}
    </article>
  );
}
