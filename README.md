# nnole

**Content delivery for very large video.**

## The Story

nnole.com started as a joke: a domain bought out of boredom, hosting a
deliberately pointless "website about nothing" — a shop selling six varieties
of nothing, a search that found nothing, a contact form that sent messages
into a void.

Then a friend asked if the domain could serve a very large VR video file.
It could. Word got around.

Today nnole is a small, invite-only CDN serving real clients — mostly
multi-gigabyte VR and 360° video, delivered from redundant object storage
through a global edge cache. The joke era is over, but its visual language
(and exactly one falling-letters gag) survives on the marketing site.

## What the site is

This repo is the marketing/landing site at [nnole.com](https://nnole.com).
It is **not** the delivery path itself — client content is served separately.

The site includes a live status section with zero fabricated numbers: the
visitor's browser measures real round-trip latency against the network and
shows the real edge location (`/api/edge`) serving them.

## Tech Stack

- [React Router 7](https://reactrouter.com/)
- Cloudflare Workers
- Tailwind CSS

No database. The status data comes from the incoming request itself
(edge colo / geo) plus client-side timing.

## Getting Started

### Prerequisites

- Node.js 18+
- A Cloudflare account

### Develop

```sh
npm install
npm run dev
```

### Check & deploy

```sh
npm run check    # typecheck + build + dry-run deploy
npm run deploy
```

### OG image

The Open Graph image is generated, not hand-drawn:

```sh
python3 scripts/generate-og.py   # needs Pillow; writes public/og.png
```
