import type { Route } from "./+types/home";
import { useFetcher } from "react-router";
import {
	type CSSProperties,
	useEffect,
	useRef,
	useState,
} from "react";
// Note: Domain suggestions are now purely client-side (no DB, no server).
// The "accidentally useful" bit is now actually accidental and local.

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "nnole.com — a website about nothing" },
		{
			name: "description",
			content:
				"A domain bought out of boredom. Spells ELON backwards (close enough). Now hosting a website about absolutely nothing.",
		},
	];
}

// Note: No more D1 database. Domain suggestions are generated in the browser.
// Contact messages are sent into the actual void (we just pretend it worked).

export async function loader() {
	return { now: Date.now() };
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent");

	// Contact form — we still accept submissions, we just don't keep them.
	if (intent === "contact") {
		const body = formData.get("body") as string;

		if (!body?.trim()) {
			return Response.json({ error: "empty" }, { status: 400 });
		}

		// We read it. We nod solemnly. Then we let it go.
		return Response.json({ success: true });
	}

	return Response.json({ error: "unknown_intent" }, { status: 400 });
}

const ACCENT_OPTIONS = ["#c64a2e", "#2f6f5b", "#3b4cca", "#b88914", "#0a0a0a"];

export default function Home({ loaderData }: Route.ComponentProps) {
	// Domains are now generated client-side inside AccidentallyUseful.
	// No more server fetcher for that joke.

	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [accent, setAccent] = useState<string>(ACCENT_OPTIONS[0]);
	const [cursorOn, setCursorOn] = useState<boolean>(true);
	const [cart, setCart] = useState<number>(0);
	const [mounted, setMounted] = useState(false);
	const [checkoutOpen, setCheckoutOpen] = useState(false);
	const [showCursor, setShowCursor] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		setMounted(true);
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
	}, []);

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
			<Nav onJump={jump} cart={cart} isMobile={isMobile} />
			<Hero accent={accent} mounted={mounted} isMobile={isMobile} />
			<Shop
				accent={accent}
				cart={cart}
				onAdd={() => setCart((c) => Math.max(0, c))}
				onCheckout={() => setCheckoutOpen(true)}
				isMobile={isMobile}
			/>
			<AccidentallyUseful accent={accent} isMobile={isMobile} />
			<About accent={accent} isMobile={isMobile} />
			<Reviews accent={accent} isMobile={isMobile} />
			<SearchVoid accent={accent} isMobile={isMobile} />
			<Contact accent={accent} isMobile={isMobile} />
			<Careers isMobile={isMobile} />
			<Footer accent={accent} mounted={mounted} isMobile={isMobile} />

			<ControlsPanel
				theme={theme}
				setTheme={setTheme}
				accent={accent}
				setAccent={setAccent}
				cursorOn={cursorOn}
				setCursorOn={setCursorOn}
				isMobile={isMobile}
			/>

			<CheckoutModal
				open={checkoutOpen}
				onClose={() => setCheckoutOpen(false)}
				accent={accent}
				onComplete={() => {
					setCart(0);
					setCheckoutOpen(false);
				}}
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
	cart,
	isMobile,
}: {
	onJump: (id: string) => void;
	cart: number;
	isMobile: boolean;
}) {
	const items = ["shop", "useful", "about", "reviews", "contact", "careers"];
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
						<span style={{ opacity: 0.5 }}>.com</span>
					</div>

					<div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12 }}>
						<div
							style={{
								fontFamily: "var(--mono)",
								fontSize: 12,
								letterSpacing: "0.06em",
							}}
						>
							cart ({cart})
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
							<div style={{ paddingTop: 20, fontSize: 12, opacity: 0.6, fontFamily: "var(--mono)" }}>
								Cart: {cart} item{cart === 1 ? "" : "s"} of nothing
							</div>
						</div>
					</div>
				)}
			</>
		);
	}

	// Desktop nav (unchanged behavior)
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
				<span style={{ opacity: 0.5 }}>.com</span>
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
				cart ({cart})
			</div>
		</nav>
	);
}

