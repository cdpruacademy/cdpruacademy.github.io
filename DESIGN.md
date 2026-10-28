---
name: CD Team Dashboard
description: Prudential Thailand curriculum development team's project timeline, analytics, announcements and partner settings. Style B, "Brand Hero".
colors:
  pru-red: "#ED1B2E"
  brand-ink: "#ED1B2E"
  pru-red-soft: "#FFE9EB"
  done: "#15803D"
  done-soft: "#E3F5EA"
  ink: "#1C1917"
  ink-soft: "#57534E"
  rule: "#E7E5E4"
  surface: "#F5F5F4"
  paper: "#F7F5F3"
  enhancement: "#78716C"
typography:
  family: "Noto Sans Thai (400, 500, 600, 700), Tahoma, sans-serif"
  hero-number: "88px mobile / 124px desktop, 700"
  page-title: "34–44px / 700"
  body: "14–15px / 400"
  label: "12–13px / 600"
rounded:
  card: "20px"
  button: "999px"
  tile: "16px"
shadow: "card: 0 1px 2px rgba(41,37,36,.05), 0 8px 24px -12px rgba(41,37,36,.12)"
---

# CD Team Dashboard: design system (style B, "Brand Hero")

Chosen by the owner on 28 Oct 2026 from three options on the design canvas
(https://claude.ai/artifact/Bhqj9Xqwn5weTtGLGk5584, page "รอบ 5"). Tokens live in `app/globals.css` inside `@theme`.

## Rules

- **Red band on every page.** The nav and the top of each page share one Prudential red band (`bg-pru-red`, #ED1B2E). `PageHero` draws it and `PageBody` overlaps its lower edge with white cards (`components/page-hero.tsx`). The band carries the page's headline number in white.
- **Red means Current; ink means Completed.** The site uses only Prudential red, ink and greys (the owner dropped green on 28 Oct 2026). On the timeline one solid grey line runs from the first step to the last that matters; the part already done is ink. A done step is an ink circle with a tick, the Current step is a red circle with that step's icon, an upcoming step is a white circle with a grey ring, and a skipped step has no marker: the line runs straight through it, because that step is not part of the project.
- **Partner colours** belong to partners, not channels, and are edited on the Partners page. Use them only for partner badges, group bands, chart segments and dots. Never use a partner colour for status.
- **Cards** are white, 20px corners, the soft `--shadow-card`. Buttons are pills. Primary actions on white are ink (`cardButtonDark`); on the red band they are white (`heroButtonSolid`).
- **One red.** Every red on the site, in the LINE images and in CODY is Prudential red #ED1B2E (`pru-red`; `brand-ink` and the `red-*` scale point to the same value). The owner chose this on 28 Oct 2026 over a darker red for small text, so keep red text 14px semibold or larger. Text on the red band is white.
- **Words:** UI labels are English (Project, Completed, In progress, Current, Upcoming, Skipped, On hold, Partner, Channel, Owner, Target Launch); short helper text stays Thai. See PRODUCT.md.
- **Table headings** show the step icon in an ink circle, the step number and a two-line name broken between words (`PHASE_HEADINGS` in `timeline-row.tsx`).

## Icons

`Icon` in `components/icon.tsx`: 24 viewBox line icons, stroke 1.8, round caps, colour from `currentColor`. Each timeline step has its own icon (`PHASE_ICONS`): Kick-off flag, First Draft document, e-learning screen, Final Approval seal, Final e-learning laptop, Internal Training classroom, Target Launch rocket. No emoji or text glyphs as icons. Older dialogs still use `PruIcon` and Lucide.

## Partners and channels

`lib/partners.ts`. A partner has a name, one brand colour and a list of channels. A project's `broker` text is its channel, so saved data does not change. `partnerOf()` finds a channel's partner; channels nobody lists fall into "Other" (grey) and are flagged on the Partners page. Partners are stored in `timeline_store` row `partners` (read by everyone once migration `20261028_public_read_partners.sql` is applied; written by admins).

## Timeline

`TimelineHero` (band: controls, project count, status pills, partner mix), `StepTiles` (projects at each step), `TimelineTable` (headings, partner groups, rows, legend). Phones get `TimelineMobileList`. The LINE image `TimelineExportBoard` (1280px) reuses the same pieces in compact mode, and "Save image" downloads that board.

## LINE images

`TimelineExportBoard` (1280px, one per type) and `ChannelSummaryExportBoard` (1200px, projects by partner) render off-screen and are captured as PNG.

## Accessibility

- Focus ring: 2px `brand-ink` outline via `:focus-visible`.
- `touch-target` makes controls 44px on coarse pointers.
- Step markers carry text labels ("Final Approval: Current") for screen readers.
- Dialogs use `useDialogA11y`; toasts and confirms go through `lib/notify`.
