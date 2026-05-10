import { NextRequest } from "next/server";

export interface AuthUser {
  username: string;
  roblox_user_id: string;
  avatar_url?: string;
}

/**
 * Session token registry (games authenticate with tokens from localStorage)
 * In production, these would be validated against a database/Redis
 */
const SESSION_TOKENS = new Map<string, AuthUser>();

/**
 * Register a session token when user logs in (called by frontend)
 */
export function registerSessionToken(token: string, user: AuthUser) {
  SESSION_TOKENS.set(token, user);
}

/**
 * Get auth user from session token (games pass token in request body)
 */
export function getAuthByToken(sessionToken: string): AuthUser | null {
  if (!sessionToken) return null;
  return SESSION_TOKENS.get(sessionToken) || null;
}

/**
 * Header-based auth for admin panel (uses x-username, x-user-id headers)
 */
export function requireAuth(req: NextRequest): AuthUser | null {
  // Backwards compatible header-based auth
  const username = req.headers.get("x-username");
  const roblox_user_id = req.headers.get("x-user-id");
  const avatar_url = req.headers.get("x-avatar-url");

  if (username && roblox_user_id) {
    return {
      username,
      roblox_user_id,
      avatar_url: avatar_url || undefined,
    };
  }

  return null;
}

export function getSessionToken(
  req: NextRequest,
  body?: unknown,
): string | null {
  const tokenFromBody = (body as { sessionToken?: string })?.sessionToken;
  const tokenFromHeader = req.headers.get("x-session-token");
  const tokenFromQuery = new URL(req.url).searchParams.get("sessionToken");

  return (tokenFromBody || tokenFromHeader || tokenFromQuery || null) as
    | string
    | null;
}

export function getAuthFromRequest(
  req: NextRequest,
  body?: { sessionToken?: string; username?: string },
): AuthUser | null {
  // Try session token first
  const token = getSessionToken(req, body);
  if (token) {
    let authUser = getAuthByToken(token);
    // DEV FALLBACK: Allow a hardcoded test user for a known test token
    if (!authUser && token === "devtesttoken") {
      authUser = {
        username: "devuser",
        roblox_user_id: "1234567890",
        avatar_url: undefined,
      };
    }
    if (authUser) {
      const requestedUsername =
        body?.username ||
        req.headers.get("x-username") ||
        new URL(req.url).searchParams.get("username");
      if (requestedUsername && requestedUsername !== authUser.username) {
        return null;
      }
      return authUser;
    }
  }
  // Fallback: use header-based auth (for admin or legacy clients)
  const username = req.headers.get("x-username");
  const roblox_user_id = req.headers.get("x-user-id");
  const avatar_url = req.headers.get("x-avatar-url");
  if (username && roblox_user_id) {
    return {
      username,
      roblox_user_id,
      avatar_url: avatar_url || undefined,
    };
  }
  return null;
}

export function requireAdmin(req: NextRequest): AuthUser | null {
  const user = requireAuth(req);
  if (!user) {
    return null;
  }

  const admins = [
    { username: "PinkySold", id: "2363245162" },
    { username: "BarnoDDino", id: "3020071071" },
  ];

  const isAdmin = admins.some(
    (admin) =>
      admin.id === user.roblox_user_id ||
      admin.username.toLowerCase() === user.username.toLowerCase(),
  );

  if (!isAdmin) {
    return null;
  }

  return user;
}
