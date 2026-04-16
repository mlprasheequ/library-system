"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, BookOpen, UserCheck, Lock, ArrowRight, Loader2, Command, Activity, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    await new Promise((res) => setTimeout(res, 1200));

    const parts = email.split('@');
    if (parts.length < 2) {
      setError("GATEWAY_ROUTING_ERROR: INVALID_DOMAIN_FORMAT");
      setLoading(false);
      return;
    }

    const handle = parts[0];
    const domain = parts[1].toLowerCase();

    try {
      // Fetch user by username/handle OR email
      // Using .or with exact matches to prevent accidental overlaps
      const { data: user, error: fetchErr } = await supabase
        .from('students')
        .select('*')
        .or(`username.eq.${handle},email_library.eq.${email}`)
        .eq('password', password)
        .maybeSingle();

      if (fetchErr || !user) {
        setError("AUTHENTICATION_FAILURE: INVALID_CREDENTIALS");
        setLoading(false);
        return;
      }

      if (domain === "system.com" || domain === "admin.com") {
        if (!user.is_admin) {
          setError("AUTHENTICATION_FAILURE: NOT_AN_ADMINISTRATOR");
          setLoading(false);
          return;
        }
        setSession({ email, role: 'admin', name: user.full_name, id: user.id });
        router.push("/admin");
      } 
      else if (domain === "responsible.com") {
        if (!user.is_responsible) {
          setError("AUTHENTICATION_FAILURE: NOT_A_LIBRARIAN");
          setLoading(false);
          return;
        }
        setSession({ email, role: 'responsible', name: user.full_name, id: user.id });
        router.push("/responsible");
      }
      else if (domain === "library.com") {
        setSession({
          email,
          role: 'student-library',
          name: user.full_name,
          roll: user.roll_id,
          id: user.id
        });
        router.push("/student/library");
      }
      else {
        setError("GATEWAY_ROUTING_ERROR: UNRECOGNIZED_DOMAIN");
        setLoading(false);
      }
    } catch (err) {
      setError("SYSTEM_CRITICAL_ERROR: UNABLE_TO_PROCESS_REQUEST");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden font-sans selection:bg-indigo-500/30 px-4 py-8">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] bg-indigo-600/10 rounded-full blur-[120px] md:blur-[150px] lg:blur-[180px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px] bg-blue-600/5 rounded-full blur-[140px] md:blur-[170px] lg:blur-[200px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="z-10 w-full max-w-md p-0.5 rounded-[3rem] bg-indigo-500/10 shadow-[0_0_100px_rgba(79,70,229,0.1)] relative"
      >
        <div className="bg-[#020617]/90 rounded-[2.9rem] p-8 md:p-12 border border-white/5 backdrop-blur-4xl relative overflow-hidden group">
          <div className="mb-10 text-center relative">
             <div className="inline-flex p-4 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/20 mb-6">
                <ShieldCheck className="w-8 h-8 text-indigo-400 relative z-10" />
             </div>
             <h1 className="text-3xl font-black text-white tracking-tight mb-2 italic">
                GATEWAY<span className="text-indigo-500">_ACCESS</span>
             </h1>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                Secure Authentication Protocol
             </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Terminal Identity (Email)</label>
              <div className="relative group/input">
                <Command className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-indigo-500 transition-colors" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@domain.com"
                  className="w-full bg-white/5 border border-white/10 p-5 pl-12 rounded-2xl text-xs font-bold text-white outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-2">Access Key (Password)</label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-indigo-500 transition-colors" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 p-5 pl-12 rounded-2xl text-xs font-bold text-white outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                  required
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center space-x-3"
                >
                  <Zap className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-wider leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="w-full group relative bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
              <span className="flex items-center justify-center relative z-10">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Authorize Session <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" /></>
                )}
              </span>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center space-y-4">
             <div className="flex items-center space-x-6">
                <div className="flex flex-col items-center">
                   <ShieldCheck className="w-4 h-4 text-gray-600 mb-1" />
                   <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">TLS 1.3</span>
                </div>
                <div className="flex flex-col items-center">
                   <Activity className="w-4 h-4 text-gray-600 mb-1" />
                   <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Live Node</span>
                </div>
             </div>
             <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.4em]">Proprietary Archive System v4.0.2</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
