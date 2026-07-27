import type { Route } from "./+types/home";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

// nnole — a small, invite-only CDN specializing in very large video (VR/360°).
// The site started life as "a website about nothing"; the visual language of
// that era survives on purpose. The claims below don't: everything stated here
// is real. The status section measures real latency from the visitor's
// connection and shows the real edge location serving them.

const SITE_URL = "https://nnole.com";
const TITLE = "nnole — content delivery for very large video";
const DESCRIPTION =
	"An invite-only CDN built for VR and 360° video: multi-gigabyte files, redundant storage, a global edge cache. Formerly a website about nothing.";
const OG_IMAGE = `${SITE_URL}/og.png`;
const OG_IMAGE_ALT =
	"Giant NNOLE letters, the last E falling off in rust red. Content delivery for very large video.";

const CONTACT_EMAIL = "n@nnole.com";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: TITLE },
		{ name: "description", content: DESCRIPTION },

		// Open Graph (used by X/Twitter, plus everything else)
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: `${SITE_URL}/` },
		{ property: "og:site_name", content: "nnole" },
		{ property: "og:title", content: TITLE },
		{ property: "og:description", content: DESCRIPTION },
		{ property: "og:image", content: OG_IMAGE },
		{ property: "og:image:type", content: "image/png" },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:image:alt", content: OG_IMAGE_ALT },

		// Twitter card
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: TITLE },
		{ name: "twitter:description", content: DESCRIPTION },
		{ name: "twitter:image", content: OG_IMAGE },
		{ name: "twitter:image:alt", content: OG_IMAGE_ALT },
	];
}

export async function loader({ context }: Route.LoaderArgs) {
	// The edge location that served this very page render — real data, free.
	const cf = context.cloudflare.cf;
	return {
		edge: {
			colo: cf?.colo ?? null,
			city: cf?.city ?? null,
			country: cf?.country ?? null,
		},
	};
}

const ACCENT_OPTIONS = ["#c64a2e", "#2f6f5b", "#3b4cca", "#b88914", "#0a0a0a"];

type EdgeState = {
	colo: string | null;
	city: string | null;
	country: string | null;
};

