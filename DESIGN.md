---
name: CD Team Dashboard
description: Prudential Thailand curriculum development team's project timeline, announcements and analytics, built on the PRU Academy house style ("clean, formal")
colors:
  paper: "#FBFAF8"
  surface: "#F2F2F2"
  white: "#FFFFFF"
  rule: "#E0E3E5"
  ink: "#4E565C"
  ink-soft: "#5F6970"
  pru-grey: "#68737A"
  mid-grey: "#A7A8AA"
  light-grey: "#D0D0CE"
  pru-red: "#ED1B2E"
  pru-red-ink: "#C8102E"
  pru-red-soft: "#FDECEE"
  brand-fill: "#4E565C"
  brand-hover: "#3D4449"
  enhancement: "#68737A"
  status-done: "#4E565C"
  status-active: "#ED1B2E"
  status-paused: "#A7A8AA"
typography:
  family: "Sarabun (400, 700), Tahoma, sans-serif"
  display: "40px / 700 (28px on phones)"
  body: "15px / 400"
  label: "13px / 400-700"
rounded:
  all: "0"
shadow: none
---

# CD Team Dashboard: design system

The site follows the PRU Academy design system: clean, formal and quiet, with red used as an accent. Tokens are defined in `app/globals.css` inside `@theme`. Tailwind's `gray`, `slate`, `red`, `amber`, `emerald`, `green` and `blue` scales are remapped to brand greys and brand reds, so older utility classes still land on brand colours.

## Rules

- **Square shapes.** Every radius is 0. Cards use a 2px `rule` border on white or `paper`. Nothing has a shadow or a gradient.
- **Red is an accent.** Keep red to roughly 20–30% of a screen. It goes on the key word in a headline, on progress and the "current" state, and on one hero KPI card per row.
- **White on red only at 24px and up.** For that reason primary buttons are filled with `ink` (`brand-fill`), not red. Secondary buttons are white with a 2px `rule` border that darkens to `ink` on hover.
- **Signature eyebrow.** `<Eyebrow>` in `components/pru-icon.tsx` draws two red bars (72×10 and 20×10) followed by an uppercase label, and sits above each page headline.
- **Headlines state the point.** For example "งานเดือน **ตุลาคม 2026**", "ส่งมอบแล้ว **56** จาก 67 โครงการ", "ข่าวถึงทีม **ส่งเข้า LINE** ให้อัตโนมัติ".
- **Type.** Sarabun only, loaded from `next/font`, in weights 400 and 700.

## Icons

All icons come from `PruIcon` in `components/pru-icon.tsx`. Each is a line icon on a 48-unit viewBox with stroke 3–4, and each stroke has an opening. Do not use emoji or Unicode symbols as icons. Lucide is kept only for the `Loader2` spinner and in older dialogs.

- `pin` always means the latest update, i.e. the current phase. It is used nowhere else.
- `board` marks a channel (broker). `person` marks an owner. `target` marks the launch date.

## Timeline

- Progress line: solid red up to the current phase, then a short gap (the "opening"), then dashed grey for phases still to come. Done phases are red dots, the current phase is a red `pin`, and upcoming phases are grey rings.
- The current phase is the milestone the team flags in the form (`isElearningIcon`, shown as the pin toggle). If nothing is flagged, it is the first open phase. Finished projects have no current phase.
- Status colours: done = `ink`, in progress = red, paused = `mid-grey` with a dashed border.
- Series colours: New Product = red, Enhancement = grey. They are used this way in analytics charts and in the LINE images.
- Phones (below `md`) get `TimelineMobileList`: one card per project with segmented progress and a "ตอนนี้: …" line, expandable to show every phase and the admin actions. Desktop and the LINE images use the 3-column grid `[280px | phases | 140px]`.

## LINE images

`TimelineExportBoard` (1280px) and `ChannelSummaryExportBoard` (1200px) are rendered off-screen and captured as PNG. They share the page language: Eyebrow, a red-keyword headline, the Prudential logo, white bordered tables, the legend, and a footer line marking the image as confidential. The channel summary lists the top 9 channels and groups the rest as "อื่นๆ".

## Accessibility

- Focus ring is a 2px `pru-red-ink` outline via `:focus-visible`.
- The `touch-target` utility makes controls 44px on coarse pointers.
- Dialogs use `useDialogA11y`: focus trap, Escape to close, and focus returns to the trigger.
- Toasts and confirm dialogs go through `lib/notify`.
