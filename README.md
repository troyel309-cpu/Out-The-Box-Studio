# Out the Box Studio

**Turn an idea into organized, production-ready creative work.**

Out the Box Studio is a local-first AI creative production platform that helps creators move from a raw idea to a governed production workflow. Instead of one general assistant, the studio identifies the work, assembles specialized workers, manages references and characters, and keeps production assets organized.

## What it does

- Creates and manages creative projects
- Routes work through specialized AI workers
- Preserves character continuity
- Stores reference images and production assets locally
- Supports Hybrid, My Picture Only, and AI Only modes
- Plans image, story, voice, video, and release work
- Keeps the OpenAI API key server-side

## Workflow

```text
Idea → Capabilities → Qualified Crew → Execution Plan → Production → Verification
```

## Technology

- Node.js 20+
- JavaScript ES modules
- HTML and CSS
- OpenAI API
- Local JSON registries

## Run locally

```bash
read -s "OPENAI_API_KEY?Paste your OpenAI API key: "
export OPENAI_API_KEY
echo
npm start
```

Open `http://localhost:3000`.

## Verify

```bash
npm run check
```

## Reference asset modes

**Hybrid:** use an uploaded picture with AI.

**My Picture Only:** preserve the original picture as the production artifact.

**AI Only:** create from a written request without an uploaded reference.

Supported uploads: PNG, JPG/JPEG, and WEBP up to 15 MB.

## Character continuity

Registered characters can include appearance, wardrobe, personality, continuity rules, negative constraints, and version information.

## Current release

**v1.0.0 — OpenAI Build Week submission**

See [`RELEASE_NOTES.md`](RELEASE_NOTES.md), [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md), and [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

## Roadmap

- Expanded image, video, and audio workflows
- Stronger production verification
- Reusable templates
- Collaboration
- Provider routing
- Evidence dashboards

## Principle

> The idea moves through the studio. The creator does not have to carry every job alone.

## Security

Never commit API keys, `.env` files, private customer information, or private uploaded assets. See [`SECURITY.md`](SECURITY.md).

## Status

Built and locally verified. Production-scale usage and outcome proof remain future milestones.
