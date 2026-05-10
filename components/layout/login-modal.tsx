"use client";

import React, { useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "@/lib/storage";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const verificationStories = [
  "The dice rolled a mysterious seven",
  "A knife collector's tale",
  "When the trade went sideways",
  "The legendary unboxing moment",
  "Midnight gambling spree",
  "The rarest item appeared",
  "A bet that changed everything",
  "The ultimate comeback story",
  "Lost everything, won it back",
  "The knife that shouldn't exist",
  "Trading up from nothing",
  "The luckiest spin ever",
  "When RNG blessed the player",
];

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [step, setStep] = useState<"verify" | "story">("verify");
  const [username, setUsername] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [randomStory, setRandomStory] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`trav.bet Verification ┃ ${randomStory}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const loggedInUser = getStorageItem("mm2dice_user");
    if (loggedInUser) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    if (!username.trim()) {
      alert("Please enter your Roblox username");
      return;
    }
    if (!tosAccepted) {
      alert("Please accept the Terms of Service");
      return;
    }
    const story =
      verificationStories[
        Math.floor(Math.random() * verificationStories.length)
      ];
    setRandomStory(story);
    setErrorMessage("");
    setStep("story");
  };

  const handleVerifyComplete = async () => {
    setIsVerifying(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/roblox/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          verificationCode: randomStory,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStorageItem("mm2dice_user", data.username);
        setStorageItem("mm2dice_user_id", data.userId.toString());

        // Upsert user in DB and load their balance, and get session_token
        try {
          const avatarRes = await fetch(
            `/api/roblox/avatar?userId=${data.userId}`,
          );
          const avatarData = await avatarRes.json().catch(() => ({}));
          const loginRes = await fetch("/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: data.username,
              roblox_user_id: data.userId.toString(),
              avatar_url: avatarData.avatarUrl || "",
            }),
          });
          const loginData = await loginRes.json();
          if (avatarData?.avatarUrl) {
            setStorageItem("mm2dice_avatar", avatarData.avatarUrl);
          }
          if (loginData.balance !== undefined) {
            setStorageItem(
              "mm2dice_balance",
              loginData.balance.toString(),
            );
          }
          // Store the session_token from backend as 'mm2dice_session_token' for auth
          if (loginData.session_token) {
            setStorageItem(
              "mm2dice_session_token",
              loginData.session_token,
            );
          }
        } catch (_) {
          // fallback: keep existing balance
        }

        setIsLoggedIn(true);
        window.dispatchEvent(new Event("userLogin"));
        onClose();
      } else {
        setErrorMessage(data.error || "Verification failed. Please try again.");
      }
    } catch (error) {
      setErrorMessage("Failed to verify. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ animation: "backdropIn 0.3s ease-out forwards" }}
    >
      <style>{`
        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes flyIn {
          0% {
            opacity: 0;
            transform: perspective(1200px) rotateY(-25deg) translateX(-120px) scale(0.85);
            filter: blur(4px);
          }
          60% {
            opacity: 1;
            transform: perspective(1200px) rotateY(4deg) translateX(8px) scale(1.02);
            filter: blur(0px);
          }
          80% {
            transform: perspective(1200px) rotateY(-2deg) translateX(-3px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: perspective(1200px) rotateY(0deg) translateX(0px) scale(1);
            filter: blur(0px);
          }
        }
      `}</style>
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex w-full max-w-[900px] mx-4 h-auto md:h-[580px] bg-[#0d0b1a] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)]"
        style={{
          animation: "flyIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        {/* Left Panel - Character Image */}
        <div className="hidden md:block w-[380px] relative bg-[#0D0B1A] overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-9-1771675371162.png?width=400&height=400&resize=contain"
              alt="trav.bet"
              className="w-full h-full object-cover object-center opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0d0b1a]" />
            <div className="absolute inset-0 bg-[#be30ff]/10 mix-blend-overlay" />
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 bg-transparent relative flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors z-20"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1 flex items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-white">
                  Welcome to trav<span className="text-[#be30ff]">.bet</span>
                </h1>
              </div>

              {step === "verify" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <img
                          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771675678634.png?width=400&height=400&resize=contain"
                          alt="Roblox"
                          width={20}
                          height={20}
                          style={{ objectFit: "contain", opacity: 0.7 }}
                        />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter Roblox Username"
                        className="w-full h-12 bg-[#16142c] rounded-lg pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={tosAccepted}
                          onChange={(e) => setTosAccepted(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-transparent rounded bg-[#16142c] peer-checked:bg-[#be30ff] peer-checked:border-[#be30ff] transition-all flex items-center justify-center">
                          {tosAccepted && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 leading-relaxed select-none">
                        I acknowledge that I am at least{" "}
                        <span className="font-bold text-white">
                          18 years of age
                        </span>
                        , that any items I wager are not stolen, and I agree to
                        the Terms of Service.
                      </span>
                    </label>

                    <button
                      onClick={handleLogin}
                      disabled={!tosAccepted || !username.trim()}
                      className="w-full h-12 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, #d8b4fe, #7e22ce)",
                        boxShadow:
                          "0 6px 0 #581c87, 0 8px 16px rgba(0,0,0,0.5)",
                        transform: "translateY(0)",
                        transition:
                          "transform 0.08s ease, box-shadow 0.08s ease",
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "translateY(4px)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 0 #581c87, 0 4px 8px rgba(0,0,0,0.4)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 0 #581c87, 0 8px 16px rgba(0,0,0,0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 0 #581c87, 0 8px 16px rgba(0,0,0,0.5)";
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      Login
                    </button>
                  </div>
                </div>
              )}

              {step === "story" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-[#16142c] rounded-lg p-6 space-y-4">
                    <div
                      onClick={handleCopyCode}
                      className="bg-[#0d0b1a] hover:bg-[#1c1a2e] rounded p-4 text-center space-y-1 cursor-pointer transition-colors group relative"
                      title="Click to copy"
                    >
                      <div className="text-sm font-black text-white tracking-wide break-words">
                        trav.bet Verification ┃ {randomStory}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-[#be30ff] transition-colors mt-1">
                        {copied ? "✓ Copied!" : "Click to copy"}
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-white font-bold">
                      <p className="font-black text-white">
                        To complete verification, follow these steps:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 font-bold text-white">
                        <li>Go to your Roblox profile settings</li>
                        <li>
                          Add this code to your profile description:{" "}
                          <span className="font-black text-[#be30ff] break-words">
                            trav.bet Verification ┃ {randomStory}
                          </span>
                        </li>
                        <li>Click &quot;Verify Now&quot; below to complete</li>
                      </ol>
                    </div>
                    {errorMessage && (
                      <div className="bg-red-500/10 rounded p-3 text-sm text-red-400">
                        {errorMessage}
                      </div>
                    )}
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.roblox.com/users/profile?username=${encodeURIComponent(username)}`,
                          "_blank",
                        )
                      }
                      className="w-full h-10 text-white font-bold rounded-lg select-none mb-2"
                      style={{
                        background:
                          "linear-gradient(to bottom, #d8b4fe, #9333ea)",
                        boxShadow:
                          "0 6px 0 #6b21a8, 0 8px 16px rgba(0,0,0,0.5)",
                        transform: "translateY(0)",
                        transition:
                          "transform 0.08s ease, box-shadow 0.08s ease",
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "translateY(4px)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 0 #6b21a8, 0 4px 8px rgba(0,0,0,0.4)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 0 #6b21a8, 0 8px 16px rgba(0,0,0,0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 0 #6b21a8, 0 8px 16px rgba(0,0,0,0.5)";
                      }}
                    >
                      Go to Profile
                    </button>
                    <button
                      onClick={handleVerifyComplete}
                      disabled={isVerifying}
                      className="w-full h-10 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed select-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, #d8b4fe, #7e22ce)",
                        boxShadow:
                          "0 6px 0 #581c87, 0 8px 16px rgba(0,0,0,0.5)",
                        transform: "translateY(0)",
                        transition:
                          "transform 0.08s ease, box-shadow 0.08s ease",
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "translateY(4px)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 0 #581c87, 0 4px 8px rgba(0,0,0,0.4)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 0 #581c87, 0 8px 16px rgba(0,0,0,0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 0 #581c87, 0 8px 16px rgba(0,0,0,0.5)";
                      }}
                    >
                      {isVerifying ? "Verifying..." : "Verify Now"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
