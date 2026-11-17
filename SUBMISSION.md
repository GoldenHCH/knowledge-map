# GapMap

**Know what you know. Learn only what's missing.**

- **Live app:** https://gapmap-eight.vercel.app (no login needed)
- **Code:** https://github.com/GoldenHCH/knowledge-map

## The problem

When I want to learn something, I don't know where to start or where my gaps are. Every video and tutorial is written for an imagined average learner. Some assume prerequisites I never learned, and I get lost ten minutes in. Others spend twenty minutes on material I already know. Nothing keeps track of what *I* know, so every new topic starts from a guess.

## What I built

GapMap keeps a map of what you know, shows the exact gaps between you and a learning goal, and teaches each gap by asking questions that start from what you already know.

1. **Pick a goal.** It is drawn as a prerequisite map, foundations at the top and the goal at the bottom. Three maps are ready-made (44 concepts); type any other topic and GapMap builds its map.
2. **Tell it what you know.** Mark concepts as known, shaky or new, or paste a transcript, course list or CV. GapMap suggests what you already know and shows the evidence for each suggestion ("MATH 101 Calculus I, A-"), and you confirm before anything changes.
3. **See only your gaps.** The path lists just the concepts you are missing, prerequisites first: "8 lessons · skipping 9 you already know". Open a concept too early and GapMap names what you are missing and where to start instead.
4. **Work it out yourself.** A lesson is three multiple-choice or fill-in-the-blank questions, not a lecture. Each one starts from a concept you already know, and answering them in order leads you to the new idea. Pick a wrong choice and you are told why that particular mistake goes wrong. If you get stuck, a live tutor chat streams its answer as it is written, and it knows the question you are on and what you already know.
5. **Take your knowledge with you.** GapMap is also an MCP server. Add your personal link to Claude or ChatGPT and the assistant can check what you know and find your gaps before it explains anything.

## Try it in two minutes

1. Open https://gapmap-eight.vercel.app and click **Try the demo**. A sample learner's map opens, and the path reads "8 lessons · skipping 9 you already know".
2. Click **Backpropagation** on the map. GapMap warns that six prerequisites are missing and points to **Chain rule**.
3. Click **Go to Chain rule**, then **Start lesson**. The first question starts from Derivatives, which this learner knows. Pick "5 times as fast" to see the feedback on that mistake, then pick the right answer. Click **Stuck? Talk it through live** and ask for a smaller first step.
4. Finish the three questions and press **I've got it — mark as learned**. The concept turns green and the path shrinks.
5. Click **Import from transcript**, pick a sample transcript and press **Find what I know**.
6. Click **Connect to Claude or ChatGPT** in the top bar and copy your personal MCP link.

## Functionality: does it work?

Everything below runs on the live link today.

| Feature | State |
|---------|-------|
| Landing page with one-click demo and early-access sign-up | Works; sign-ups are stored in a database visitors can add to but not read |
| Prerequisite maps, known / shaky / new marking, saved in the browser | Works on desktop and phone width |
| Gap path and missing-prerequisite warning | Works; computed in code, so it is instant and repeatable |
| Quiz lessons: multiple choice and fill-in-the-blank, checked instantly | Works; the two demo-path lessons open instantly, a new lesson takes about 15 seconds to write |
| Live tutor chat | Works; first words in about 1.5 seconds, streamed |
| Transcript import | Works; about 2.5 seconds |
| Any-topic map generation | Works; about 13 seconds |
| MCP server at `/api/mcp` | Works; `initialize`, `tools/list` and all three tools verified with direct JSON-RPC calls |
| 8-second video lesson for the chain rule, generated with ElevenLabs | Works; plays on the landing page and inside the lesson |

It is built not to break in a demo. Every model call has a fallback: the three maps are ready-made, two lessons on the demo path are hand-written, and any other lesson falls back to a quiz built from the map itself. Quiz answers are checked in code, so a lesson never waits on a model once it has loaded. Model output is validated before use and retried once if it is malformed.

## Creativity: what is new here?

