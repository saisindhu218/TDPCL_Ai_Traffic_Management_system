import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import apiClient from '../utils/apiClient';
import { AlertTriangle, Radio, ShieldAlert } from 'lucide-react';

const DASHBOARD_CACHE_KEY = 'policeDashboardCache';

function loadDashboardCache() {
  try {
    const cached = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function buildLegacyLaneRecords(resolvedEntries = []) {
  return resolvedEntries.flatMap((emergency) => {
    const signals = emergency.cleared_signals || [];

    return signals.map((signal) => ({
      _id: `${emergency._id}-${signal.id}`,
      emergency_id: emergency._id,
      legacy: true,
      createdAt: emergency.resolved_at,
      cleared_at: emergency.resolved_at,
      message: `Legacy clearance plan: ${signal.id}`,
      payload: {
        signal_id: signal.id,
        lane_name: signal.id,
        emergency_id: emergency._id,
        hospital_code: emergency.hospital_code || '',
        hospital_name: emergency.hospital_name || '',
        note: emergency.incident_note || '',
        legacy: true
      }
    }));
  });
}

function getLaneKey(emergency, signalId) {
  return `${emergency.emergency_id || emergency._id}-${signalId}`;
}

function toLaneKeyFromHistory(entry) {
  const emergencyId = entry.payload?.emergency_id || entry.emergency_id;
  const signalId = entry.payload?.signal_id || entry.payload?.lane_name;
  return `${emergencyId}-${signalId}`;
}

const PoliceDashboard = () => {
  const { socket } = useContext(SocketContext);
  const cachedDashboard = loadDashboardCache();
  const [activeEmergencies, setActiveEmergencies] = useState(cachedDashboard?.activeEmergencies || {});
  const [resolvedHistory, setResolvedHistory] = useState(cachedDashboard?.resolvedHistory || []);
  const [laneHistory, setLaneHistory] = useState(cachedDashboard?.laneHistory || []);
  const [congestionLevel, setCongestionLevel] = useState(60);
  const [clearedLaneKeys, setClearedLaneKeys] = useState(
    (cachedDashboard?.laneHistory || [])
      .filter((entry) => !entry.legacy)
      .map((entry) => toLaneKeyFromHistory(entry))
  );
  const [lastSyncedAt, setLastSyncedAt] = useState(cachedDashboard?.lastSyncedAt || null);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        activeEmergencies,
        resolvedHistory,
        laneHistory,
        clearedLaneKeys,
        lastSyncedAt
      }));
    } catch (err) {
      console.error(err);
    }
  }, [activeEmergencies, resolvedHistory, laneHistory, clearedLaneKeys, lastSyncedAt]);

  useEffect(() => {
    let syncTimer = null;

    const loadEmergencies = async () => {
      try {
        const [activeRes, historyRes, laneHistoryRes] = await Promise.allSettled([
          apiClient.get('/emergencies/active'),
          apiClient.get('/emergencies/history'),
          apiClient.get('/police/lane-clearance/history')
        ]);

        if (activeRes.status === 'fulfilled') {
          const emergenciesMap = {};
          activeRes.value.data.forEach((em) => {
            if (em.status === 'active') {
              emergenciesMap[em._id] = em;
            }
          });
          setActiveEmergencies(emergenciesMap);
        }

        let resolvedEntries = null;
        if (historyRes.status === 'fulfilled') {
          resolvedEntries = historyRes.value.data.map((em) => ({
            ...em,
            resolved_at: em.end_time || em.updatedAt || em.createdAt
          }));
          setResolvedHistory(resolvedEntries.slice(0, 20));
        }

        let laneRecords = [];
        if (laneHistoryRes.status === 'fulfilled') {
          laneRecords = laneHistoryRes.value.data.map((entry) => ({
            ...entry,
            cleared_at: entry.createdAt || entry.updatedAt
          }));
        }

        if (!laneRecords.length && resolvedEntries?.length) {
          laneRecords = buildLegacyLaneRecords(resolvedEntries);
        }

        setLaneHistory(laneRecords.slice(0, 20));

        const clearedKeys = laneRecords
          .filter((entry) => !entry.legacy)
          .map((entry) => toLaneKeyFromHistory(entry));
        setClearedLaneKeys(clearedKeys);
        setLastSyncedAt(new Date().toISOString());
        setSyncError('');
      } catch (err) {
        console.error(err);
        setSyncError('Unable to fully refresh police dashboard data. Showing cached state.');
      }
    };

    loadEmergencies();
    syncTimer = setInterval(loadEmergencies, 15000);

    if (!socket) {
      return () => {
        if (syncTimer) {
          clearInterval(syncTimer);
        }
      };
    }

    const onPoliceAlert = (data) => {
      if (data.status && data.status !== 'active') {
        return;
      }

      setActiveEmergencies((prev) => ({
        ...prev,
        [data.emergency_id]: {
          ...prev[data.emergency_id],
          ...data
        }
      }));
    };

    const onEmergencyResolved = (data) => {
      let resolvedEmergency = null;

      setActiveEmergencies((prev) => {
        resolvedEmergency = prev[data.emergency_id] || null;

        const newState = { ...prev };
        delete newState[data.emergency_id];
        return newState;
      });

      if (resolvedEmergency) {
        setResolvedHistory((historyPrev) => ([
          {
            ...resolvedEmergency,
            resolved_at: new Date().toISOString()
          },
          ...historyPrev
        ].slice(0, 20)));
      }

      loadEmergencies();
    };

    const onLaneCleared = (data) => {
      const key = `${data.emergency_id}-${data.signal_id || data.lane_name}`;
      setClearedLaneKeys((prev) => (prev.includes(key) ? prev : [key, ...prev]));
      setLaneHistory((prev) => ([
        {
          ...data,
          cleared_at: data.createdAt || new Date().toISOString(),
          message: data.message || `Lane cleared: ${data.signal_id || data.lane_name}`,
          payload: {
            signal_id: data.signal_id,
            lane_name: data.lane_name,
            note: data.note
          }
        },
        ...prev
      ].slice(0, 20)));
    };

    socket.on('police_alert', onPoliceAlert);
    socket.on('emergency_resolved', onEmergencyResolved);
    socket.on('lane_cleared', onLaneCleared);

    return () => {
      if (syncTimer) {
        clearInterval(syncTimer);
      }
      socket.off('police_alert', onPoliceAlert);
      socket.off('emergency_resolved', onEmergencyResolved);
      socket.off('lane_cleared', onLaneCleared);
    };
  }, [socket]);

  const activeEmergencyList = Object.values(activeEmergencies)
    .filter((em) => em.status === 'active')
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

  const currentEmergency = activeEmergencyList[0] || null;
  const activeCount = activeEmergencyList.length;
  const pendingSignals = currentEmergency
    ? (currentEmergency.cleared_signals || []).filter((signal) => !clearedLaneKeys.includes(getLaneKey(currentEmergency, signal.id)))
    : [];

  const clearLane = async (emergency, signal) => {
    if (!emergency) {
      return;
    }

    const key = getLaneKey(emergency, signal.id);
    if (clearedLaneKeys.includes(key)) {
      return;
    }

    try {
      const res = await apiClient.post('/police/lane-clearance', {
        emergency_id: emergency.emergency_id || emergency._id,
        signal_id: signal.id,
        lane_name: signal.id,
        note: `Police confirmed ${signal.id} is clear`
      });

      setClearedLaneKeys((prev) => [key, ...prev]);
      setLaneHistory((prev) => ([
        {
          ...res.data,
          cleared_at: res.data.createdAt || new Date().toISOString(),
          message: res.data.message || `Lane cleared: ${signal.id}`,
          payload: {
            ...res.data.payload,
            signal_id: signal.id,
            lane_name: signal.id,
            note: `Police confirmed ${signal.id} is clear`
          }
        },
        ...prev
      ].slice(0, 20)));
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDashboard = async () => {
    try {
      const [activeRes, historyRes, laneHistoryRes] = await Promise.allSettled([
        apiClient.get('/emergencies/active'),
        apiClient.get('/emergencies/history'),
        apiClient.get('/police/lane-clearance/history')
      ]);

      if (activeRes.status === 'fulfilled') {
        const emergenciesMap = {};
        activeRes.value.data.forEach((em) => {
          if (em.status === 'active') {
            emergenciesMap[em._id] = em;
          }
        });
        setActiveEmergencies(emergenciesMap);
      }

      if (historyRes.status === 'fulfilled') {
        const history = historyRes.value.data.map((em) => ({
          ...em,
          resolved_at: em.end_time || em.updatedAt || em.createdAt
        }));
        setResolvedHistory(history.slice(0, 20));
      }

      if (laneHistoryRes.status === 'fulfilled') {
        const laneRecords = laneHistoryRes.value.data.map((entry) => ({
          ...entry,
          cleared_at: entry.createdAt || entry.updatedAt
        }));
        setLaneHistory(laneRecords.slice(0, 20));
        setClearedLaneKeys(
          laneRecords
            .filter((entry) => !entry.legacy)
            .map((entry) => toLaneKeyFromHistory(entry))
        );
      }

      setLastSyncedAt(new Date().toISOString());
      setSyncError('');
    } catch (err) {
      console.error(err);
      setSyncError('Manual refresh failed. Cached data is still shown.');
    }
  };

  const submitCongestion = async () => {
    try {
      await apiClient.post('/traffic/input', {
        location: currentEmergency?.ambulance_location || currentEmergency?.current_location || { lat: 12.9716, lng: 77.5946 },
        congestion_level: Number(congestionLevel),
        emergency_id: currentEmergency?.emergency_id || currentEmergency?._id
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 w-fit">
            Traffic Control
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white flex items-center gap-3 sm:text-4xl">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
            Traffic Control Command
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Monitor live corridors and manage intersections overrides</p>
          <p className="mt-1 text-xs text-slate-500">
            {lastSyncedAt ? `Last sync: ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Waiting for first sync...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshDashboard}
            className="action-button action-button--secondary px-4 py-2"
          >
            Refresh
          </button>
          <div className="surface-card surface-card--soft px-6 py-3 flex items-center gap-4 shadow-inner">
            <div className={`w-3 h-3 rounded-full ${activeCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="font-semibold text-slate-300">
              {activeCount} Active {activeCount === 1 ? 'Emergency' : 'Emergencies'}
            </span>
          </div>
        </div>
      </header>

      {syncError && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl text-sm">
          {syncError}
        </div>
      )}

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel-card col-span-1 overflow-y-auto flex flex-col gap-4">
          <h3 className="font-semibold border-b border-white/10 pb-2 text-slate-100 sticky top-0 bg-slate-950/80 py-2 z-10 backdrop-blur">
            Active Overrides
          </h3>

          {currentEmergency ? (
            <div className="surface-card surface-card--soft p-4 space-y-4 border-red-500/25">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-red-300/90 font-bold mb-1">Active Override</div>
                  <div className="text-white font-semibold text-base">
                    {currentEmergency.hospital_name || currentEmergency.hospital_code || 'Assigned destination'}
                  </div>
                  {currentEmergency.incident_note && (
                    <div className="text-xs text-amber-200 mt-1">{currentEmergency.incident_note}</div>
                  )}
                </div>
                <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-700 rounded-md px-2 py-1">
                  #{currentEmergency.emergency_id?.slice(-4) || currentEmergency._id?.slice(-4)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Pending</div>
                  <div className="text-lg font-bold text-amber-300">{pendingSignals.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Status</div>
                  <div className={`text-sm font-semibold ${pendingSignals.length === 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {pendingSignals.length === 0 ? 'Corridor Cleared' : 'Action Required'}
                  </div>
                </div>
              </div>

              {pendingSignals.length === 0 ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  All planned lane clearances are complete.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSignals.map((sig) => {
                    const laneKey = getLaneKey(currentEmergency, sig.id);
                    const isCleared = clearedLaneKeys.includes(laneKey);

                    return (
                      <div key={laneKey} className="flex items-center gap-3 text-sm rounded-2xl border border-white/10 bg-white/5 p-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-slate-100 font-medium">{sig.id}</div>
                          <div className="text-[11px] text-slate-400">Priority lane</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearLane(currentEmergency, sig)}
                          disabled={isCleared}
                          className="action-button ml-auto px-3 py-1.5 text-xs bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20 disabled:bg-white/5 disabled:text-slate-500"
                        >
                          {isCleared ? 'Cleared' : 'Clear Lane'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Radio className="w-12 h-12 mb-3 opacity-20" />
              <p>No active emergencies</p>
            </div>
          )}

          <div className="surface-card surface-card--soft p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Resolved History</h4>
            {resolvedHistory.length === 0 ? (
              <div className="text-xs text-slate-500">No resolved emergencies in this session.</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {resolvedHistory.map((em) => (
                  <div key={`history-${em.emergency_id || em._id}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-emerald-300">Resolved #{(em.emergency_id || em._id)?.slice(-4)}</span>
                      <span>{new Date(em.resolved_at).toLocaleTimeString()}</span>
                    </div>
                    {em.incident_note && (
                      <div className="text-slate-400 mt-1">{em.incident_note}</div>
                    )}
                    <div className="text-slate-500 mt-1">Final ETA: {em.eta || '--'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-card surface-card--soft p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Lane Clearance History</h4>
            {laneHistory.length === 0 ? (
              <div className="text-xs text-slate-500">No lane clearance actions recorded yet.</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {laneHistory.map((entry) => (
                  <div key={`lane-${entry._id || entry.createdAt}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-cyan-300">
                        {entry.legacy ? 'Legacy clearance plan' : 'Lane cleared'}
                      </span>
                      <span>{new Date(entry.cleared_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-400 mt-1">{entry.message}</div>
                    <div className="text-slate-500 mt-1">
                      {entry.payload?.signal_id || entry.payload?.lane_name || '--'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-card surface-card--soft p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Manual Congestion Input</h4>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={congestionLevel}
              onChange={(e) => setCongestionLevel(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-slate-300">Congestion Level: {congestionLevel}%</div>
            <button
              disabled={!currentEmergency}
              onClick={submitCongestion}
              className="action-button action-button--primary w-full justify-center py-2 disabled:bg-white/5"
            >
              Submit Traffic Update
            </button>
          </div>
        </div>

        <div className="map-shell col-span-1 p-1 relative h-[600px] lg:col-span-2 lg:h-auto">
          <LiveMap
            route={currentEmergency?.route || []}
            ambulanceCoords={currentEmergency?.ambulance_location || currentEmergency?.current_location}
          />
        </div>
      </div>
    </div>
  );
};

export default PoliceDashboard;