// ─────────────────────────────────────────────────────────────────────
// HERO — colossal "NNOLE" letters that fall away on hover
// ─────────────────────────────────────────────────────────────────────
function Hero({ accent, mounted, isMobile }: { accent: string; mounted: boolean; isMobile: boolean }) {
	const [erased, setErased] = useState<number[]>([]);
	const [time, setTime] = useState<Date | null>(null);

	useEffect(() => {
		setTime(new Date());
		const t = setInterval(() => setTime(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	const letters = ["N", "N", "O", "L", "E"];

	// Slightly tighter letter sizing on mobile to avoid overflow
	const letterSize = isMobile ? "clamp(72px, 18vw, 140px)" : "clamp(110px, 24vw, 400px)";

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
				<div>VOL. 000 / ISSUE 000</div>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					gap: isMobile ? "clamp(2px, 1vw, 8px)" : "clamp(6px, 1.8vw, 20px)",
					userSelect: "none",
					flex: 1,
					flexWrap: isMobile ? "wrap" : "nowrap", // allow graceful wrapping if needed
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
				<div style={{ maxWidth: isMobile ? "100%" : 420, fontSize: isMobile ? 14 : 15, lineHeight: 1.5 }}>
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
						↓ A website about
					</span>
					<strong style={{ fontWeight: 700 }}>Nothing.</strong> Built out of
					boredom on a domain bought out of boredom. No products, no newsletter,
					no opinions, no journey, no mission, no founder story, no roadmap,
					no team page.{" "}
					<span style={{ color: "var(--muted)" }}>
						(One accidentally useful feature. We're sorry.)
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
					<div>NNOLE = ELONN BACKWARDS</div>
					<div>(close enough)</div>
					<div>VISITORS TODAY: 0</div>
					<div>FEATURES SHIPPED: 1 (regrettably)</div>
					<div style={{ color: accent }}>↘ scroll for less</div>
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
// SHOP — products that are all nothing
// ─────────────────────────────────────────────────────────────────────
type ProductT = {
	name: string;
	sub: string;
	price: string;
	stock: number;
	variant: "A" | "B" | "C";
};

function Shop({
	accent,
	onAdd,
	cart,
	onCheckout,
	isMobile = false,
}: {
	accent: string;
	onAdd: (name: string) => void;
	cart: number;
	onCheckout: () => void;
	isMobile?: boolean;
}) {
	const products: ProductT[] = [
		{
			name: "Nothing, Original",
			sub: "The classic. Untouched since 1923.",
			price: "$0.00",
			stock: 0,
			variant: "A",
		},
		{
			name: "Nothing, Limited Ed.",
			sub: "Same as the original. Costlier.",
			price: "$248",
			stock: 1,
			variant: "B",
		},
		{
			name: "Nothing, Travel Size",
			sub: "Now in a smaller package of nothing.",
			price: "$0.00",
			stock: 0,
			variant: "A",
		},
		{
			name: "Nothing, Subscription",
			sub: "Receive nothing, every month, automatically.",
			price: "$12/mo",
			stock: 0,
			variant: "C",
		},
		{
			name: "Nothing, Industrial",
			sub: "For factory floors, warehouses, and silos.",
			price: "POA",
			stock: 0,
			variant: "B",
		},
		{
			name: "Nothing, For Two",
			sub: "A romantic option. Comes with two of nothing.",
			price: "$48",
			stock: 0,
			variant: "A",
		},
	];

	return (
		<section
			id="shop"
			data-screen-label="02 Shop"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
			}}
		>
			<SectionHead
				num="01"
				title="The Shop"
				sub="Six varieties of nothing, sourced ethically from absolutely nowhere."
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
				{products.map((p, i) => (
					<Product
						key={i}
						p={p}
						accent={accent}
						onAdd={() => onAdd(p.name)}
						isMobile={isMobile}
					/>
				))}
			</div>

			{cart > 0 && (
				<div
					style={{
						marginTop: 32,
						padding: 20,
						border: `1px solid ${accent}`,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						background: "transparent",
					}}
				>
					<div>
						<div
							style={{
								fontFamily: "var(--mono)",
								fontSize: 11,
								color: "var(--muted)",
								letterSpacing: "0.08em",
							}}
						>
							YOUR CART
						</div>
						<div style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>
							{cart} × nothing{" "}
							<span style={{ color: "var(--muted)", fontWeight: 300 }}>
								= still nothing
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onCheckout}
						style={{
							fontFamily: "var(--mono)",
							fontSize: 11,
							letterSpacing: "0.1em",
							padding: "14px 22px",
							border: "none",
							background: accent,
							color: "#f4f1ec",
							cursor: "pointer",
							textTransform: "uppercase",
						}}
					>
						checkout →
					</button>
				</div>
			)}
		</section>
	);
}

function Product({
	p,
	accent,
	onAdd,
	isMobile = false,
}: {
	p: ProductT;
	accent: string;
	onAdd: () => void;
	isMobile?: boolean;
}) {
	const [hover, setHover] = useState(false);
	const [added, setAdded] = useState(false);
	return (
		<div
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				borderRight: "1px solid var(--line)",
				borderBottom: "1px solid var(--line)",
				padding: isMobile ? 16 : 24,
				position: "relative",
				minHeight: isMobile ? 280 : 360,
				display: "flex",
				flexDirection: "column",
				background: hover ? "var(--fg)" : "transparent",
				color: hover ? "var(--bg)" : "var(--fg)",
				transition: "background 0.25s, color 0.25s",
			}}
		>
			<Placeholder variant={p.variant} hover={hover} />

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
					SKU 000.
					{String(Math.abs(p.name.length * 7)).padStart(3, "0")}
				</div>
				<div style={{ fontSize: 18, fontWeight: 500, marginTop: 6 }}>
					{p.name}
				</div>
				<div
					style={{
						fontSize: 13,
						lineHeight: 1.5,
						marginTop: 6,
						opacity: 0.7,
					}}
				>
					{p.sub}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginTop: 18,
					paddingTop: 14,
					borderTop: `1px solid ${
						hover ? "rgba(244,241,236,0.2)" : "var(--line)"
					}`,
				}}
			>
				<span className="mono" style={{ fontSize: 13 }}>
					{p.price}
				</span>
				<button
					type="button"
					onClick={() => {
						onAdd();
						setAdded(true);
						setTimeout(() => setAdded(false), 1200);
					}}
					style={{
						fontFamily: "var(--mono)",
						fontSize: 10,
						letterSpacing: "0.12em",
						padding: "8px 12px",
						border: `1px solid ${
							hover ? "rgba(244,241,236,0.4)" : "var(--line)"
						}`,
						background: added ? accent : "transparent",
						color: added ? "#f4f1ec" : "inherit",
						cursor: "pointer",
						textTransform: "uppercase",
						transition: "all 0.2s",
					}}
				>
					{added ? "∅ in cart" : "+ add nothing"}
				</button>
			</div>

			<div
				style={{
					position: "absolute",
					top: 16,
					right: 16,
					fontFamily: "var(--mono)",
					fontSize: 10,
					letterSpacing: "0.08em",
					opacity: 0.5,
				}}
			>
				STOCK: {p.stock}
			</div>
		</div>
	);
}

