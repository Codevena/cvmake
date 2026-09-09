# Vendored fonts

Seven of the twelve templates ship their typefaces in `<template>/fonts.css` as
`@font-face` rules with the woff2 embedded as a `data:` URI, latin subset only.

**Not all of them do.** `classic-serif` (EB Garamond, Playfair Display),
`magazine` (Playfair Display, Cormorant Garamond) and `bauhaus` (Futura, Avenir
Next) still name typefaces that nothing here ships, so they render in whatever
the machine happens to have. Futura and Avenir Next cannot be vendored at all —
one is licensed commercially, the other ships with macOS. The other three are
OFL and could be, at roughly another 0.5 MB in this package. Which is why the
list in `test/fonts.test.ts` (`NOT_VENDORED`) names every one of them with its
reason: the gap is recorded rather than discovered later from a PDF.

They are vendored rather than fetched for two reasons. The renderer refuses all
network access while producing a PDF, so a remote font can never load there. And
the `@import` these replace was silently dropped in every PDF path anyway: the
composed stylesheet puts the reset rules first, and CSS ignores an `@import`
that is not at the top of the sheet — so the templates advertised typefaces no
export ever used, while the browser preview did load them. `@font-face` has no
such ordering rule.

## Licences

All families come from Google Fonts and are redistributable:

| Family | Licence | Used by |
|---|---|---|
| Inter | SIL Open Font License 1.1 | modern-minimal, monochrome-dark, creative-accent, tech-dev |
| Fraunces | SIL Open Font License 1.1 | editorial, creative-accent |
| Source Sans Pro | SIL Open Font License 1.1 | editorial |
| Cormorant Garamond | SIL Open Font License 1.1 | noir |
| Crimson Pro | SIL Open Font License 1.1 | academic |
| JetBrains Mono | SIL Open Font License 1.1 | tech-dev |

The OFL permits bundling and redistribution, including inside a derived work,
as long as the fonts are not sold on their own and any modified version is
renamed. Nothing here modifies them — the woff2 files are Google Fonts' own
latin subsets, re-encoded as base64 and not otherwise altered.

## Copyright notices

The OFL requires these to travel with the font software, so they are reproduced
verbatim from each family's upstream `OFL.txt`:

- Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)
- Copyright (c) 2020 The Fraunces Project Authors
  (https://github.com/undercasetype/Fraunces)
- Copyright (c) 2010, 2012 Adobe Systems Incorporated (http://www.adobe.com/),
  with Reserved Font Name 'Source'. Source is a trademark of Adobe Systems
  Incorporated in the United States and/or other countries.
- Copyright (c) 2015 The Cormorant Project Authors
  (https://github.com/CatharsisFonts/Cormorant)
- Copyright (c) 2018 The Crimson Pro Project Authors
  (https://github.com/Fonthausen/CrimsonPro)
- Copyright (c) 2020 The JetBrains Mono Project Authors
  (https://github.com/JetBrains/JetBrainsMono)

## SIL Open Font License, Version 1.1

    Copyright (c) <dates and holders above>

    This Font Software is licensed under the SIL Open Font License, Version 1.1.
    This license is copied below, and is also available with a FAQ at:
    https://openfontlicense.org

    -----------------------------------------------------------
    SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
    -----------------------------------------------------------

    PREAMBLE
    The goals of the Open Font License (OFL) are to stimulate worldwide
    development of collaborative font projects, to support the font creation
    efforts of academic and linguistic communities, and to provide a free and
    open framework in which fonts may be shared and improved in partnership
    with others.

    The OFL allows the licensed fonts to be used, studied, modified and
    redistributed freely as long as they are not sold by themselves. The
    fonts, including any derivative works, can be bundled, embedded,
    redistributed and/or sold with any software provided that any reserved
    names are not used by derivative works. The fonts and derivatives,
    however, cannot be released under any other type of license. The
    requirement for fonts to remain under this license does not apply
    to any document created using the fonts or their derivatives.

    DEFINITIONS
    "Font Software" refers to the set of files released by the Copyright
    Holder(s) under this license and clearly marked as such. This may
    include source files, build scripts and documentation.

    "Reserved Font Name" refers to any names specified as such after the
    copyright statement(s).

    "Original Version" refers to the collection of Font Software components as
    distributed by the Copyright Holder(s).

    "Modified Version" refers to any derivative made by adding to, deleting,
    or substituting -- in part or in whole -- any of the components of the
    Original Version, by changing formats or by porting the Font Software to a
    new environment.

    "Author" refers to any designer, engineer, programmer, technical writer or
    other person who contributed to the Font Software.

    PERMISSION & CONDITIONS
    Permission is hereby granted, free of charge, to any person obtaining a
    copy of the Font Software, to use, study, copy, merge, embed, modify,
    redistribute, and sell modified and unmodified copies of the Font
    Software, subject to the following conditions:

    1) Neither the Font Software nor any of its individual components, in
    Original or Modified Versions, may be sold by itself.

    2) Original or Modified Versions of the Font Software may be bundled,
    redistributed and/or sold with any software, provided that each copy
    contains the above copyright notice and this license. These can be
    included either as stand-alone text files, human-readable headers or in
    the appropriate machine-readable metadata fields within text or binary
    files as long as those fields can be easily viewed by the user.

    3) No Modified Version of the Font Software may use the Reserved Font
    Name(s) unless explicit written permission is granted by the corresponding
    Copyright Holder. This restriction only applies to the primary font name as
    presented to the users.

    4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
    Software shall not be used to promote, endorse or advertise any Modified
    Version, except to acknowledge the contribution(s) of the Copyright
    Holder(s) and the Author(s) or with their explicit written permission.

    5) The Font Software, modified or unmodified, in part or in whole, must be
    distributed entirely under this license, and must not be distributed under
    any other license. The requirement for fonts to remain under this license
    does not apply to any document created using the Font Software.

    TERMINATION
    This license becomes null and void if any of the above conditions are not
    met.

    DISCLAIMER
    THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
    OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
    COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
    DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
    OTHER DEALINGS IN THE FONT SOFTWARE.
