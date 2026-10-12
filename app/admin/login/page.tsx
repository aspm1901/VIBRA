"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError("Ingresa un PIN válido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "PIN incorrecto");
      }

      router.replace("/admin");
    } catch (err: any) {
      setError(err.message || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#18181f] border border-[#2b2b36] rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-vibra-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-vibra-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#23232c] border border-[#353540] flex items-center justify-center text-vibra-400 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight lowercase">
          vibra <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-vibra-500/20 text-vibra-300 ml-1">admin</span>
        </h1>
        <p className="text-xs text-gray-400 mt-2 mb-6">
          Ingresa el PIN de seguridad para gestionar tiendas y vectores.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center text-2xl tracking-[0.5em] py-3.5 px-4 bg-[#121214] border border-[#32323d] focus:border-vibra-400 focus:ring-1 focus:ring-vibra-400 rounded-xl text-white font-mono placeholder:text-gray-600 transition-colors outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-3.5 px-4 bg-vibra-500 hover:bg-vibra-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-vibra-950/50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>Desbloquear panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-[11px] text-gray-500">
          Acceso restringido para administración del catálogo de Gamarra.
        </div>
      </div>
    </div>
  );
}
