import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Radio,
  Shield,
  Siren,
  Clock,
  Zap,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  X,
  Heart,
  GitBranch,
} from 'lucide-react';
import PropTypes from 'prop-types';

const BENGALURU_JUNCTIONS = [
  { id: 'j1', name: 'Silk Board Junction', lat: 12.917, lng: 77.6227, congestion: 0.85 },
  { id: 'j2', name: 'Hebbal Flyover', lat: 13.0358, lng: 77.597, congestion: 0.62 },
  { id: 'j3', name: 'KR Puram', lat: 13.0012, lng: 77.6882, congestion: 0.74 },
  { id: 'j4', name: 'Marathahalli Bridge', lat: 12.9591, lng: 77.701, congestion: 0.58 },
  { id: 'j5', name: 'Whitefield Main', lat: 12.9698, lng: 77.75, congestion: 0.45 },
  { id: 'j6', name: 'Electronic City', lat: 12.8456, lng: 77.6603, congestion: 0.71 },
  { id: 'j7', name: 'Majestic', lat: 12.9767, lng: 77.5713, congestion: 0.8 },
  { id: 'j8', name: 'Koramangala 4th Block', lat: 12.9352, lng: 77.6245, congestion: 0.66 },
];

const HOSPITALS = [
  { id: 'h1', name: 'Apollo Hospital', area: 'Bannerghatta', lat: 12.8917, lng: 77.5975, beds: 12, eta: null },
  { id: 'h2', name: 'Manipal Hospital', area: 'HAL Airport Rd', lat: 12.9594, lng: 77.6472, beds: 8, eta: null },
  { id: 'h3', name: 'Fortis Hospital', area: 'Cunningham Rd', lat: 12.9892, lng: 77.5862, beds: 15, eta: null },
  { id: 'h4', name: 'Narayana Health', area: 'Bommasandra', lat: 12.813, lng: 77.684, beds: 20, eta: null },
  { id: 'h5', name: 'Columbia Asia', area: 'Hebbal', lat: 13.035, lng: 77.594, beds: 6, eta: null },
];

const SIGNAL_STATES = ['RED', 'GREEN', 'AMBER', 'PRIORITY_GREEN'];

const ROLES = {
  ADMIN: { label: 'System Administrator', icon: Settings, color: '#6366f1' },
  PARAMEDIC: { label: 'Emergency Medical Responder', icon: Heart, color: '#ef4444' },
  POLICE: { label: 'Traffic Control Officer', icon: Shield, color: '#3b82f6' },
  SIGNAL: { label: 'Signal Control Unit', icon: Radio, color: '#f59e0b' },
};

const getRoleDescription = (key) => {
  if (key === 'ADMIN') return 'Full system oversight, analytics & configuration';
  if (key === 'PARAMEDIC') return 'Dispatch ambulances & activate priority corridors';
  if (key === 'POLICE') return 'Control nearby signals & assist emergency vehicles';
  return 'Monitor and manage traffic signal operations';
};

const getSidebarItems = (currentRole) => Object.entries(ROLES).map(([key, roleConfig]) => ({
  key,
  label: roleConfig.label,
  icon: roleConfig.icon,
  color: roleConfig.color,
  description: getRoleDescription(key),
  active: currentRole === key,
}));

const QdrantDB = {
  collections: {
    traffic_vectors: [],
    route_embeddings: [],
    incident_history: [],
  },
  insert(collection, point) {
    this.collections[collection].push({ ...point, id: crypto.randomUUID(), timestamp: Date.now() });
  },
  search(collection, filter = {}) {
    return this.collections[collection].filter((p) => {
      return Object.entries(filter).every(([k, v]) => p.payload?.[k] === v);
    });
  },
  getAll(collection) {
    return this.collections[collection];
  },
};

