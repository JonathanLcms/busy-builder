# Busy Builder

**Let's fix the busy schedule** — a free, kind AI schedule organizer for students (middle school → college), built for the Presidential SI Challenge.

**Live site:** https://jonathanlcms.github.io/busy-builder/
(The site loads the app; AI organizing + email need the local server running — see below.)

## What it does
- **Today** — dump a messy list, get a clean one-day schedule
- **This Week** — a box for each weekday, organized across the week
- **Alarms** — timed reminders that pop up and beep
- **Email** — send your finished schedule to any email
- **Shortcuts** — make your own codes (HW = Homework) to type less

The AI plans realistic times, never double-books, asks when something's unclear — and is always encouraging, never judging.

## Run it locally (full features)
1. Put an OpenAI key in `.env`: `OPENAI_API_KEY=your-key`
2. Run `node server.js`
3. Open http://localhost:3000

The AI calls go through a small local server so the key never leaves your computer.

## Why it matters
Over 52% of high schoolers struggle with procrastination or time management. Busy Builder makes planning instant.
