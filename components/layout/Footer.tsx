"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-white/5 py-12 px-6 mt-20">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white italic tracking-tighter">
              TRAV<span className="text-[#be30ff]">.BET</span>
            </span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">
            The ultimate Roblox gambling destination. Play your favorite games with MM2 items and Robux.
          </p>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Games</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/mines" className="hover:text-[#be30ff] transition-colors">Mines</Link></li>
              <li><Link href="/upgrader" className="hover:text-[#be30ff] transition-colors">Upgrader</Link></li>
              <li><Link href="/coinflip" className="hover:text-[#be30ff] transition-colors">Coinflip</Link></li>
              <li><Link href="/blackjack" className="hover:text-[#be30ff] transition-colors">Blackjack</Link></li>
            </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Help</h4>
          <ul className="space-y-3 text-sm text-slate-500">
            <li><Link href="/provably-fair" className="hover:text-[#be30ff] transition-colors">Provably Fair</Link></li>
            <li><Link href="#" className="hover:text-[#be30ff] transition-colors">Terms of Service</Link></li>
            <li><Link href="#" className="hover:text-[#be30ff] transition-colors">Support</Link></li>
            <li><Link href="#" className="hover:text-[#be30ff] transition-colors">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Social</h4>
          <ul className="space-y-3 text-sm text-slate-500">
            <li><Link href="https://discord.gg/travbet" className="hover:text-[#5865f2] transition-colors">Discord</Link></li>
            <li><Link href="#" className="hover:text-[#1da1f2] transition-colors">Twitter</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-[1440px] mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-600 text-[11px] font-medium uppercase tracking-widest">
          © 2026 TRAV.BET - ALL RIGHTS RESERVED
        </p>
        <div className="flex items-center gap-6">
          <img src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=128&height=128&resize=contain" alt="18+" className="h-6 grayscale opacity-30" />
        </div>
      </div>
    </footer>
  );
}
