import React, { useMemo } from "react";

interface CoinSpriteProps {
  side: "blue" | "orange";
  isFlipping?: boolean;
  isLooping?: boolean;
  size?: number;
  className?: string;
  variant?: 1 | 2;
}

export const CoinSprite: React.FC<CoinSpriteProps> = ({
  side,
  isFlipping,
  isLooping,
  size = 120,
  className = "",
}) => {
  // Use unique timestamp for flipping to restart GIF
  const timestamp = useMemo(() => Date.now(), [isFlipping]);

  // Determine the image source based on state
  // Blue = Heads (Daggers), Orange = Tails (Pistols)
  const isAnimated = isFlipping || isLooping;
  
  const headsAsset = isAnimated ? "/heads.gif" : "/coin-heads-static.png";
  const tailsAsset = isAnimated ? "/tails.gif" : "/coin-tails-static.png";

  let imgSrc = side === "blue" ? headsAsset : tailsAsset;

  // Add cache-busting timestamp only when flipping to ensure restart
  if (isFlipping) {
    imgSrc = `${imgSrc}?t=${timestamp}`;
  }

  return (
    <div 
      className={`coin-sprite-container ${className}`}
      style={{
        width: size,
        height: size,
        transform: "translateZ(0)", // Force hardware acceleration
        willChange: "transform",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "1000px"
      }}
    >
      <img
        src={imgSrc}
        alt={side}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block"
        }}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};