function Placeholder({
	variant,
	hover,
}: {
	variant: "A" | "B" | "C";
	hover: boolean;
}) {
	const stripeColor = hover ? "rgba(244,241,236,0.12)" : "rgba(10,10,10,0.06)";
	return (
		<div
			style={{
				width: "100%",
				aspectRatio: "4 / 3",
				border: `1px dashed ${
					hover ? "rgba(244,241,236,0.25)" : "var(--line)"
				}`,
				position: "relative",
				overflow: "hidden",
				background: `repeating-linear-gradient(45deg, transparent 0 12px, ${stripeColor} 12px 13px)`,
			}}
		>
			<span
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "var(--mono)",
					fontSize: 11,
					letterSpacing: "0.12em",
					color: hover ? "rgba(244,241,236,0.55)" : "var(--muted)",
				}}
			>
				[ nothing.{variant.toLowerCase()} ]
			</span>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// ACCIDENTALLY USEFUL — now 100% client-side (no DB, no server)
// ─────────────────────────────────────────────────────────────────────

function generateRandomFiveLetterDomain(): string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz";
	let result = "";
	for (let i = 0; i < 5; i++) {
		result += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return result;
}

function getFiveFreshSuggestions(exclude: Set<string> = new Set()): string[] {
	const suggestions = new Set<string>();
	let attempts = 0;
	while (suggestions.size < 5 && attempts < 100) {
		attempts++;
		const candidate = generateRandomFiveLetterDomain();
		if (!exclude.has(candidate)) suggestions.add(candidate);
	}
	return Array.from(suggestions);
}

const COOLDOWN_MS = 1000 * 60 * 5; // 5 minutes
const COOLDOWN_STORAGE_KEY = "nnole_domain_cooldown";

