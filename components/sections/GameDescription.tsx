"use client";

export default function GameDescription() {
  return (
    <section className="bg-[#1a1f2e]/40 border border-white/[0.04] rounded-2xl p-8 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Mission Uncrossable</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-400 leading-relaxed">
          <p>
            Experience the ultimate test of nerves in Mission Uncrossable! Navigate through 24 increasingly 
            hazardous lanes of traffic. Each successful hop increases your multiplier, but one wrong move 
            means game over. Will you play it safe or push for the ultimate payout?
          </p>
          <p>
            Choose between four difficulty levels: Easy, Medium, Hard, and Daredevil. 
            More risk means much higher rewards. Cash out at any time to secure your winnings 
            or keep hopping to reach the top of the leaderboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-white/[0.04]">
        <div>
          <p className="text-[#be30ff] font-black text-xl">24</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Lanes</p>
        </div>
        <div>
          <p className="text-[#22c55e] font-black text-xl">4</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Difficulties</p>
        </div>
        <div>
          <p className="text-[#be30ff] font-black text-xl">64B×</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Max Multiplier</p>
        </div>
        <div>
          <p className="text-[#3b82f6] font-black text-xl">100%</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Provably Fair</p>
        </div>
      </div>
    </section>
  );
}
