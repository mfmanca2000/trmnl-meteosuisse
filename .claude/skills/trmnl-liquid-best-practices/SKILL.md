---
name: trmnl-liquid-best-practices
description: TRMNL Framework CSS class reference for writing or editing plugin Liquid layouts (plugins/*/src/*.liquid). Use this whenever creating a new layout, adding markup to full/half_horizontal/half_vertical/quadrant.liquid, or fixing a Chef (TRMNL's automatic recipe checker) complaint about inline styles, opacity, missing image-dither, or missing responsive classes — even if the user doesn't name Chef or the framework explicitly, e.g. "make this layout look nicer", "add a badge/pill to this template", "why did the recipe check fail", "the copyright line looks too faint", or "the image is overlapping the text". Prefer Framework utility classes over inline `style="..."` attributes. Every class name in this file was cross-checked against the real, current docs (`https://trmnl.com/framework/docs/3.1/*`, fetched and read as raw HTML) — see "How to verify a class" before trusting any other source.
---

# TRMNL Liquid best practices

TRMNL runs every plugin recipe through an automatic checker ("Chef") before
publishing. Rules it enforces, from
[the best-practices doc](https://help.trmnl.com/en/articles/11395668-recipe-best-practices)
and observed Chef output on this repo's plugins:

1. **No inline `style="..."` at all.** Any single occurrence trips "Inline
   style attribute detected" — there's no "too many" threshold. If no class
   covers it, the styling has to be dropped, not kept inline (no
   accepted-exception path with this checker).
2. Don't use `opacity` for faded/muted text — use `text--gray-##` instead.
3. **Every `<img>` needs `image-dither`.**
4. **Every layout needs at least one real responsive class** (`lg:`,
   `portrait:`, etc.), not a token one added just to silence the check.

## How to verify a class (read this before trusting any single source)

This skill went through two rounds of getting things wrong before landing
on a reliable method — both directions are worth understanding:

**Round 1 — trusted WebFetch summaries of the docs pages.** These
confidently stated specific, plausible details (hex colors, "0-800px"
ranges) that were actually fabricated by the summarizing step. This caused
a real bug: a claimed `w--[Npx]` range of 0-800px is wrong (see below),
and using it for a 220x260 image made the image render at ~full card size,
overlapping the text below it.

**Round 2 — overcorrected by grepping the compiled CSS with a pattern
that only matched standalone selectors** (`\.classname\{`). TRMNL's CSS
bundles hundreds of responsive/bit-depth variants into single giant
comma-separated selector groups sharing one rule body — a real class
almost never appears as `.classname{` on its own. This blind spot produced
*false negatives*: it wrongly concluded `text--gray-##`, `label--gray`,
and `label--filled` don't exist, when they do (confirmed in round 3 below).
Don't repeat this — if grepping compiled CSS, match on word boundaries
(`[.,]classname[,{:]`), not brace-adjacency.

**Round 3 — read the actual docs pages, fetched raw and read in full
(`curl`, not WebFetch's summarizer).** This is the reliable method. The
docs index is at `https://trmnl.com/framework/docs/3.1` and links every
real page (it's a much longer list than any single summary suggested —
includes `rounded`, `title`, `value`, `colors`, `divider`, `description`,
`clamp`, `tokens`, etc.). For a specific component, fetch its page
directly and read the actual size/variant list stated in prose (e.g. "The
Title system offers five size variants: small, base, large, xlarge,
xxlarge" on the `title` page) — that's more reliable than scanning code
snippets, since one-off example snippets can themselves contain the
author's own typos (see `value--medium` below).

```bash
curl -sL -o /tmp/doc.html "https://trmnl.com/framework/docs/3.1/<page>"
grep -oE 'classname-family--[a-zA-Z]+' /tmp/doc.html | sort -u
```

Compiled-CSS grepping (`curl -sL https://usetrmnl.com/css/latest/plugins.css`)
is still useful as a *secondary* cross-check (e.g. for the exact bracket
pixel-range cutoff, which isn't stated in prose anywhere) — just remember
the boundary-matching lesson above, and prefer the docs as the primary
source when the two disagree.

## Confirmed real (checked against the docs pages directly)

- `text--gray-1` through `text--gray-75` (odd-looking but real: 1, 2, then
  5-point steps 10, 15, 20 ... 75) — documented on the `text_color` page.
  Use this for muted/faded text, e.g. `label--gray`.
- `label--gray` and `label--gray-out` — both documented on the `label`
  page, and in the compiled CSS they're literally grouped as the same
  rule (`.label--gray,.label--gray-out{...}`), so they're aliases of each
  other. Either is fine on a `label`-classed element.
- `label--filled`, `label--inverted` — both documented, both real.
- `label--outline`, `label--primary`/`label--success`/`label--error`/`label--warning`,
  `label--underline` — all documented on the `label` page.
- `image-dither` and `data-clamp="N"` (also `data-clamp-md="N"`,
  `data-clamp-portrait="N"`, and class-based `clamp--none`/`clamp--1`
  through `clamp--50`) — real, but don't expect to find them in the
  compiled CSS: they're processed by TRMNL's JS runtime / server-side
  render pipeline (e-ink dithering, and the "Clamp engine" for text
  truncation), not by static CSS rules.
- `rounded` — real, fixed `border-radius:10px; overflow:hidden`, no size
  variants.
- `image--cover`/`image--contain`/`image--fill` — real object-fit classes.

## Confirmed NOT real (despite looking exactly as plausible as the above)

- **`title--medium`** — the `title` docs page states explicitly: "The
  Title system offers **five** size variants: small, base (default),
  large, xlarge, and xxlarge." No medium, ever, in any example on that page.
- **`value--medium`** — the `value` docs page states: "The Value system
  offers **twelve** size variants, from XXSmall to Peta" (xxsmall, xsmall,
  small, base, large, xlarge, xxlarge, xxxlarge, mega, giga, tera, peta —
  that's twelve, no medium). `value--medium` *does* appear once, in one
  combined responsive example (`value--xsmall sm:value--small
  md:value--medium lg:value--large`) — but never gets its own explained
  section like every real size does, and never appears in the compiled
  CSS in any form (checked with plain substring search, zero hits). Best
  read as a typo in TRMNL's own example code, not a real class.
- Both of the above were pre-existing in this repo (both plugins, several
  layouts) before this investigation — every use silently fell back to
  the unstyled base size for as long as they'd been there. Fixed to
  `title--base`/`value--base`.
- **Bracket arbitrary-size classes above 128px** (`w--[220px]`,
  `h--[260px]`, etc.) — not stated anywhere in the docs' prose at all
  (the "0-800px" figure was a WebFetch-summary fabrication). Checking the
  compiled CSS directly shows the real generated range is **0-128px
  only**; above that, the class exists syntactically but the CSS custom
  property it should set is never defined anywhere, so it silently does
  nothing. This is the one fact in this file confirmed via CSS rather
  than docs prose — the docs simply don't cover it.

## Verified image sizing

For a fixed pixel size ≤128px, bracket syntax works and is exact:
`w--[90px]`, `h--[110px]`.

For anything above 128px, use the named scale below (nearest step; ~4px
off is visually negligible). Put sizing directly on the `<img>` itself
(no wrapper `<div>` needed) alongside `image--cover`/`image--contain`/
`image--fill`, `image-dither`, and `rounded`:

```html
<img class="image image--cover image-dither rounded shrink-0 w--56 h--64" src="{{ url }}">
```

Verified `w--N`/`h--N` scale above 12 (same numbers, same px, both axes) —
confirmed via compiled CSS, not docs prose:

| n | px | n | px | n | px | n | px |
|---|---|---|---|---|---|---|---|
| 14 | 56 | 28 | 112 | 44 | 176 | 64 | 256 |
| 16 | 64 | 32 | 128 | 48 | 192 | 72 | 288 |
| 20 | 80 | 36 | 144 | 52 | 208 | 80 | 320 |
| 24 | 96 | 40 | 160 | 56 | 224 | 96 | 384 |

(0 through 12 are sequential, `n * 4px`. Numbers not listed above 12 —
13, 15, 17-19, 21-23, etc. — don't exist; that's a real gap, not a typo.)

`w--min-0`, `w--full`, `h--full`, `grow`, `shrink-0` work at any size, no
range limit — they don't use the bracket mechanism.

## Confirmed class mapping — inline style → Framework class

| Instead of inline style... | ...use this class |
|---|---|
| `style="width: 100%;"` on a flex wrapper | `w--full` |
| `style="flex: 1;"` (fill remaining space) | `grow` |
| `style="text-align: center;"` | `text--center` (also `text--left`, `text--right`, `text--justify`) |
| `style="flex-wrap: wrap; justify-content: center;"` on a badge row | `flex--wrap flex--center-x` |
| `style="align-items: center;"` in a row | `flex--center-y` (cross-axis of a row) |
| `style="border: 1px solid currentColor; border-radius: Npx; padding: ...;"` on a `label label--small` badge | `label--outline` |
| `style="opacity: 0.5;"` on muted/copyright text | `label--gray` (mid-scale; adjust 1-75 to taste). This repo puts it on `label label--small` elements — the `label` and `text--gray-*` classes stack fine. |
| `style="object-fit: cover;"` on an `<img class="image">` | `image--cover` (also `image--contain`, `image--fill`) |
| `style="border-radius: Npx;"` on an image | `rounded` (fixed `border-radius:10px`, no size variants) |
| `style="display: -webkit-box; -webkit-line-clamp: N; ...overflow: hidden;"` (line-clamp hack) | `data-clamp="N"` attribute on any text element |
| `style="word-break: break-all;"` on a long URL | `data-clamp="1"` — clamps to one line with an ellipsis instead of ugly mid-word breaking |

Other real classes worth knowing when building a layout from scratch:
- Flex direction: `flex flex--row` / `flex flex--col`
- Flex alignment: `flex--center-x`/`flex--left`/`flex--right` (main axis), `flex--center-y`/`flex--top`/`flex--bottom` (cross axis)
- Label sizes: `label--small`/`label--base`/`label--large`/`label--xlarge`/`label--xxlarge`
- Label variants: `label--outline`, `label--gray`/`label--gray-out` (aliases), `label--filled`/`label--inverted`, `label--primary`/`label--success`/`label--error`/`label--warning`, `label--underline`
- Title sizes: `title--small`/`title--base`/`title--large`/`title--xlarge`/`title--xxlarge` (no "medium")
- Value sizes: `value--xxsmall`/`value--xsmall`/`value--small`/`value--base`/`value--large`/`value--xlarge`/`value--xxlarge`/`value--xxxlarge`/`value--mega`/`value--giga`/`value--tera`/`value--peta` (no "medium"); `value--tnums` for tabular numbers
- Responsive/orientation prefixes confirmed working on the above: `md:`, `lg:`, `portrait:` (e.g. `lg:value--large`, `portrait:flex--col`)

## No framework utility exists — drop the styling, don't fall back to inline

Chef rejects every `style=` attribute, so "no class exists for this" means
the styling has to go, not move to `style=`. Cases hit so far:

- `font-style: italic` — no italic utility found on any docs page checked.
  Dropped italic entirely from saint "legacy" quotes in `daily-saints`;
  the `&ldquo;`/`&rdquo;` curly quotes still signal it's a quotation.
- Custom `font-size`/`line-height` smaller than `label--small` — e.g. an
  8px copyright line crammed into a `quadrant` (400×240) layout. Switched
  to plain `label label--small` and accepted the slightly larger size.
- `word-break: break-all` — see `data-clamp="1"` in the mapping table above.

## Responsive classes

Chef wants at least one real responsive/orientation class per layout.
Reasonable defaults used so far:

- A two-column row layout (image beside text) that would get too cramped
  rotated 90° → `portrait:flex--col` on the row container, so it stacks
  instead of squishing sideways (used in `daily-saints`' `full`,
  `half_horizontal`, `quadrant`).
- A layout with fixed pixel/size classes that could afford to be larger on
  a physically bigger screen → an `lg:` bump, e.g. `lg:w--36 lg:h--40` on
  an image, or `lg:value--large` on a headline value (used across both
  plugins).

Pick whichever genuinely fits that layout's content, not a token class
added just to silence the linter.

## Other patterns adopted in this repo

- **Avoid emoji as fallback/empty-state icons.** E-ink devices render
  through a limited custom font set (TRMNL12/16/21, NicoPups, BlockKie,
  etc.) that likely has no emoji glyphs — an emoji can render as an empty
  box. Both plugins now use text-only empty states (a `title`/`description`
  message, no icon) instead of `&#128330;`-style HTML entities.
- **Guard `{% for %}` loops over API-sourced arrays against blank
  elements**, not just against an empty/nil array. `{% if arr.size > 0 %}`
  only catches the outer array being empty; a non-empty array with a
  nil/blank element inside it still needs `{% unless item == blank %}`
  around the per-item markup, e.g.:
  ```liquid
  {% for p in saint.patronage %}
  {% unless p == blank %}
  <span class="label label--small label--outline">{{ p }}</span>
  {% endunless %}
  {% endfor %}
  ```

## Verifying changes

Preview a plugin's layouts with [`trmnlp`](https://github.com/usetrmnl/trmnlp):

```
cd plugins/<plugin-name>
trmnlp serve
```

This repo's dev sandbox frequently lacks Ruby, so `trmnlp` may not be
runnable there — say so explicitly and ask the user to run the preview
themselves. For framework *class name* questions specifically, fetch the
real docs page raw (`curl`, not WebFetch) per "How to verify a class"
above before asserting a class does or doesn't exist.
