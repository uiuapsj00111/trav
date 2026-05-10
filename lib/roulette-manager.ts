import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendDiscordGameNotification } from './discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WAITING_TIME = 10; // 10 seconds to bet
const ROLLING_TIME = 8; // 8 seconds animation
const COOLDOWN_TIME = 3; // 3 seconds before next round

const COLORS = ['red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'green', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue'];

function generateResult(serverSeed: string, publicSeed: string, roundId: string): number {
  const combined = `${serverSeed}:${publicSeed}:${roundId}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // Use first 8 hex characters as the source of entropy (0 to 4,294,967,295)
  const hex = hash.substring(0, 8);
  const val = parseInt(hex, 16);
  
  // Modulo 15 to get 0-14
  return val % 15;
}

async function processPayouts(roundId: string, rollValue: number, outcome: string) {
  console.log(`Processing payouts for round ${roundId}, roll: ${rollValue}, outcome: ${outcome}`);
  
  const { data: bets } = await supabase
    .from('roulette_bets')
    .select('*, user_stats(avatar_url)')
    .eq('round_id', roundId);

  if (!bets || bets.length === 0) return;

  for (const bet of bets) {
      const isWin = bet.outcome === outcome;
      const multiplier = isWin ? (outcome === 'green' ? 14 : 2) : 0;
      const payout = Number(bet.amount) * multiplier;
      const profit = payout - Number(bet.amount);
      const resultStr = isWin ? 'win' : 'loss';
      
      await supabase
        .from('roulette_bets')
        .update({ payout })
        .eq('id', bet.id);

      if (isWin) {
        const { data: result, error: payoutError } = await supabase.rpc('process_roulette_payout', {
          p_username: bet.username,
          p_amount: payout,
          p_currency: bet.currency
        });
    
        if (payoutError) {
          console.error(`Failed to pay out to ${bet.username}:`, payoutError);
        } else {
          console.log(`Paid out ${payout} ${bet.currency} to ${bet.username}. New balance: ${result?.new_balance}`);
        }
      }

      // Add to bet_history
      const avatarUrl = (bet.user_stats as any)?.avatar_url;
      await supabase
        .from('bet_history')
        .insert({
          game_type: 'roulette',
          username: bet.username,
          avatar_url: avatarUrl,
          wager: bet.amount,
          payout,
          profit,
          multiplier,
          result: resultStr,
          meta: {
            round_id: roundId,
            roll_value: rollValue,
            outcome: outcome,
            bet_outcome: bet.outcome
          },
          currency: bet.currency
        });

      // Send to Discord directly via shared utility
      if (bet.currency === 'coins') {
        try {
          await sendDiscordGameNotification({
            game_type: 'roulette',
            username: bet.username,
            avatar_url: avatarUrl,
            wager: Number(bet.amount),
            payout,
            profit,
            multiplier,
            result: resultStr,
            meta: {
              outcome: outcome.charAt(0).toUpperCase() + outcome.slice(1),
              roll: rollValue
            }
          });
        } catch (err) {
          console.error('[Discord] Failed to send notification:', err);
        }
      }
  }
}

async function tick() {
  try {
    const { data: activeRound } = await supabase
      .from('roulette_rounds')
      .select('*')
      .neq('status', 'ended')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();

    if (!activeRound) {
      const { data: lastRound } = await supabase
        .from('roulette_rounds')
        .select('created_at')
        .eq('status', 'ended')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastEndedTime = lastRound ? new Date(lastRound.created_at).getTime() : 0;
      
      if (now - lastEndedTime > COOLDOWN_TIME * 1000) {
        // Double-check no one else created a round in the last 2 seconds
        const { count } = await supabase
          .from('roulette_rounds')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', new Date(now - 2000).toISOString());

        if ((count || 0) > 0) return;

        console.log('Starting new round with provably fair seeds...');
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const hashedServerSeed = crypto.createHash('sha256').update(serverSeed).digest('hex');
        
        await supabase
          .from('roulette_rounds')
          .insert({
            status: 'waiting',
            start_time: new Date().toISOString(),
            server_seed: serverSeed,
            hashed_server_seed: hashedServerSeed
          });
      }
      return;
    }

    const startTime = new Date(activeRound.start_time).getTime();
    const elapsed = (now - startTime) / 1000;

    if (activeRound.status === 'waiting' && elapsed >= WAITING_TIME) {
      console.log('Transitioning to rolling...');
      
      // Generate public seed when bets close
      const publicSeed = crypto.randomBytes(16).toString('hex');
      const rollValue = generateResult(activeRound.server_seed, publicSeed, activeRound.id);
      const outcome = COLORS[rollValue];

      const { error: updateError } = await supabase
        .from('roulette_rounds')
        .update({
          status: 'rolling',
          roll_value: rollValue,
          outcome: outcome,
          public_seed: publicSeed
        })
        .eq('id', activeRound.id)
        .eq('status', 'waiting'); // Atomic check to prevent double-transition

      if (updateError) {
          console.log('Round already transitioned by another instance');
      }

    } else if (activeRound.status === 'rolling' && elapsed >= WAITING_TIME + ROLLING_TIME) {
      console.log('Transitioning to ended...');
      
      // Update status to ended FIRST to prevent double processing
      const { data: updatedRound, error: updateError } = await supabase
        .from('roulette_rounds')
        .update({ status: 'ended' })
        .eq('id', activeRound.id)
        .eq('status', 'rolling') // Atomic check
        .select()
        .maybeSingle();

      if (updateError || !updatedRound) {
          console.log('Round already ended by another instance');
          return;
      }

      await processPayouts(activeRound.id, activeRound.roll_value, activeRound.outcome);
    }
  } catch (err) {
    console.error('Error in roulette manager tick:', err);
  }
}

// In Next.js, modules are sometimes re-evaluated.
// We'll use a global variable to ensure only one interval runs.
const G = globalThis as any;

if (!G.rouletteManagerInterval) {
  console.log('Roulette Manager initialized');
  G.rouletteManagerInterval = setInterval(tick, 1000);
}

export const rouletteManager = {
  start: () => {
    // Just to ensure the module is loaded
    console.log('Roulette Manager is running');
  }
};
