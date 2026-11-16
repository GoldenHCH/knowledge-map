# GapMap

**Know what you know. Learn only what's missing.**

**Live app: https://gapmap-eight.vercel.app** (no login needed)

## The problem

When you set out to learn something, you don't know where to start or where your gaps are. Videos and tutorials are written for an imagined average learner. Some assume prerequisites you never learned. Others spend twenty minutes on material you already know. Nothing keeps track of what *you* know, so every new topic starts from a guess.

## What GapMap does

GapMap keeps a map of what you know, shows the exact gaps between you and a learning goal, and teaches each missing piece by asking questions that start from what you already know.

- **A map of the goal.** Every goal is drawn as a prerequisite map: foundations at the top, the goal at the bottom.
- **Your knowledge on the map.** Mark each concept as known, shaky or new. One knowledge profile carries across maps, so "Probability basics" learned for statistics is already green when you open machine learning.
- **Import from a transcript.** Paste a transcript, course list or CV, or upload a text file. GapMap suggests what you already know, with the evidence for each suggestion, and you confirm before anything changes.
- **Only the gaps, in order.** The path lists just the concepts you are missing, prerequisites first: "8 lessons · skipping 9 you already know".
- **A warning before you get lost.** Open a concept too early and GapMap names the prerequisites you are missing and where to start instead.
- **Lessons as a guided dialogue.** A lesson is three questions, not a lecture. Each question starts from a concept you know, you type your reasoning, and the tutor replies with what is right and a nudge toward the next step. You work the idea out yourself.
- **An 8-second video version.** The Chain rule lesson has a short video generated with ElevenLabs: three gears and a voiceover showing that rates multiply.
- **Any topic.** Type a goal and GapMap builds its map.
- **Your knowledge inside Claude or ChatGPT.** GapMap is also an MCP server. Add your personal connector link to Claude or ChatGPT and the assistant can check what you already know and find your gaps before it explains anything.

## Try it in two minutes

1. Open https://gapmap-eight.vercel.app and click **Try the demo**. It opens the neural network map with a sample learner loaded, and the path reads "8 lessons · skipping 9 you already know".
2. Play the 8-second video on the landing page or inside the Chain rule concept.
3. Click **Backpropagation** on the map. GapMap warns that six prerequisites are missing and points to **Chain rule**.
4. Click **Go to Chain rule**, then **Start lesson**. Answer the first question in your own words and press **Check my thinking**.
5. Finish the three questions and press **I've got it — mark as learned**. The concept turns green and the next step unlocks.
6. Click **Import from transcript**, pick a sample transcript and press **Find what I know** to see GapMap propose what a learner knows from their courses.
7. Click **Connect to Claude or ChatGPT** in the top bar to copy your personal MCP link.
8. Back on the landing page, leave an email under **Get early access**.

## Connect it to Claude or ChatGPT

The MCP endpoint is `https://gapmap-eight.vercel.app/api/mcp`. The app adds a snapshot of your knowledge to the link, so copy it from **Connect to Claude or ChatGPT** in the top bar.

- **Claude:** Settings → Connectors → Add custom connector → paste the link.
- **ChatGPT:** Settings → Connectors → turn on developer mode → Create → paste the link as the MCP server URL, authentication "None".

Tools the assistant gets:

| Tool | What it returns |
|------|-----------------|
| `get_knowledge_profile` | The concepts you know and the ones you are shaky on |
| `check_concepts` | For a list of concept names: known, shaky or unknown |
| `find_gaps` | For a goal: the ordered concepts you still need, the ones you can skip, and the next step |

## How it works

The model sits at the edges. Everything in between is code.

```
Typed goal ──[model]──▶ concepts + prerequisites ──▶ validated graph
Transcript ──[model]──▶ suggested known concepts ──▶ learner confirms
                                                          │
                              graph + what you know ──▶ gaps and path (code)
                                                          │
Path step + what you know ──[model]──▶ three guiding questions
Your typed answer ──[model]──▶ a reply on your reasoning
```

- **Gaps and path** are computed in code: a walk over the prerequisite graph and a topological sort. No model decides what you know or what comes next.
- **Model output is validated** before use: concept ids are normalised, unknown prerequisites dropped, cycles removed. Bad output is retried once, then the app falls back.
- **Every model path has a fallback.** Three maps are ready-made, two lessons on the demo path are hand-written, and if a reply call fails the lesson shows the stored line of thought instead.

## Stack

- Angular 21 (standalone components) with Angular Material and SCSS, in `app/`
- Vercel serverless functions in `app/api/`: `map`, `lesson`, `reply`, `transcript`, `mcp`, `signup`
- Vercel AI Gateway for model calls; no API key in the repo or the browser. Lessons, replies and transcript reading run on Gemini 2.5 Flash and map generation on GPT-4o mini; set `GAPMAP_LESSON_MODEL` and `GAPMAP_MAP_MODEL` to change them
- ElevenLabs for the lesson video, generated ahead of time and served from `app/public/media/`
- Supabase for early-access sign-ups: one table that visitors can add to but not read
- Knowledge is stored in the browser's `localStorage`; there are no accounts

## Limits

- **No accounts.** Your knowledge lives in one browser and does not sync between devices.
- **The MCP link is a snapshot.** It carries the concepts you knew when you copied it; copy a fresh link after you learn more. Anyone with the link can read that list.
- **Mastery is self-reported.** The transcript import and the tutor suggest; you decide what counts as known.
- **Transcripts are plain text.** Paste the text of a PDF rather than uploading the file.
- **Generated maps take about eight seconds** and are simpler than the three ready-made maps.
- **One video so far.** Only the Chain rule lesson has a video; it was generated ahead of time, not on demand.
- **Sign-up is a waiting list.** It stores an email; it does not create an account yet.

## Run it locally

```bash
cd app
npm install
npx ng serve
```

The AI functions run on Vercel. To run them locally, link the project and use `vercel dev` from `app/`.

## Repo guide

- `brief/brief.md`: the problem, scope and demo script
- `plans/00-general.md`: build phases and decisions
- `rules/`: coding conventions the project follows
