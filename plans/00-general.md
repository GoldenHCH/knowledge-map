# General Plan

**Demo path (one sentence):** Pick a goal, load a sample learner, see the gaps on the map, open a lesson fitted to what you know, mark it learned and watch the path shrink.

## Phases

Time budget is about 42 minutes of building for phases 01 to 04, plus 10 for the video stretch. Phase 01 blocks the rest; 02 and 03 can run side by side.

| # | Phase | Minutes | Blocking? | Can run in parallel with | Plan file | Status |
|---|-------|---------|-----------|--------------------------|-----------|--------|
| 01 | Data + graph logic: concept and map types, three seeded maps, layout, gap and path calculation, mastery saved in the browser | 8 | Yes | — | `phase-01-data.md` | Live |
| 02 | Map screen: goal picker, map drawing, mark known / shaky / new, path list, sample learner | 12 | | 03 | `phase-02-map.md` | Live |
| 03 | Guided-dialogue lessons: three serverless functions (topic → map, step → question ladder, answer → reply), concept panel with the dialogue, hint and "show the reasoning", missing-prerequisite warning, hand-written ladders for two demo-path lessons | 14 | | 02 | `phase-03-lessons.md` | Live |
| 04 | Ship: deploy to Vercel, walk the demo path on the live link, write README with the link and demo flow | 8 | — | — | — | Live at https://gapmap-eight.vercel.app |
| 05 | Stretch, only once 04 is live: make one video with ElevenLabs for the "Chain rule" lesson, embed it, redeploy | 10 | — | — | — | Live: one Chain rule video, 7,272 credits |
| 06 | Added during the build: transcript import, MCP connector, landing page with demo and sign-up | — | — | — | — | Live |
| 07 | Last mile if time remains: phone layout check, UI polish | rest | — | — | — | Phone width checked on landing, map and concept panel |

## Requirements from the brief

- Submission MD includes a link to the live hosted app
- The app is reachable by a judge with no login
- Keep track of what the learner knows
- Show where the gaps are between the learner and a goal, including missing prerequisites
- Generate tutorials based on what the learner knows: no assumed prerequisites, no re-teaching known material
- Lessons are a dialogue: questions built on what the learner knows that lead them to reason out the answer
- If time allows: video tutorials generated with ElevenLabs

## Decisions

- **Hosting: Vercel.** The Firebase CLI is not installed and no Firebase project exists; Vercel is installed and signed in. Angular front end in `app/`, serverless functions in `app/api/`.
- **Model access: Claude through the Anthropic SDK**, with `ANTHROPIC_API_KEY` set only in Vercel. Default model Claude Opus 5.5 at low effort; `GAPMAP_CLAUDE_MODEL` switches it. Without a key the functions fall back to Vercel AI Gateway (Gemini 2.5 Flash, GPT-4o mini), because the team's gateway plan blocks Claude models there.
- **Sign-ups: Supabase**, project `gapmap`, one insert-only `signups` table.
- **MCP: stateless**, with the learner's knowledge carried in the connector link as a snapshot, because there are no accounts.
- **Lesson format: a three-question quiz**, multiple choice and fill-in-the-blank, generated in one model call and checked in code. A live, streaming tutor chat is the optional mode for learners who are stuck.
- **Video: made ahead of time, one lesson only.** Phase 05 starts only after the live link works, and is the first thing dropped if the clock runs short.
- **Storage: the browser's localStorage.** No Firestore, no accounts.
- **Change detection: zone.js**, because `[ANG-03]` rules out signals and Angular 21 is zoneless by default.
- **Package manager: npm.** `[PKG-02]` asks for yarn, which is not installed on this machine.

## Cut on purpose

- Accounts and sync between devices
- Recommending real videos
- Generating a video on demand for every lesson
- Quizzes that verify knowledge
- Hand-editing maps
- Spaced repetition and history
- Tests, beyond walking the demo path
