"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Button from "@/components/ui/Button";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
          },
        });
        if (error) throw error;
        setSuccessMessage("¡Enlace mágico enviado! Revisa tu casilla de correo electrónico.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // If login failed, try sign up if user doesn't exist
          if (error.message.includes("Invalid login credentials") && email.toLowerCase() === "matiasvidal11972@gmail.com") {
            // Attempt signup for root admin initial setup
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
            });
            if (signUpError) throw error;
            setSuccessMessage("Cuenta creada exitosamente como Administrador Raíz. Iniciando sesión...");
            router.push("/admin");
            return;
          }
          throw error;
        }
        router.push("/admin");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
            <span className="text-white font-black text-xl">SPT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Acceso Administrativo
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Panel de control Saladillo Padel Tour
          </p>
        </div>

        <div className="bg-dark-800/90 border border-dark-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2.5 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google OAuth */}
          <div className="mb-6">
            <GoogleSignInButton />
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-dark-700"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-dark-500">
              o mediante email
            </span>
            <div className="flex-grow border-t border-dark-700"></div>
          </div>

          {/* Email / Password / Magic Link Form */}
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@saladillo.com"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {!isMagicLink && (
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl"
            >
              {loading
                ? "Procesando..."
                : isMagicLink
                ? "Enviar Magic Link"
                : "Iniciar Sesión"}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMagicLink(!isMagicLink);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isMagicLink
                  ? "Ingresar con Contraseña habitual"
                  : "Ingresar sin contraseña (Magic Link por email)"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-dark-700/60 text-center">
            <p className="text-[11px] text-dark-500 leading-relaxed">
              Administrador raíz predeterminado:{" "}
              <span className="text-dark-300 font-mono">matiasvidal11972@gmail.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