export default function Home({ loaderData }: Route.ComponentProps) {
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [accent, setAccent] = useState<string>(ACCENT_OPTIONS[0]);
	const [cursorOn, setCursorOn] = useState<boolean>(true);
	const [mounted, setMounted] = useState(false);
	const [showCursor, setShowCursor] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Live edge measurements (real, from the visitor's connection)
	const [edge, setEdge] = useState<EdgeState>(loaderData.edge);
	const [rtt, setRtt] = useState<number | null>(null);
	const [measuring, setMeasuring] = useState(false);

	const measure = useCallback(async () => {
		setMeasuring(true);
		try {
			// Warm-up request absorbs connection setup, then take the best of 3.
			const warm = await fetch("/api/edge", { cache: "no-store" });
			const info = (await warm.json()) as EdgeState;
			if (info.colo) setEdge(info);
			const samples: number[] = [];
			for (let i = 0; i < 3; i++) {
				const t0 = performance.now();
				await fetch("/api/edge", { cache: "no-store" });
				samples.push(performance.now() - t0);
			}
			setRtt(Math.round(Math.min(...samples)));
		} catch {
			// Leave rtt as-is; the section renders dashes.
		}
		setMeasuring(false);
	}, []);

	useEffect(() => {
		setMounted(true);
		measure();

		// Only enable custom cursor on devices with fine pointer (mouse) + hover capability
		const mqCursor = window.matchMedia("(pointer: fine) and (hover: hover)");
		const updateCursor = () => setShowCursor(mqCursor.matches);
		updateCursor();
		mqCursor.addEventListener("change", updateCursor);

		// Responsive breakpoint (768px)
		const mqMobile = window.matchMedia("(max-width: 768px)");
		const updateMobile = () => setIsMobile(mqMobile.matches);
		updateMobile();
		mqMobile.addEventListener("change", updateMobile);

		return () => {
			mqCursor.removeEventListener("change", updateCursor);
			mqMobile.removeEventListener("change", updateMobile);
		};
	}, [measure]);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.setProperty("--accent", accent);
	}, [theme, accent]);

	function jump(id: string) {
		const el = document.getElementById(id);
		if (el)
			window.scrollTo({
				top: el.getBoundingClientRect().top + window.scrollY - 60,
				behavior: "smooth",
			});
	}

	return (
		<>
			{mounted && showCursor && cursorOn && <EraserCursor accent={accent} />}
			<Nav onJump={jump} isMobile={isMobile} />
			<Hero
				accent={accent}
				mounted={mounted}
				isMobile={isMobile}
				edge={edge}
				rtt={rtt}
			/>
			<Capabilities accent={accent} isMobile={isMobile} />
			<VRSection accent={accent} isMobile={isMobile} />
			<StatusBoard
				accent={accent}
				isMobile={isMobile}
				edge={edge}
				rtt={rtt}
				measuring={measuring}
				onMeasure={measure}
				mounted={mounted}
			/>
			<About accent={accent} isMobile={isMobile} />
			<Contact accent={accent} isMobile={isMobile} />
			<Footer accent={accent} mounted={mounted} isMobile={isMobile} edge={edge} />

			<ControlsPanel
				theme={theme}
				setTheme={setTheme}
				accent={accent}
				setAccent={setAccent}
				cursorOn={cursorOn}
				setCursorOn={setCursorOn}
				isMobile={isMobile}
			/>
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────
// Custom "eraser" cursor — small circle + trail that follows pointer.
// ─────────────────────────────────────────────────────────────────────
function EraserCursor({ accent }: { accent: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const trailRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let x = window.innerWidth / 2;
		let y = window.innerHeight / 2;
		let tx = x;
		let ty = y;
		function move(e: MouseEvent) {
			x = e.clientX;
			y = e.clientY;
		}
		function loop() {
			tx += (x - tx) * 0.18;
			ty += (y - ty) * 0.18;
			if (ref.current)
				ref.current.style.transform = `translate(${x - 6}px, ${y - 6}px)`;
			if (trailRef.current)
				trailRef.current.style.transform = `translate(${tx - 18}px, ${ty - 18}px)`;
			r = requestAnimationFrame(loop);
		}
		window.addEventListener("mousemove", move);
		let r = requestAnimationFrame(loop);
		return () => {
			window.removeEventListener("mousemove", move);
			cancelAnimationFrame(r);
		};
	}, []);

	return (
		<>
			<div
				ref={trailRef}
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: 36,
					height: 36,
					borderRadius: "50%",
					border: `1px solid ${accent}`,
					pointerEvents: "none",
					zIndex: 100,
					mixBlendMode: "difference",
					opacity: 0.6,
				}}
			/>
			<div
				ref={ref}
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: 12,
					height: 12,
					borderRadius: "50%",
					background: accent,
					pointerEvents: "none",
					zIndex: 101,
				}}
			/>
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────
// Top Nav — desktop horizontal + mobile hamburger + overlay menu
// ─────────────────────────────────────────────────────────────────────
function Nav({
	onJump,
	isMobile,
}: {
	onJump: (id: string) => void;
	isMobile: boolean;
}) {
	const items = ["delivery", "vr", "status", "about", "contact"];
	const [menuOpen, setMenuOpen] = useState(false);

	// Close menu after jumping on mobile
	const handleJump = (id: string) => {
		onJump(id);
		if (isMobile) setMenuOpen(false);
	};

	if (isMobile) {
		return (
			<>
				<nav
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						zIndex: 50,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "14px 16px",
						mixBlendMode: "difference",
						color: "#f4f1ec",
						pointerEvents: "none",
					}}
				>
					<div
						style={{
							pointerEvents: "auto",
							fontFamily: "var(--mono)",
							fontSize: 13,
							letterSpacing: "0.04em",
						}}
					>
						<span style={{ fontWeight: 500 }}>nnole</span>
						<span style={{ opacity: 0.5 }}> cdn</span>
					</div>

					<div
						style={{
							pointerEvents: "auto",
							display: "flex",
							alignItems: "center",
							gap: 12,
						}}
					>
						<div
							style={{
								fontFamily: "var(--mono)",
								fontSize: 12,
								letterSpacing: "0.06em",
							}}
						>
							● up
						</div>
						<button
							type="button"
							onClick={() => setMenuOpen(!menuOpen)}
							style={{
								background: "transparent",
								border: "1px solid rgba(244,241,236,0.5)",
								color: "#f4f1ec",
								padding: "6px 10px",
								fontFamily: "var(--mono)",
								fontSize: 16,
								lineHeight: 1,
								cursor: "pointer",
							}}
							aria-label="Menu"
						>
							{menuOpen ? "✕" : "☰"}
						</button>
					</div>
				</nav>

				{/* Mobile overlay menu */}
				{menuOpen && (
					<div
						style={{
							position: "fixed",
							inset: 0,
							zIndex: 60,
							background: "rgba(10,10,10,0.92)",
							display: "flex",
							flexDirection: "column",
							padding: "80px 24px 40px",
						}}
						onClick={() => setMenuOpen(false)}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 4,
							}}
							onClick={(e) => e.stopPropagation()}
						>
							{items.map((i) => (
								<a
									key={i}
									href={`#${i}`}
									onClick={(e) => {
										e.preventDefault();
										handleJump(i);
									}}
									style={{
										color: "#f4f1ec",
										fontFamily: "var(--mono)",
										fontSize: 18,
										padding: "14px 0",
										borderBottom: "1px solid rgba(244,241,236,0.15)",
										opacity: 0.9,
									}}
								>
									{i}
								</a>
							))}
							<div
								style={{
									paddingTop: 20,
									fontSize: 12,
									opacity: 0.6,
									fontFamily: "var(--mono)",
								}}
							>
								Invite-only · very large video, delivered
							</div>
						</div>
					</div>
				)}
			</>
		);
	}

	// Desktop nav
	return (
		<nav
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				zIndex: 50,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "18px 28px",
				mixBlendMode: "difference",
				color: "#f4f1ec",
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					pointerEvents: "auto",
					fontFamily: "var(--mono)",
					fontSize: 13,
					letterSpacing: "0.04em",
				}}
			>
				<span style={{ fontWeight: 500 }}>nnole</span>
				<span style={{ opacity: 0.5 }}> — content delivery</span>
			</div>
			<div
				style={{
					pointerEvents: "auto",
					display: "flex",
					gap: 22,
					fontFamily: "var(--mono)",
					fontSize: 12,
					letterSpacing: "0.06em",
					textTransform: "uppercase",
				}}
			>
				{items.map((i) => (
					<a
						key={i}
						href={`#${i}`}
						onClick={(e) => {
							e.preventDefault();
							onJump(i);
						}}
						style={{
							cursor: "pointer",
							opacity: 0.7,
							transition: "opacity 0.2s",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLAnchorElement).style.opacity = "1";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLAnchorElement).style.opacity = "0.7";
						}}
					>
						{i}
					</a>
				))}
			</div>
			<div
				style={{
					pointerEvents: "auto",
					fontFamily: "var(--mono)",
					fontSize: 12,
					letterSpacing: "0.06em",
				}}
			>
				● operational
			</div>
		</nav>
	);
}

