"use client";

import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [phase, setPhase] = useState<"loading" | "fadeout" | "done">("loading");
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setShouldRender(true);
    const fadeTimer = setTimeout(() => setPhase("fadeout"), 2400);
    const doneTimer = setTimeout(() => {
      setPhase("done");
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done" || !shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at center, #110f21 0%, #050508 100%)",
        transition: "opacity 0.6s ease-out",
        opacity: phase === "fadeout" ? 0 : 1,
      }}
    >
      {/* Logo */}
      <div
        className="relative flex items-center select-none"
        style={{
          animation: "logoPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both",
        }}
      >
        {"trav.".split("").map((char, i) => (
          <span
            key={i}
            className="text-7xl font-black tracking-tight text-white/90"
            style={{
              animation: `letterDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${
                0.25 + i * 0.07
              }s both`,
              textShadow: "0 2px 20px rgba(255,255,255,0.1)",
            }}
          >
            {char}
          </span>
        ))}
        {"bet".split("").map((char, i) => (
          <span
            key={`b${i}`}
            className="text-7xl font-black tracking-tight"
            style={{
              color: "#be30ff",
              animation: `letterDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${
                0.6 + i * 0.07
              }s both`,
              textShadow:
                "0 0 25px rgba(168,85,247,0.6), 0 0 50px rgba(168,85,247,0.3)",
            }}
          >
            {char}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes logoPop {
          0%   { opacity: 0; transform: scale(0.6); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes letterDrop {
          0%   { opacity: 0; transform: translateY(-40px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
