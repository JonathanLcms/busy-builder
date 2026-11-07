# Busy Builder Notes

- OpenAI model with "luna" in its name: `gpt-5.6-luna`
- Saves on this computer only for now

## How to run
Open a terminal in this folder and run:

    node server.js

Then open http://localhost:3000 in your browser.

## What's done (V1)
- Two tabs at the top: "Today" (one-day schedule) and "This Week" (whole week)
- Today tab: one dump box + preferences; Week tab: an input box for each weekday (Mon-Sun) plus an "Any day" box — same AI organizes both
- Week results show in sections per day (Monday, Tuesday, ...); today shows one table
- Buttons send it to the real OpenAI AI through a small local server (key stays on the server, never in the page)
- Follow-up box to answer the AI's question or ask for a change
- Friendly, kind tone only — no pressure or judging (safety plan)
- Quick "sign in" = just a first name, stored locally
- Everything saves in the browser (localStorage) via storage.js, with made-up sample items
- "Thinking..." shown and button disabled while the AI works; friendly error if the key or internet fails

## What's next
- Test saving + AI in the browser
- Record a short video of the main job (dump list → organized schedule)

## Maybe Later
- Real database instead of localStorage (storage.js is the only file to swap)
- Real accounts/login instead of the name box
- Calendar export / reminders
- Edit or reorder schedule blocks by dragging
- Mobile app version
