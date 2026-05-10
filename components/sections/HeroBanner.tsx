"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const GAME_ROUTES = ["/limbo", "/mines", "/upgrader", "/coinflip"];

function getRandomGame() {
  return GAME_ROUTES[Math.floor(Math.random() * GAME_ROUTES.length)];
}

const slides = [
  {
    id: 1,
    tag: "SPECIAL EVENT",
    title: "DISCORD GIVEAWAYS",
    subtitle:
      "Join our active community to enter daily giveaways and stay updated on the latest drops!",
    cta: "Join Discord",
    href: "https://discord.gg/travbet",
    accent: "#5865f2",
    bg: "radial-gradient(circle at 20% 50%, rgba(88, 101, 242, 0.15) 0%, transparent 70%)",
    accentBg: "rgba(88,101,242,0.15)",
    image:
      "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/New-Project-72-1771768085069.png",
    imageMobile:
      "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/resized_375x260_character_focus-1772028000309.png",
  },
  {
    id: 2,
    tag: "LIVE NOW",
    title: "TRAV.BET IS LIVE",
    subtitle:
      "Experience the next generation of Roblox gambling. Fast, fair, and cinematic gaming at your fingertips.",
    cta: "Play Now",
    href: "/random",
    accent: "#be30ff",
    bg: "radial-gradient(circle at 20% 50%, rgba(249, 115, 22, 0.15) 0%, transparent 70%)",
    accentBg: "rgba(249,115,22,0.12)",
    image:
      "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/New-Project-73-1771768975924.png",
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const router = useRouter();

  const goTo = useCallback(
    (index: number, dir: "left" | "right" = "right") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 400);
    },
    [animating],
  );

  const next = useCallback(() => {
    goTo((current + 1) % slides.length, "right");
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, "left");
  }, [current, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <div
        className="relative overflow-hidden rounded-xl h-[180px] md:h-[380px] select-none"
        style={{
          background: "linear-gradient(135deg, #12001a 0%, #1a002a 100%)",
        }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === "right" ? "40px" : "-40px"})`
              : "translateX(0)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover object-center hidden md:block"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(slide as any).imageMobile ?? slide.image}
            alt={slide.title}
            className="w-full h-full object-cover object-center block md:hidden"
          />
        </div>

        {/* Left fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/60 to-transparent pointer-events-none z-10" />

        {/* Content */}
        <div
          className="relative z-20 h-full flex flex-col justify-center px-5 md:px-14 gap-1.5 md:gap-3"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === "right" ? "-20px" : "20px"})`
              : "translateX(0)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {/* Tag */}
          {slide.tag && (
            <span
              className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase px-2.5 py-1 rounded-full w-fit"
              style={{
                background: `${slide.accent}22`,
                color: slide.accent,
              }}
            >
              {slide.tag}
            </span>
          )}

          {/* Title */}
          <h2
            className="font-black leading-[1.1] tracking-tighter"
            style={{
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              fontSize: "clamp(28px, 6vw, 90px)",
              color: "white",
              maxWidth: "90%",
            }}
          >
            {slide.id === 2 ? (
              <>
                <span className="text-white">TRAV</span>
                <span
                  className="text-[#be30ff]"
                  style={{ textShadow: "0 0 24px #2a003f, 0 0 8px #be30ff" }}
                >
                  .BET
                </span>
                <br />
                <span className="text-white opacity-95">IS LIVE NOW</span>
              </>
            ) : (
              slide.title
            )}
          </h2>

          {/* Subtitle */}
          <p
            className="text-white/70 font-semibold leading-relaxed tracking-wide"
            style={{
              fontSize: "clamp(12px, 2.5vw, 17px)",
              maxWidth: "min(500px, 60%)",
            }}
          >
            {slide.subtitle}
          </p>

          {/* CTA */}
          <div className="mt-4">
            {slide.id === 2 ? (
              <button
                onClick={() => router.push(getRandomGame())}
                className="group relative px-10 py-4 bg-gradient-to-b from-[#be30ff] to-[#2a003f] rounded-lg text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#2a003f]/40 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                Play Now
              </button>
            ) : (
              <Link
                href={slide.href}
                target={slide.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  slide.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="group relative px-10 py-4 bg-[#5865f2] rounded-lg text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden block w-fit"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {slide.cta}
              </Link>
            )}
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i, i > current ? "right" : "left")}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "20px" : "6px",
                height: "6px",
                background:
                  i === current ? slide.accent : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
