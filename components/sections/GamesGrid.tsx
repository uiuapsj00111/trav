import Image from "next/image";
import Link from "next/link";
import { CoinSprite } from "./CoinSprite";

const GamesGrid = () => {
  const games = [
    {
      name: "COINFLIP",
      subtitle: "TRAV.BET",
      href: "/coinflip",
      color: "#be30ff",
      fgCoins: true,
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-32-1771890713206.png?width=400&height=400&resize=contain",
      bgOpacity: "opacity-100",
    },
    {
      name: "MINES",
      subtitle: "TRAV.BET",
      href: "/mines",
      color: "#22c55e",
      disabled: false,
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-19-1771775663405.png",
      hoverGif:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-20-1771776041963.png",
      bgOpacity: "opacity-100",
    },
    {
      name: "LIMBO",
      subtitle: "TRAV.BET",
      href: "/limbo",
      color: "#be30ff",
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-26-1772214202057.png?width=400&height=400&resize=contain",
      bgOpacity: "opacity-100",
    },


    {
      name: "UPGRADER",
      subtitle: "TRAV.BET",
      href: "/upgrader",
      color: "#be30ff",
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-26-4-1772214472123.png?width=400&height=400&resize=contain",
      bgOpacity: "opacity-100",
    },

    {
      name: "BLACKJACK",
      subtitle: "TRAV.BET",
      href: "/blackjack",
      color: "#22c55e",
      disabled: false,
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-26-1771778864277.png",
      bgOpacity: "opacity-100",
    },
    {
      name: "ROULETTE",
      subtitle: "TRAV.BET",
      href: "/roulette",
      color: "#eab308",
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-26-1772403514876.png?width=400&height=400&resize=contain",
      bgOpacity: "opacity-100",
    },
    {
      name: "DICE",
      subtitle: "TRAV.BET",
      href: "/dice",
      color: "#be30ff",
      bgImage:
        "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/dice_game_promo_1775849426557.png",
      bgOpacity: "opacity-100",
    },
  ].sort((a, b) => {
    const aDisabled = (a as { disabled?: boolean }).disabled ?? false;
    const bDisabled = (b as { disabled?: boolean }).disabled ?? false;
    if (aDisabled && !bDisabled) return 1;
    if (!aDisabled && bDisabled) return -1;
    return 0;
  });

  return (
    <section className="mt-[12px] mb-[30px] w-full max-w-[1600px] mx-auto px-3 md:px-6 relative z-10 box-border">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        {games.map((game) => (
          <Link
            key={game.name}
            href={(game as { disabled?: boolean }).disabled ? "#" : game.href}
            onClick={(e) => {
              if ((game as { disabled?: boolean }).disabled) e.preventDefault();
            }}
            className={`relative group overflow-hidden rounded-xl bg-[#0f0f0f] h-[140px] md:h-[310px] transition-all duration-300 block ${(game as { disabled?: boolean }).disabled ? "cursor-not-allowed opacity-40 grayscale" : "cursor-pointer hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]"}`}
          >
            {/* Background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              {(game as { bgImage?: string }).bgImage ? (
                <>
                  {/* Static image — hidden on hover if hoverGif exists */}
                  <Image
                    src={(game as { bgImage?: string }).bgImage!}
                    alt={`${game.name} Background`}
                    fill
                    quality={100}
                    unoptimized
                    className={`object-cover ${(game as { bgOpacity?: string }).bgOpacity ?? "opacity-40"} transition-opacity duration-400 ease-in-out ${(game as { hoverGif?: string }).hoverGif ? "group-hover:opacity-0" : "group-hover:scale-110"}`}
                  />
                  {(game as { hoverGif?: string }).hoverGif && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(game as { hoverGif?: string }).hoverGif!}
                      alt={`${game.name} animated`}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-in-out"
                    />
                  )}
                </>
              ) : (
                <div
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${game.color}33 0%, transparent 70%)`,
                  }}
                />
              )}
            </div>

            {/* Foreground Icon */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              {(game as { fgCoins?: boolean }).fgCoins ? (
                <div className="relative w-[170px] h-[130px] group-hover:scale-110 transition-transform duration-500">
                  {/* Tails (orange) — back */}
                  <div
                    className="absolute left-0 top-[10px] w-[110px] h-[110px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:-translate-y-2"
                    style={{
                      filter: "drop-shadow(0 0 20px rgba(249, 115, 22, 0.4))",
                    }}
                  >
                    <CoinSprite side="orange" isLooping size={110} />
                  </div>
                  {/* Heads (blue) — front */}
                  <div
                    className="absolute right-0 top-0 w-[110px] h-[110px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:-translate-y-2"
                    style={{
                      filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))",
                    }}
                  >
                    <CoinSprite side="blue" isLooping size={110} />
                  </div>
                </div>
              ) : (game as { fgImage?: string }).fgImage ? (
                <div className="relative w-[150px] h-[150px] drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <Image
                    src={(game as { fgImage?: string }).fgImage!}
                    alt={game.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="group-hover:scale-110 transition-transform duration-500">
                  {game.icon}
                </div>
              )}
            </div>

            {/* Text Overlay */}
            <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
              <h3
                className="font-black text-white tracking-tighter uppercase mb-1 text-[20px] md:text-[28px]"
              >
                {game.name}
              </h3>
              <p
                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-white opacity-60">TRAV</span>
                  <span className="text-[#be30ff]">.BET</span>
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default GamesGrid;
