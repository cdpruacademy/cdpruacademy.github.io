# CD Team Dashboard

## What it is

The monthly work log and product timeline of Prudential Thailand's curriculum development team (ฝ่ายพัฒนาหลักสูตร). It tracks each training project from Kick-off to Internal Training and Target Launch, sends a timeline image and announcements to the team's LINE group, and summarises the year in Analytics.

## Who uses it

- **Team leads and management:** want the month at a glance. How many projects are running, how many are complete, and where work is stuck.
- **Team members:** update their own projects through a shared admin login, and check what is current.
- Everyone reads the LINE image more often than the website.

## Vocabulary (decided 27 Oct 2026)

UI labels are in English; short helper text stays Thai.

| Term | Meaning |
|---|---|
| Project | One product or enhancement being built |
| Completed | Every step delivered |
| In progress | Has a Current step |
| Current | The step the team is on now (`isElearningIcon`) |
| Upcoming | A later step |
| Skipped | A step the project does not use |
| On hold | Paused project |
| Partner | The company Prudential works with (ttb, UOB, CIMB THAI…), or Prudential In-house |
| Channel | A sales channel under a partner (ttb touch, Digital-UOB, Agency…) |
| Owner | The team member responsible |
| Target Launch | Commercial launch date |

## Partners and channels

Two levels. A Partner owns the brand colour; Channels sit under it. Admins add or edit partners, colours and channels in Settings, so new partners need no code change. A project's existing `broker` text maps to a Channel.

## Constraints

- A milestone's `status` stays `completed | pending`. At most one step has `isElearningIcon: true`. The GAS bot depends on this.
- The LINE image must stay correct whatever the website looks like.
- Static export to GitHub Pages; Supabase stores data.