// ─────────────────────────────────────────────────────────────────────
// HERO — colossal "NNOLE" letters that fall away on hover.
// The one gag we kept. A CDN can have one gag.
// ─────────────────────────────────────────────────────────────────────
function Hero({
	accent,
	mounted,
	isMobile,
	edge,
	rtt,
}: {
	accent: string;
	mounted: boolean;
	isMobile: boolean;
	edge: EdgeState;
	rtt: number | null;
}) {
	const [erased, setErased] = useState<number[]>([]);
	const [time, setTime] = useState<Date | null>(null);

	useEffect(() => {
		setTime(new Date());
		const t = setInterval(() => setTime(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	const letters = ["N", "N", "O", "L", "E"];

	// Slightly tighter letter sizing on mobile to avoid overflow
	const letterSize = isMobile
		? "clamp(72px, 18vw, 140px)"
		: "clamp(110px, 24vw, 400px)";

	return (
		<section
			data-screen-label="01 Hero"
			style={{
				minHeight: "100vh",
				position: "relative",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: isMobile ? "70px 16px 20px" : "90px 28px 28px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontFamily: "var(--mono)",
					fontSize: 11,
					color: "var(--muted)",
					letterSpacing: "0.04em",
				}}
			>
				<div suppressHydrationWarning>
					EST. ∅ —{" "}
					{mounted && time
						? time.toLocaleTimeString([], { hour12: false })
						: "--:--:--"}
				</div>
				<div>CDN / VR VIDEO / INVITE-ONLY</div>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					gap: isMobile ? "clamp(2px, 1vw, 8px)" : "clamp(6px, 1.8vw, 20px)",
					userSelect: "none",
					flex: 1,
					flexWrap: isMobile ? "wrap" : "nowrap",
				}}
			>
				{letters.map((L, i) => (
					<Letter
						key={i}
						ch={L}
						index={i}
						onErase={() => setErased((e) => [...e, i])}
						erased={erased.includes(i)}
						accent={accent}
						fontSize={letterSize}
					/>
				))}
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: isMobile ? "column" : "row",
					justifyContent: "space-between",
					alignItems: isMobile ? "flex-start" : "flex-end",
					gap: isMobile ? 18 : 24,
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						maxWidth: isMobile ? "100%" : 440,
						fontSize: isMobile ? 14 : 15,
						lineHeight: 1.5,
					}}
				>
					<span
						style={{
							fontFamily: "var(--mono)",
							fontSize: 11,
							letterSpacing: "0.08em",
							color: "var(--muted)",
							textTransform: "uppercase",
							display: "block",
							marginBottom: 10,
						}}
					>
						↓ A content delivery network
					</span>
					<strong style={{ fontWeight: 700 }}>
						For absurdly large video.
					</strong>{" "}
					nnole moves multi-gigabyte VR and 360° files from redundant storage,
					through a global edge cache, into your viewer's headset. Invite-only,
					deliberately small, quietly reliable.{" "}
					<span style={{ color: "var(--muted)" }}>
						(Formerly a website about nothing. Long story — see About.)
					</span>
				</div>
				<div
					style={{
						fontFamily: "var(--mono)",
						fontSize: 11,
						color: "var(--muted)",
						letterSpacing: "0.04em",
						textAlign: isMobile ? "left" : "right",
					}}
				>
					<div suppressHydrationWarning>
						YOUR EDGE: {mounted && edge.colo ? edge.colo : "---"}
					</div>
					<div suppressHydrationWarning>
						ROUND TRIP: {mounted && rtt !== null ? `${rtt} MS` : "-- MS"}
					</div>
					<div>
						STATUS: <span style={{ color: accent }}>●</span> OPERATIONAL
					</div>
					<div style={{ color: accent }}>↘ scroll for the details</div>
				</div>
			</div>

			{erased.length > 0 && (
				<button
					type="button"
					onClick={() => setErased([])}
					style={{
						position: "absolute",
						top: isMobile ? "auto" : "50%",
						bottom: isMobile ? 80 : "auto",
						right: isMobile ? 16 : 28,
						transform: isMobile ? "none" : "translateY(-50%)",
						background: "transparent",
						border: "1px solid var(--line)",
						color: "var(--muted)",
						fontFamily: "var(--mono)",
						fontSize: 10,
						padding: "8px 12px",
						cursor: "pointer",
						letterSpacing: "0.08em",
						zIndex: 5,
					}}
				>
					↻ restore ({erased.length})
				</button>
			)}
		</section>
	);
}

