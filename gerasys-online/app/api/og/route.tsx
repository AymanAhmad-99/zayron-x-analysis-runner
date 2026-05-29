import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title    = searchParams.get("title")    ?? "ZAYRON-X Intelligence";
  const category = searchParams.get("category") ?? "INTELLIGENCE";
  const author   = searchParams.get("author")   ?? "Zayron Intel";
  const date     = searchParams.get("date")     ?? new Date().getFullYear().toString();

  // Truncate long titles
  const displayTitle = title.length > 80 ? title.slice(0, 77) + "…" : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#09090B",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(0,255,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(180,120,60,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Top accent bar */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #00FFFF, #D2B48C, transparent)", width: "100%" }} />

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 72px", justifyContent: "space-between" }}>
          {/* Category chip */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                background: "rgba(0,255,255,0.12)",
                border: "0.5px solid rgba(0,255,255,0.3)",
                borderRadius: "6px",
                padding: "4px 12px",
                color: "#00CCCC",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {category.toUpperCase()}
            </div>
            {/* Live dot */}
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#DC2626" }} />
            <span style={{ color: "#DC2626", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>
              LIVE INTELLIGENCE
            </span>
          </div>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            <div
              style={{
                fontSize: displayTitle.length > 60 ? "44px" : "54px",
                fontWeight: 800,
                color: "#FFFFFF",
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                maxWidth: "900px",
              }}
            >
              {displayTitle}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(0,255,255,0.1)",
                  border: "0.5px solid rgba(0,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00CCCC",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                Zx
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#D2B48C", fontSize: "13px", fontWeight: 700 }}>{author}</span>
                <span style={{ color: "#52525B", fontSize: "11px", fontWeight: 400 }}>{date}</span>
              </div>
            </div>

            {/* Brand */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0" }}>
              <span style={{ color: "#FFFFFF", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em" }}>
                ZAYRON
              </span>
              <span style={{ color: "#FFFFFF", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em" }}>
                -
              </span>
              <span
                style={{
                  color: "#00FFFF",
                  fontSize: "28px",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  fontStyle: "italic",
                }}
              >
                X
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
