---
name: trmnl-liquid-best-practices
description: TRMNL Framework CSS class reference for writing or editing plugin Liquid layouts (plugins/*/src/*.liquid). Use this whenever creating a new layout, adding markup to full/half_horizontal/half_vertical/quadrant.liquid, or fixing a Chef (TRMNL's automatic recipe checker) complaint about inline styles, opacity, missing image-dither, or missing responsive classes — even if the user doesn't name Chef or the framework explicitly, e.g. "make this layout look nicer", "add a badge/pill to this template", "why did the recipe check fail", "the copyright line looks too faint", or "the image is overlapping the text". Prefer Framework utility classes over inline `style="..."` attributes. Every class name in this file was verified by downloading and grepping the real, current framework CSS (`https://usetrmnl.com/css/latest/plugins.css`) — see "How this was verified" before trusting any *other* source (docs pages, WebFetch summaries) on framework class names.

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
2. Don't use `opacity` for faded/muted text — use `text--muted` instead.
3. **Every `<img>` needs `image-dither`.**
4. **Every layout needs at least one real responsive class** (`lg:`,
   `portrait:`, etc.), not a token one added just to silence the check.

## How this was verified (read this before trusting any doc summary)

Framework docs (`https://trmnl.com/framework/docs/3.1/*`) and generic
WebFetch summaries of them turned out to contain **fabricated class names**
that looked entirely plausible and were confidently stated with specifics
(hex colors, scale ranges) — and still turned out to not exist. Confirmed
hallucinations from earlier iterations of this skill:

- `text--gray-10` through `text--gray-75` — **does not exist at all.**
  The real muted-text class is `text--muted`.
- `label--gray` / `label--filled` — **don't exist.** The real classes are
  `label--gray-out` and `label--inverted`.
- `title--medium` / `value--medium` — **don't exist.** These sizes only go
  small → base → large → xlarge → xxlarge (value also has xxsmall/xsmall
  and mega/giga/tera/peta above xxlarge). "Medium" was never a real step;
  every pre-existing use of it in this repo (both plugins, several
  layouts) silently fell back to the unstyled base size for months.
- Arbitrary bracket size classes (`w--[Npx]`, `h--[Npx]`) — docs claimed a
  range of "0-800px"; the real generated range is **0-128px only**. Any
  bracket value above 128 silently does nothing (no error, the CSS custom
  property it's supposed to set is just never defined) — this caused a
  real, visually severe bug (an image rendering at ~full card size,
  overlapping all the text below it) that took two rounds of guessing to
  properly diagnose.

**When in doubt about whether a class is real, don't re-ask a doc-summary
tool — check the actual shipped CSS:**

```bash
curl -sL -o /tmp/trmnl.css https://usetrmnl.com/css/latest/plugins.css
grep -oE '\.classname[a-zA-Z0-9_-]*\{[^}]*\}' /tmp/trmnl.css | sort -u
```

This is a ~14MB file; grep handles it fine. Note: `image-dither` and
`data-clamp="N"` are real, correctly-documented features but **don't
appear in this CSS file at all** — they're processed by TRMNL's JS
runtime / server-side render pipeline (dithering for e-ink, and the
"Clamp engine" for text truncation), not by static CSS rules. Their
absence from the CSS is expected, not a sign they're fake — unlike the
cases above, which were absent because they simply don't exist.

## Verified image sizing (the actual bug this skill exists to prevent)

For a fixed pixel size ≤128px, bracket syntax works and is exact:
`w--[90px]`, `h--[110px]`.

For anything above 128px, use the named scale below (nearest step; ~4px
off is visually negligible). Put sizing directly on the `<img>` itself
(no wrapper `<div>` needed) alongside `image--cover`/`image--contain`/
`image--fill`, `image-dither`, and `rounded`:

```html
<img class="image image--cover image-dither rounded shrink-0 w--56 h--64" src="{{ url }}">
```

Full verified `w--N`/`h--N` scale (same numbers, same px, for both axes):

| n | px | n | px | n | px | n | px |
|---|---|---|---|---|---|---|---|
| 0 | 0 | 8 | 32 | 24 | 96 | 48 | 192 |
| 1 | 4 | 9 | 36 | 28 | 112 | 52 | 208 |
| 2 | 8 | 10 | 40 | 32 | 128 | 56 | 224 |
| 3 | 12 | 11 | 44 | 36 | 144 | 60 | 240 |
| 4 | 16 | 12 | 48 | 40 | 160 | 64 | 256 |
| 5 | 20 | 14 | 56 | 44 | 176 | 72 | 288 |
| 6 | 24 | 16 | 64 | | | 80 | 320 |
| 7 | 28 | 20 | 80 | | | 96 | 384 |

(Numbers between 12 and 96 that aren't listed — 13, 15, 17-19, 21-23,
etc. — don't exist; that's a real gap in the scale, not a typo.)

`w--min-0`, `w--full`, `h--full`, `grow`, `shrink-0` are all confirmed
real and work at any size, no range limit.

## Confirmed class mapping — inline style → Framework class

| Instead of inline style... | ...use this class |
|---|---|
| `style="width: 100%;"` on a flex wrapper | `w--full` |
| `style="flex: 1;"` (fill remaining space) | `grow` |
| `style="text-align: center;"` | `text--center` (also `text--left`, `text--right`, `text--justify`) |
| `style="flex-wrap: wrap; justify-content: center;"` on a badge row | `flex--wrap flex--center-x` |
| `style="align-items: center;"` in a row | `flex--center-y` (cross-axis of a row) |
| `style="border: 1px solid currentColor; border-radius: Npx; padding: ...;"` on a `label label--small` badge | `label--outline` (real rule: `border:1px solid var(--framework-border-strong); border-radius:4px; padding: 0 2px`) |
| `style="opacity: 0.5;"` on muted/copyright text | `text--muted` (real rule: `color:var(--framework-text-secondary)` — note `.label` elements already get this color by default, so adding it to non-label muted text is what actually matters) |
| `style="object-fit: cover;"` on an `<img class="image">` | `image--cover` (also `image--contain`, `image--fill`) |
| `style="border-radius: Npx;"` on an image | `rounded` (real rule: `border-radius:10px; overflow:hidden` — single fixed value, no size variants exist) |
| `style="display: -webkit-box; -webkit-line-clamp: N; ...overflow: hidden;"` (line-clamp hack) | `data-clamp="N"` attribute on any text element — real JS-runtime feature ("Clamp engine"), also supports `data-clamp-md="N"` / `data-clamp-portrait="N"` for responsive clamping, and `clamp--none`/`clamp--1`...`clamp--50` as class-based alternatives |
| `style="word-break: break-all;"` on a long URL | `data-clamp="1"` — clamps to one line with an ellipsis instead of ugly mid-word breaking |

Other real classes worth knowing when building a layout from scratch:
- Flex direction: `flex flex--row` / `flex flex--col`
- Flex alignment: `flex--center-x`/`flex--left`/`flex--right` (main axis), `flex--center-y`/`flex--top`/`flex--bottom` (cross axis)
- Label sizes: `label--small`/`label--base`/`label--large`/`label--xlarge`/`label--xxlarge`
- Label variants: `label--outline`, `label--gray-out`, `label--inverted`, `label--primary`/`label--success`/`label--error`/`label--warning`
- Title sizes: `title--small`/`title--base`/`title--large`/`title--xlarge`/`title--xxlarge` (no "medium")
- Value sizes: `value--xxsmall`/`value--xsmall`/`value--small`/`value--base`/`value--large`/`value--xlarge`/`value--xxlarge`/`value--mega`/`value--giga`/`value--tera`/`value--peta` (no "medium"); `value--tnums` for tabular numbers
- Responsive/orientation prefixes confirmed working on the above: `md:`, `lg:`, `portrait:` (e.g. `lg:value--large`, `portrait:flex--col`)

## No framework utility exists — drop the styling, don't fall back to inline

Chef rejects every `style=` attribute, so "no class exists for this" means
the styling has to go, not move to `style=`. Cases hit so far:

- `font-style: italic` — no italic utility exists anywhere in the CSS.
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

## Verifying changes

Preview a plugin's layouts with [`trmnlp`](https://github.com/usetrmnl/trmnlp):

```
cd plugins/<plugin-name>
trmnlp serve
```

This repo's dev sandbox frequently lacks Ruby, so `trmnlp` may not be
runnable there — say so explicitly and ask the user to run the preview
themselves. But for framework *class name* questions specifically, you
don't need `trmnlp` at all — download the real CSS (see "How this was
verified" above) and grep it directly. That's faster, free of
hallucination risk, and is how every fact in this file was established.
