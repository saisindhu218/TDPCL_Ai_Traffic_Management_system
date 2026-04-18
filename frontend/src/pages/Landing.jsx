import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, HeartPulse, ArrowRight } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-shell flex items-center justify-center">
      <section className="auth-hero w-full max-w-5xl px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="flex flex-col gap-8 lg:gap-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <Activity className="h-4 w-4" />
              Smart Traffic Operations
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              AI-Powered Smart Traffic Management System for Ambulance Emergency Response.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Access ambulance routing, police lane coordination, hospital readiness, and admin oversight from a single secure interface built for operational use.
            </p>

            <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Routing</div>
                <div className="mt-2 text-lg font-semibold text-white">Live and traceable</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Access</div>
                <div className="mt-2 text-lg font-semibold text-white">Role-aware security</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Operations</div>
                <div className="mt-2 text-lg font-semibold text-white">Real-time visibility</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-red-400/15 bg-red-500/10 p-4">
              <Activity className="h-5 w-5 text-red-300" />
              <div className="mt-4 text-sm font-semibold text-white">Ambulance command</div>
              <div className="mt-1 text-xs text-slate-300">Start or end emergency traces with live route updates.</div>
            </div>
            <div className="rounded-[1.35rem] border border-cyan-400/15 bg-cyan-500/10 p-4">
              <ShieldAlert className="h-5 w-5 text-cyan-200" />
              <div className="mt-4 text-sm font-semibold text-white">Police coordination</div>
              <div className="mt-1 text-xs text-slate-300">Track lane clearance events and congestion response.</div>
            </div>
            <div className="rounded-[1.35rem] border border-emerald-400/15 bg-emerald-500/10 p-4">
              <HeartPulse className="h-5 w-5 text-emerald-200" />
              <div className="mt-4 text-sm font-semibold text-white">Hospital readiness</div>
              <div className="mt-1 text-xs text-slate-300">Monitor incoming units and capacity at a glance.</div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate('/login?mode=login')}
              className="action-button action-button--primary w-full justify-between px-5 py-4 text-base"
            >
              <span>Login</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/login?mode=register')}
              className="action-button action-button--secondary w-full justify-between px-5 py-4 text-base"
            >
              <span>Sign Up</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/simulation')}
              className="action-button action-button--secondary w-full justify-between px-5 py-4 text-base"
            >
              <span>Simulation</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;