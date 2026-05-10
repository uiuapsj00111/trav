-- Create this RPC function in your Supabase SQL editor
-- Run this once in Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION coinflip_complete_atomic(
  game_id_param TEXT,
  winner_username_param TEXT,
  winner_side_param TEXT,
  joiner_username_param TEXT
)
RETURNS JSON AS $$
DECLARE
  game_record RECORD;
  prize INTEGER;
  balance_field TEXT;
  winner_balance INTEGER;
  history_entries JSON[];
BEGIN
  -- Fetch game and lock it
  SELECT * INTO game_record
  FROM coinflip_games
  WHERE id = game_id_param AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Game not found or not active');
  END IF;

  -- Calculate prize
  prize := FLOOR(game_record.bet_amount * 2 * 0.9);

  -- Determine balance field
  balance_field := CASE WHEN game_record.currency = 'coins' THEN 'balance' ELSE 'fun_balance' END;

  -- Update winner balance
  EXECUTE format('UPDATE user_stats SET %I = %I + %L WHERE username = %L', balance_field, balance_field, prize, winner_username_param);

  -- Update game status
  UPDATE coinflip_games
  SET status = 'completed',
      winner_username = winner_username_param,
      winner_side = winner_side_param,
      joiner_username = joiner_username_param
  WHERE id = game_id_param;

  -- Prepare bet history entries
  history_entries := ARRAY[
    json_build_object(
      'game_type', 'coinflip',
      'username', winner_username_param,
      'avatar_url', CASE WHEN winner_username_param = game_record.creator_username THEN game_record.creator_avatar ELSE game_record.joiner_avatar END,
      'wager', game_record.bet_amount,
      'payout', prize,
      'profit', prize - game_record.bet_amount,
      'result', 'win',
      'currency', game_record.currency,
      'meta', json_build_object(
        'game_id', game_id_param,
        'winner_side', winner_side_param,
        'creator', game_record.creator_username,
        'joiner', game_record.joiner_username
      )
    ),
    json_build_object(
      'game_type', 'coinflip',
      'username', CASE WHEN winner_username_param = game_record.creator_username THEN game_record.joiner_username ELSE game_record.creator_username END,
      'avatar_url', CASE WHEN winner_username_param = game_record.creator_username THEN game_record.joiner_avatar ELSE game_record.creator_avatar END,
      'wager', game_record.bet_amount,
      'payout', 0,
      'profit', -game_record.bet_amount,
      'result', 'loss',
      'currency', game_record.currency,
      'meta', json_build_object(
        'game_id', game_id_param,
        'winner_side', winner_side_param,
        'creator', game_record.creator_username,
        'joiner', game_record.joiner_username
      )
    )
  ];

  -- Insert bet history
  INSERT INTO bet_history (game_type, username, avatar_url, wager, payout, profit, result, currency, meta)
  SELECT
    (entry->>'game_type')::TEXT,
    (entry->>'username')::TEXT,
    (entry->>'avatar_url')::TEXT,
    (entry->>'wager')::INTEGER,
    (entry->>'payout')::INTEGER,
    (entry->>'profit')::INTEGER,
    (entry->>'result')::TEXT,
    (entry->>'currency')::TEXT,
    (entry->>'meta')::JSONB
  FROM unnest(history_entries) AS entry;

  RETURN json_build_object('success', true, 'prize', prize);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;