# cvMake — Audit & Fix-Plan

> Erstellt: 2026-06-02 · Multi-Agent-Audit (6 Subsysteme parallel reviewt, jedes Finding
> adversarial am echten Code verifiziert, Default „kein Bug"; + 3 Strategie-Agents).
> **28 bestätigte Findings** (3 high · 5 medium · 20 low), 1 als False-Positive verworfen.

## Inhalt
1. [Zusammenfassung](#zusammenfassung)
2. [Findings — High](#findings--high)
3. [Findings — Medium](#findings--medium)
4. [Findings — Low](#findings--low)
5. [Verworfen (False-Positive)](#verworfen-false-positive)
6. [Website- & Produkt-Strategie](#website--produkt-strategie)
7. [Architektur- & Technik-Strategie](#architektur--technik-strategie)
8. [OSS-Potenzial](#oss-potenzial-510)
9. [Fix-Plan & Reihenfolge](#fix-plan--reihenfolge)

---

## Zusammenfassung

Die Codebase ist für ein v0.1 **überdurchschnittlich reif**: `.strict()`-Zod-Schemas, gehärtete
Export-Route (Rate-Limit, Concurrency-Semaphore, Abort-Timeout, Origin-Guard), korrektes
Slug-Path-Containment, gut getestete Autosave-Race-Logik, OIDC-npm-Publishing. Die Templates
sind robust gegen leere CV-Sektionen, `renderToStaticMarkup` escapt automatisch (kein Text-XSS).

Die wichtigsten Schwachstellen clustern in **zwei Wurzeln**:
- **Eine Path-Traversal-Lücke** über das ungeprüfte `photo`-Feld (Datei-Read auf Self-Host).
- **„Preview ≠ Export"**: `applyHiddenSections` und das geteilte Reset/Print-CSS laufen nur im
  Live-Preview, nie im echten PDF-Export-/CLI-Pfad. Das erzeugt allein 3 Findings (1× high, 2× medium).

| Severity | Anzahl |
|----------|--------|
| 🔴 High   | 3 |
| 🟡 Medium | 5 |
| ⚪ Low    | 20 |
| ❌ Verworfen | 1 |

---

## Findings — High

### H1 — Path-Traversal über `personal.photo` → beliebiger Datei-Read
- **Bereich:** core-pipeline / web-api (dieselbe Wurzel, von zwei Seiten gemeldet)
- **Ort:** `packages/core/src/photo-embed.ts:67-79`, `apps/web/app/api/export/route.ts:236`, Schema `packages/schema/src/cv.ts:20`
- **Confidence:** high
- **Problem:** `photo` ist `z.string().optional()` ohne Pfad-Beschränkung. `embedPhoto` löst den Wert per
  `path.resolve(baseDir, photo)` bzw. `path.join(dir,'public',rel)` **ohne Containment-Check** auf.
  Payloads wie `photo: "../../../../etc/foo.png"` oder `"/photos/../../../../etc/foo.png"` brechen aus
  dem erlaubten Verzeichnis aus; die Datei-Bytes werden base64 in das zurückgegebene PDF eingebettet
  → Datei-Exfiltration. Beide Vektoren empirisch bestätigt (kollabieren außerhalb der Roots).
- **Blast Radius (verifiziert begrenzt):** Mime-Gate erlaubt nur Dateien, deren echter Name auf
  `.jpg/.jpeg/.png/.webp` endet (also kein direktes `/etc/passwd`/`.env`). In der **Demo** durch
  `DEMO_SLUGS` entschärft (prüft aber nur `body.slug`, nicht `body.data.personal.photo` → in Demo
  trotzdem erreichbar). **Self-Host-Instanzen voll exponiert** (auch cross-CV-Foto-Diebstahl).
  `checkOrigin` ist fail-open, wenn `NEXT_PUBLIC_APP_ORIGIN` nicht gesetzt ist.
- **Fix:** Wie beim existierenden `resolveCvPath` (`lib/data-paths.ts:57-65`) den kanonischen Root
  auflösen und `path.resolve(filePath).startsWith(root + path.sep)` erzwingen; normalisierte
  `..`-Segmente ablehnen; Schema auf `/photos/<slug>.<ext>` oder `data:image/`-URLs verengen.

### H2 — Geteiltes `reset.css`/`print.css` greift im PDF-Export & CLI **nie**
- **Bereich:** templates
- **Ort:** `packages/templates/src/css.ts:11` + jedes `packages/templates/src/*/styles.css:1-3`
- **Confidence:** high
- **Problem:** Jedes Template-CSS startet mit `@import "../shared/reset.css"; @import "../shared/print.css";`.
  Im Export (`export/route.ts:243-248`) und CLI (`build.ts:37-47`) wird das CSS inline in einen
  `<style>`-Block gelegt und mit `page.setContent(html)` (`pdf.ts:77`) **ohne Base-URL** (about:blank)
  gerendert → die relativen `@import`-URLs lösen nicht auf und werden verworfen. Verloren gehen:
  `@page{size:A4;margin:28mm 0 18mm}`, `print-color-adjust:exact`, alle `break-after/break-inside/orphans/widows`,
  `box-sizing:border-box`, List-Reset.
- **Kritisch:** Die Pagination-Spacer-Mathematik in `pdf.ts:103-112` hängt an genau diesen 28mm/18mm-Margins
  (`preferCSSPageSize:true`) → ohne `print.css` fällt Chromium auf 0mm zurück und **Seitenumbrüche landen falsch**.
  Die Live-Preview ist nicht betroffen (`PreviewFrame.tsx:59-61` injiziert Reset/Print als separate `<style>`
  mit `<base>`) — **deshalb fällt die Regression im Preview nicht auf, nur im Download**.
  CLI-Doppelfehler: dort stehen die `@import` zusätzlich nach `:root{}` (ungültige Position, vom Browser ignoriert).
- **Nuance:** `printBackground:true` erzwingt Hintergründe trotz fehlendem `print-color-adjust` — etwas
  weniger katastrophal als zunächst angenommen, aber Pagination + `box-sizing` bleiben kaputt.
- **Fix:** Im Export-Route + CLI `bootstrap.resetCss`/`printCss` voranstellen und die relativen
  `@import`-Zeilen aus dem Template-CSS strippen (`tplCss.replace(/@import "\.\.\/shared\/[^"]+";\n?/g,'')`).

### H3 — Skill-Kategorie umbenennen verliert Fokus bei **jedem** Tastendruck
- **Bereich:** web-client
- **Ort:** `apps/web/components/sections/SkillsSection.tsx:84`
- **Confidence:** high
- **Problem:** Die Row ist `<div key={name}>` mit `<Input value={name} onChange={rename}>`. Der `onChange`
  (kontrollierter Input, feuert pro Keystroke) schreibt den Objekt-Key um (`{...rest, [next]: items}`)
  → der React-`key` ändert sich beim ersten Zeichen → Row unmountet/remountet → **Fokus springt raus**.
  Die Row springt zusätzlich ans Listenende. Mehrstellige Kategorienamen sind praktisch nicht eintippbar.
  Deterministisch reproduzierbar: Skills-Tab → Categories → bestehende Kategorie editieren.
- **Fix:** Stabilen Key (Index/ID) verwenden und Rename per lokalem Draft on `blur`/`Enter` committen —
  wie es der „Add category"-Pfad (Zeilen 116-154) in derselben Datei bereits korrekt macht.

---

## Findings — Medium

### M1 — Datumsfelder akzeptieren Müll → „undefined &lt;year&gt;" im PDF
- **Ort:** `packages/schema/src/cv.ts:33-34` (+ `packages/templates/src/utils/dates.ts:39`)
- **Problem:** `startDate`/`endDate`/`birthDate`/`meta.updatedAt` sind nur `z.string().min(1)` ohne Format.
  `"2020-13"`, `"2020-99"`, `"not-a-date"` passieren. `formatMonthYear` macht `months[monthNum-1]` ohne
  Bounds-Check → Monat 13 ⇒ `months[12]` ⇒ `undefined` ⇒ gedruckt **„undefined 2020"** (runtime-verifiziert);
  `"2020-00"` lässt den Monat still wegfallen. Über die geführten `<select>`-Dropdowns nicht erreichbar,
  aber über hand-editiertes YAML (= Haupteingabeweg des Tools!). `birthDate` ist Freitext → Tippfehler
  drucken verbatim.
- **Fix:** Datumsfelder im Schema mit Regex bounden, z.B.
  `z.string().regex(/^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/)`; **zusätzlich** `formatMonthYear`
  defensiv absichern (`if (monthNum < 1 || monthNum > 12) return year`).

### M2 — Nach „Cancel" im Konflikt-Modal ist Autosave dauerhaft pausiert + Retry tot
- **Ort:** `apps/web/components/EditorShell.tsx:262`
- **Problem:** `onCancel` setzt `conflictPaused=true` und `conflict=null`. `conflictPaused` wird nur in
  `onReload` (227) / erfolgreichem `onOverwrite` (257) zurückgesetzt — beide nach Cancel unerreichbar
  (Modal unmountet). `paused` bleibt die ganze Session true. Der „Retry"-Button ruft `save()`, das bei
  `if (current.paused) return;` (`use-autosave.ts:65`) sofort returnt → **toter No-Op**. Weitere Edits
  erholen sich nicht (`mark-dirty`-Effekt returnt bei `state==='error'`). Nur Reload rettet.
  Der SaveIndicator zeigt durchgehend roten „Conflict"-Fehler (also nicht ganz „silent").
  Spec (`docs/.../2026-04-25-forq-editor-design.md:374`) wollte „pausiert bis Reload/Overwrite" —
  Implementierung macht das unerreichbar → Intent-vs-Impl-Gap.
- **Fix:** Persistenten „Resolve conflict"-Banner/Button, der das Modal wieder öffnet, ODER beim nächsten
  Edit `conflictPaused` clearen, damit ein frischer 409 das Modal erneut zeigt. Mindestens den Retry-Pfad
  so machen, dass er `conflictPaused` clearen/Modal öffnen kann statt garantiert nichts zu tun.

### M3 — Sidebar-Skills/Languages umgehen `hiddenSections` in 4 Templates
- **Ort:** `packages/templates/src/classic-serif/Template.tsx:78-105` (+ monochrome-dark, tech-dev, creative-accent)
- **Problem:** Diese 4 Templates rendern Skills/Languages in einer Sidebar **außerhalb** der
  `sections.map`-Schleife, gegated nur auf Daten-Präsenz, nie auf `sections.includes('skills'/'languages')`.
  → im Export/CLI-Pfad wird die ausgeblendete Sektion trotzdem gedruckt (WYSIWYG-Bruch). `swiss` macht's korrekt,
  die übrigen 7 rendern innerhalb der Schleife (korrekt gefiltert).
- **Fix:** Sidebar-Blöcke auf `sections.includes('skills') && ...` gaten (bzw. `hasSkills/hasLanguages` in
  creative-accent entsprechend berechnen). Wird auch durch die zentrale Lösung (M5-Fix) miterledigt.

### M4 — `customSections` lassen sich im PDF-Export/CLI nicht ausblenden
- **Ort:** alle 12 Templates (`*/Template.tsx`, z.B. classic-serif:181) + `render-helpers.ts`
- **Problem:** Alle 12 Templates rendern `data.customSections?.map(...)` unbedingt, nach der `sections.map`-Schleife,
  ohne Check gegen `hiddenSections`. `applyHiddenSections` (das `customSections` leert) läuft nur im Web-Preview.
  → im Preview ausgeblendet, im Download gedruckt. (Hinweis: `HiddenSectionsToggles` bietet **keinen**
  customSections-Toggle in der Web-UI; erreichbar nur via YAML/CLI/API.)
- **Fix:** Zentral lösen (siehe M5), oder pro Template gegen `hiddenSections.includes('customSections')` gaten.

### M5 — (Wurzel von H2/M3/M4) Hidden-Section-Stripping läuft nur im Web-Preview
- **Ort:** `apps/web/app/api/export/route.ts:236-238`, `apps/cli/src/commands/build.ts:30-34`
- **Problem:** `applyHiddenSections` wird **nur** in `PreviewFrame.tsx:115` aufgerufen. Export-Route und CLI
  übergeben rohe `parsed.data` an `renderCV`; weder `core` noch `cli` referenzieren `hiddenSections`.
- **Fix (Schlüsselmaßnahme):** `applyHiddenSections` in `@codevena/cvmake-core` verschieben und in **beiden**
  `renderCV`-Konsumenten (Export-Route + CLI) vor dem Rendern anwenden. Damit werden M3 und M4 zentral mitgefixt;
  die per-Template-`resolveSectionOrder` wird zum Belt-and-Suspenders-Layer.

---

## Findings — Low

_Beschreibungen/Fixes im Original (Reviewer-Output, EN); Bereichs-Labels lokalisiert._

#### L1 — `personal.photo` akzeptiert `javascript:`/`data:`-URIs in `<img src>`
- **Bereich:** schema · **Ort:** `packages/schema/src/cv.ts:20`
- **Problem:** `photo` ist `z.string().optional()` ohne Validierung (`"javascript:alert(1)"` wird akzeptiert). Templates rendern es direkt als `<img src={p.photo}>`. Gleiche Klasse: `contacts.github/linkedin` sind plain strings, die Templates mit `github.com/` präfixen → ein `github`-Wert `"https://evil.com/x"` ergibt `github.com/https://evil.com/x`.
- **Fix:** `photo` auf sichere Form beschränken (`z.string().regex(/^(https?:\/\/|\/|\.\/|photos\/|data:image\/)/)`); github/linkedin als bare Handle validieren (`/^[A-Za-z0-9._-]+$/`).

#### L2 — Doppelte `customSection`-IDs erzeugen doppelte React-Keys
- **Bereich:** schema · **Ort:** `packages/schema/src/cv.ts:99-116`
- **Problem:** Keine Eindeutigkeits-Prüfung für `CustomSection.id`; Templates nutzen `cs.id` als React-Key → Reconciliation-Warnungen/Bugs.
- **Fix:** `.refine(arr => new Set(arr.map(s => s.id)).size === arr.length, 'customSection ids must be unique')`.

#### L3 — `SkillsSchema` erlaubt komplett leere Skills
- **Bereich:** schema · **Ort:** `packages/schema/src/cv.ts:51-56`
- **Problem:** `stack` und `categorized` beide optional ohne Refinement → `skills: {}` validiert; `categorized` erlaubt Leerstring-Keys und leere Arrays. Templates rendern dann eine leere/heading-only Sektion.
- **Fix:** `.refine(s => (s.stack?.length ?? 0) > 0 || Object.keys(s.categorized ?? {}).length > 0)`; Keys `z.string().min(1)`, Werte `.nonempty()`.

#### L4 — `rendering.template/palette/sectionOrder/hiddenSections` unvalidierte Strings
- **Bereich:** schema · **Ort:** `packages/schema/src/cv.ts:86-97`
- **Problem:** Unbekannte template-/palette-ID passiert das Schema, scheitert erst später (renderer fällt still auf `palettes[0]` zurück). customSection-IDs in `sectionOrder/hiddenSections` haben keinen Effekt.
- **Fix:** Nach dem Parse im Core verifizieren, dass `rendering.template` existiert und `palette` zum Template gehört (klarer Fehler statt silent fallback). customSection-IDs in `resolveSectionOrder` einfließen lassen, falls Reorder/Hide gewünscht.

#### L5 — `getLabels` liefert `undefined` für Locale außerhalb `de/en`
- **Bereich:** core-pipeline · **Ort:** `packages/core/src/i18n.ts:45-47`
- **Problem:** `DICTIONARIES[locale]` ohne Fallback; ein künftiges Locale in der Enum ohne Dictionary-Eintrag ⇒ `undefined`, das Templates dereferenzieren → Render-Crash. Typ-Signatur verdeckt die Lücke.
- **Fix:** `return DICTIONARIES[locale] ?? DICTIONARIES.en;` (oder expliziter Fehler).

#### L6 — TOCTOU-Race zwischen mtime-Check und `atomicWriteFile` in `/api/save`
- **Bereich:** web-api · **Ort:** `apps/web/app/api/save/route.ts:102-133`
- **Problem:** Optimistic-Concurrency-Guard stat't die Datei, schreibt aber später ohne Lock über die Check-then-act-Lücke. Zwei parallele POSTs mit gleicher mtime passieren beide → last writer wins, Konflikt-Modal feuert nicht.
- **Fix:** Saves pro Zielpfad mit In-Process-Async-Mutex serialisieren (`Map<target, Promise>`), oder mtime unmittelbar vor dem rename erneut prüfen.

#### L7 — Information-Leak: rohe Error-Strings an Clients
- **Bereich:** web-api · **Ort:** `apps/web/app/api/cv/[slug]/route.ts:50` und `apps/web/app/api/upload/route.ts:115`
- **Problem:** `{ message: String(err) }` kann absolute Pfade/Sharp-Internals enthalten → Server-Internals exponiert.
- **Fix:** Vollen Fehler server-seitig loggen, generische Message (oder enumerierter Reason ohne Pfade) an Client.

#### L8 — Upload-Temp-Dateiname kann bei parallelem Same-Slug-Upload kollidieren
- **Bereich:** web-api · **Ort:** `apps/web/app/api/upload/route.ts:99`
- **Problem:** Temp-Pfad `.upload-${slug}-${Date.now()}.bin` — nur slug+Date.now() (anders als `atomic-write.ts`, das bewusst `randomBytes(8)` nutzt). Gleiche Millisekunde → gleiche Datei, `finally{rm}` löscht dem anderen Request die Datei weg.
- **Fix:** `randomBytes(6).toString('hex')` in den Temp-Namen, wie in `atomic-write.ts`.

#### L9 — Keine Dimensions-/Pixel-Validierung bei Uploads (Decompression-Bomb-Fläche)
- **Bereich:** web-api · **Ort:** `apps/web/app/api/upload/route.ts:84-107` und `packages/core/src/photo.ts:40-65`
- **Problem:** Nur Byte-Größe (10 MB) + MIME-Allowlist; kein Cap auf dekodierte Dimensionen/Pixelzahl vor Sharp. Ein kleines, hochkomprimiertes Bild kann Sharp zu großen Allokationen zwingen. `limitInputPixels` nie gesetzt.
- **Fix:** `sharp(buffer, { limitInputPixels: 24_000_000 })` und/oder Metadata zuerst lesen und `width*height` cappen (413/415).

#### L10 — Autosave stoppt still bei invalidem Formular, Indicator verspricht trotzdem „auto-save in 2s"
- **Bereich:** web-client · **Ort:** `apps/web/lib/use-autosave.ts:135`
- **Problem:** Autosave-Effekt returnt früh bei `!isValid`, aber der „mark dirty"-Effekt nicht → Indicator zeigt „auto-save in 2s", das nie passiert. Daten nur im Speicher bis das Formular wieder valid ist.
- **Fix:** Bei `isDirty && !isValid` distinkten Indicator-State („Unsaved — fix validation errors to save"); `blockedInvalid`-State aus dem Hook exponieren.

#### L11 — „Saved Ns ago" wird einmal berechnet und nie aktualisiert
- **Bereich:** web-client · **Ort:** `apps/web/components/SaveIndicator.tsx:31`
- **Problem:** `relativeTime(lastSavedAt)` zur Render-Zeit berechnet; im Idle ohne Re-Render bleibt der Text bei „3s ago" eingefroren. Kosmetisch.
- **Fix:** Leichtes `setInterval(forceTick, 30000)` (nur bei `clean && lastSavedAt`, cleanup on unmount) oder absolute Zeit rendern.

#### L12 — PreviewFrame portalt das neue Template kurz in das alte iframe-Root
- **Bereich:** web-client · **Ort:** `apps/web/components/PreviewFrame.tsx:137`
- **Problem:** Bei `templateId`-Wechsel wird das neue Template für einen Render gegen das alte Dokument/CSS gerendert, bevor der Doc-Rewrite (useEffect) das Root neu baut → sichtbarer Flash + Fragilität (`doc.open()` löst das Portal-Node ab).
- **Fix:** iframe-Doc synchron vor dem Portalen umschreiben (useLayoutEffect), oder Portal an das frisch gebaute Root koppeln (`lastTemplateRef.current === templateId`).

#### L13 — Gestapelte Focus-Traps streiten um `document`-keydown/focus
- **Bereich:** web-client · **Ort:** `apps/web/lib/use-focus-trap.ts:93`
- **Problem:** Bei zwei offenen getrappten Surfaces (z.B. ConflictModal + ConfirmDialog) hören beide Traps auf `document`, beide managen Tab/Focus, der innere fängt das Element des äußeren als „previouslyFocused" → falsche Restore-Reihenfolge.
- **Fix:** Nur den obersten Trap aktiv schalten (Focus-Trap-Stack), oder den Listener am Container statt `document` registrieren.

#### L14 — Hidden Sections im PDF-Export & CLI ignoriert (`applyHiddenSections` nur im Web-Preview)
- **Bereich:** templates · **Ort:** `apps/web/app/api/export/route.ts:236-238`
- **Problem:** (= Wurzel M5) `applyHiddenSections` nur in `PreviewFrame.tsx:115`; Export/CLI übergeben rohe Daten an `renderCV`. → Preview blendet aus, Download druckt.
- **Fix:** `applyHiddenSections` nach `@codevena/cvmake-core`, in beiden `renderCV`-Konsumenten anwenden.

#### L15 — corporate verletzt sein deklariertes `photoFallback:'initials'`
- **Bereich:** templates · **Ort:** `packages/templates/src/corporate/meta.ts:9`
- **Problem:** meta deklariert `photoFallback:'initials'`, Template rendert aber nur `{p.photo && <img/>}` ohne Initialen-Fallback → meta und Komponente widersprechen sich; ohne Foto leerer Header.
- **Fix:** meta auf `'none'` korrigieren, oder Initialen-Fallback-Branch ergänzen.

#### L16 — Toter Font-Helper in `shared/fonts.ts`
- **Bereich:** templates · **Ort:** `packages/templates/src/shared/fonts.ts:7`
- **Problem:** `googleFontsHref()`/`FontFace` exportiert, nie importiert (Fonts via `@import url()` direkt in jedem `styles.css`). Dead Code; baut zudem eine nicht-sortierte Achsenliste, die Google Fonts ablehnen würde.
- **Fix:** `shared/fonts.ts` entfernen, oder verdrahten und Gewichte aufsteigend sortieren/deduplizieren.

#### L17 — Hero-Terminal-Copy-Button kopiert Prompt + Fake-Output statt lauffähigem Befehl
- **Bereich:** cli-showcase · **Ort:** `apps/showcase/index.html:163`
- **Problem:** `wireCopyButtons()` kopiert `pre.textContent` der gesamten simulierten Session inkl. `$`-Prompt und 3 Zeilen Fake-Output → unbrauchbar beim Einfügen. (Die 3 Quickstart-Blöcke sind in Ordnung.)
- **Fix:** `data-copy` vom Hero-`<pre>` entfernen, oder nur einen designierten Befehl (`<code data-copy-text>`) kopieren.

#### L18 — Ungültiger `--palette`-Wert wird still ignoriert (inkonsistent zu `--template`)
- **Bereich:** cli-showcase · **Ort:** `apps/cli/src/commands/build.ts:29`
- **Problem:** `--palette does-not-exist` rendert still mit Default-Palette, Exit 0; `--template` wirft dagegen „unknown template".
- **Fix:** Nach `getTemplate` prüfen `template.palettes.some(p => p.id === args.palette)` und sonst `unknown palette '...'` werfen.

#### L19 — Copy-Button-Label hängt nach Doppelklick auf „Copied"
- **Bereich:** cli-showcase · **Ort:** `apps/showcase/app.js:206`
- **Problem:** Handler merkt sich `prev = btn.textContent`; zweiter Klick innerhalb 1400 ms fängt `prev='Copied'` → Label kehrt nie zu „Copy" zurück. Timer nicht gecancelt.
- **Fix:** Kanonisches Label einmal außerhalb fixieren (`const LABEL='Copy'`), vor neuem Timer `clearTimeout(btn._t)`.

#### L20 — Fehlendes Chromium / fehlende Datei surface't rohe Library-Errors ohne Hilfe
- **Bereich:** cli-showcase · **Ort:** `apps/cli/src/index.ts:57`
- **Problem:** Auf frischem Clone ohne Chromium wirft `puppeteer.launch` ein rohes „Could not find Chrome..."; der Top-Level-Catch printet `err.message`, Exit 1 — korrekt, aber ohne Hinweis auf den Install-Schritt.
- **Fix:** Chromium-not-found-Fall erkennen und einzeiligen Hinweis printen (`pnpm exec puppeteer browsers install chrome`).

---

## Verworfen (False-Positive)

- **[core-pipeline] „Orphaned font-ready promise rejection" in `pdf.ts`** (gemeldet als medium).
  Der Verifier hat am Code bestätigt, dass die Race nicht real auslöst → `isReal=false`, kein Bug.

---

## Website- & Produkt-Strategie

> Kernbefund: Die größten Wachstumshebel liegen **nicht im Code, sondern an drei Funnel-Bruchstellen**:
> (1) `npx`-Onboarding ist auf der Website unsichtbar; (2) der Demo-Editor ist eine Sackgasse ohne
> YAML-Import; (3) der erste `npx`-Lauf lädt wortlos ~150 MB Chromium und setzt eine existierende `cv.yaml` voraus.

| Prio | Impact/Aufwand | Maßnahme |
|------|---------------|----------|
| 1 | hoch / niedrig | **`npx`-Einzeiler zum primären Onboarding-Pfad machen** — Showcase bewirbt nur den 4-Schritte-`git clone`-Pfad; der `npx @codevena/cvmake-cli build`-Einzeiler taucht nirgends auf. Hero-Terminal umstellen, Quickstart als 2 Tabs („npx" default / „Clone für Contrib"). |
| 2 | hoch / niedrig | **Chromium-Download beim ersten Build ankündigen** — wortlose ~150-MB-Pause wirkt wie Hänger → Bounce. Einmalige klare Meldung. |
| 3 | hoch / mittel | **`cvmake init`-Scaffold-Command** — beworbener Einzeiler setzt existierende `cv.yaml` voraus, die der Erstnutzer nicht hat. Schließt die Lücke „installiert → erstes PDF". |
| 4 | hoch / mittel | **YAML-Import/Paste im Demo-Editor** — aktuell nur Download, kein Import → Besucher kann echten CV nicht reinbringen, Loop offen. Direktester Conversion-Hebel. |
| 5 | hoch / mittel | **Pro-Template-Landingpages** (`/templates/swiss` …) — derzeit nur 1 Seite indexierbar; Daten+Screenshots existieren. SEO-Fläche 1 → 13. |
| 6 | mittel / niedrig | **Demo-Funnel-Endpunkt schärfen** — Banner-Botschaft von „wird nicht gespeichert" → „Lade dein PDF/YAML herunter" umdrehen (Export funktioniert bereits serverseitig). |
| 7 | mittel / niedrig | **Positionierung verschärfen** — „Git-natives CV-Tool für Entwickler" statt generischer Resume-Builder; Diff/grep/Versionierung + multilinguale Schema-Parität + byte-identische Preview führen. |
| 8 | mittel / mittel | **Build-in-Public über Templates** — „Template der Woche"/Contributor-Wall, 5-Min-Tutorial, „good first issue"-Tickets. |
| 9 | mittel / mittel | **Locale-Switch ohne Reload + Undo/Redo** im Editor (größte UX-Lücken, ROADMAP v0.2). |
| 10 | mittel / mittel | **ATS-Tauglichkeit verifizieren & per Badge auszeichnen** — Smoke-Test (PDF-Text vs. YAML-Felder) in die Visual-Suite. |

---

## Architektur- & Technik-Strategie

> cvMake ist für ein OSS-MVP solide gebaut. Strategische Risiken: Skalierung (Single-Browser + In-Memory-Limits),
> Deployability (kein `standalone`, volles Chromium), Testing (keine Coverage, ungetestete Pagination), Tech-Debt (CSP `unsafe-inline`, ~60 Lint-Findings).

| Prio | Impact/Aufwand | Maßnahme |
|------|---------------|----------|
| 1 | hoch / mittel | **Puppeteer-Browser-Lifecycle härten** — `pdf.ts` hält genau einen Browser (SPOF + Memory-Leak, kein Recycling). Page-Pool + Browser-Neustart nach N Renders, Pre-Warming beim Boot. |
| 2 | hoch / mittel | **Rate-Limit/Concurrency distributed-fähig** — `rateBuckets`-Map + `activeExports` sind In-Memory; bei Scale-Out gilt das Limit N-fach → DoS-Schutz bricht. Optionaler Redis/Upstash-Pfad, Grenze dokumentieren. |
| 3 | hoch / mittel | **`output: 'standalone'`** aktivieren + Docker-Image verschlanken (kopiert aktuell vollen Workspace inkl. devDeps, TODO H4). Hunderte MB kleiner. |
| 4 | hoch / mittel | **Pagination-Spacer-Logik in `pdf.ts` testen** — komplexester/fragilster Code, null Unit-Tests; hier brechen Template-Änderungen still (siehe H2). |
| 5 | mittel / niedrig | **Code-Coverage messen** (v8 + Schwellwert, zunächst nur reporten) — „Testing-Gap" ist sonst Vermutung. |
| 6 | mittel / mittel | **Visual-Baselines plattformunabhängig** — Linux-only erzeugt, lokal auf macOS faktisch rot → Onboarding-Hürde. Pinned Chromium-Container. |
| 7 | mittel / niedrig | **~60 Biome-Findings abbauen** — hartes Gate mit geduldeter Altlast ist Widerspruch, produziert schleichend mehr Suppressions. |
| 8 | mittel / mittel | **CSP von `unsafe-inline` befreien + Fonts self-hosten** (`next/font` abschließen; auch DSGVO fürs DACH-Publikum). |
| 9 | mittel / hoch | **Optionaler `@sparticuz/chromium`-Serverless-Adapter** für v0.4-„one-click installer". |
| 10 | mittel / niedrig | **Observability** — strukturierte Metriken/Logs für PDF-Throughput/Fehler/Browser-RSS. |
| 11 | mittel / niedrig | **Playwright-Retries in CI** (aktuell `retries:0` → ein Flake rotbricht alles). |
| 12 | niedrig / niedrig | **CI-`concurrency`-Cancellation** + Job-Parallelisierung (lint/typecheck nicht seriell hinter build). |

---

## OSS-Potenzial: 5/10

> *„Solides, sauber gebautes Nischen-Tool mit echtem Handwerk in den Templates und einer ehrlichen
> Privacy-Story — aber in einem überfüllten Markt ohne klaren Burggraben. Realistisches Potenzial: ein
> respektables 1–5k-Stars-Projekt mit treuer Dev-Nische, kein Kategorie-Gewinner."*

**Stärken:** 12 handgemachte Templates mit 36+ Paletten (kuratiert vs. JSON-Resume-Theme-Wüste) ·
Puppeteer = byte-identische Preview/PDF + volle CSS-Freiheit (umgeht LaTeX/Typst-Lernkurve) · glaubwürdige
No-Lock-in/Privacy-Story · Dual-Surface (CLI + Editor auf einer Engine) · Multilingual-First (DACH/EU-Vorteil) ·
Ingenieurs-Reife (43 Test-Dateien, OIDC-Release).

**Risiken:** **YAMLResume** (PPResume, ~1,4k Stars) verkauft *exakt* dieselbe Story inkl. Playground +
`json2yamlresume` + kommerziellem Backing → Verwechslungs-/SEO-Kannibalisierung · **Reactive Resume**
(~38k Stars, Drag&Drop, AI, gleiche Privacy-Story) → „warum nicht einfach RxResume?" · YAML ist für die
Mehrheit eine Eintrittsbarriere · Puppeteer ist ein operativer Klotz · **ATS ungelöst** (nur Roadmap) ·
Bus-Faktor 1, kein Monetarisierungsmodell, Pre-Launch-Traction · schwache Daten-Interop (kein JSON-Resume-Import).

**Konkurrenz:** YAMLResume (direkte Bedrohung, fast identisch) · Reactive Resume (Kategorie-König, frontal
nicht schlagbar, nur via Dev-Nische umgehbar) · JSON Resume + resume-cli (Standard, aber fragmentiert/semi-aufgegeben
→ Import-Chance) · RenderCV/Typst (~15k Stars, ATS-stark, schnell) · OpenResume (~8,7k Stars, Parser/ATS-Hook) ·
Paid SaaS (Rezi/Teal/Standard Resume → anderes Spiel, Koexistenz statt Wettbewerb).

**Go-to-Market:** Spitze Dev-Positionierung besitzen · **Namensrisiko ggü. YAMLResume sofort adressieren**
(abgrenzen oder Schärfung/Umbenennung erwägen) · **JSON-Resume-Import als Akquise-Brücke** · `LAUNCH_DRAFTS.md`-Sequenz
auf die Live-Demo ankern · Template-Vielfalt als Content-Maschine + Contributor-Funnel · **ATS-Variante priorisieren** ·
**DACH/Europass-Nische** bespielen.

---

## Fix-Plan & Reihenfolge

**Batching nach Wurzel** (ein zentraler Fix erschlägt mehrere Findings):

- [x] **Batch A — Sicherheit (H1):** ✅ Containment-Check in `embedPhoto` (`findPublicDir` + `isContained`,
      gespiegelt an `resolveCvPath`). 2 Traversal-Tests (relativ + absolut) zuerst rot, dann grün.
      *Schema-Verengung von `photo` → Defense-in-Depth, offen in Batch D.*
- [x] **Batch B — „Preview = Export" (H2 + M5 + M3 + M4 + L14):** ✅
      1. `applyHiddenSections` → `@codevena/cvmake-core/hidden-sections` (purer Subpath, kein Node-Dep im Client),
         zentral in `renderCV` angewandt → deckt Export **und** CLI **und** die 4 Sidebar-Templates ab
         (Daten werden gestrippt, Template-Gates greifen automatisch — keine 12 Template-Edits nötig).
      2. `stripSharedImports` + `loadResetCss`/`loadPrintCss` in `templates/css.ts`; Export-Route + CLI
         komponieren jetzt `reset → template(stripped) → print → palette` (wie die Preview).
      Verifiziert: CLI-Build erzeugt valides 810 KB PDF; neue Tests (renderCV-strip, stripSharedImports).
- [x] **Batch C — Editor-UX (H3 + M2):** ✅ SkillsSection `CategoryRow` mit lokalem Draft + commit-on-blur +
      stabilem Key + ordnungserhaltendem Rename (Regressionstest rot→grün). M2: Konflikt-Payload bleibt nach
      „Cancel" erhalten, persistenter „Resolve conflict"-Banner + smarter Retry (öffnet Modal statt No-Op);
      `conflictPaused` entfernt → `conflictDismissed`.
- [x] **Batch D — Schema-Härtung:** ✅ M1 (Datums-Regex `CvDateSchema` + `formatMonthYear`-Guard),
      L1 (`photo`-Scheme-Block via `isSafePhotoValue` + github/linkedin als `HandleSchema`), L2 (unique
      `customSection.id` refine), L3 (nicht-leere Skills + nicht-leere categorized-Keys). L4 über L18 (CLI)
      abgedeckt; Template-Teil schon durch `getTemplate`-Throw.
- [x] **Batch E — Web-API-Low (L6–L9):** ✅ Save-TOCTOU per-target `runExclusive`-Mutex (L6),
      generische Client-Errors + `console.error` (L7, upload + cv/[slug]), Upload-Temp-Name `randomBytes(6)` (L8),
      `limitInputPixels: 50M` in `photo.ts` (L9).
- [x] **Batch F — Restliche Low:** ✅ i18n-Fallback `?? DICTIONARIES.en` (L5), SaveIndicator-Tick (L11) +
      invalid-state-Copy via `blockedInvalid` (L10), PreviewFrame-Portal-Gate `lastTemplateRef === templateId` (L12),
      Focus-Trap-Stack (L13), corporate `photoFallback:'none'` (L15), `shared/fonts.ts` gelöscht (L16),
      Showcase `data-copy-text` + stabiles Label/Timer (L17/L19), CLI `--palette`-Validierung (L18) + Chromium-Hinweis (L20).

---

### Fortschritt (2026-06-02) — ALLE 28 FINDINGS GEFIXT

**Erledigt: alle 3 High + alle 5 Medium + alle 20 Low.** Verifikations-Gate grün:
**Build 7/7 · Typecheck 10/10 · 248 Unit-Tests · Biome-Lint sauber.**

Neue/erweiterte Tests: `photo-embed` (2× Traversal), `renderer` (hidden-section-strip), `templates/css`
(stripSharedImports), `utils.dates` (out-of-range-Monat), `schema/cv` (Datums-Regex, photo-Scheme, Handle,
unique IDs, leere Skills), `SkillsSection` (rename-on-blur). CLI-Smoke: valides 810 KB PDF.

**Nächster Schritt:** Review-Pipeline (Codex ×2 + Claude ×2) → lokaler Commit (Push nach Rückfrage).

> Vollständige strukturierte Reviewer-Ausgabe (inkl. aller Verifier-Begründungen):
> `tasks/w7fra719l.output` (JSON, via `jq '.result'`).
