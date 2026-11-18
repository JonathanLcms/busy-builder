# Busy Builder — Rounds

- Round 1 — Built V1: dump a task list, AI returns a clean schedule with questions.
- Round 2 — Week support: tasks could carry a day, schedule spans Mon–Sun.
- Round 3 — Today / This Week tabs sharing the same AI.
- Round 4 — Week tab got an input box per weekday plus "Any day".
- Round 5 — Look + feel polish for judging (bigger title, steps, chips, Clear + Copy).
- Round 6 — Custom shortcuts: users create codes like HW = Homework to type less; the AI writes the full name in the schedule.
- Round 7 — Alarms tab: set a date/time + short note; a banner pops up and beeps when the time hits (while the app is open).
- Round 8 — Email tab (optional): enter an email, press the button, and your own mail app opens with the schedule pre-filled — each event listed with its times and name.
- Round 9 — Email tab now sends for real through the server via EmailJS (no mail app opens); added "which schedule(s)" checkboxes. Needs EmailJS keys in .env to activate.
- Round 10 — App moved to docs/ so GitHub Pages serves the real app at jonathanlcms.github.io/busy-builder (AI + email still need the local server).
- Round 11 — Live site can now do AI + email: when no local server is detected, the page asks for your OpenAI key once (saved in your browser only, never in code/GitHub) and calls OpenAI directly.
- Round 12 — Save file export/import: download all your work as a .json file and load it later to resume (AI key excluded for safety).
