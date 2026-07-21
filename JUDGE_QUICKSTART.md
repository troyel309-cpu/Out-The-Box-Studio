# Out the Box Studios — Judge Quick Start

## What this project demonstrates

Out the Box Studios turns a rough idea into a visible production job, routes it through specialized AI workers, exposes work stages and artifacts, and blocks a final release when required media or proof does not exist.

## Requirements

- Node.js 18 or newer
- npm
- An OpenAI API key for provider-backed generation

## Run locally

```bash
npm install
cp .env.example .env
# Add OPENAI_API_KEY to .env only when testing provider-backed generation.
npm start
```

Open:

```text
http://localhost:3000
```

## Suggested judge path

1. Open the studio.
2. Upload a reference image or choose AI-only mode.
3. Enter a short production idea.
4. Start the production job.
5. Watch the specialized workers change state.
6. Inspect the generated artifacts and evidence.
7. Confirm that unfinished provider-dependent work remains honestly blocked.

## Integrity note

The app separates planning artifacts from real generated media. It does not label images, narration, video, or final release as complete unless the corresponding output exists.
