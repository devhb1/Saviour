import { DemoConsole } from "../components/DemoConsole";

/**
 * Demo surface for the product loop.
 * First viewport: brand + one line + the address action (single composition).
 * APIs: /api/investigate (mainnet Graph) · /api/shield/check (Sepolia memory).
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 24px 64px",
      }}
    >
        <div style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <p
          className="rise"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 9vw, 88px)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
          }}
        >
          SAVIOURS
        </p>
        <p
          className="rise"
          style={{
            margin: "18px 0 0",
            maxWidth: 420,
            fontSize: 18,
            lineHeight: 1.45,
            color: "var(--ink-muted)",
            animationDelay: "80ms",
          }}
        >
          Investigate once. Remember forever. Block instantly next time.
        </p>
        <p
          className="rise"
          style={{
            margin: "10px 0 36px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--ink-muted)",
            animationDelay: "140ms",
          }}
        >
          Mainnet evidence · Sepolia memory · registry-first Shield
        </p>

        <div className="rise" style={{ animationDelay: "200ms" }}>
          <DemoConsole />
        </div>
      </div>
    </main>
  );
}
