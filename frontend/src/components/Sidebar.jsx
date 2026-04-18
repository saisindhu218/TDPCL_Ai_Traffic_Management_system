import React, { useContext, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Activity, Map, Shield, HeartPulse, ShieldAlert, User, Moon, Sun } from 'lucide-react';
import apiClient from '../utils/apiClient';

const SELECTED_HOSPITAL_KEY = 'selectedHospitalCode';

const Sidebar = ({ theme, onToggleTheme }) => {
  const { user, logout } = useContext(AuthContext);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalCode, setSelectedHospitalCode] = useState(() => localStorage.getItem(SELECTED_HOSPITAL_KEY) || '');

  useEffect(() => {
    if (user?.role !== 'hospital') {
      return undefined;
    }

    const loadHospitals = async () => {
      try {
        const res = await apiClient.get('/hospitals');
        setHospitals(res.data || []);
        if (res.data?.length > 0) {
          setSelectedHospitalCode((current) => current || res.data[0].code);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadHospitals();
  }, [user?.role]);

  useEffect(() => {
    if (selectedHospitalCode) {
      localStorage.setItem(SELECTED_HOSPITAL_KEY, selectedHospitalCode);
    }
  }, [selectedHospitalCode]);

  const getMenuIcon = (role) => {
    switch(role) {
      case 'ambulance': return <Activity className="w-5 h-5" />;
      case 'police': return <ShieldAlert className="w-5 h-5" />;
      case 'hospital': return <HeartPulse className="w-5 h-5" />;
      case 'admin': return <Shield className="w-5 h-5" />;
      default: return <Map className="w-5 h-5" />;
    }
  };

  return (
    <aside className="app-shell__sidebar">
      <div className="px-6 pt-6 pb-5">
        <div className="sidebar-brand flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_16px_40px_rgba(34,211,238,0.18)]">
            <Activity className="text-slate-950 w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-semibold">Smart Traffic</div>
            <div className="text-lg font-semibold text-white">Operations Hub</div>
          </div>
        </div>
      </div>

      <div className="px-4 flex-1">
        <div className="sidebar-chip mb-3">Role Panel</div>
        <NavLink 
          to={`/${user.role}`} 
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'sidebar-nav-link--active' : ''}`}
        >
          {getMenuIcon(user.role)}
          <span className="capitalize">{user.role} Dashboard</span>
        </NavLink>

        {user.role === 'hospital' && (
          <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <div className="sidebar-chip mb-3">Hospital List</div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {hospitals.map((hospital) => (
                <button
                  type="button"
                  key={hospital.code}
                  onClick={() => {
                    setSelectedHospitalCode(hospital.code);
                    globalThis.dispatchEvent(new CustomEvent('hospital:selected', { detail: hospital.code }));
                  }}
                  className={`w-full text-left rounded-2xl p-3 border transition-all ${selectedHospitalCode === hospital.code ? 'border-cyan-400/40 bg-cyan-400/10 shadow-[0_10px_30px_rgba(34,211,238,0.08)]' : 'border-white/10 bg-slate-950/45 hover:border-cyan-400/25 hover:bg-white/5'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-50 truncate">{hospital.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate">{hospital.area || hospital.address}</div>
                    </div>
                    <div className="text-[10px] uppercase px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300 shrink-0">
                      {hospital.status}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {hospital.available_beds} beds free
                  </div>
                </button>
              ))}

              {hospitals.length === 0 && (
                <div className="text-xs text-slate-500 px-1">No hospital records found.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-auto">
        <button
          type="button"
          onClick={onToggleTheme}
          className="action-button action-button--secondary mb-4 w-full justify-center"
          aria-label="Toggle dashboard theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        {user.role === 'ambulance' ? (
          <div className="mb-4">
            <NavLink
              to="/ambulance/profile"
              className="sidebar-profile flex items-center gap-3 transition-all hover:border-cyan-400/25 hover:bg-white/7"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center uppercase text-slate-100 font-bold border border-white/10">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                 <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                   {user.name}
                   <User className="w-4 h-4 text-slate-400" />
                 </div>
                 <div className="text-xs text-slate-400 capitalize">Tap to open profile</div>
              </div>
            </NavLink>
          </div>
        ) : (
          <div className="sidebar-profile bg-white/5 p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center uppercase text-slate-100 font-bold border border-white/10">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
               <div className="text-sm font-medium text-white truncate">{user.name}</div>
               <div className="text-xs text-slate-400 capitalize">{user.role}</div>
            </div>
          </div>
        )}

        <button 
          onClick={logout}
          className="action-button action-button--danger w-full justify-start"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  theme: PropTypes.oneOf(['dark', 'light']).isRequired,
  onToggleTheme: PropTypes.func.isRequired
};

export default Sidebar;
