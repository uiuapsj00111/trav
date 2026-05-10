"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";

interface AuthUser {
  username: string;
  roblox_user_id: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEV: Always use devtesttoken for session in development
    if (
      process.env.NODE_ENV === "development" ||
      window.location.hostname === "localhost"
    ) {
      const devUser = {
        username: "devuser",
        roblox_user_id: "1234567890",
      };
      setUser(devUser);
      setToken("devtesttoken");
      setIsLoading(false);
      return;
    }

    // Check localStorage for existing session
    const storedUsername = getStorageItem("mm2dice_user");
    const storedUserId = getStorageItem("mm2dice_user_id");
    const storedToken = getStorageItem("mm2dice_session_token");

    if (storedUsername && storedUserId) {
      setUser({
        username: storedUsername,
        roblox_user_id: storedUserId,
      });

      if (storedToken) {
        setToken(storedToken);
        // Re-register server-side session token to avoid stale session mapping
        fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: storedToken,
            username: storedUsername,
            roblox_user_id: storedUserId,
            avatar_url: getStorageItem("mm2dice_avatar") || "",
          }),
        }).catch(() => {});
      } else {
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setStorageItem("mm2dice_session_token", sessionToken);
        setToken(sessionToken);
      }
    }

    setIsLoading(false);

    // Listen for custom login events from the login modal
    const handleLogin = () => {
      const newUsername = getStorageItem("mm2dice_user");
      const newUserId = getStorageItem("mm2dice_user_id");
      const newToken = getStorageItem("mm2dice_session_token");
      if (newUsername && newUserId && newToken) {
        setUser({
          username: newUsername,
          roblox_user_id: newUserId,
        });
        setToken(newToken);
      }
    };

    window.addEventListener("userLogin", handleLogin);
    return () => window.removeEventListener("userLogin", handleLogin);
  }, []);

  const login = (userData: AuthUser) => {
    // Generate a session token
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setStorageItem("mm2dice_user", userData.username);
    setStorageItem("mm2dice_user_id", userData.roblox_user_id);
    setStorageItem("mm2dice_session_token", sessionToken);

    setUser(userData);
    setToken(sessionToken);
  };

  const logout = () => {
    removeStorageItem("mm2dice_user");
    removeStorageItem("mm2dice_user_id");
    removeStorageItem("mm2dice_balance");
    removeStorageItem("mm2dice_session_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthenticatedFetch() {
  const { user, token } = useAuth();

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = input instanceof URL ? input.toString() : String(input);
    let finalInit = { ...init };

    if (user && token) {
      const isPostOrPatch = init?.method === "POST" || init?.method === "PATCH";
      const isGetRequest = !isPostOrPatch && !init?.method;

      if (isPostOrPatch) {
        // For POST/PATCH requests, add session token to request body
        let body: any = {};
        if (init?.body) {
          if (typeof init.body === "string") {
            try {
              body = JSON.parse(init.body);
            } catch (e) {
              // If body is not JSON, just use empty object and let server handle it
              body = {};
            }
          } else if (typeof init.body === "object") {
            body = init.body;
          }
        }

        const bodyWithAuth = {
          ...body,
          sessionToken: token,
          username: user.username,
        };

        const headers = new Headers(init?.headers);
        headers.set("Content-Type", "application/json");

        finalInit = {
          ...init,
          body: JSON.stringify(bodyWithAuth),
          headers,
        };
      } else if (isGetRequest) {
        // For GET requests, add as query parameters
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}sessionToken=${encodeURIComponent(token)}&username=${encodeURIComponent(user.username)}`;
      }
    }

    return fetch(url, finalInit);
  };
}