function Letter({
	ch,
	index,
	onErase,
	erased,
	accent,
	fontSize = "clamp(110px, 24vw, 400px)",
}: {
	ch: string;
	index: number;
	onErase: () => void;
	erased: boolean;
	accent: string;
	fontSize?: string;
}) {
	const [hover, setHover] = useState(false);
	return (
		<span
			onMouseEnter={() => {
				if (!erased) {
					setHover(true);
					setTimeout(onErase, 280);
				}
			}}
			style={{
				fontFamily: "Helvetica Neue, Helvetica, var(--sans)",
				fontWeight: 900,
				fontSize,
				lineHeight: 0.82,
				letterSpacing: "-0.05em",
				color: hover ? accent : "var(--fg)",
				transform: erased
					? `translateY(${30 + index * 8}vh) rotate(${(index - 2) * 6}deg)`
					: "translateY(0)",
				opacity: erased ? 0 : 1,
				transition:
					"transform 1.4s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 1.4s ease, color 0.2s",
				display: "inline-block",
				cursor: "default",
			}}
		>
			{ch}
		</span>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 01 DELIVERY — what the network actually does
// ─────────────────────────────────────────────────────────────────────
type CapabilityT = {
	glyph: string;
	name: string;
	sub: string;
	spec: string;
};

function Capabilities({
	accent,
	isMobile = false,
}: {
	accent: string;
	isMobile?: boolean;
}) {
	const caps: CapabilityT[] = [
		{
			glyph: "GB+",
			name: "Large-object delivery",
			sub: "Multi-gigabyte files served whole or in pieces. Byte-range requests mean instant seeks and resumable downloads — no re-buffering a 40 GB file from zero.",
			spec: "HTTP 206 / RANGE",
		},
		{
			glyph: "8K",
			name: "VR & 360° video",
			sub: "High-bitrate stereoscopic video streamed straight to headsets. Our specialty, and most of our traffic.",
			spec: "180° / 360° / SBS / TB",
		},
		{
			glyph: "◍",
			name: "Global edge cache",
			sub: "Content is cached in cities near your viewers and served from there — not from one distant, overworked server.",
			spec: "EDGE-CACHED",
		},
		{
			glyph: "URL",
			name: "Hotlink-ready links",
			sub: "Stable, direct URLs you can drop into any player, page, or app. CORS is configured so embeds just work.",
			spec: "CORS / DIRECT",
		},
		{
			glyph: "TLS",
			name: "Encrypted by default",
			sub: "HTTPS only, over modern protocols. Nothing is served in the clear.",
			spec: "HTTP/2 · HTTP/3",
		},
		{
			glyph: "×2",
			name: "Redundant origins",
			sub: "Every object lives in two independent storage backends. If one has a bad day, delivery doesn't notice.",
			spec: "DUAL ORIGIN",
		},
	];

	return (
		<section
			id="delivery"
			data-screen-label="02 Delivery"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
			}}
		>
			<SectionHead
				num="01"
				title="Delivery"
				sub="What the network does, minus the adjectives. Every claim on this page is one we can keep."
			/>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: 0,
					border: "1px solid var(--line)",
					marginTop: 56,
				}}
			>
				{caps.map((c, i) => (
					<Capability key={i} c={c} index={i} isMobile={isMobile} />
				))}
			</div>

			<div
				style={{
					marginTop: 24,
					fontFamily: "var(--mono)",
					fontSize: 10,
					color: "var(--muted)",
					letterSpacing: "0.08em",
					textTransform: "uppercase",
				}}
			>
				no transcoding · no watermarks · your bytes, exactly as uploaded
			</div>
		</section>
	);
}

