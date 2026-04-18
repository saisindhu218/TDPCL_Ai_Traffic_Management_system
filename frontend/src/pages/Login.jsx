import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Activity, ShieldAlert, HeartPulse, Shield, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('ambulance');
  const [error, setError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsLogin(mode !== 'register');
  }, [searchParams]);

  const handleDemoFill = (demoRole) => {
    setEmail(`${demoRole}@demo.com`);
    setPassword('demo123');
    setRole(demoRole);
    setName(`Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authSubmitting) {
      return;
    }

    setAuthSubmitting(true);
    setError('');
    
    let res;
    if (isLogin) {
      res = await login(email, password);
    } else {
      res = await register(name, email, password, role);
    }

    if (res.success) {
      navigate(`/${res.user.role}`);
    } else {
      setError(res.msg);
    }

    setAuthSubmitting(false);
  };

  let submitLabel = 'Create Account';
  if (isLogin) {
    submitLabel = 'Sign In';
  }
  if (authSubmitting) {
    submitLabel = 'Please wait...';
  }

  return (
    <div className="auth-shell flex items-center justify-center">
      <div className="auth-card w-full max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_16px_40px_rgba(34,211,238,0.18)]">
            <Activity className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Secure Access</div>
            <h2 className="text-2xl font-semibold text-white">AI-Powered Smart Traffic Management System for Ambulance Emergency Response</h2>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          {isLogin ? 'Sign in to continue to your command dashboard.' : 'Create a role-based account for platform access.'}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-[1.25rem] border border-white/10 bg-white/5 p-2">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setSearchParams({ mode: 'login' });
            }}
            className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${isLogin ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setSearchParams({ mode: 'register' });
            }}
            className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${isLogin ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'}`}
          >
            Create Account
          </button>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="field-label">Name</label>
              <input
                id="name"
                type="text"
                className="w-full"
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input
              id="email"
              type="email"
              className="w-full"
              placeholder="user@demo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full pr-12"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-100"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="role" className="field-label">Role</label>
              <select
                id="role"
                className="w-full"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="ambulance">Ambulance</option>
                <option value="police">Police</option>
                <option value="hospital">Hospital</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={authSubmitting}
            className="action-button action-button--primary mt-2 w-full"
          >
            {submitLabel}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Quick Demo Login</p>
              <p className="mt-1 text-sm text-slate-500">Fill a demo role in one click.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button onClick={() => handleDemoFill('ambulance')} type="button" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-red-400/30 hover:bg-red-500/10 group">
              <Activity className="h-5 w-5 text-red-300 transition-transform group-hover:scale-110" />
              <span className="mt-6 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Ambulance</span>
            </button>
            <button onClick={() => handleDemoFill('police')} type="button" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/10 group">
              <ShieldAlert className="h-5 w-5 text-cyan-300 transition-transform group-hover:scale-110" />
              <span className="mt-6 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Police</span>
            </button>
            <button onClick={() => handleDemoFill('hospital')} type="button" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/10 group">
              <HeartPulse className="h-5 w-5 text-emerald-300 transition-transform group-hover:scale-110" />
              <span className="mt-6 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Hospital</span>
            </button>
            <button onClick={() => handleDemoFill('admin')} type="button" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-violet-400/30 hover:bg-violet-500/10 group">
              <Shield className="h-5 w-5 text-violet-300 transition-transform group-hover:scale-110" />
              <span className="mt-6 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Admin</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? 'Need a demo account? ' : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              const nextMode = isLogin ? 'register' : 'login';
              setIsLogin(!isLogin);
              setSearchParams({ mode: nextMode });
            }}
            className="font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {isLogin ? 'Switch to Create Account' : 'Switch to Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