const API = {
  baseUrl: '/api/v1',
  async getJunctions() {
    await new Promise((r) => setTimeout(r, 150));
    return BENGALURU_JUNCTIONS.map((j) => ({
      ...j,
      congestion: Math.min(1, Math.max(0, j.congestion + (Math.random() - 0.5) * 0.15)),
      signalState: SIGNAL_STATES[Math.floor(Math.random() * 3)],
      vehicleCount: Math.floor(Math.random() * 80) + 10,
      avgWaitTime: (Math.random() * 120 + 15).toFixed(0),
    }));
  },
  async getHospitals() {
    await new Promise((r) => setTimeout(r, 100));
    return HOSPITALS.map((h) => ({
      ...h,
      beds: Math.max(0, h.beds + Math.floor((Math.random() - 0.3) * 4)),
      eta: (Math.random() * 20 + 5).toFixed(1),
      status: Math.random() > 0.2 ? 'AVAILABLE' : 'FULL',
    }));
  },
  async dispatchAmbulance(data) {
    await new Promise((r) => setTimeout(r, 300));
    QdrantDB.insert('incident_history', {
      vector: [Math.random(), Math.random(), Math.random()],
      payload: { type: 'dispatch', ...data, status: 'ACTIVE' },
    });
    return { success: true, dispatchId: `AMB-${Date.now().toString(36).toUpperCase()}`, eta: data.eta };
  },
  async triggerPriorityCorridor(junctionIds, ambulanceId) {
    await new Promise((r) => setTimeout(r, 200));
    QdrantDB.insert('traffic_vectors', {
      vector: junctionIds.map(() => Math.random()),
      payload: { type: 'priority_corridor', junctions: junctionIds, ambulanceId },
    });
    return { success: true, corridorActive: true, signalsOverridden: junctionIds.length };
  },
  async getAnalytics() {
    await new Promise((r) => setTimeout(r, 250));
    return {
      totalDispatches: QdrantDB.getAll('incident_history').length + Math.floor(Math.random() * 50),
      avgResponseTime: (Math.random() * 8 + 4).toFixed(1),
      corridorsActivated: Math.floor(Math.random() * 20) + 5,
      signalOverrides: Math.floor(Math.random() * 100) + 30,
      congestionReduction: (Math.random() * 25 + 10).toFixed(1),
      livePrediction: (Math.random() * 100).toFixed(0),
    };
  },
  async wsConnect() {
    return { connected: true, latency: Math.floor(Math.random() * 30) + 5 };
  },
};

