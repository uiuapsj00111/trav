"use client";

import React, { useMemo, useState, useEffect } from "react";

export default function ParticleBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 140 }).map((_, i) => ({
      left: `${Math.random() * 105 - 2.5}%`,
      size: Math.random() * 2 + 1.2,
      rainDuration: Math.random() * 4 + 3,
      shimmerDuration: Math.random() * 2 + 1,
      delay: Math.random() * 15,
      opacity: Math.random() * 0.3 + 0.3, // Solid base opacity
    }));
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute bg-[#be30ff] rounded-full"
          style={{
            left: p.left,
            top: "-10vh",
            width: `${p.size}px`,
            height: `${p.size * 6}px`,
            boxShadow: "0 0 10px rgba(190, 48, 255, 0.5)",
            opacity: p.opacity,
            animation: `particle-rain ${p.rainDuration}s linear infinite, particle-shimmer ${p.shimmerDuration}s ease-in-out infinite`,
            animationDelay: `${-p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
