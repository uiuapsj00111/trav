import { QRCode } from "qrcode.react";
import { useEffect, useState } from "react";

// Example LTC price, replace with live price if available
const LTC_USD = 54.59;

export default function LitecoinDeposit({ userId }: { userId: string }) {
  const [amount, setAmount] = useState(0.5);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate invoice on mount or when userId changes
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");
    setInvoice(null);
    fetch("/api/nowpayments/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 0.5, userId }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Failed to create invoice");
        setInvoice(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  // Allow user to change amount and regenerate invoice
  const handleAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value);
    setAmount(newAmount);
    if (!userId || isNaN(newAmount) || newAmount < 0.5) return;
    setLoading(true);
    setError("");
    setInvoice(null);
    try {
      const res = await fetch("/api/nowpayments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newAmount, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");
      setInvoice(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#10182a] border border-[#232c43] rounded-2xl p-6 max-w-md mx-auto shadow-xl">
      {/* Header with LTC icon, name, and price */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#232c43] flex items-center justify-center">
          <img
            src="/ltc.png"
            alt="Litecoin"
            className="w-10 h-10"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div>
          <div className="text-white font-bold text-xl leading-tight">
            Litecoin
          </div>
          <div className="text-blue-400 font-bold text-xs uppercase tracking-wider">
            LTC
          </div>
          <div className="text-gray-300 text-sm font-semibold mt-1">
            ${LTC_USD.toFixed(2)}
          </div>
        </div>
      </div>

      {/* QR code and info */}
      {error && <p className="text-red-500 mt-3">{error}</p>}
      {loading && (
        <p className="text-gray-400 mt-3">Generating deposit address...</p>
      )}
      {invoice && (
        <>
          <div className="flex flex-col items-center mb-6">
            <QRCode value={invoice.pay_address} size={180} />
            <div className="mt-4 w-full">
              <div className="bg-[#18213a] rounded-lg px-4 py-3 text-blue-300 text-center font-semibold text-sm border border-blue-700">
                Scan the QR code or copy the address and send your desired
                amount.
              </div>
            </div>
          </div>

          {/* Currency conversion */}
          <div className="bg-[#151c2e] border border-[#232c43] rounded-lg p-4 mb-4">
            <div className="font-bold text-white mb-1">Currency conversion</div>
            <div className="text-xs text-gray-400 mb-2">
              The final amount is calculated once your deposit confirms on the
              network.
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-2 bg-[#232c43] rounded px-3 py-2">
                <img
                  src="/ltc.png"
                  alt="LTC"
                  className="w-5 h-5"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="font-mono text-white text-base">
                  {invoice.pay_amount} LTC
                </span>
              </div>
              <span className="text-gray-400 font-bold text-lg">≈</span>
              <div className="flex items-center gap-2 bg-[#232c43] rounded px-3 py-2">
                <img src="/favicon.ico" alt="Coin" className="w-5 h-5" />
                <span className="font-mono text-yellow-400 text-base">
                  1 coin
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              The final amount is calculated once your deposit confirms on the
              network.
            </div>
          </div>

          {/* Wallet address box */}
          <div className="bg-[#151c2e] border border-[#232c43] rounded-lg p-4 mb-2">
            <div className="font-bold text-white mb-1">Your wallet address</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={invoice.pay_address}
                readOnly
                className="flex-1 bg-[#232c43] text-white font-mono px-3 py-2 rounded outline-none border-none text-sm"
                style={{ minWidth: 0 }}
              />
              <button
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                onClick={() =>
                  navigator.clipboard.writeText(invoice.pay_address)
                }
                title="Copy address"
                aria-label="Copy address"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// Removed to resolve build error: Export QRCode doesn't exist in target module