const StatusBadge = ({ status }) => {
  const colors = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    DISPATCHED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    COMPLETED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    PRIORITY: 'bg-red-500/20 text-red-300 border-red-500/30',
    AVAILABLE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    FULL: 'bg-red-500/20 text-red-300 border-red-500/30',
    RED: 'bg-red-500/20 text-red-300 border-red-500/30',
    GREEN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    AMBER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    PRIORITY_GREEN: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    NORMAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    RECOVERY: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border rounded-full ${colors[status] || colors.ACTIVE}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

StatusBadge.defaultProps = {
  status: '',
};

const MetricCard = ({ icon: Icon, label, value, unit, accent }) => (
  <div
    className="relative overflow-hidden rounded-xl border border-white/[0.06] p-4"
    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-widest text-white/40">{label}</p>
        <p className="text-2xl font-black" style={{ color: accent || '#fff', fontFamily: `'JetBrains Mono', monospace` }}>
          {value}
          <span className="ml-1 text-sm font-normal text-white/30">{unit}</span>
        </p>
      </div>
      <div className="rounded-lg p-2" style={{ background: `${accent || '#fff'}15` }}>
        <Icon size={18} style={{ color: accent || '#fff' }} />
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent || '#fff'}40, transparent)` }} />
  </div>
);

MetricCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  accent: PropTypes.string,
};

MetricCard.defaultProps = {
  unit: '',
  accent: '',
};

const PulsingDot = ({ color = '#22c55e', size = 8 }) => (
  <span className="relative inline-flex">
    <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: color, width: size, height: size }} />
    <span className="relative inline-flex rounded-full" style={{ backgroundColor: color, width: size, height: size }} />
  </span>
);

PulsingDot.propTypes = {
  color: PropTypes.string,
  size: PropTypes.number,
};

const TrafficCanvas = ({ junctions, ambulances }) => {
  const canvasRef = useRef(null);
  const animFrame = useRef(0);
  const vehiclesRef = useRef([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    if (vehiclesRef.current.length < 40) {
      for (let i = 0; i < 40; i += 1) {
        vehiclesRef.current.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          type: Math.random() > 0.9 ? 'ambulance' : 'car',
          size: Math.random() * 3 + 2,
        });
      }
    }

    const draw = () => {
      timeRef.current += 0.016;
      ctx.fillStyle = 'rgba(8, 10, 18, 0.3)';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 20;
      for (let i = 0; i < 5; i += 1) {
        const x = (W / 5) * i + W / 10;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
        const y = (H / 5) * i + H / 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      for (let i = 0; i < 5; i += 1) {
        const x = (W / 5) * i + W / 10;
        ctx.beginPath();
        ctx.moveTo(x - 5, 0);
        ctx.lineTo(x - 5, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 5, 0);
        ctx.lineTo(x + 5, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      vehiclesRef.current.forEach((v) => {
        v.x += v.vx;
        v.y += v.vy;
        if (v.x < 0 || v.x > W) v.vx *= -1;
        if (v.y < 0 || v.y > H) v.vy *= -1;

        if (v.type === 'ambulance') {
          const flash = Math.sin(timeRef.current * 10) > 0;
          ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
          ctx.shadowColor = flash ? '#ef4444' : '#3b82f6';
          ctx.shadowBlur = 15;
          ctx.fillRect(v.x - 4, v.y - 2, 8, 4);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = `rgba(100, 160, 255, ${0.4 + Math.random() * 0.3})`;
          ctx.beginPath();
          ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (junctions) {
        junctions.forEach((j, i) => {
          const x = ((i % 4) + 0.5) * (W / 4);
          const y = (Math.floor(i / 4) + 0.5) * (H / 2);
          let congColor = '#22c55e';
          if (j.congestion > 0.7) {
            congColor = '#ef4444';
          } else if (j.congestion > 0.4) {
            congColor = '#f59e0b';
          }

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
          gradient.addColorStop(0, `${congColor}40`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x - 30, y - 30, 60, 60);

          ctx.fillStyle = congColor;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(j.name.split(' ')[0], x, y + 18);
        });
      }

      if (ambulances && ambulances.length > 0) {
        ambulances.forEach(() => {
          const startX = W * 0.1;
          const endX = W * 0.9;
          const y = H * 0.3 + Math.sin(timeRef.current * 2) * 5;

          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + Math.sin(timeRef.current * 5) * 0.2})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      animFrame.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame.current);
  }, [junctions, ambulances]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={350}
      className="w-full rounded-xl border border-white/[0.06]"
      style={{ background: '#080a12' }}
    />
  );
};

TrafficCanvas.propTypes = {
  junctions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    congestion: PropTypes.number.isRequired,
  })).isRequired,
  ambulances: PropTypes.arrayOf(PropTypes.shape({
    dispatchId: PropTypes.string,
  })).isRequired,
};

const CongestionChart = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-24 items-end gap-1.5">
      {data.map((d, i) => {
        const h = (d.value / maxVal) * 100;
        let color = '#22c55e';
        if (d.value > 0.7) {
          color = '#ef4444';
        } else if (d.value > 0.4) {
          color = '#f59e0b';
        }
        return (
          <div key={`${d.label}-${d.value}`} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-sm transition-all duration-700" style={{ height: `${h}%`, backgroundColor: `${color}60`, borderTop: `2px solid ${color}` }} />
            <span className="w-full truncate text-center text-[8px] text-white/30">{d.label.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
};

CongestionChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
  })).isRequired,
};

const ActivityFeed = ({ events }) => (
  <div className="max-h-64 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
    {events.map((e) => (
      <div key={`${e.time}-${e.message}`} className="flex items-start gap-3 rounded-lg border border-white/[0.04] p-2 transition-colors hover:border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="mt-1">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color || '#6366f1' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-white/80">{e.message}</p>
          <p className="mt-0.5 font-mono text-[10px] text-white/25">{e.time}</p>
        </div>
        {e.badge && <StatusBadge status={e.badge} />}
      </div>
    ))}
  </div>
);

ActivityFeed.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape({
    message: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
    color: PropTypes.string,
    role: PropTypes.string,
    type: PropTypes.string,
    badge: PropTypes.string,
  })).isRequired,
};

const AdminPanel = ({ junctions, hospitals, analytics, events, ambulances }) => (
  <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard icon={Siren} label="Total Dispatches" value={analytics.totalDispatches} accent="#ef4444" />
      <MetricCard icon={Clock} label="Avg Response" value={analytics.avgResponseTime} unit="min" accent="#f59e0b" />
      <MetricCard icon={GitBranch} label="Corridors Today" value={analytics.corridorsActivated} accent="#8b5cf6" />
      <MetricCard icon={Zap} label="Signal Overrides" value={analytics.signalOverrides} accent="#06b6d4" />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-white/[0.06] p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Live Network View</span>
            <div className="flex items-center gap-2">
              <PulsingDot color="#22c55e" />
              <span className="font-mono text-[10px] text-white/30">STREAMING</span>
            </div>
          </div>
          <TrafficCanvas junctions={junctions} ambulances={ambulances} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Junction Congestion</p>
          <CongestionChart data={junctions.map((j) => ({ label: j.name, value: j.congestion }))} />
        </div>
        <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Qdrant Vector DB</p>
          <div className="space-y-2">
            {['traffic_vectors', 'route_embeddings', 'incident_history'].map((c) => (
              <div key={c} className="flex items-center justify-between text-xs">
                <span className="font-mono text-white/40">{c}</span>
                <span className="font-mono text-white/70">{QdrantDB.getAll(c).length} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Junction Status</p>
        <div className="space-y-1.5">
          {junctions.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                {(() => {
                  let congestionColor = '#22c55e';
                  if (j.congestion > 0.7) {
                    congestionColor = '#ef4444';
                  } else if (j.congestion > 0.4) {
                    congestionColor = '#f59e0b';
                  }

                  return <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: congestionColor }} />;
                })()}
                <span className="text-xs text-white/70">{j.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-white/30">{j.vehicleCount} veh</span>
                <StatusBadge status={j.signalState} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Live Activity</p>
        <ActivityFeed events={events} />
      </div>
    </div>
  </div>
);

AdminPanel.propTypes = {
  junctions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    congestion: PropTypes.number.isRequired,
    vehicleCount: PropTypes.number.isRequired,
    signalState: PropTypes.string.isRequired,
  })).isRequired,
  hospitals: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })).isRequired,
  analytics: PropTypes.shape({
    totalDispatches: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    avgResponseTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    corridorsActivated: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    signalOverrides: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  events: PropTypes.arrayOf(PropTypes.shape({ message: PropTypes.string.isRequired })).isRequired,
  ambulances: PropTypes.arrayOf(PropTypes.shape({ dispatchId: PropTypes.string })).isRequired,
};

const ParamedicPanel = ({ hospitals, junctions, onDispatch, activeDispatch, events }) => {
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedJunction, setSelectedJunction] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  const handleDispatch = async () => {
    if (!selectedHospital || !selectedJunction) return;
    setDispatching(true);
    await onDispatch({ hospital: selectedHospital, junction: selectedJunction });
    setDispatching(false);
  };

  return (
    <div className="space-y-5">
      {activeDispatch && (
        <div className="animate-pulse rounded-xl border border-red-500/30 p-4" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))' }}>
          <div className="flex items-center gap-3">
            <Siren size={24} className="text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-300">ACTIVE DISPATCH - {activeDispatch.dispatchId}</p>
              <p className="text-xs text-red-400/70">Priority corridor enabled • ETA: {activeDispatch.eta} min</p>
            </div>
            <StatusBadge status="PRIORITY" />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Select Destination Hospital</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {hospitals.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHospital(h)}
              className={`rounded-lg border p-3 text-left transition-all ${selectedHospital?.id === h.id ? 'border-red-500/50 bg-red-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80">{h.name}</span>
                <StatusBadge status={h.status} />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/40">
                <span>{h.area}</span>
                <span>•</span>
                <span>{h.beds} beds</span>
                <span>•</span>
                <span className="text-emerald-400">{h.eta} min ETA</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Incident Location (Junction)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {junctions.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelectedJunction(j)}
              className={`rounded-lg border p-2 text-center transition-all ${selectedJunction?.id === j.id ? 'border-red-500/50 bg-red-500/10' : 'border-white/[0.06] hover:border-white/[0.12]'}`}
            >
              <span className="block text-[11px] text-white/70">{j.name.split(' ').slice(0, 2).join(' ')}</span>
              <span className="font-mono text-[9px] text-white/30">{(j.congestion * 100).toFixed(0)}% load</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleDispatch}
        disabled={!selectedHospital || !selectedJunction || dispatching}
        className="w-full rounded-xl py-4 text-sm font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          background: selectedHospital && selectedJunction ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'rgba(255,255,255,0.05)',
          color: selectedHospital && selectedJunction ? '#fff' : 'rgba(255,255,255,0.3)',
          boxShadow: selectedHospital && selectedJunction ? '0 0 30px rgba(239,68,68,0.3)' : 'none',
        }}
      >
        {dispatching ? 'Activating Priority Corridor...' : 'Dispatch Ambulance & Activate Corridor'}
      </button>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Dispatch Log</p>
        <ActivityFeed events={events.filter((e) => e.role === 'PARAMEDIC' || e.type === 'dispatch')} />
      </div>
    </div>
  );
};

