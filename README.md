# nnole

**A website about nothing.**

## The Story

I bought the domain `nnole.com` for no particular reason.

One day I looked at it and realized it was basically "Elon" spelled backwards.  
At that point I felt emotionally committed to doing something with it.

Instead of building something useful, productive, or even mildly ambitious, I made a website whose entire purpose is to celebrate its own lack of purpose.

This is that website.

## What is nnole?

nnole is a deliberately pointless, anti-productivity, conceptual art project disguised as a website.

It has no mission statement, no founder story, no newsletter, no roadmap, and no desire to "solve" anything.  
Its one (1) "useful" feature is a random 5-letter `.com` domain suggestion generator.  
We make no guarantees about availability. In fact, we openly admit we don't check.

The site exists primarily to be stared at, to waste a few minutes of your life, and to serve as a small monument to the strange human impulse to buy domains for no reason.

## One Accidentally Useful Feature

The domain suggestions.

We genuinely considered building a proper domain availability checker.  
It seemed like too much hassle, so we gave up.

Instead, the site just generates random 5-letter combinations and presents them with the honest disclaimer that some of them *might* be available... but we have no idea.

## Tech Stack

- [React Router 7](https://reactrouter.com/)
- Cloudflare Workers
- Tailwind CSS

Zero external databases. The "accidentally useful" domain suggestions are generated in the browser.

## Getting Started

### Prerequisites

- Node.js 18+
- A Cloudflare account (free tier is enough)

### Clone & Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/nnole.git
cd nnole
npm install
npm run dev
```

Your local version will be available at `http://localhost:5173`.

## Deployment

Because this repository is connected directly to Cloudflare for automatic deployments, **every push to `main` will trigger a production deploy**.

### Important
No databases or special bindings are required. Just push to `main` (or run `npm run deploy` locally after building). The site runs with zero external services beyond the Workers runtime.

## License

This project is free for personal and commercial use.

You are free to use, modify, fork, or even deploy your own version of nnole without asking for permission.

Attribution is appreciated but not required.

---

*Built out of boredom on a domain bought out of boredom.*  
*Spells ELONN backwards (close enough).*