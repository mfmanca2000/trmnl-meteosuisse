---
name: trmnl-liquid-best-practices
description: TRMNL Framework CSS class reference for writing or editing plugin Liquid layouts (plugins/*/src/*.liquid). Use this whenever creating a new layout, adding markup to full/half_horizontal/half_vertical/quadrant.liquid, or fixing a Chef (TRMNL's automatic recipe checker) complaint about "too many inline styles" or "opacity should not be used" — even if the user doesn't name Chef or the framework explicitly, e.g. "make this layout look nicer", "add a badge/pill to this template", "why did the recipe check fail", or "the copyright line looks too faint". Prefer Framework utility classes over inline `style="..."` attributes; this skill maps the inline styles this repo has historically reached for to their class equivalents.
---

# TRMNL Liquid best practices

TRMNL runs every plugin recipe through an automatic checker ("Chef") before
publishing. Two rules it enforces, straight from
[the best-practices doc](https://help.trmnl.com/en/articles/11395668-recipe-best-practices):

1. Don't reach for inline `style="..."` when a Framework class does the same
   thing — Chef flags "too many inline styles."
2. Don't use `opacity` for faded/muted text — use a `text--gray-##` class
   instead ([framework text-color docs](https://trmnl.com/framework/docs/text_color)).

This skill exists because `bored-api` and `daily-saints` both hand-rolled the
same handful of inline styles across all four layouts, and got flagged for
it. The mapping below is what fixed them — reach for these classes first
instead of writing new inline CSS.

## Confirmed class mapping (verified against `https://trmnl.com/framework/docs/3.1/*`)

| Instead of inline style... | ...use this class |
|---|---|
| `style="width: 100%;"` on a flex wrapper | `w--full` |
| `style="flex: 1;"` (fill remaining space) | `grow` |
| `style="text-align: center;"` | `text--center` (also `text--left`, `text--right`, `text--justify`) |
| `style="flex-wrap: wrap; justify-content: center;"` on a badge row | `flex--wrap flex--center-x` |
| `style="align-items: center;"` in a row | `flex--center-y` (cross-axis of a row) |
| `style="border: 1px solid currentColor; border-radius: Npx; padding: ...;"` on a `label label--small` badge | `label--outline` — the label component already renders a bordered pill, don't hand-roll it |
| `style="opacity: 0.5;"` on muted/copyright text | `text--gray-50` (documented as `#999999`, the mid-gray — closest match to 50% opacity). Full scale: `text--gray-10` through `text--gray-75` in steps of 5, plus `text--black`/`text--white` |
| `style="object-fit: cover;"` on an `<img class="image">` | `image--cover` (also `image--contain`, `image--fill`) |

Other classes worth knowing when building a layout from scratch:
- Flex direction: `flex flex--row` / `flex flex--col`
- Flex alignment: `flex--center-x`/`flex--left`/`flex--right` (main axis), `flex--center-y`/`flex--top`/`flex--bottom` (cross axis)
- Label sizes: `label--small`/`label--base`/`label--large`/`label--xlarge`/`label--xxlarge`
- Label variants: `label--outline`, `label--gray`, `label--filled` (alias `label--inverted`), `label--primary`/`label--success`/`label--error`/`label--warning`
- Responsive/orientation prefixes work on most of the above: `md:`, `lg:`, `portrait:`, `landscape:` (e.g. `md:text--center`)

## Confirmed NOT working — don't use these

Tested in `daily-saints/half_vertical.liquid` via a real `trmnlp serve`
render (2026-07-27): `w--[160px] h--[190px]` on an `<img>` did **not**
constrain its size — the image rendered at nearly full card width/height,
overlapping the text below it. The bracket arbitrary-value syntax
(`w--[Npx]`, `h--[Npx]`, `basis--[Npx]`, and presumably other `--[...]`
forms) is either not supported by the version of the Framework CSS this
repo's `trmnlp` pulls, or works differently than documented.

**Use plain inline `style="width: Npx; height: Npx;"` for image/element
pixel sizing and `style="flex: 0 0 Npx;"` / `style="flex-basis: Npx;"` for
fixed flex-column widths instead of any `--[Npx]` bracket class.** This is
exactly the kind of "necessary custom style" Chef's inline-style rule
doesn't penalize — arbitrary per-layout pixel dimensions have no fixed-scale
equivalent anyway.

Classes from the same family that are NOT bracket syntax (plain scale
values, e.g. `w--min-0`, `grow`, `shrink-0`) are unaffected by this and
still fine to use — only the `--[value]` bracket form is suspect.

## Lower-confidence classes — verify before trusting

These came from doc excerpts, not yet from rendering them in this repo.
Apply them, but call out to the user that they're unverified and should be
checked with a live preview (see "Verifying changes" below) before treating
them as settled:

| Instead of... | Try... | Why it's unverified |
|---|---|---|
| `style="display: -webkit-box; -webkit-line-clamp: N; -webkit-box-orient: vertical; overflow: hidden;"` (line-clamp hack) | `data-clamp="N"` attribute | Confirmed working by observation in the same `half_vertical.liquid` render (summary text clamped to ~5 lines with a trailing ellipsis) — reasonably safe to use, but only tested at one clamp value on one element type so far |
| `style="border-radius: Npx;"` on an image | `rounded` (exact size modifier, e.g. `rounded--sm`, unconfirmed) | Docs only confirmed the base class exists; not clearly visible one way or the other in the one render checked so far |

If a lower-confidence class doesn't render correctly, just revert that one
spot back to the inline style rather than forcing it — that's a legitimate,
narrow exception, not a failure.

## Known exceptions — no framework utility exists, inline style is correct

- `font-style: italic`
- `word-break: break-all`
- Custom `font-size`/`line-height` smaller than the smallest `label--small`
  preset — e.g. an 8px copyright line crammed into a `quadrant` (400×240)
  layout has no matching class, so leave it inline.

## Worked example

Before (from `bored-api/src/full.liquid`, pre-fix):

```html
<div class="flex flex--col h--full" style="width: 100%;">
  <div class="flex flex--col flex--center-x flex--center-y gap--medium" style="flex: 1;">
    <div class="value value--large" style="text-align: center;">{{ activity.activity }}</div>
    <div class="flex flex--row gap--xsmall" style="flex-wrap: wrap; justify-content: center;">
      <span class="label label--small" style="border: 1px solid currentColor; border-radius: 12px; padding: 2px 10px;">{{ activity.type }}</span>
    </div>
  </div>
  <div class="label label--small text--center" style="opacity: 0.5;">Copyright</div>
</div>
```

After:

```html
<div class="flex flex--col h--full w--full">
  <div class="flex flex--col flex--center-x flex--center-y gap--medium grow">
    <div class="value value--large text--center">{{ activity.activity }}</div>
    <div class="flex flex--row gap--xsmall flex--wrap flex--center-x">
      <span class="label label--small label--outline">{{ activity.type }}</span>
    </div>
  </div>
  <div class="label label--small text--center text--gray-50">Copyright</div>
</div>
```

## Verifying changes

Preview a plugin's layouts with [`trmnlp`](https://github.com/usetrmnl/trmnlp):

```
cd plugins/<plugin-name>
trmnlp serve
```

This repo's dev sandbox frequently lacks Ruby, so `trmnlp` may not be
runnable there — if so, say so explicitly and ask the user to run the
preview themselves, especially for anything from the "lower-confidence"
table above. Don't claim a visual fix is confirmed without actually having
rendered it.