ParamedicPanel.propTypes = {
  hospitals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    area: PropTypes.string,
    beds: PropTypes.number.isRequired,
    eta: PropTypes.string,
    status: PropTypes.string.isRequired,
  })).isRequired,
  junctions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    congestion: PropTypes.number.isRequired,
  })).isRequired,
  onDispatch: PropTypes.func.isRequired,
  activeDispatch: PropTypes.shape({ dispatchId: PropTypes.string, eta: PropTypes.string }),
  events: PropTypes.arrayOf(PropTypes.shape({ message: PropTypes.string.isRequired })).isRequired,
};

ParamedicPanel.defaultProps = {
  activeDispatch: null,
};

const PolicePanel = ({ junctions, ambulances, events, onOverrideSignal }) => {
  const [selectedJunction, setSelectedJunction] = useState(null);

  return (
    <div className="space-y-5">
      {ambulances.length > 0 && (
        <div className="space-y-2">
          {ambulances.map((a) => (
            <div key={a.dispatchId} className="flex items-center gap-3 rounded-xl border border-amber-500/30 p-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))' }}>
              <div className="animate-pulse">
                <Siren size={20} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-300">INCOMING: {a.dispatchId}</p>
                <p className="text-[10px] text-amber-400/60">Route: {a.junction} → {a.hospital} • ETA {a.eta} min</p>
              </div>
              <button
                onClick={() => onOverrideSignal(a.junctionIds || [junctions[0]?.id])}
                className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/30"
              >
                Clear Path
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Nearby Junction Control</p>
        <div className="space-y-2">
          {junctions.slice(0, 4).map((j) => (
            <button
              key={j.id}
              type="button"
              className={`cursor-pointer rounded-lg border p-3 text-left transition-all ${selectedJunction?.id === j.id ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/[0.06] hover:border-white/[0.10]'}`}
              onClick={() => setSelectedJunction(j)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedJunction(j);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/80">{j.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-white/30">{j.vehicleCount} vehicles</span>
                    <span className="text-[10px] text-white/20">•</span>
                    <span className="font-mono text-[10px] text-white/30">{j.avgWaitTime}s avg wait</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={j.signalState} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOverrideSignal([j.id]);
                    }}
                    className="rounded bg-blue-500/20 px-2 py-1 text-[9px] font-bold uppercase text-blue-300 transition-colors hover:bg-blue-500/30"
                  >
                    Override
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Area Congestion</p>
        <div className="grid grid-cols-4 gap-1">
          {junctions.map((j) => {
            const intensity = j.congestion;
            const r = Math.floor(intensity * 239);
            const g = Math.floor((1 - intensity) * 200);
            return (
              <div key={j.id} className="flex aspect-square items-center justify-center rounded-md" style={{ backgroundColor: `rgba(${r}, ${g}, 50, 0.3)`, border: `1px solid rgba(${r}, ${g}, 50, 0.2)` }}>
                <span className="text-center text-[8px] leading-tight text-white/50">
                  {j.name.split(' ')[0]}
                  <br />
                  {(intensity * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Officer Activity Log</p>
        <ActivityFeed events={events.filter((e) => e.role === 'POLICE' || e.type === 'override')} />
      </div>
    </div>
  );
};

PolicePanel.propTypes = {
  junctions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    vehicleCount: PropTypes.number.isRequired,
    avgWaitTime: PropTypes.string.isRequired,
    signalState: PropTypes.string.isRequired,
    congestion: PropTypes.number.isRequired,
  })).isRequired,
  ambulances: PropTypes.arrayOf(PropTypes.shape({
    dispatchId: PropTypes.string,
    junction: PropTypes.string,
    hospital: PropTypes.string,
    eta: PropTypes.string,
    junctionIds: PropTypes.arrayOf(PropTypes.string),
  })).isRequired,
  events: PropTypes.arrayOf(PropTypes.shape({ message: PropTypes.string.isRequired })).isRequired,
  onOverrideSignal: PropTypes.func.isRequired,
};

const SignalPanel = ({ junctions, ambulances, systemState }) => {
  const [overrideMode, setOverrideMode] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">System Mode</p>
          <p className="mt-1 text-lg font-black text-white/90" style={{ fontFamily: `'JetBrains Mono', monospace` }}>
            {systemState}
          </p>
        </div>
        <StatusBadge status={systemState} />
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Signal Matrix</p>
          <button
            onClick={() => setOverrideMode(!overrideMode)}
            className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${overrideMode ? 'border-amber-500/30 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-white/5 text-white/40'}`}
          >
            {overrideMode ? 'Override Active' : 'Manual Override'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {junctions.map((j) => {
            const isPriority = j.signalState === 'PRIORITY_GREEN';
            return (
              <div
                key={j.id}
                className="rounded-xl border p-3 text-center transition-all"
                style={{
                  borderColor: isPriority ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.06)',
                  background: isPriority ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                  boxShadow: isPriority ? '0 0 20px rgba(6,182,212,0.15)' : 'none',
                }}
              >
                <div className="mb-2 inline-flex flex-col gap-1 rounded-lg bg-black/40 p-2">
                  <div className={`mx-auto h-4 w-4 rounded-full ${j.signalState === 'RED' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-red-500/20'}`} />
                  <div className={`mx-auto h-4 w-4 rounded-full ${j.signalState === 'AMBER' ? 'bg-amber-500 shadow-lg shadow-amber-500/50' : 'bg-amber-500/20'}`} />
                  <div className={`mx-auto h-4 w-4 rounded-full ${j.signalState === 'GREEN' || j.signalState === 'PRIORITY_GREEN' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-emerald-500/20'}`} />
                </div>
                <p className="text-[10px] font-semibold text-white/60">{j.name.split(' ').slice(0, 2).join(' ')}</p>
                <p className="mt-0.5 text-[9px] font-mono text-white/25">{j.vehicleCount} queued</p>
                {isPriority && <p className="mt-1 animate-pulse text-[8px] font-bold text-cyan-400">🚨 PRIORITY</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Cycle Configuration</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Green Phase', value: '45s', color: '#22c55e' },
            { label: 'Amber Phase', value: '5s', color: '#f59e0b' },
            { label: 'Red Phase', value: '60s', color: '#ef4444' },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-white/[0.06] p-3 text-center">
              <div className="mx-auto mb-2 h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
              <p className="font-mono text-lg font-black text-white/80">{c.value}</p>
              <p className="text-[9px] uppercase tracking-wider text-white/30">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">TDPCL Algorithm Status</p>
        <div className="space-y-2">
          {[
            { label: 'Dynamic Routing Engine', status: 'ACTIVE', color: '#22c55e' },
            { label: 'Predictive Congestion Model', status: 'ACTIVE', color: '#22c55e' },
            { label: 'Priority Corridor Generator', status: ambulances.length > 0 ? 'ENGAGED' : 'STANDBY', color: ambulances.length > 0 ? '#ef4444' : '#f59e0b' },
            { label: 'Adaptive Signal Control', status: 'ACTIVE', color: '#22c55e' },
            { label: 'Vector Similarity Search', status: 'ACTIVE', color: '#22c55e' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <PulsingDot color={item.color} size={6} />
                <span className="text-xs text-white/60">{item.label}</span>
              </div>
              <span className="font-mono text-[10px] font-bold" style={{ color: item.color }}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

SignalPanel.propTypes = {
  junctions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    signalState: PropTypes.string.isRequired,
    vehicleCount: PropTypes.number.isRequired,
    congestion: PropTypes.number.isRequired,
  })).isRequired,
  ambulances: PropTypes.arrayOf(PropTypes.shape({ dispatchId: PropTypes.string })).isRequired,
  systemState: PropTypes.string.isRequired,
};

export default function Simulation() {
  const [role, setRole] = useState('ADMIN');
  const [junctions, setJunctions] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [events, setEvents] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [systemState, setSystemState] = useState('NORMAL');
  const [wsStatus, setWsStatus] = useState({ connected: false, latency: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const tickRef = useRef(null);

  const sidebarItems = getSidebarItems(role);

  const addEvent = useCallback((message, type = 'info', eventRole = null, badge = null) => {
    const colors = { info: '#6366f1', dispatch: '#ef4444', override: '#f59e0b', success: '#22c55e' };
    setEvents((prev) => [
      {
        message,
        time: new Date().toLocaleTimeString(),
        color: colors[type] || colors.info,
        role: eventRole,
        type,
        badge,
      },
      ...prev,
    ].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!role) return undefined;

    const loadData = async () => {
      const [j, h, a, ws] = await Promise.all([API.getJunctions(), API.getHospitals(), API.getAnalytics(), API.wsConnect()]);
      setJunctions(j);
      setHospitals(h);
      setAnalytics(a);
      setWsStatus(ws);
    };

    loadData();
    tickRef.current = setInterval(loadData, 3000);
    return () => clearInterval(tickRef.current);
  }, [role]);

  useEffect(() => {
    if (!role) return undefined;
    const seeds = [
      { msg: 'System initialized — TDPCL v2.4 online', type: 'success' },
      { msg: 'Qdrant vector DB connected (3 collections)', type: 'info' },
      { msg: 'FastAPI backend: all endpoints healthy', type: 'info' },
      { msg: 'WebSocket stream established — real-time mode', type: 'success' },
      { msg: 'AI prediction model loaded (congestion forecast)', type: 'info' },
    ];
    seeds.forEach((s, i) => setTimeout(() => addEvent(s.msg, s.type), i * 400));
    return undefined;
  }, [role, addEvent]);

  const handleDispatch = async (data) => {
    const result = await API.dispatchAmbulance({
      hospital: data.hospital.name,
      junction: data.junction.name,
      eta: data.hospital.eta,
    });
    setActiveDispatch({ ...result, ...data, hospital: data.hospital.name, junction: data.junction.name });
    setAmbulances((prev) => [...prev, { ...result, hospital: data.hospital.name, junction: data.junction.name, eta: data.hospital.eta, junctionIds: [data.junction.id] }]);
    setSystemState('PRIORITY');
    addEvent(`🚨 Ambulance ${result.dispatchId} dispatched: ${data.junction.name} → ${data.hospital.name}`, 'dispatch', 'PARAMEDIC', 'DISPATCHED');
    addEvent(`Priority corridor activated — ${data.junction.name} signals overridden`, 'override', 'SIGNAL', 'PRIORITY');

    setTimeout(clearDispatch, 30000, result.dispatchId);

    return result;
  };

  const clearDispatch = useCallback((dispatchId) => {
    setAmbulances((currentAmbulances) => currentAmbulances.filter((ambulance) => ambulance.dispatchId !== dispatchId));
    setActiveDispatch(null);
    setSystemState('RECOVERY');
    addEvent(`✅ ${dispatchId} reached destination. Corridor deactivated.`, 'success', 'PARAMEDIC', 'COMPLETED');
    setTimeout(() => setSystemState('NORMAL'), 8000);
  }, [addEvent]);

  const handleOverrideSignal = (junctionIds) => {
    addEvent(`Signal override triggered for ${junctionIds.length} junction(s) — priority green activated`, 'override', 'POLICE', 'PRIORITY');
    API.triggerPriorityCorridor(junctionIds, 'MANUAL');
  };

  const CurrentRole = ROLES[role];
  const RoleIcon = CurrentRole.icon;

  const renderCurrentPanel = () => {
    if (role === 'ADMIN') return <AdminPanel junctions={junctions} hospitals={hospitals} analytics={analytics} events={events} ambulances={ambulances} />;
    if (role === 'PARAMEDIC') return <ParamedicPanel hospitals={hospitals} junctions={junctions} onDispatch={handleDispatch} activeDispatch={activeDispatch} events={events} />;
    if (role === 'POLICE') return <PolicePanel junctions={junctions} ambulances={ambulances} events={events} onOverrideSignal={handleOverrideSignal} />;
    return <SignalPanel junctions={junctions} ambulances={ambulances} systemState={systemState} />;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg, #050608 0%, #0a0d14 40%, #0d1017 100%)', fontFamily: `'DM Sans', sans-serif` }}>
      <header className="sticky top-0 z-40 border-b border-white/[0.06]" style={{ background: 'rgba(5,6,8,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 hover:bg-white/5 lg:hidden">
              {sidebarOpen ? <X size={18} className="text-white/60" /> : <Menu size={18} className="text-white/60" />}
            </button>
            <h1 className="text-base font-extrabold text-white/90" style={{ fontFamily: `'Sora', sans-serif`, letterSpacing: '-0.02em' }}>
              TDPCL<span style={{ color: CurrentRole.color }}>.</span>
            </h1>
            <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] px-2.5 py-1 sm:flex" style={{ background: `${CurrentRole.color}10` }}>
              <RoleIcon size={12} style={{ color: CurrentRole.color }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: CurrentRole.color }}>{CurrentRole.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <PulsingDot color={wsStatus.connected ? '#22c55e' : '#ef4444'} size={6} />
              <span className="font-mono text-[10px] text-white/30">{wsStatus.latency}ms</span>
            </div>
            {systemState !== 'NORMAL' && (
              <div className="hidden sm:block">
                <StatusBadge status={systemState} />
              </div>
            )}
            <button
              onClick={() => { setRole('ADMIN'); setEvents([]); setAmbulances([]); setActiveDispatch(null); setSystemState('NORMAL'); setSidebarOpen(false); }}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
            >
              <LogOut size={16} className="text-white/30" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl gap-4 px-4 py-5 pb-24">
        <aside className={`fixed inset-y-0 left-0 z-50 w-[18rem] transform border-r border-white/[0.06] bg-black/90 p-4 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:rounded-2xl lg:border ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Simulation Menu</div>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 hover:bg-white/5">
              <X size={18} className="text-white/60" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">Current Role</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="rounded-xl p-2" style={{ background: `${CurrentRole.color}15` }}>
                  <RoleIcon size={18} style={{ color: CurrentRole.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{CurrentRole.label}</div>
                  <div className="text-xs text-white/35">{getRoleDescription(role)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {sidebarItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setRole(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition-all ${item.active ? 'border-white/20 bg-white/10' : 'border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl p-2" style={{ background: `${item.color}15` }}>
                        <ItemIcon size={16} style={{ color: item.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">{item.label}</span>
                          <ChevronRight size={14} className={item.active ? 'text-white/70' : 'text-white/20'} />
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/35">{item.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {sidebarOpen && <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close simulation menu" />}

        <section className="min-w-0 flex-1 space-y-4 lg:pl-0">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 lg:hidden">
            <button type="button" onClick={() => setSidebarOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-left">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Open Simulation Menu</div>
                <div className="mt-1 text-sm font-semibold text-white">{CurrentRole.label}</div>
              </div>
              <Menu size={18} className="text-white/50" />
            </button>
          </div>

          {renderCurrentPanel()}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04] px-4 py-2" style={{ background: 'rgba(5,6,8,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] text-white/20">TDPCL v2.4.0</span>
            <span className="text-[9px] text-white/10">|</span>
            <span className="font-mono text-[9px] text-white/20">FastAPI + Qdrant + Ionic</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-white/20">{junctions.length} junctions</span>
            <span className="font-mono text-[9px] text-white/20">{hospitals.length} hospitals</span>
            <span className="font-mono text-[9px] text-white/20">{QdrantDB.getAll('incident_history').length} vectors</span>
          </div>
        </div>
      </footer>
    </div>
  );
}