- **The unit is what you know, not what the course covers.** Courses and videos are organised around their own syllabus. GapMap is organised around one learner's knowledge and subtracts it from the goal. The headline number is what you get to skip.
- **One knowledge profile across every topic.** Knowledge is keyed by concept, not by course. "Probability basics" learned for statistics is already green when you open machine learning.
- **Lessons that ask instead of tell.** Because GapMap knows what you know, each question can start there: "If y changes 3 times as fast as u, and u changes 2 times as fast as x, how fast does y change with x?" You derive the chain rule yourself in three steps. The wrong options are the mistakes people actually make (adding the rates, dividing them), each with its own explanation.
- **Your knowledge follows you into your AI assistant.** Chat assistants explain everything from zero because they don't know you. With the GapMap connector, Claude or ChatGPT can call `find_gaps` first and build on what you know.
- **A transcript as onboarding, with receipts.** GapMap reads what you have already studied, shows the course behind each suggestion, and leaves the decision to you.

## Ambition: how high did it aim?

The first version only needed a map and a tutorial generator. It ended up as a product with six connected pieces:

- A learner model that works for **any topic**, not a fixed curriculum
- A **teaching method** (a quiz that leads you to the idea, plus a live tutor), not just generated text
- **Three ways in**: tap the map, import a transcript, or load a sample learner
- **A way out of the app**: an MCP server, so the same knowledge profile improves every other AI tool the learner uses
- **A second medium**: a video lesson generated with ElevenLabs
- A **landing page with sign-up**, so it can start collecting real learners

Where it goes next: accounts so the profile follows you across devices and stays live inside the MCP connector, a video for every lesson generated on demand, and checks that verify knowledge instead of relying on self-report.

## Technical difficulty: what was hard?

- **Graph logic written from scratch.** A layered map layout (longest-path depth, barycentre ordering to reduce edge crossings, Bézier edges), transitive prerequisite walks, and a topological ordering that produces the gap path and the next unlockable step. No graph or diagram library.
- **Making model output safe to use.** A generated map can contain duplicate ids, prerequisites that don't exist, or cycles. The server normalises ids, drops bad edges and removes cycles before the graph logic sees it. Transcript findings are checked against the map's real concept list, so the model cannot invent knowledge.
- **The model stays at the edges.** A model turns text into structure (topic → map, transcript → suggested concepts) and structure into text (path step → questions, answer → reply). Everything in between is code. No model decides what you know or what comes next.
- **A hand-written MCP server.** JSON-RPC 2.0 over Streamable HTTP with no SDK: protocol version negotiation, notifications, batches, tool schemas and CORS, running as a stateless serverless function. With no accounts, the learner's knowledge travels in the connector link as a snapshot. The server reuses the app's own graph code, so the assistant and the app always agree on the gaps.
- **Lessons that are generated once and then run without a model.** One call writes the whole quiz: three questions, four options each, a targeted explanation for every wrong option, and every accepted form of each blank. The server rejects a quiz with the wrong shape (no blank marker, more than one correct option). After that, answers are checked in code, so feedback is instant.
- **A streaming tutor chat.** The server streams Claude's reply to the browser as it is written, with the concept, the current question and the learner's known and shaky concepts in the prompt, and instructions to guide rather than give the answer away.
- **Six serverless functions and three services**, all without a secret in the repo or the browser: model calls go to Claude through the Anthropic SDK with the key held only in the hosting environment, sign-ups go to Supabase behind an insert-only rule, and the video comes from ElevenLabs.
- **Built by orchestrating parallel agents.** One lead session wrote the type contract and briefs, then six parallel Claude Code sessions built against that contract in a single shared checkout, each owning separate files, while the lead integrated, deployed and tested on the live link.

## Stack

Angular 21 with Angular Material · Vercel serverless functions · Claude Opus 5.5 through the Anthropic SDK · Supabase · ElevenLabs · Model Context Protocol

## Honest limits

- **No accounts yet.** Knowledge lives in one browser. The sign-up form is a waiting list.
- **The MCP link is a snapshot.** It carries what you knew when you copied it. It was verified at the protocol level, not yet inside the Claude or ChatGPT connector screens.
- **Mastery is self-reported.** The transcript import and the tutor suggest; you decide what counts as known.
- **One video so far**, generated ahead of time for the chain rule lesson.
