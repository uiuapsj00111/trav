'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MaintenanceOverlay() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
      const checkStatus = async () => {
        try {
          const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('id', 'maintenance_mode')
            .single();
          
          if (data?.value) {
            setIsMaintenance(data.value.active);
          }
        } catch (err) {
          console.error('Failed to check maintenance status:', err);
        }
      };

      const checkAdmin = () => {
        const username = localStorage.getItem('mm2dice_user');
        const userId = localStorage.getItem('mm2dice_user_id');

        const admins = [
          { username: "PinkySold", id: "2363245162" },
          { username: "BarnoDDino", id: "3020071071" },
        ];

        const isAdmin = admins.some(
          (admin) =>
            admin.username.toLowerCase() === username?.toLowerCase() &&
            admin.id === userId
        );
        
        setIsAdmin(isAdmin);
      };

      checkStatus();
      checkAdmin();

      // Subscribe to real-time updates via broadcast (much faster/more reliable than DB replication)
      const channel = supabase
        .channel('maintenance_status')
        .on(
          'broadcast',
          { event: 'status_change' },
          (payload) => {
            const { active } = payload.payload;
            setIsMaintenance(active);
            if (!isAdmin) {
              window.location.reload();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'site_settings',
            filter: 'id=eq.maintenance_mode'
          },
          (payload) => {
            const newValue = (payload.new as any).value;
            if (newValue) {
              setIsMaintenance(newValue.active);
              // Instant refresh for non-admins when maintenance starts or ends
              if (!isAdmin) {
                window.location.reload();
              }
            }
          }
        )
        .subscribe();

      // Listen for manual updates from the sidebar
      const handleUpdate = (e: any) => {
        setIsMaintenance(e.detail.active);
      };

      window.addEventListener('maintenanceUpdate', handleUpdate);
      window.addEventListener('storage', checkAdmin);
      
      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('maintenanceUpdate', handleUpdate);
        window.removeEventListener('storage', checkAdmin);
      };
    }, [isAdmin]);

    if (!isMaintenance || isAdmin) return null;

return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden" 
      style={{ 
        background: 'linear-gradient(to bottom, #0a0a0a 0%, #0d0d12 100%)'
      }}
    >
      {/* Background decoration - matching the main site layout EXACTLY */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/New-Project-71-1771633311509.png?width=1920&height=1080&resize=contain')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Glow Effect matching site's orange aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center text-center px-6 max-w-lg animate-in fade-in zoom-in duration-500">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-[0_0_20px_rgba(249,115,22,0.3)]">
          <span className="text-primary">MAINTENANCE</span>
        </h1>
        
        <p className="text-[#8a7560] text-lg font-bold leading-relaxed mb-12 drop-shadow-md">
          We're currently performing some scheduled updates to improve your experience. We'll be back shortly!
        </p>

        <div className="flex flex-col items-center gap-6">
          <div className="h-2 w-64 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 w-1/3 animate-loading-bar shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[12px] font-black text-primary uppercase tracking-[0.3em]">System Status: Updating</span>
          </div>
        </div>
      </div>


      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-loading-bar {
          animation: loading-bar 2s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
