"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";

const PromotionSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      image:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/e493a9e9-cb10-474b-b970-6c6f2509ebfd-rbxchance-com/assets/images/discord-17.png",
      title: "FREE CODES, EVENTS, UPDATES & GIVEAWAY",
      subtitle: "Join Our Community And Never Miss Out!",
      buttonText: "Join Discord!",
      buttonLink: "https://discord.gg/rbxchance",
    },
    {
      id: 2,
      image:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/e493a9e9-cb10-474b-b970-6c6f2509ebfd-rbxchance-com/assets/images/discord-17.png",
      title: "SEASONAL REWARDS ARE HERE",
      subtitle: "Play your favorite games and climb the leaderboard!",
      buttonText: "View Rewards",
      buttonLink: "#",
    },
    {
      id: 3,
      image:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/e493a9e9-cb10-474b-b970-6c6f2509ebfd-rbxchance-com/assets/images/discord-17.png",
      title: "DAILY RAIN EVENTS",
      subtitle: "Stay active in chat to participate in huge rain drops!",
      buttonText: "Open Chat",
      buttonLink: "#",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative w-full max-w-[1600px] mx-auto mb-[20px] select-none">
      <div
        className="relative w-full aspect-[1600/367] lg:aspect-[1600/367] max-lg:aspect-video overflow-hidden rounded-[1rem] bg-[#0a0a0a] border border-white/5 shadow-2xl"
        style={{ backfaceVisibility: "hidden" }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {/* Background Image Container */}
            <div className="relative w-full h-full">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover object-right lg:object-center"
                priority={index === 0}
              />

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center px-[5%] lg:px-[8%] bg-gradient-to-r from-[#020617]/80 to-transparent">
                <div className="max-w-[500px] flex flex-col items-start gap-4">
                  <h1 className="text-[clamp(1.5rem,4vw,2.5rem)] font-[800] leading-tight text-white tracking-tight uppercase [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">
                    {slide.title.split(", ").map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i !== arr.length - 1 ? ",\n" : ""}
                        {i !== arr.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h1>

                  <p className="text-[clamp(0.875rem,2vw,1.125rem)] text-slate-300 font-medium tracking-wide">
                    {slide.subtitle}
                  </p>

                  <a
                    href={slide.buttonLink}
                    className="mt-2 inline-flex items-center justify-center px-8 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white text-[14px] font-bold uppercase rounded-[0.75rem] transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(88,101,242,0.3)]"
                  >
                    {slide.buttonText}
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Pagination Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                index === currentSlide
                  ? "w-8 bg-blue-500"
                  : "w-4 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromotionSlider;