function AccidentallyUseful({
	accent,
	isMobile = false,
}: {
	accent: string;
	isMobile?: boolean;
}) {
	const [domains, setDomains] = useState<string[]>(() => getFiveFreshSuggestions());
	const [cooldownError, setCooldownError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<number>(0);

	// Load last refresh time from localStorage on mount (persists across reloads)
	useEffect(() => {
		const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
		if (stored) setLastRefresh(parseInt(stored, 10));
	}, []);

	function handleRefresh() {
		const now = Date.now();
		if (lastRefresh && now - lastRefresh < COOLDOWN_MS) {
			setCooldownError(
				"Look. I went through the effort of generating these. The least you can do is pretend to consider one for a second."
			);
			// Clear the message after a few seconds
			setTimeout(() => setCooldownError(null), 4200);
			return;
		}

		const newOnes = getFiveFreshSuggestions(new Set(domains));
		setDomains(newOnes);
		const newTime = Date.now();
		setLastRefresh(newTime);
		localStorage.setItem(COOLDOWN_STORAGE_KEY, String(newTime));
		setCooldownError(null);
	}

	return (
		<section
			id="useful"
			data-screen-label="02b Accidentally Useful"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
			}}
		>
			<SectionHead
				num="02"
				title="Accidentally Useful"
				sub="We promised nothing. We accidentally shipped one (1) thing that sort of does something. We are deeply sorry (we considered a real checker but it was too much work)."
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
						color: "var(--fg)",
					}}
				>
					<p style={{ marginBottom: 18 }}>
						This domain was purchased{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							out of boredom
						</em>
						. Zero plan. Zero vision. Just pure "it was available and my
						card was saved" energy.
					</p>
					<p style={{ marginBottom: 18, color: "var(--muted)" }}>
						Then I noticed{" "}
						<span style={{ color: "var(--fg)" }}>
							nnole spells ELONN backwards (close enough)
						</span>
						, and at that point I was emotionally committed to the bit.
					</p>
					<p style={{ color: "var(--muted)" }}>
						To make peace with the situation, this site now generates five
						random 5-letter .com suggestions. We genuinely considered building
						a proper domain availability checker, but it seemed like too much
						hassle, so we gave up. Some of these may actually be available.
						Most probably aren't. We have no idea.
					</p>
				</div>

				<div style={{ gridColumn: isMobile ? "auto" : "span 7" }}>
					<div style={{ border: "1px solid var(--line)" }}>
						<div
							style={{
								padding: "14px 20px",
								borderBottom: "1px solid var(--line)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								fontFamily: "var(--mono)",
								fontSize: 11,
								letterSpacing: "0.1em",
								color: "var(--muted)",
								textTransform: "uppercase",
							}}
						>
							<span>5 random .com suggestions</span>
							<span style={{ color: accent }}>● some may be shockingly available</span>
						</div>

						{domains.map((domain) => (
							<DomainRow key={domain} domain={domain} accent={accent} />
						))}

						<div style={{ padding: "18px 20px" }}>
							<button
								type="button"
								onClick={handleRefresh}
								style={{
									fontFamily: "var(--mono)",
									fontSize: 11,
									letterSpacing: "0.12em",
									padding: "12px 18px",
									border: `1px solid ${accent}`,
									background: "transparent",
									color: accent,
									cursor: "pointer",
									textTransform: "uppercase",
									transition: "all 0.2s",
								}}
							>
								↻ give me 5 more i don't need
							</button>

							{cooldownError && (
								<div
									style={{
										marginTop: 16,
										padding: "12px 14px",
										border: "1px solid var(--line)",
										fontFamily: "var(--mono)",
										fontSize: 12,
										color: "var(--fg)",
										lineHeight: 1.5,
										animation: "fadeIn 0.3s ease",
									}}
								>
									{cooldownError}{" "}
									<span style={{ color: "var(--muted)" }}>
										I'm not mad, I'm just disappointed (in both of us).
									</span>
								</div>
							)}
						</div>
					</div>

					<div
						style={{
							marginTop: 16,
							fontFamily: "var(--mono)",
							fontSize: 10,
							color: "var(--muted)",
							letterSpacing: "0.08em",
							textTransform: "uppercase",
						}}
					>
						client-side only · button cooldown: 5 min · no real checking performed
					</div>
				</div>
			</div>
		</section>
	);
}

function DomainRow({ domain, accent }: { domain: string; accent: string }) {
	const [hover, setHover] = useState(false);
	return (
		<div
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				borderBottom: "1px solid var(--line)",
				padding: "16px 20px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				background: hover ? "var(--fg)" : "transparent",
				color: hover ? "var(--bg)" : "var(--fg)",
				transition: "background 0.2s, color 0.2s",
			}}
		>
			<span
				className="mono"
				style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}
			>
				{domain}.com
			</span>
			<span
				style={{
					fontFamily: "var(--mono)",
					fontSize: 10,
					letterSpacing: "0.12em",
					textTransform: "uppercase",
					color: hover ? "var(--bg)" : accent,
					border: `1px solid ${hover ? "var(--bg)" : accent}`,
					padding: "5px 10px",
				}}
			>
				might be real
			</span>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// ABOUT — manifesto + marquee of nothings
