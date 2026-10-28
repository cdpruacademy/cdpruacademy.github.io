@AGENTS.md

# CD Team Dashboard

The work log and timeline site for the Prudential Thailand curriculum development team (ฝ่ายพัฒนาหลักสูตร). A LINE bot sends its data to the team's LINE group. The owner talks in Thai, so reply in Thai.

## Status (closed 28 Oct 2026)

The style B redesign is **finished and live**. The owner closed the task on 28 Oct 2026. The next session starts from "Open items" and "Suggested features" below; ask the owner which one to do.

Style B, "Brand Hero", was chosen on the design canvas https://claude.ai/artifact/Bhqj9Xqwn5weTtGLGk5584 (page "รอบ 5"). Live commits are `0afd6e6` (redesign) and `89bb980` (CODY, edit form, TBC box, admin-only Partners).

- **What's live:**
  - the red Prudential band on every page
  - Noto Sans Thai, rounded cards and step icons
  - green = Completed, red = Current
  - English UI labels (see PRODUCT.md)
  - Timeline grouped by partner
  - Analytics and Announcements in style B
  - Partners page (admin only)
  - new LINE images
  - a rebuilt add/edit form
- **Partner > Channel:**
  - Code: `lib/partners.ts`, `hooks/use-partners.ts`, page `/partners`.
  - Stored in `timeline_store` row `partners`.
  - Migration `20261028_public_read_partners.sql` is applied, so everyone can read that row.
  - The owner has saved partners once and assigned the old channels.
- **LINE bot = CODY (โคดี้):**
  - The team renamed the bot CODY, from CD TEAM.
  - It answers messages that start with "CODY", "โคดี้" (no space needed) or the old "CD". "CODY help" shows how to use it.
  - Flex cards in `gas/cd-notify-bot.js` use style B, with the CODY logo and line icons, grouped by partner.
  - The icons are PNGs in `public/cody/`, made from `components/icon.tsx` by `node scripts/make-cody-icons.mjs` (LINE cannot show SVG). Rerun the script when an icon changes, and deploy the website before the bot.
  - The owner deploys the bot by pasting the file into Apps Script and creating a new version. This was done on 28 Oct 2026.
- **Edit form:** the form starts from the project being edited and does not reset itself. An old effect used to wipe what the user had typed when partners finished loading, so don't bring back a sync effect.

What earlier rounds tried and the owner rejected: the PRU Academy deck look (square, grey on grey, Sarabun), a dark heading bar with status boxes, and plain cards without infographics.

### Round 6 (28 Oct 2026, built locally, not committed yet)

Designed on canvas page "รอบ 6: งานที่เหลือ", then built:

- **One red:** every red is now Prudential #ED1B2E (tokens, hard-coded hexes, LINE images, CODY icons and `gas/cd-notify-bot.js`). The owner must redeploy the bot for its cards to change.
- **Dialogs in style B:**
  - confirm and toast (`notify-host.tsx`; `confirmAction` takes an optional `icon`)
  - admin sign in (portaled to `<body>`, because the nav trapped the fixed overlay)
  - Team (shows project counts)
  - the announcement form, now a right-side panel with a LINE preview. The parent mounts it only while open, with a key, so there is no reset effect.
  - the Analytics project list, with English step names and Partner badges
- **Phone Timeline:**
  - The red band is about 330px.
  - One month button opens a month/year sheet.
  - A ••• sheet holds Send to LINE and Save image.
  - Add project is a floating button.
- **Code clean-up:**
  - `broker-color-modal.tsx` and `use-channel-colors.ts` are removed.
  - Lint now has 0 errors; 63 warnings remain, mostly unused variables.

### Open items

- **Bot name:** the display name "CODY" in LINE Official Account Manager is set by the owner, not in code.
- **Bot redeploy:** paste `gas/cd-notify-bot.js` into Apps Script after this round is pushed, so CODY uses the new red.
- **Lint warnings:** clear the remaining unused-variable warnings.

### Suggested features (proposed to the owner, not started)

1. **CODY Rich Menu:** a fixed button panel in the LINE chat (Timeline, By partner, My projects, Help), so nobody has to type commands.
2. **CODY reminders:**
   - Push a message when a Current step's date has passed, or when Target Launch is 7 days away.
   - Optionally DM each owner a weekly list of their own projects.
3. **"Needs attention" on the website:** a badge for projects stuck on the same step for more than 60 days, or whose launch is still TBC within a month. The Analytics design round already had "Current step age".
4. **Filters on Timeline:** search, Partner and status filters. They were in the design but are not built.
5. **Change history:** record who changed what and when, because everyone shares one admin login. A name prompt on save is enough.
6. **Monthly report export:** one PDF or Excel file with Timeline + Analytics for management.
7. **Year view:** a Gantt-style roadmap across months, which was option 2 in the design rounds.

Constraints that must not change:

- **Data format:** a milestone keeps `status: "completed" | "pending"`. The Current step is the one with `isElearningIcon: true`, and at most one step has it. A project's `broker` text stays the channel name. The GAS bot and saved records depend on this format.
- **LINE image:** whatever the page looks like, the Timeline image sent to LINE must still look right.

## Stack and deploy

- **Build:** Next.js 16 static export with Tailwind v4. Prettier style has no semicolons.
- **Deploy:** pushing to `main` deploys to GitHub Pages at https://cdpruacademy.github.io/ via GitHub Actions, in about a minute. Commit and push only when the owner asks.
- **Supabase project `bwevlsmrtbqbgsqjpppn`:**
  - Data is in table `timeline_store`, with ids `current`, `announcements`, `latest_image`, `latest_announcement`, `line_group_info`, `line_lead_rooms` and `partners`.
  - RLS: everyone can read `current`, `latest_image`, `announcements`, `latest_announcement` and `partners`; only an admin can write.
  - LINE images are uploaded to the `timeline-snapshots` storage bucket.
  - Scheduled jobs (pg_cron): announcements are sent every 5 minutes, and `timeline_store` is backed up daily into `timeline_store_backups`.
- **Login:** one shared team account, `cdpruacademy@gmail.com`, password only. Never ask for or handle the password in chat.
- **LINE bot:** a Google Apps Script in `gas/`. `collectActiveItems` mirrors the website's `getItemsForMonth`, so the bot's numbers match the site. The owner decided **not** to rotate the LINE token.

## Design system

Style B, "Brand Hero", described in `DESIGN.md`:

- Red Prudential band at the top of every page (`components/page-hero.tsx`), white rounded cards, Noto Sans Thai.
- Red = Current step and the band; green = Completed; partner colours only for partner badges and charts.
- Icons come from `components/icon.tsx`. Don't use emoji or text glyphs as icons.

## Checking changes locally

- The dev server is `dashboard-dev` in `../.claude/launch.json`, on port 3000.
- To see admin-only UI, temporarily force admin on in `hooks/use-admin-auth.ts`:

  ```bash
  cp hooks/use-admin-auth.ts "$TEMP/use-admin-auth.bak"
  sed -i 's/^    isAdmin,$/    isAdmin: true, \/\/ TEMP-LOCAL-TEST/' hooks/use-admin-auth.ts
  ```

  **Always revert it before committing**, then check that `grep -c TEMP-LOCAL-TEST hooks/use-admin-auth.ts` prints 0. Saving is still blocked by the server, so this can't change real data.
- To look at the LINE images, find the off-screen `div[aria-hidden="true"]` placed at `left: -99999px` and set its `left` to `0`.
- Run `npx tsc --noEmit` and `npx next build` before pushing. Running `next build` while the dev server is up crashes the dev server, so stop it first.
