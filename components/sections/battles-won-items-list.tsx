import React from 'react';
import Image from 'next/image';

interface WonItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rarity: 'Ancient' | 'Godly' | 'Vintage' | 'Legendary' | 'Unique' | 'Common' | 'Uncommon' | 'Rare';
}

interface BattlesWonItemsListProps {
  items: WonItem[];
  totalValue: number;
}

const rarityGradientMap: Record<WonItem['rarity'], string> = {
  Ancient: 'radial-gradient(circle at center, rgba(243, 178, 57, 0.25) 0%, transparent 75%)',
  Godly: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.25) 0%, transparent 75%)',
  Vintage: 'radial-gradient(circle at center, rgba(136, 148, 175, 0.25) 0%, transparent 75%)',
  Legendary: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.25) 0%, transparent 75%)',
  Unique: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.25) 0%, transparent 75%)',
  Common: 'radial-gradient(circle at center, rgba(156, 163, 175, 0.25) 0%, transparent 75%)',
  Uncommon: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.25) 0%, transparent 75%)',
  Rare: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.25) 0%, transparent 75%)',
};

const BattlesWonItemsList: React.FC<BattlesWonItemsListProps> = ({ items, totalValue }) => {
  return (
    <div className="flex flex-col w-full bg-[#111111]/40 rounded-xl overflow-hidden self-end">
      {/* Header with Total Value */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1A2747]/60 border-b border-[#2a2a2a]">
        <p className="text-[13px] font-bold text-[#888888] uppercase tracking-wider">Won Items</p>
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] px-2.5 py-1 rounded-md border border-[#2a2a2a]">
          <Image 
            src="https://mm2wild.com/coin.webp" 
            alt="Coin" 
            width={14} 
            height={14} 
            className="object-contain"
          />
          <span className="text-[14px] font-bold text-white tabular-nums">
            {totalValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable List */}
      <div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-hide">
        {items.length === 0 ? (
          <div className="flex items-center justify-center w-full py-4">
            <p className="text-[#888888] text-sm font-medium italic">No items won yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.id}
              className="relative shrink-0 group"
            >
              {/* Card Container */}
              <div 
                className="w-[82px] h-[82px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] relative flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105"
                style={{
                  background: `linear-gradient(180deg, rgba(34, 50, 99, 0.8) 0%, #111111 100%), ${rarityGradientMap[item.rarity]}`
                }}
              >
                {/* Rarity Indicator Overlay */}
                <div 
                  className="absolute inset-0 opacity-40 rounded-xl pointer-events-none"
                  style={{ background: rarityGradientMap[item.rarity] }}
                />

                {/* Item Image */}
                <div className="relative z-10 size-14 flex items-center justify-center">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={52}
                    height={52}
                    className="object-contain drop-shadow-lg"
                  />
                </div>

                {/* Price Tag Overlay (Bottom) */}
                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm rounded-md py-0.5 border border-[#2a2a2a]/50 z-20">
                  <div className="flex items-center gap-1">
                    <Image 
                      src="https://mm2wild.com/coin.webp" 
                      alt="Coin" 
                      width={10} 
                      height={10} 
                    />
                    <span className="text-[11px] font-bold text-white tabular-nums">
                      {item.price}
                    </span>
                  </div>
                </div>

                {/* Tooltip on Hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-[10px] text-white font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  {item.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BattlesWonItemsList;
// Battles feature fully removed
