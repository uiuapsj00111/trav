import Image from "next/image";

interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  level: number;
  score: number;
  totalValue: number;
  isWinner?: boolean;
}

const players: Player[] = [
  {
    id: "1",
    name: "Noxvibed",
    avatarUrl:
      "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-1F1D21CBEBF8A3E6143C3A2DB777C910-Png/180/180/AvatarHeadshot/Webp/noFilter",
    level: 20,
    score: 12450,
    totalValue: 12450,
    isWinner: true,
  },
  {
    id: "2",
    name: "0nlyy_tay",
    avatarUrl:
      "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-39B45BC004DD1990F8F533207C48578F-Png/180/180/AvatarHeadshot/Webp/noFilter",
    level: 5,
    score: 8720,
    totalValue: 8720,
  },
];

export default function BattlesPlayerColumns() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 px-4 md:px-6 py-8">
      {players.map((player) => (
        <div
          key={player.id}
          className="relative flex flex-col bg-[#1A2544] rounded-2xl group overflow-hidden"
        >
          {/* Winner Glow Effect */}
          {player.isWinner && (
            <div className="absolute inset-0 bg-radial-gradient from-[#F3B239]/10 to-transparent pointer-events-none" />
          )}

          {/* Player Header Content */}
          <div className="flex p-4 gap-4 relative z-10">
            {/* Avatar Section with Gradient Border */}
            <div className="relative shrink-0">
              <div className="size-20 md:size-24 rounded-2xl p-0.5 bg-gradient-to-b from-[#F3B239] to-[#D38502]">
                <div className="size-full bg-[#181818] rounded-[calc(1rem-2px)] flex items-center justify-center overflow-hidden">
                  <Image
                    src={player.avatarUrl}
                    alt={player.name}
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Level Badge */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-b from-[#F3B239] to-[#D38502] rounded-md shadow-lg">
                <span className="text-[11px] font-bold text-[#0a0a0a]">
                  {player.level}
                </span>
              </div>
            </div>

            {/* Info & Score Progress */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {player.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <img src="/coin.webp" className="size-4" alt="coins" />
                    <span className="text-sm font-bold text-white tabular-nums">
                      {player.totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {player.isWinner && (
                  <div className="bg-[#F3B239] text-[#0a0a0a] text-[10px] font-black px-2 py-0.5 rounded italic">
                    WINNER
                  </div>
                )}
              </div>

              {/* Horizontal Score Bar (Mobile Layout/Secondary Info) */}
              <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden mt-3 relative">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#F3B239] to-[#E5AD4E] transition-[width] duration-1000"
                  style={{ width: `${(player.score / 15000) * 100}%` }}
                />
              </div>
            </div>

            {/* Vertical Score Progress Bar (Desktop Highlight) */}
            <div className="hidden lg:flex flex-col items-center justify-between w-4 bg-[#0a0a0a] rounded-full p-0.5 border border-[#2a2a2a]">
              <div className="flex-1 w-full relative">
                <div
                  className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#D38502] to-[#F3B239] rounded-full transition-[height] duration-1000"
                  style={{ height: `${(player.score / 15000) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Current Round Result Slot Area */}
          <div className="mt-auto px-4 pb-4">
            <div className="h-28 w-full bg-[#131B3C] border-t border-[#2a2a2a] rounded-b-xl flex items-center justify-center relative group/slot">
              {/* Animated Slot Border Decoration */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#F3B239]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#F3B239]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#F3B239]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#F3B239]" />
              </div>

              {/* Animated Reel Result Shadow */}
              <div className="w-20 h-20 bg-linear-to-b from-white/5 to-transparent rounded-lg flex items-center justify-center border border-white/10 animate-pulse">
                <p className="text-[#888888] text-xs font-bold text-center px-2">
                  ROLLING...
                </p>
              </div>
            </div>
          </div>

          {/* Victory Outline Decor */}
          {player.isWinner && (
            <div className="absolute inset-0 border-2 border-[#F3B239]/50 rounded-2xl pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );
}
// Battles feature fully removed
