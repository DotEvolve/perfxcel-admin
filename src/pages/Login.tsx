import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      setLoading(false);
      navigate("/");
    } else {
      setError("Please check your email to confirm your account.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address above, then click Forgot password.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <img
              src="/logo.png"
              alt="DotEvolve Logo"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
          <p className="text-slate-400 mt-2">PerfXcel LMS Admin</p>
        </div>

        <div className="p-8">
          {resetSent && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              Password reset email sent. Check your inbox.
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-lg text-sm font-medium border border-rose-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-shadow"
                placeholder="admin@dotevolve.net"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-shadow"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
