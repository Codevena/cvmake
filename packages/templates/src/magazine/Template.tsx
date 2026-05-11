import type { TemplateProps } from '@codevena/cvmake-schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MagazineTemplate({ data, palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  const shadowColor = hexToRgba(palette.accent, 0.35);
  const photoShadow = { boxShadow: `4px 4px 0 ${shadowColor}` };

  const currentYear = new Date().getFullYear();
  const issueNo = String(((currentYear - 2000) % 100) + 1).padStart(3, '0');

  const contactParts: string[] = [];
  if (data.personal.contacts.email) contactParts.push(data.personal.contacts.email);
  if (data.personal.contacts.phone) contactParts.push(data.personal.contacts.phone);
  if (data.personal.contacts.location) contactParts.push(data.personal.contacts.location);
  if (data.personal.contacts.website) contactParts.push(data.personal.contacts.website);
  if (data.personal.contacts.linkedin)
    contactParts.push(`linkedin.com/in/${data.personal.contacts.linkedin}`);
  if (data.personal.contacts.github)
    contactParts.push(`github.com/${data.personal.contacts.github}`);

  return (
    <article className="magazine">
      <header className="magazine__head">
        <div className="magazine__head-text">
          <div className="magazine__label">
            Profile · No. {issueNo} · {currentYear}
          </div>
          <h1 className="magazine__name">
            {data.personal.firstName} {data.personal.lastName}
          </h1>
          {(data.personal.title || data.personal.contacts.location) && (
            <p className="magazine__role">
              {data.personal.title}
              {data.personal.title && data.personal.contacts.location ? ' · ' : ''}
              {data.personal.contacts.location}
            </p>
          )}
        </div>

        {data.personal.photo ? (
          <img
            className="magazine__photo"
            src={data.personal.photo}
            alt={`${data.personal.firstName} ${data.personal.lastName}`}
            style={photoShadow}
          />
        ) : (
          <div className="magazine__initials" style={photoShadow} aria-hidden>
            {initials(data.personal.firstName, data.personal.lastName)}
          </div>
        )}
      </header>

      <div className="magazine__divider" />

      {sections.includes('summary') && data.summary && (
        <p className="magazine__summary">{data.summary}</p>
      )}

      {contactParts.length > 0 && (
        <div className="magazine__contacts">
          {contactParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      )}

      <div className="magazine__grid">
        {sections.map((section) => {
          if (section === 'summary') {
            // Summary is rendered above as pull-quote
            return null;
          }

          if (section === 'experience' && data.experience.length > 0) {
            return (
              <div key="experience" style={{ display: 'contents' }}>
                <div className="magazine__section-label">{labels.experience}</div>
                <div className="magazine__section-body">
                  {data.experience.map((e, i) => (
                    <div className="magazine__item" key={`${e.company}-${i}`}>
                      <div className="magazine__item-title">
                        {e.title} · {e.company}
                      </div>
                      <div className="magazine__item-meta">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                      {e.bullets.length > 0 && (
                        <ul>
                          {e.bullets.map((b, j) => (
                            <li key={`${b.slice(0, 20)}-${j}`} className="magazine__item-body">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (section === 'education' && data.education.length > 0) {
            return (
              <div key="education" style={{ display: 'contents' }}>
                <div className="magazine__section-label">{labels.education}</div>
                <div className="magazine__section-body">
                  {data.education.map((e, i) => (
                    <div className="magazine__item" key={`${e.institution}-${i}`}>
                      <div className="magazine__item-title">
                        {e.degree} · {e.institution}
                      </div>
                      <div className="magazine__item-meta">
                        {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                      </div>
                      {e.bullets && e.bullets.length > 0 && (
                        <ul>
                          {e.bullets.map((b, j) => (
                            <li key={`${b.slice(0, 20)}-${j}`} className="magazine__item-body">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (
            section === 'skills' &&
            data.skills &&
            (data.skills.categorized || data.skills.stack)
          ) {
            return (
              <div key="skills" style={{ display: 'contents' }}>
                <div className="magazine__section-label">{labels.skills}</div>
                <div className="magazine__section-body">
                  {data.skills.categorized
                    ? Object.entries(data.skills.categorized).map(([group, items]) => (
                        <div className="magazine__skills-group" key={group}>
                          <div className="magazine__skills-group-label">{group}</div>
                          <div className="magazine__item-body">{items.join(' · ')}</div>
                        </div>
                      ))
                    : data.skills.stack && (
                        <div className="magazine__item-body">{data.skills.stack.join(' · ')}</div>
                      )}
                </div>
              </div>
            );
          }

          if (section === 'languages' && data.languages && data.languages.length > 0) {
            return (
              <div key="languages" style={{ display: 'contents' }}>
                <div className="magazine__section-label">{labels.languages}</div>
                <div className="magazine__section-body">
                  <div className="magazine__lang-list">
                    {data.languages.map((l) => (
                      <div className="magazine__item-body" key={l.name}>
                        {l.name} · {l.label ?? l.level}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {data.customSections?.map((cs) => (
          <div key={cs.id} style={{ display: 'contents' }}>
            <div className="magazine__section-label">{cs.title}</div>
            <div className="magazine__section-body">
              {cs.items.map((it, i) => (
                <div className="magazine__item" key={`${it.title}-${i}`}>
                  <div className="magazine__item-title">{it.title}</div>
                  {it.subtitle && <div className="magazine__item-meta">{it.subtitle}</div>}
                  {it.description && <p className="magazine__item-body">{it.description}</p>}
                  {it.bullets && (
                    <ul>
                      {it.bullets.map((b, j) => (
                        <li key={`${b.slice(0, 20)}-${j}`} className="magazine__item-body">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
