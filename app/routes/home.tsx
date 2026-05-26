import type { Route } from "./+types/home";
import { useFetcher } from "react-router";
import { getFiveAvailableDomains, forceRefreshDomains } from "../lib/domains.server";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "nnole" },
		{ name: "description", content: "I bought this domain for no reason. Now it has a website that also has no reason." },
	];
}

const REFRESH_COOKIE = "nnole_last_refresh";

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const domains = await getFiveAvailableDomains(db);

  const cookie = request.headers.get("Cookie");
  const lastRefreshStr = parseCookie(cookie, REFRESH_COOKIE);
  const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;

  return {
    domains,
    lastRefresh,
    now: Date.now(),
  };
}

export async function action({ context, request }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "refresh-domains") {
    const cookie = request.headers.get("Cookie");
    const lastStr = parseCookie(cookie, REFRESH_COOKIE);
    const last = lastStr ? parseInt(lastStr, 10) : 0;
    const fiveMinutes = 1000 * 60 * 5;
    const now = Date.now();

    if (last && now - last < fiveMinutes) {
      return Response.json(
        {
          error: "cooldown",
          message: "Look. I went through the effort of generating these. The least you can do is pretend to consider one for a second.",
        },
        { status: 429 }
      );
    }

    const newDomains = await forceRefreshDomains(db);

    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `${REFRESH_COOKIE}=${now}; Path=/; Max-Age=${60 * 5}; SameSite=Lax`
    );

    return Response.json({ domains: newDomains }, { headers });
  }

  return Response.json({ error: "unknown_intent" }, { status: 400 });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { domains: initialDomains } = loaderData;
  const fetcher = useFetcher();

  const domains = (fetcher.data as any)?.domains ?? initialDomains;
  const isRefreshing = fetcher.state === "submitting";
  const cooldownError = fetcher.data?.error === "cooldown" ? fetcher.data.message : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 pt-20 pb-16">
      <div className="max-w-[680px]">
        {/* Brand first, then the story — all left aligned */}
        <div className="mb-12">
          <div className="text-[92px] leading-none font-semibold tracking-[-6.5px] mb-1">
            NNOLE
          </div>
          <div className="text-xl tracking-[4px] text-zinc-500 mb-9">.COM</div>

          <div className="max-w-[560px] space-y-4 text-lg text-zinc-400 leading-tight">
            <p>I bought this domain for no reason at all.</p>
            <p>Zero plan. Zero vision. Just pure “it was available and my card was saved” energy.</p>
            <p>Then I noticed it spells “Elon” backwards… and now I’m emotionally committed to the bit.</p>
            <p className="pt-1">So here we are. A completely pointless website, living on a completely pointless domain.</p>
          </div>
        </div>

        {/* The one useful thing — framed as a reluctant confession */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-9">
          <div className="mb-7">
            <div className="uppercase text-rose-400 text-xs tracking-[2px] mb-2 font-medium">okay fine</div>
            <div className="text-2xl font-medium leading-tight tracking-tight">
              I accidentally made one thing that’s<br />slightly useful.
            </div>
            <div className="mt-3 text-zinc-400">
              Here are 5 random available 5-letter .com domains.<br />
              Because if I’m going to own a pointless domain, I might as well drag you into it too.
            </div>
          </div>

          {/* Domain rows — a bit more playful */}
          <div className="space-y-2">
            {domains.map((domain: string) => (
              <div
                key={domain}
                className="domain-row group flex items-center justify-between bg-zinc-950 border border-zinc-800 px-5 py-4 rounded-2xl hover:border-zinc-700"
              >
                <span className="font-mono text-[17px] font-medium tracking-[-0.3px] text-white">
                  {domain}.com
                </span>
                <span className="text-xs font-medium px-3.5 py-1 rounded-full bg-lime-900/40 text-lime-400 border border-lime-900/60">
                  shockingly available
                </span>
              </div>
            ))}
          </div>

          {/* Playful button — left aligned now */}
          <div className="mt-6">
            <fetcher.Form method="post">
              <button
                name="intent"
                value="refresh-domains"
                disabled={isRefreshing}
                className="px-7 py-3 text-sm font-medium rounded-2xl border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 active:bg-black disabled:opacity-50 transition flex items-center gap-2"
              >
                {isRefreshing ? "generating more regret..." : "give me 5 more I don’t need"}
              </button>
            </fetcher.Form>
          </div>

          {/* Unhinged but charming cooldown message */}
          {cooldownError && (
            <div className="cooldown-message mt-6 text-[14.5px] bg-zinc-950 border border-zinc-700 text-zinc-300 px-6 py-4 rounded-2xl leading-snug">
              {cooldownError} <span className="text-zinc-500">I’m not mad, I’m just disappointed (in both of us).</span>
            </div>
          )}

          <div className="mt-7 text-[11px] text-zinc-500 leading-tight tracking-wide">
            This list refreshes every hour when someone actually visits.<br />
            The button has a 5-minute cooldown because I have <span className="line-through opacity-60">some</span> self-respect left.
          </div>
        </div>

        {/* Rambling pointless closer — left aligned */}
        <div className="mt-12 text-zinc-400 text-[15px] leading-tight max-w-[520px]">
          <p>The rest of this site has no reason to exist. I might add more stupid features later. Or I might just leave it like this forever. Either way, you’re already here, so… congrats?</p>
        </div>

        <div className="mt-6 text-xs text-zinc-600">
          no refunds • no roadmap • no idea what i’m doing
        </div>
      </div>
    </main>
  );
}