function Capability({
	c,
	index,
	isMobile = false,
}: {
	c: CapabilityT;
	index: number;
	isMobile?: boolean;
}) {
	const [hover, setHover] = useState(false);
	return (
		<div
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				borderRight: "1px solid var(--line)",
				borderBottom: "1px solid var(--line)",
				padding: isMobile ? 16 : 24,
				position: "relative",
				minHeight: isMobile ? 240 : 320,
				display: "flex",
				flexDirection: "column",
				background: hover ? "var(--fg)" : "transparent",
				color: hover ? "var(--bg)" : "var(--fg)",
				transition: "background 0.25s, color 0.25s",
			}}
		>
			<div
				style={{
					width: "100%",
					aspectRatio: "4 / 2",
					border: `1px dashed ${
						hover ? "rgba(244,241,236,0.25)" : "var(--line)"
					}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "var(--mono)",
					fontSize: "clamp(32px, 4vw, 48px)",
					fontWeight: 500,
					letterSpacing: "-0.02em",
				}}
			>
				{c.glyph}
			</div>

			<div style={{ flex: 1, marginTop: 18 }}>
				<div
					style={{
						fontFamily: "var(--mono)",
						fontSize: 10,
						letterSpacing: "0.1em",
						opacity: 0.6,
						textTransform: "uppercase",
					}}
				>
					CAP {String(index + 1).padStart(3, "0")}
				</div>
				<div style={{ fontSize: 18, fontWeight: 500, marginTop: 6 }}>
					{c.name}
				</div>
				<div
					style={{
						fontSize: 13,
						lineHeight: 1.5,
						marginTop: 6,
						opacity: 0.7,
					}}
				>
					{c.sub}
				</div>
			</div>

			<div
				style={{
					marginTop: 18,
					paddingTop: 14,
					borderTop: `1px solid ${
						hover ? "rgba(244,241,236,0.2)" : "var(--line)"
					}`,
					fontFamily: "var(--mono)",
					fontSize: 10,
					letterSpacing: "0.1em",
					opacity: 0.7,
				}}
			>
				{c.spec}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 02 VR — the specialty, explained
// ─────────────────────────────────────────────────────────────────────
function VRSection({
	accent,
	isMobile = false,
}: {
	accent: string;
	isMobile?: boolean;
}) {
	return (
		<section
			id="vr"
			data-screen-label="03 VR"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
			}}
		>
			<SectionHead
				num="02"
				title="Built for VR"
				sub="Most CDNs treat an 8K stereoscopic file as an inconvenience. For us it's the whole point."
			/>

			<div
				style={{
					marginTop: isMobile ? 32 : 56,
					display: "grid",
					gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
					gap: isMobile ? 32 : 24,
				}}
			>
				<div
					style={{
						gridColumn: isMobile ? "auto" : "span 5",
						fontSize: isMobile ? 15 : 16,
						lineHeight: 1.55,
					}}
				>
					<p style={{ marginBottom: 18 }}>
						VR video is a hostile workload:{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							enormous files, brutal bitrates
						</em>
						, and viewers who scrub constantly. A headset that waits is a
						headset that gets taken off.
					</p>
					<p style={{ marginBottom: 18, color: "var(--muted)" }}>
						So the network is tuned for exactly that: honest byte-range
						responses for instant seeking, edge caching so the second viewer in
						a city never touches the origin, and{" "}
						<span style={{ color: "var(--fg)" }}>
							zero transcoding — your mastered bitrate arrives untouched
						</span>
						.
					</p>
					<p style={{ color: "var(--muted)" }}>
						Links work in the players your viewers actually use: headset
						browsers and the usual dedicated VR players (DeoVR, HereSphere,
						Skybox and friends). Paste the URL, put the headset on, done.
					</p>
				</div>

				<div style={{ gridColumn: isMobile ? "auto" : "span 7" }}>
					<div style={{ border: "1px solid var(--line)" }}>
						<div
							style={{
								padding: "14px 20px",
								borderBottom: "1px solid var(--line)",
								fontFamily: "var(--mono)",
								fontSize: 11,
								letterSpacing: "0.1em",
								color: "var(--muted)",
								textTransform: "uppercase",
								display: "flex",
								justifyContent: "space-between",
							}}
						>
							<span>What a delivery looks like</span>
							<span style={{ color: accent }}>● live traffic pattern</span>
						</div>
						{[
							["GET /v/…/scene-04_8k_sbs.mp4", "Range: bytes=0-"],
							["→ 206 Partial Content", "from edge cache"],
							["viewer scrubs to 12:40", "Range: bytes=9 663 676 416-"],
							["→ 206 Partial Content", "seek served in one round trip"],
							["headset plays on", "origin never contacted"],
						].map(([l, r], i) => (
							<div
								key={i}
								style={{
									display: "flex",
									justifyContent: "space-between",
									gap: 12,
									padding: "13px 20px",
									borderBottom: i === 4 ? "none" : "1px solid var(--line)",
									fontFamily: "var(--mono)",
									fontSize: isMobile ? 11 : 13,
								}}
							>
								<span
									style={{
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{l}
								</span>
								<span
									style={{ color: "var(--muted)", whiteSpace: "nowrap" }}
								>
									{r}
								</span>
							</div>
						))}
					</div>

					<div
						style={{
							marginTop: 24,
							paddingTop: 24,
							borderTop: "1px solid var(--line)",
							display: "grid",
							gridTemplateColumns: "repeat(3, 1fr)",
							gap: 24,
						}}
					>
						<Stat n="8K" label="Resolutions served" />
						<Stat n="0" label="Re-encodes performed" />
						<Stat n="206" label="Favorite status code" />
					</div>
				</div>
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 03 STATUS — inverted section, real measurements from this visit
// ─────────────────────────────────────────────────────────────────────
function StatusBoard({
	accent,
	isMobile = false,
	edge,
	rtt,
	measuring,
	onMeasure,
	mounted,
}: {
	accent: string;
	isMobile?: boolean;
	edge: EdgeState;
	rtt: number | null;
	measuring: boolean;
	onMeasure: () => void;
	mounted: boolean;
}) {
	const place =
		edge.city && edge.country
			? `${edge.city}, ${edge.country}`
			: edge.country ?? null;

	return (
		<section
			id="status"
			data-screen-label="04 Status"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "60px 16px" : "120px 28px",
				background: "var(--fg)",
				color: "var(--bg)",
			}}
		>
			<div
				style={{
					fontFamily: "var(--mono)",
					fontSize: 11,
					letterSpacing: "0.12em",
					opacity: 0.5,
					textTransform: "uppercase",
				}}
			>
				03 — Live status
			</div>
			<h2
				style={{
					fontSize: "clamp(36px, 5vw, 72px)",
					fontWeight: 300,
					letterSpacing: "-0.03em",
					margin: "24px 0 12px",
					maxWidth: 900,
					lineHeight: 1.1,
				}}
			>
				Working. Measured from your connection, just now.
			</h2>
			<p style={{ opacity: 0.6, maxWidth: 620, marginBottom: 40 }}>
				No invented nines. The numbers below were measured by your browser
				against this very network while the page loaded.
			</p>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
					gap: 1,
					background: "rgba(244,241,236,0.15)",
					border: "1px solid rgba(244,241,236,0.15)",
					maxWidth: 1100,
				}}
			>
				{[
					{
						label: "SYSTEMS",
						value: (
							<span>
								<span style={{ color: accent }}>●</span> OPERATIONAL
							</span>
						),
						note: "all edges answering",
					},
					{
						label: "YOUR EDGE",
						value: mounted && edge.colo ? edge.colo : "---",
						note: place && mounted ? `serving ${place}` : "nearest city to you",
					},
					{
						label: "ROUND TRIP",
						value: mounted && rtt !== null ? `${rtt} ms` : "…",
						note: "best of 3, this visit",
					},
					{
						label: "DELIVERY",
						value: "206 ✓",
						note: "range requests honored",
					},
				].map((s, i) => (
					<div
						key={i}
						style={{
							background: "var(--fg)",
							padding: isMobile ? "20px 16px" : "28px 24px",
						}}
					>
						<div
							style={{
								fontFamily: "var(--mono)",
								fontSize: 10,
								letterSpacing: "0.12em",
								opacity: 0.5,
							}}
						>
							{s.label}
						</div>
						<div
							suppressHydrationWarning
							style={{
								fontSize: isMobile ? 24 : 34,
								fontWeight: 500,
								marginTop: 10,
								fontFamily: "var(--mono)",
								letterSpacing: "-0.02em",
							}}
						>
							{s.value}
						</div>
						<div
							suppressHydrationWarning
							style={{
								fontFamily: "var(--mono)",
								fontSize: 10,
								letterSpacing: "0.06em",
								opacity: 0.45,
								marginTop: 8,
							}}
						>
							{s.note}
						</div>
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={onMeasure}
				disabled={measuring}
				style={{
					marginTop: 32,
					fontFamily: "var(--mono)",
					fontSize: 11,
					letterSpacing: "0.12em",
					padding: "12px 18px",
					border: `1px solid ${accent}`,
					background: "transparent",
					color: accent,
					cursor: measuring ? "wait" : "pointer",
					textTransform: "uppercase",
				}}
			>
				{measuring ? "measuring…" : "↻ measure again"}
			</button>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 04 ABOUT — the origin story, owned
// ─────────────────────────────────────────────────────────────────────
function About({
	accent,
	isMobile = false,
}: {
	accent: string;
	isMobile?: boolean;
}) {
	return (
		<section
			id="about"
			data-screen-label="05 About"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
				position: "relative",
				overflow: "hidden",
			}}
		>
			<SectionHead
				num="04"
				title="About"
				sub="A short history of an accidental pivot."
			/>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
					gap: isMobile ? 32 : 24,
					marginTop: isMobile ? 32 : 56,
				}}
			>
				<div
					style={{
						gridColumn: isMobile ? "auto" : "span 5",
						fontFamily: "var(--mono)",
						fontSize: 11,
						color: "var(--muted)",
						letterSpacing: "0.04em",
					}}
				>
					<div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
						FOUNDED
					</div>
					<div
						style={{
							fontFamily: "var(--sans)",
							fontSize: 22,
							color: "var(--fg)",
							marginTop: 6,
							marginBottom: 28,
							fontWeight: 400,
						}}
					>
						As a joke. A website about nothing, on a domain bought out of
						boredom.
					</div>

					<div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
						THE PIVOT
					</div>
					<div
						style={{
							fontFamily: "var(--sans)",
							fontSize: 22,
							color: "var(--fg)",
							marginTop: 6,
							marginBottom: 28,
							fontWeight: 400,
						}}
					>
						A friend asked if the domain could serve a very large VR file. It
						could. Word got around.
					</div>

					<div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
						CLIENTS
					</div>
					<div
						style={{
							fontFamily: "var(--sans)",
							fontSize: 22,
							color: "var(--fg)",
							marginTop: 6,
							marginBottom: 28,
							fontWeight: 400,
						}}
					>
						A short list, by invitation. We'd like to keep it that way a while.
					</div>

					<div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
						ROADMAP
					</div>
					<div
						style={{
							fontFamily: "var(--sans)",
							fontSize: 22,
							color: "var(--fg)",
							marginTop: 6,
							fontWeight: 400,
						}}
					>
						Still none, on principle. The files just keep arriving, and we keep
						delivering them.
					</div>
				</div>

				<div style={{ gridColumn: isMobile ? "auto" : "span 7" }}>
					<p
						style={{
							fontSize: "clamp(22px, 2.4vw, 32px)",
							lineHeight: 1.3,
							fontWeight: 300,
							textWrap: "pretty",
						}}
					>
						We used to make{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							nothing
						</em>
						. Six varieties of it, ethically sourced from nowhere. It turns out
						years of practicing nothing make you unusually good at the one
						thing a delivery network owes you:{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							staying out of the way
						</em>
						. No transcoding, no re-compression, no watermarks, no opinions
						about your content. Your bytes, exactly as uploaded, from somewhere
						near your viewer.
					</p>

					<div
						style={{
							marginTop: 36,
							paddingTop: 24,
							borderTop: "1px solid var(--line)",
							display: "grid",
							gridTemplateColumns: "repeat(3, 1fr)",
							gap: 24,
						}}
					>
						<Stat n="2" label="Independent storage backends" />
						<Stat n="1" label="Purpose (finally)" />
						<Stat n="∅" label="Bytes modified in transit" />
					</div>
				</div>
			</div>

			<Marquee accent={accent} isMobile={isMobile} />
		</section>
	);
}

function Stat({ n, label }: { n: string; label: string }) {
	return (
		<div>
			<div
				style={{
					fontSize: 48,
					fontWeight: 700,
					letterSpacing: "-0.04em",
					lineHeight: 1,
				}}
			>
				{n}
			</div>
			<div
				style={{
					fontFamily: "var(--mono)",
					fontSize: 10,
					letterSpacing: "0.1em",
					color: "var(--muted)",
					textTransform: "uppercase",
					marginTop: 8,
				}}
			>
				{label}
			</div>
		</div>
	);
}

function Marquee({
	accent,
	isMobile = false,
}: {
	accent: string;
	isMobile?: boolean;
}) {
	const words = [
		"8K",
		"360°",
		"stereoscopic",
		"206",
		"range: bytes=0-",
		"180°",
		"edge-cached",
		"H.265",
		"AV1",
		"no buffering",
		"multi-gig",
		"60 fps",
		"SBS",
		"TLS",
	];
	const row = [...words, ...words, ...words];
	return (
		<div
			style={{
				marginTop: isMobile ? 48 : 96,
				marginLeft: isMobile ? -16 : -28,
				marginRight: isMobile ? -16 : -28,
				padding: "24px 0",
				borderTop: "1px solid var(--line)",
				borderBottom: "1px solid var(--line)",
				overflow: "hidden",
				whiteSpace: "nowrap",
			}}
		>
			<div
				className="marquee-text"
				style={{
					display: "inline-flex",
					gap: isMobile ? 32 : 48,
					animation: "noneScroll 40s linear infinite",
					fontSize: isMobile
						? "clamp(32px, 12vw, 56px)"
						: "clamp(48px, 8vw, 120px)",
					fontWeight: 300,
					letterSpacing: "-0.03em",
				}}
			>
				{row.map((w, i) => (
					<span key={i} style={{ color: i % 4 === 0 ? accent : "var(--fg)" }}>
						{w}
					</span>
				))}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 05 CONTACT — real this time. Messages no longer go into a void.
// ─────────────────────────────────────────────────────────────────────
function Contact({
	accent,
	isMobile = false,
}: {
	accent: string;
	isMobile?: boolean;
}) {
	return (
		<section id="contact" className="section" data-screen-label="06 Contact">
			<SectionHead
				num="05"
				title="Get on the list"
				sub="No signup form, no dashboard, no credit card field. Onboarding is a conversation."
			/>

			<div
				style={{
					marginTop: isMobile ? 32 : 56,
					display: "grid",
					gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
					gap: isMobile ? 32 : 24,
				}}
			>
				<div
					style={{
						gridColumn: isMobile ? "auto" : "span 6",
						fontSize: isMobile ? 15 : 16,
						lineHeight: 1.55,
					}}
				>
					<p style={{ marginBottom: 18 }}>
						nnole is invite-only. We take on a small number of clients so the
						network stays fast for all of them. If you're serving{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							large video to real viewers
						</em>{" "}
						— VR especially — write to us.
					</p>
					<p style={{ color: "var(--muted)" }}>
						Tell us roughly what you're serving: formats, typical file sizes,
						where your viewers are, and how much traffic you expect. You'll get
						a reply from a human who runs the network, not a ticket number.
					</p>
				</div>

				<div style={{ gridColumn: isMobile ? "auto" : "span 6" }}>
					<div style={{ border: "1px solid var(--line)" }}>
						<div
							style={{
								padding: "14px 20px",
								borderBottom: "1px solid var(--line)",
								fontFamily: "var(--mono)",
								fontSize: 11,
								letterSpacing: "0.1em",
								color: "var(--muted)",
								textTransform: "uppercase",
							}}
						>
							The entire onboarding process
						</div>
						{[
							["01", "You email us", CONTACT_EMAIL],
							["02", "We talk", "about your content and traffic"],
							["03", "You upload", "we hand you delivery URLs"],
							["04", "That's it", "your viewers press play"],
						].map(([n, t, s], i) => (
							<div
								key={n}
								style={{
									display: "flex",
									alignItems: "baseline",
									gap: 16,
									padding: "16px 20px",
									borderBottom: i === 3 ? "none" : "1px solid var(--line)",
								}}
							>
								<span
									className="mono"
									style={{ fontSize: 11, color: accent }}
								>
									{n}
								</span>
								<span style={{ fontSize: 17, fontWeight: 500 }}>{t}</span>
								<span
									className="mono"
									style={{
										fontSize: 12,
										color: "var(--muted)",
										marginLeft: "auto",
										textAlign: "right",
									}}
								>
									{s}
								</span>
							</div>
						))}
					</div>

					<a
						href={`mailto:${CONTACT_EMAIL}?subject=Delivery%20inquiry`}
						className="btn btn-accent"
						style={{
							display: "inline-block",
							marginTop: 24,
							textAlign: "center",
						}}
					>
						{CONTACT_EMAIL} →
					</a>
					<div
						style={{
							marginTop: 14,
							fontFamily: "var(--mono)",
							fontSize: 11,
							color: "var(--muted)",
							letterSpacing: "0.04em",
						}}
					>
						We respond within a business day. A real one — the old "0–∞
						business days" policy has been retired.
					</div>
				</div>
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────
function Footer({
	accent,
	mounted,
	isMobile = false,
	edge,
}: {
	accent: string;
	mounted: boolean;
	isMobile?: boolean;
	edge: EdgeState;
}) {
	const [time, setTime] = useState<Date | null>(null);

	useEffect(() => {
		setTime(new Date());
		const t = setInterval(() => setTime(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	const year = time ? time.getFullYear() : 2026;

	return (
		<footer
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "40px 16px 24px" : "60px 28px 28px",
				background: "var(--fg)",
				color: "var(--bg)",
			}}
		>
			<div
				style={{
					fontSize: "clamp(70px, 16vw, 240px)",
					fontWeight: 900,
					letterSpacing: "-0.06em",
					lineHeight: 0.85,
					fontFamily: "Helvetica Neue, var(--sans)",
				}}
			>
				nnole.
			</div>
			<div
				className="footer-grid"
				style={{
					marginTop: isMobile ? 36 : 56,
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
					gap: isMobile ? 24 : 32,
					fontFamily: "var(--mono)",
					fontSize: 12,
					letterSpacing: "0.04em",
				}}
			>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>SITEMAP</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<a href="#delivery">↳ /delivery</a>
						<a href="#vr">↳ /vr</a>
						<a href="#status">↳ /status</a>
						<a href="#contact">↳ /contact</a>
					</div>
				</div>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>NETWORK</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<span style={{ color: accent }}>● All systems operational</span>
						<span suppressHydrationWarning>
							Your edge: {mounted && edge.colo ? edge.colo : "---"}
						</span>
						<span suppressHydrationWarning>
							Local time:{" "}
							{mounted && time
								? time.toLocaleTimeString([], { hour12: false })
								: "--:--:--"}
						</span>
					</div>
				</div>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>CONTACT</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
						<span style={{ opacity: 0.5 }}>invite-only · by conversation</span>
						<span style={{ opacity: 0.5 }}>abuse: same address</span>
					</div>
				</div>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>LEGAL</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<span>Terms — by arrangement</span>
						<span>Privacy — we log traffic, not people</span>
						<span>Cookies — still none</span>
					</div>
				</div>
			</div>
			<div
				style={{
					marginTop: 64,
					paddingTop: 20,
					borderTop: "1px solid rgba(244,241,236,0.15)",
					display: "flex",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 16,
					fontFamily: "var(--mono)",
					fontSize: 11,
					opacity: 0.5,
				}}
			>
				<div>© {year} nnole — content delivery.</div>
				<div>Formerly a website about nothing · the pivot was accidental</div>
				<div>v1.0.0</div>
			</div>
		</footer>
	);
}

// ─────────────────────────────────────────────────────────────────────
// Section header (number / title / sub)
// ─────────────────────────────────────────────────────────────────────
function SectionHead({
	num,
	title,
	sub,
}: {
	num: string;
	title: string;
	sub: string;
}) {
	return (
		<div className="section-head">
			<div className="section-head-num mono">{num}</div>
			<h2 className="section-head-title">{title}</h2>
			<div className="section-head-sub">{sub}</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// Minimal floating controls panel (theme / accent / cursor)
// ─────────────────────────────────────────────────────────────────────
function ControlsPanel({
	theme,
	setTheme,
	accent,
	setAccent,
	cursorOn,
	setCursorOn,
	isMobile = false,
}: {
	theme: "light" | "dark";
	setTheme: (t: "light" | "dark") => void;
	accent: string;
	setAccent: (a: string) => void;
	cursorOn: boolean;
	setCursorOn: (v: boolean) => void;
	isMobile?: boolean;
}) {
	const [open, setOpen] = useState(false);

	if (!open) {
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				style={{
					position: "fixed",
					right: 16,
					bottom: 16,
					zIndex: 90,
					width: isMobile ? 44 : 38,
					height: isMobile ? 44 : 38,
					borderRadius: "50%",
					border: "1px solid var(--line)",
					background: "var(--bg)",
					color: "var(--fg)",
					cursor: "pointer",
					fontFamily: "var(--mono)",
					fontSize: 14,
					lineHeight: 1,
				}}
				aria-label="Open controls"
			>
				∅
			</button>
		);
	}

	return (
		<div
			style={{
				position: "fixed",
				right: 16,
				bottom: 16,
				zIndex: 90,
				width: isMobile ? "calc(100% - 32px)" : 260,
				maxWidth: 320,
				background: "var(--bg)",
				color: "var(--fg)",
				border: "1px solid var(--line)",
				padding: 14,
				fontFamily: "var(--mono)",
				fontSize: 11,
				letterSpacing: "0.04em",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 12,
				}}
			>
				<span style={{ textTransform: "uppercase", color: "var(--muted)" }}>
					Tweaks (nothing major)
				</span>
				<button
					type="button"
					onClick={() => setOpen(false)}
					style={{
						background: "transparent",
						border: "none",
						color: "var(--muted)",
						cursor: "pointer",
						fontSize: 14,
					}}
					aria-label="Close controls"
				>
					✕
				</button>
			</div>

			<div style={{ marginBottom: 12 }}>
				<div style={{ color: "var(--muted)", marginBottom: 6 }}>MODE</div>
				<div style={{ display: "flex", gap: 6 }}>
					{(["light", "dark"] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setTheme(m)}
							style={{
								flex: 1,
								padding: "6px 8px",
								border: `1px solid ${theme === m ? "var(--fg)" : "var(--line)"}`,
								background: theme === m ? "var(--fg)" : "transparent",
								color: theme === m ? "var(--bg)" : "var(--fg)",
								cursor: "pointer",
								fontFamily: "var(--mono)",
								fontSize: 10,
								letterSpacing: "0.08em",
								textTransform: "uppercase",
							}}
						>
							{m}
						</button>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 12 }}>
				<div style={{ color: "var(--muted)", marginBottom: 6 }}>ACCENT</div>
				<div style={{ display: "flex", gap: 6 }}>
					{ACCENT_OPTIONS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => setAccent(c)}
							style={{
								flex: 1,
								height: 26,
								background: c,
								border: `1px solid ${accent === c ? "var(--fg)" : "var(--line)"}`,
								outline: accent === c ? "1px solid var(--bg)" : "none",
								outlineOffset: -3,
								cursor: "pointer",
							}}
							aria-label={c}
						/>
					))}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span style={{ color: "var(--muted)" }}>ERASER CURSOR</span>
				<button
					type="button"
					onClick={() => setCursorOn(!cursorOn)}
					style={{
						padding: "4px 10px",
						border: "1px solid var(--line)",
						background: cursorOn ? "var(--fg)" : "transparent",
						color: cursorOn ? "var(--bg)" : "var(--fg)",
						cursor: "pointer",
						fontFamily: "var(--mono)",
						fontSize: 10,
						letterSpacing: "0.08em",
						textTransform: "uppercase",
					}}
				>
					{cursorOn ? "ON" : "OFF"}
				</button>
			</div>
		</div>
	);
}
