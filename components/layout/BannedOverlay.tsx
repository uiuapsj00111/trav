'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BannedOverlay() {
  const [isBanned, setIsBanned] = useState(false);
  const [reason, setReason] = useState('Banned by admin');

  useEffect(() => {
    const checkBanStatus = async () => {
      const username = localStorage.getItem('mm2dice_user');
      if (!username) return;

      try {
        const { data } = await supabase
          .from('bans')
          .select('reason')
          .eq('username', username)
          .single();
        
        if (data) {
          setIsBanned(true);
          if (data.reason) setReason(data.reason);
        } else {
          setIsBanned(false);
        }
      } catch (err) {
        console.error('Failed to check ban status:', err);
      }
    };

    checkBanStatus();

    // Subscribe to real-time ban updates
    const channel = supabase
      .channel('ban_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bans',
        },
        (payload) => {
          const username = localStorage.getItem('mm2dice_user');
          if (!username) return;

          if (payload.eventType === 'INSERT' && payload.new.username === username) {
            setIsBanned(true);
            if (payload.new.reason) setReason(payload.new.reason);
          } else if (payload.eventType === 'DELETE' && payload.old.username === username) {
            setIsBanned(false);
          }
        }
      )
      .subscribe();

    window.addEventListener('storage', checkBanStatus);
    
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', checkBanStatus);
    };
  }, []);

  if (!isBanned) return null;

return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden" 
      style={{ 
        background: 'linear-gradient(to bottom, #0a0a0a 0%, #0d0d12 100%)'
      }}
    >
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/New-Project-71-1771633311509.png?width=1920&height=1080&resize=contain')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center text-center px-6 max-w-lg animate-in fade-in zoom-in duration-500">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <span className="text-red-500">YOU ARE BANNED</span>
        </h1>
        
        <p className="text-[#8a7560] text-lg font-bold leading-relaxed mb-4 drop-shadow-md">
          Your account has been permanently suspended from trav.bet.
        </p>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 w-full">
          <p className="text-red-400 font-bold uppercase text-sm tracking-wider mb-1">Reason</p>
          <p className="text-white font-medium">{reason}</p>
        </div>

        <button 
          onClick={() => {
            localStorage.removeItem('mm2dice_user');
            localStorage.removeItem('mm2dice_avatar');
            localStorage.removeItem('mm2dice_user_id');
            window.location.reload();
          }}
          className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        >
          LOG OUT
        </button>
      </div>
    </div>
  );
}
