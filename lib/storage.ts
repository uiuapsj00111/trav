const MASTER_KEY = "mm2dice_v2";

/**
 * Internal state for the unified storage object
 */
interface UnifiedStorage {
  [key: string]: any;
}

/**
 * Encodes an object to a base64 string
 */
function encode(data: UnifiedStorage): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch (e) {
    return "";
  }
}

/**
 * Decodes a base64 string to an object
 */
function decode(str: string): UnifiedStorage {
  try {
    return JSON.parse(decodeURIComponent(atob(str)));
  } catch (e) {
    return {};
  }
}

/**
 * Cleanup routine for unwanted system keys - Aggressive 100ms loop
 */
if (typeof window !== "undefined") {
  const unwanted = [
    "orchids_visual_edit_mode",
    "_ux_bl",
    "_ux_bt",
    "_ux_sc",
    "_ux_vem",
    "platform_notifications"
  ];
  
  setInterval(() => {
    unwanted.forEach(key => {
      localStorage.removeItem(key);
    });
  }, 100);
}

/**
 * Get the master storage object
 */
function getMaster(): UnifiedStorage {
  if (typeof window === "undefined") return {};
  
  const val = localStorage.getItem(MASTER_KEY);
  if (!val) return migrateAndGetMaster();
  return decode(val);
}

/**
 * Migration helper: pulls legacy keys into the new master object
 */
function migrateAndGetMaster(): UnifiedStorage {
  const legacyKeys = [
    "mm2dice_balance", "mm2dice_fun_balance", "mm2dice_user",
    "mm2dice_user_id", "mm2dice_session_token", "mm2dice_avatar",
    "mm2dice_balance_lock", "mm2dice_balance_ts", "mm2dice_selected_currency",
    "mm2dice_muted", "mm2dice_total_wagered", "mm2dice_session",
    "platform_notifications", "mm2dice_mines_pending_game", "mm2dice_upgrader_pending_game",
    "orchids_visual_edit_mode",
    "_ux_b", "_ux_fb", "_ux_u", "_ux_uid", "_ux_vem"
  ];
  
  const master: UnifiedStorage = {};
  let foundLegacy = false;

  legacyKeys.forEach(key => {
    // Try original
    let val = localStorage.getItem(key);
    // Try obfuscated version from previous iteration
    if (!val) {
      // Map it to check (_ux_b etc)
      const mapped = {
        mm2dice_balance: "_ux_b",
        mm2dice_user: "_ux_u"
      };
    }

    if (val) {
      // If it looks like base64, try decoding
      try {
        if (val.includes("=")) {
           master[key] = decodeURIComponent(atob(val));
        } else {
           master[key] = val;
        }
      } catch {
        master[key] = val;
      }
      localStorage.removeItem(key);
      foundLegacy = true;
    }
  });

  if (foundLegacy) {
    localStorage.setItem(MASTER_KEY, encode(master));
  }
  
  return master;
}

export const getStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  const master = getMaster();
  
  // Return from master if exists
  if (master[key] !== undefined && master[key] !== null) return String(master[key]);
  
  // Fallback to direct localStorage for legacy/unpatched compatibility
  const legacyVal = localStorage.getItem(key);
  if (legacyVal) {
    // Auto-migrate this specific key
    master[key] = legacyVal;
    localStorage.setItem(MASTER_KEY, encode(master));
    localStorage.removeItem(key);
    return legacyVal;
  }
  
  return null;
};

export const setStorageItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  const master = getMaster();
  master[key] = value;
  localStorage.setItem(MASTER_KEY, encode(master));
};

export const removeStorageItem = (key: string): void => {
  if (typeof window === "undefined") return;
  const master = getMaster();
  delete master[key];
  localStorage.setItem(MASTER_KEY, encode(master));
};