// ─────────────────────────────────────────────────────────────────────
function About({ accent, isMobile = false }: { accent: string; isMobile?: boolean }) {
	return (
		<section
			id="about"
			data-screen-label="03 About"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
				position: "relative",
				overflow: "hidden",
			}}
		>
			<SectionHead num="03" title="About" sub="A brief, mostly empty history." />

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
						The night the domain renewed itself.
					</div>

					<div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
						HEADQUARTERS
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
						The space between two adjacent thoughts.
					</div>

					<div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
						EMPLOYEES
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
						None. (Hiring? Also none.)
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
						We make{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							nothing
						</em>
						. Not the trendy, performative kind of nothing — the structural
						kind. The kind that's already there before you start. The kind
						that remains when you finish. The kind that, if you stare at it
						long enough, starts to look like a kind of{" "}
						<em
							style={{
								fontStyle: "normal",
								borderBottom: `2px solid ${accent}`,
							}}
						>
							something
						</em>
						, which is when we politely ask you to look away.
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
						<Stat n="0" label="Products in stock" />
						<Stat n="1" label="Accidental features" />
						<Stat n="∞" label="Possible interpretations" />
					</div>
				</div>
			</div>

			<Marquee accent={accent} />
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

function Marquee({ accent }: { accent: string }) {
	const words = [
		"nichts",
		"rien",
		"無",
		"нічого",
		"niente",
		"ingenting",
		"لا شيء",
		"kosong",
		"ਕੁਝ ਨਹੀਂ",
		"ʻaʻohe",
		"nada",
		"nichego",
		"inget",
		"mitään",
		"tidak ada",
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
					fontSize: isMobile ? "clamp(32px, 12vw, 56px)" : "clamp(48px, 8vw, 120px)",
					fontWeight: 300,
					letterSpacing: "-0.03em",
				}}
			>
				{row.map((w, i) => (
					<span
						key={i}
						style={{ color: i % 4 === 0 ? accent : "var(--fg)" }}
					>
						{w}
					</span>
				))}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// REVIEWS — testimonials from no one
// ─────────────────────────────────────────────────────────────────────
function Reviews({ accent, isMobile = false }: { accent: string; isMobile?: boolean }) {
	const reviews = [
		{
			body: "I expected nothing and that's exactly what I got. 0/5, would not recommend, but also would not not recommend.",
			name: "— Anonymous",
			meta: "Verified Non-Buyer",
		},
		{
			body: "My wife and I ordered one (1) nothing for our anniversary. It arrived in a beautifully empty box. We have been staring at it for three weeks.",
			name: "— H.",
			meta: "Repeat Non-Customer",
		},
		{
			body: "Initially I was disappointed by the lack of features. Then I realized: that IS the feature.",
			name: "— A reader",
			meta: "Vermont",
		},
		{
			body: "I tried to leave one star but the form rejected it. I left zero. Best decision of my year so far.",
			name: "— A passerby",
			meta: "June",
		},
	];

	return (
		<section
			id="reviews"
			data-screen-label="04 Reviews"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
			}}
		>
			<SectionHead
				num="04"
				title="Reviews"
				sub="What our zero customers are not saying."
			/>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: 1,
					marginTop: 56,
					background: "var(--line)",
					border: "1px solid var(--line)",
				}}
			>
				{reviews.map((r, i) => (
					<div
						key={i}
						style={{
							background: "var(--bg)",
							padding: 32,
							display: "flex",
							flexDirection: "column",
							minHeight: 280,
						}}
					>
						<div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
							{[0, 1, 2, 3, 4].map((s) => (
								<span
									key={s}
									style={{ fontSize: 18, color: "var(--line)" }}
								>
									★
								</span>
							))}
							<span
								style={{
									marginLeft: 8,
									fontFamily: "var(--mono)",
									fontSize: 11,
									color: "var(--muted)",
								}}
							>
								0.0 / 5
							</span>
						</div>
						<p
							style={{
								fontSize: 17,
								lineHeight: 1.5,
								fontWeight: 400,
								flex: 1,
								textWrap: "pretty",
							}}
						>
							"{r.body}"
						</p>
						<div
							style={{
								marginTop: 20,
								paddingTop: 16,
								borderTop: "1px solid var(--line)",
							}}
						>
							<div style={{ fontWeight: 500 }}>{r.name}</div>
							<div
								style={{
									fontFamily: "var(--mono)",
									fontSize: 11,
									color: "var(--muted)",
									marginTop: 2,
								}}
							>
								{r.meta}
							</div>
						</div>
					</div>
				))}
			</div>

			<div
				style={{
					marginTop: 32,
					fontFamily: "var(--mono)",
					fontSize: 11,
					color: "var(--muted)",
					textAlign: "center",
					letterSpacing: "0.04em",
				}}
			>
				Showing 4 of 0 reviews.{" "}
				<span
					style={{
						color: accent,
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					Load fewer →
				</span>
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// SEARCH that returns nothing
// ─────────────────────────────────────────────────────────────────────
function SearchVoid({ accent, isMobile = false }: { accent: string; isMobile?: boolean }) {
	const [q, setQ] = useState("");
	const [submitted, setSubmitted] = useState(false);

	useEffect(() => {
		if (submitted) {
			const t = setTimeout(() => setSubmitted(false), 4000);
			return () => clearTimeout(t);
		}
	}, [submitted]);

	return (
		<section
			data-screen-label="05 Search"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "60px 16px" : "120px 28px",
				textAlign: "center",
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
				05 — Try our search
			</div>
			<h2
				style={{
					fontSize: "clamp(36px, 5vw, 72px)",
					fontWeight: 300,
					letterSpacing: "-0.03em",
					margin: "24px auto 40px",
					maxWidth: 800,
					lineHeight: 1.1,
				}}
			>
				Search for anything. We won't find it.
			</h2>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					setSubmitted(true);
				}}
				style={{
					maxWidth: 600,
					margin: "0 auto",
					display: "flex",
					borderBottom: `1px solid ${accent}`,
					paddingBottom: 8,
				}}
			>
				<input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="e.g. meaning, purpose, that one thing…"
					style={{
						flex: 1,
						background: "transparent",
						border: "none",
						outline: "none",
						color: "var(--bg)",
						fontFamily: "var(--sans)",
						fontSize: 20,
						padding: "12px 0",
					}}
				/>
				<button
					type="submit"
					style={{
						background: "transparent",
						border: "none",
						color: accent,
						fontFamily: "var(--mono)",
						fontSize: 12,
						letterSpacing: "0.12em",
						cursor: "pointer",
						textTransform: "uppercase",
					}}
				>
					search →
				</button>
			</form>
			<div
				style={{
					marginTop: 32,
					minHeight: 60,
					fontFamily: "var(--mono)",
					fontSize: 13,
					opacity: 0.7,
				}}
			>
				{submitted ? (
					<div style={{ animation: "fadeIn 0.4s ease" }}>
						<div>No results for "{q || "nothing"}".</div>
						<div style={{ marginTop: 6, opacity: 0.6 }}>
							(Working as intended.)
						</div>
					</div>
				) : (
					<div style={{ opacity: 0.4 }}>Awaiting your query.</div>
				)}
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// CONTACT — messages sent here go into the actual void (no DB)
// ─────────────────────────────────────────────────────────────────────
function Contact({ accent, isMobile = false }: { accent: string; isMobile?: boolean }) {
	const fetcher = useFetcher();
	const isSending = fetcher.state === "submitting";
	const isSuccess = fetcher.data?.success;

	return (
		<section id="contact" className="section" data-screen-label="06 Contact">
			<SectionHead
				num="06"
				title="Contact"
				sub="Messages sent here go to a void we maintain at 4° below room temperature."
			/>

			<fetcher.Form
				method="post"
				style={{
					maxWidth: 720,
					marginTop: isMobile ? 32 : 56,
					display: "grid",
					gap: isMobile ? 24 : 32,
				}}
			>
				<input type="hidden" name="intent" value="contact" />

				<div>
					<label className="field-label">Your name (optional)</label>
					<input
						name="name"
						placeholder="Or no name. Whatever feels right."
						className="field-input"
					/>
				</div>

				<div>
					<label className="field-label">Your email (we won't use it)</label>
					<input
						name="email"
						type="email"
						placeholder="you@somewhere.com"
						className="field-input"
					/>
				</div>

				<div>
					<label className="field-label">What's on your mind?</label>
					<textarea
						name="body"
						placeholder="Type anything. Or don't."
						className="field-input field-textarea"
						rows={5}
						required
					/>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
					<button
						type="submit"
						disabled={isSending}
						className="btn btn-accent"
						style={{ minWidth: 220 }}
					>
						{isSending
							? "Sending into the void…"
							: isSuccess
								? "∅ Received (and ignored)"
								: "Send into the void →"}
					</button>
					<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
						We respond within 0–∞ business days.
					</span>
				</div>

				{isSuccess && (
					<div style={{ color: "var(--muted)", fontSize: 14 }}>
						Thank you. Your message has been successfully lost.
					</div>
				)}
			</fetcher.Form>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// CAREERS — open positions for no one
// ─────────────────────────────────────────────────────────────────────
function Careers({ isMobile = false }: { isMobile?: boolean }) {
	const roles = [
		{
			title: "Senior Doer of Nothing",
			team: "Operations",
			loc: "Remote / Anywhere / Nowhere",
			type: "Full-time",
		},
		{
			title: "Head of Inactivity",
			team: "Leadership",
			loc: "Unspecified",
			type: "Part-time",
		},
		{
			title: "Engineer — Empty Systems",
			team: "Platform",
			loc: "Distributed",
			type: "Contract",
		},
		{
			title: "Designer of Absence",
			team: "Brand",
			loc: "∅",
			type: "Full-time",
		},
	];
	return (
		<section
			id="careers"
			data-screen-label="07 Careers"
			style={{
				borderTop: "1px solid var(--line)",
				padding: isMobile ? "48px 16px 64px" : "90px 28px 120px",
			}}
		>
			<SectionHead
				num="07"
				title="Careers"
				sub="We have 0 openings. Apply anyway."
			/>

			<div style={{ marginTop: 56, border: "1px solid var(--line)" }}>
				{roles.map((r, i) => (
					<Role key={i} {...r} last={i === roles.length - 1} isMobile={isMobile} />
				))}
			</div>
		</section>
	);
}

function Role({
	title,
	team,
	loc,
	type,
	last,
	isMobile = false,
}: {
	title: string;
	team: string;
	loc: string;
	type: string;
	last: boolean;
	isMobile?: boolean;
}) {
	const [open, setOpen] = useState(false);

	// Mobile: stacked title + meta row
	if (isMobile) {
		return (
			<div style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
				<button
					type="button"
					onClick={() => setOpen(!open)}
					style={{
						width: "100%",
						background: "transparent",
						border: "none",
						cursor: "pointer",
						padding: "16px",
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						gap: 6,
						textAlign: "left",
						color: "inherit",
						position: "relative",
					}}
				>
					<div style={{ fontSize: 16, fontWeight: 500, paddingRight: 30 }}>{title}</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
						<span>{team}</span>
						<span style={{ opacity: 0.35 }}>·</span>
						<span>{loc}</span>
						<span style={{ opacity: 0.35 }}>·</span>
						<span>{type}</span>
					</div>
					<div
						style={{
							position: "absolute",
							right: 16,
							top: 18,
							transform: open ? "rotate(90deg)" : "rotate(0)",
							transition: "transform 0.2s",
							fontSize: 18,
							opacity: 0.55,
						}}
					>
						→
					</div>
				</button>
				{open && (
					<div
						style={{
							padding: "0 16px 18px",
							color: "var(--muted)",
							fontSize: 14,
							lineHeight: 1.5,
						}}
					>
						You will be responsible for doing nothing in a structured,
						deliberate manner. No deliverables, no standups, no all-hands.
						References from previous voids preferred but not required.
						Compensation: commensurate with output.{" "}
						<span style={{ color: "var(--fg)" }}>
							Apply by sending nothing through the contact form.
						</span>
					</div>
				)}
			</div>
		);
	}

	// Desktop grid row
	return (
		<div style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				style={{
					width: "100%",
					background: "transparent",
					border: "none",
					cursor: "pointer",
					padding: "20px 24px",
					display: "grid",
					gridTemplateColumns: "1fr 160px 200px 90px 30px",
					alignItems: "center",
					gap: 16,
					textAlign: "left",
					color: "inherit",
				}}
			>
				<div style={{ fontSize: 18, fontWeight: 500 }}>{title}</div>
				<div
					className="mono"
					style={{ fontSize: 12, color: "var(--muted)" }}
				>
					{team}
				</div>
				<div
					className="mono"
					style={{ fontSize: 12, color: "var(--muted)" }}
				>
					{loc}
				</div>
				<div
					className="mono"
					style={{ fontSize: 12, color: "var(--muted)" }}
				>
					{type}
				</div>
				<div
					style={{
						transform: open ? "rotate(90deg)" : "rotate(0)",
						transition: "transform 0.2s",
						fontSize: 18,
					}}
				>
					→
				</div>
			</button>
			{open && (
				<div
					style={{
						padding: "0 24px 24px",
						maxWidth: 720,
						color: "var(--muted)",
						fontSize: 15,
						lineHeight: 1.6,
					}}
				>
					You will be responsible for doing nothing in a structured,
					deliberate manner. No deliverables, no standups, no all-hands.
					References from previous voids preferred but not required.
					Compensation: commensurate with output.{" "}
					<span style={{ color: "var(--fg)" }}>
						Apply by sending nothing through the contact form.
					</span>
				</div>
			)}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────
function Footer({ accent, mounted, isMobile = false }: { accent: string; mounted: boolean; isMobile?: boolean }) {
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
						<span>↳ /</span>
						<span style={{ opacity: 0.3 }}>↳ /nothing</span>
						<span style={{ opacity: 0.3 }}>↳ /nothing/here</span>
						<span style={{ opacity: 0.3 }}>↳ /nothing/here/either</span>
					</div>
				</div>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>SOCIAL</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<span>@nnole (not on twitter)</span>
						<span>@nnole (not on instagram)</span>
						<span>@nnole (not on tiktok)</span>
						<span>@nnole (not on bluesky)</span>
					</div>
				</div>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>LEGAL</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<span>Terms (none)</span>
						<span>Privacy (we collect none)</span>
						<span>Cookies (none, sorry)</span>
						<span>Refunds (no)</span>
					</div>
				</div>
				<div>
					<div style={{ opacity: 0.5, marginBottom: 10 }}>STATUS</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<span style={{ color: accent }}>● All systems doing nothing</span>
						<span>Uptime: 100% (of available nothing)</span>
						<span suppressHydrationWarning>
							Local time:{" "}
							{mounted && time
								? time.toLocaleTimeString([], { hour12: false })
								: "--:--:--"}
						</span>
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
				<div>© {year} NNOLE INC. Patented nothing.</div>
				<div>
					Bought out of boredom · spells ELONN backwards · no refunds
				</div>
				<div>v0.0.0</div>
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

// ─────────────────────────────────────────────────────────────────────
// FAKE CHECKOUT — beautifully pointless
// ─────────────────────────────────────────────────────────────────────
function CheckoutModal({
	open,
	onClose,
	accent,
	onComplete,
}: {
	open: boolean;
	onClose: () => void;
	accent: string;
	onComplete: () => void;
}) {
	const [step, setStep] = useState<"review" | "details" | "processing" | "done">("review");

	if (!open) return null;

	const handleNext = () => {
		if (step === "review") setStep("details");
		else if (step === "details") {
			setStep("processing");
			setTimeout(() => setStep("done"), 1350);
		} else if (step === "done") {
			onComplete();
			setStep("review");
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.6)",
				zIndex: 200,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 20,
			}}
			onClick={onClose}
		>
			<div
				style={{
					background: "var(--bg)",
					color: "var(--fg)",
					border: "1px solid var(--line)",
					width: "100%",
					maxWidth: 520,
					padding: 32,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
					<div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
						CHECKOUT / STEP {step === "review" ? "1" : step === "details" ? "2" : step === "processing" ? "3" : "4"}
					</div>
					<button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
				</div>

				{step === "review" && (
					<>
						<h3 style={{ fontSize: 28, margin: "0 0 8px" }}>Review your nothing</h3>
						<p style={{ color: "var(--muted)", marginBottom: 24 }}>
							You are about to purchase 1 (one) unit of nothing.
						</p>
						<div style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 24 }}>
							<div>1 × Nothing (any variety)</div>
							<div style={{ color: "var(--muted)", marginTop: 4 }}>$0.00</div>
						</div>
					</>
				)}

				{step === "details" && (
					<>
						<h3 style={{ fontSize: 28, margin: "0 0 8px" }}>Your details (optional)</h3>
						<p style={{ color: "var(--muted)", marginBottom: 16 }}>
							We don't actually need any of this.
						</p>
						<input placeholder="Full name" className="field-input" style={{ marginBottom: 12 }} />
						<input placeholder="Email" className="field-input" style={{ marginBottom: 24 }} />
					</>
				)}

				{step === "processing" && (
					<div style={{ textAlign: "center", padding: "40px 20px" }}>
						<div style={{ fontSize: 48, marginBottom: 12 }}>∅</div>
						<div>Processing your order of nothing...</div>
					</div>
				)}

				{step === "done" && (
					<div style={{ textAlign: "center", padding: "20px 0" }}>
						<div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
						<h3 style={{ marginBottom: 8 }}>Order placed.</h3>
						<p style={{ color: "var(--muted)" }}>
							Your nothing will arrive in 3–5 business eternities.<br />
							Order #000000
						</p>
					</div>
				)}

				<div style={{ display: "flex", gap: 12, marginTop: 24 }}>
					<button className="btn" onClick={onClose} style={{ flex: 1 }}>
						Cancel
					</button>
					<button
						className="btn btn-accent"
						onClick={handleNext}
						style={{ flex: 1 }}
						disabled={step === "processing"}
					>
						{step === "review" && "Continue"}
						{step === "details" && "Place order"}
						{step === "processing" && "Processing…"}
						{step === "done" && "Close"}
					</button>
				</div>
			</div>
		</div>
	);
}
