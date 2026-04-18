import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import apiClient from '../utils/apiClient';
import { Activity, Cpu, Zap } from 'lucide-react';

const INCIDENT_OPTIONS = [
  'Road traffic collision',
  'Cardiac chest pain',
  'Stroke symptoms',
  'Unconscious patient',
  'Severe bleeding',
  'Breathing distress',
  'Burn injury',
  'Multiple trauma'
];

const EMERGENCY_STEPS = [
  'Select the nearest hospital',
  'Start emergency trace',
  'Track live route updates',
  'End emergency and save history'
];

function distanceInKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function dedupeHistoryEntries(entries = []) {
  const seen = new Set();
  const uniqueEntries = [];

  entries.forEach((entry) => {
    const entryKey = String(entry._id);
    if (seen.has(entryKey)) {
      return;
    }

    seen.add(entryKey);
    uniqueEntries.push(entry);
  });

  return uniqueEntries;
}

function getEmergencyButtonLabel(status, actionLoading) {
  if (status === 'idle') {
    if (actionLoading) {
      return 'STARTING...';
    }
    return 'START EMERGENCY TRACE';
  }

  if (actionLoading) {
    return 'ENDING...';
  }

  return 'END EMERGENCY';
}

function getStepCardClass(isActiveStep, isCompletedStep) {
  if (isActiveStep) {
    return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100';
  }

  if (isCompletedStep) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  }

  return 'border-white/10 bg-white/5 text-slate-300';
}

function getStepBadgeClass(isActiveStep, isCompletedStep) {
  if (isActiveStep) {
    return 'bg-cyan-400 text-slate-900';
  }

  if (isCompletedStep) {
    return 'bg-emerald-400 text-slate-900';
  }

  return 'bg-slate-700 text-slate-300';
}

function getStepLabel(isActiveStep, isCompletedStep) {
  if (isActiveStep) {
    return 'Current';
  }

  if (isCompletedStep) {
    return 'Done';
  }

  return 'Pending';
}

async function loadAmbulanceHospitals({
  setHospitals,
  setSelectedHospitalId,
  setStartError,
  setHospitalLoading
}) {
  try {
    const res = await apiClient.get('/hospitals');
    setHospitals(res.data);
    if (res.data.length > 0) {
      setSelectedHospitalId((current) => current || res.data[0].code);
    }
  } catch (err) {
    console.error(err);
    setStartError('Unable to load hospitals. Please refresh and login again.');
  } finally {
    setHospitalLoading(false);
  }
}

async function loadAmbulanceEmergencyState({
  userId,
  setStatus,
  setEmergencyId,
  setRoute,
  setEta,
  setCongestionLevel,
  setAiWorkflow,
  setClearedSignals,
  setLocation,
  setHistory
}) {
  try {
    const [activeRes, historyRes] = await Promise.all([
      apiClient.get('/emergencies/active'),
      apiClient.get('/emergencies/history')
    ]);

    const activeMine = activeRes.data.find((em) => String(em.ambulance_id?._id || em.ambulance_id) === String(userId) && em.status === 'active');
    if (activeMine) {
      setStatus('active');
      setEmergencyId(activeMine._id);
      setRoute(activeMine.route || []);
      setEta(activeMine.eta || '--');
      setCongestionLevel(activeMine.congestion_level || 0);
      setAiWorkflow(activeMine.ai_workflow || []);
      setClearedSignals(activeMine.cleared_signals || []);
      if (activeMine.current_location) {
        setLocation(activeMine.current_location);
      }
    }

    const historyMine = historyRes.data
      .filter((em) => String(em.ambulance_id?._id || em.ambulance_id) === String(userId))
      .map((em) => ({
        ...em,
        resolved_at: em.end_time || em.updatedAt || em.createdAt
      }));
    setHistory(historyMine.slice(0, 20));
  } catch (err) {
    console.error(err);
  }
}

async function endAmbulanceEmergency({
  emergencyId,
  actionLoading,
  eta,
  incidentType,
  setActionLoading,
  setHistory,
  setStatus,
  setRoute,
  setEta,
  setCongestionLevel,
  setAiWorkflow,
  setClearedSignals,
  timerRef
}) {
  if (actionLoading) {
    return;
  }

  setActionLoading(true);
  try {
    const res = await apiClient.post('/emergency/end-emergency', {
      emergency_id: emergencyId
    });

    setHistory((prev) => {
      const nextHistory = dedupeHistoryEntries([
        {
          _id: res.data.emergency?._id || emergencyId,
          emergency_id: res.data.emergency?._id || emergencyId,
          status: 'resolved',
          eta: res.data.emergency?.eta || eta,
          incident_note: res.data.emergency?.incident_note || incidentType,
          resolved_at: res.data.emergency?.end_time || new Date().toISOString()
        },
        ...prev
      ]);

      return nextHistory.slice(0, 20);
    });

    setStatus('idle');
    setRoute([]);
    setEta('--');
    setCongestionLevel(0);
    setAiWorkflow([]);
    setClearedSignals([]);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  } catch (err) {
    console.error(err);
  } finally {
    setActionLoading(false);
  }
}

async function startAmbulanceEmergency({
  actionLoading,
  selectedHospital,
  location,
  incidentType,
  setStartError,
  setActionLoading,
  setStatus,
  setEmergencyId,
  setRoute,
  setEta,
  setCongestionLevel,
  setAiWorkflow,
  setClearedSignals,
  setIncidentType,
  setLocation,
  setHistory,
  endEmergency,
  timerRef
}) {
  if (actionLoading) {
    return;
  }

  setActionLoading(true);
  try {
    setStartError('');
    if (!selectedHospital) {
      setStartError('Select a hospital before starting emergency.');
      setActionLoading(false);
      return;
    }

    const incidentSummary = incidentType;

    const res = await apiClient.post('/emergency/start-emergency', {
      current_location: location,
      destination: {
        lat: selectedHospital.lat,
        lng: selectedHospital.lng
      },
      hospital_code: selectedHospital.code,
      incident_note: incidentSummary
    });

    const createdEmergency = res.data;

    setStatus('active');
    setEmergencyId(createdEmergency._id);
    setRoute(createdEmergency.route || []);
    setEta(createdEmergency.eta || '--');
    setCongestionLevel(createdEmergency.congestion_level || 0);
    setAiWorkflow(createdEmergency.ai_workflow || []);
    setClearedSignals(createdEmergency.cleared_signals || []);
    setIncidentType('');

    let currentStep = 0;
    const trackedRoute = createdEmergency.route || [];

    timerRef.current = setInterval(async () => {
      if (currentStep < trackedRoute.length) {
        const newLoc = trackedRoute[currentStep];
        setLocation(newLoc);
        await apiClient.post('/location/update-location', {
          emergency_id: createdEmergency._id,
          current_location: newLoc
        });
        currentStep += 1;
      } else {
        await endEmergency(createdEmergency._id);
      }
    }, 5000);

    setActionLoading(false);
  } catch (err) {
    console.error(err);
    setStartError(err.response?.data?.msg || 'Emergency start failed. Check backend and try again.');
    setActionLoading(false);
  }
}

/* eslint-disable sonarjs/cognitive-complexity, complexity */
const AmbulanceDashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [status, setStatus] = useState('idle');
  const [emergencyId, setEmergencyId] = useState(null);
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState('--');
  const [congestionLevel, setCongestionLevel] = useState(0);
  const [aiWorkflow, setAiWorkflow] = useState([]);
  const [clearedSignals, setClearedSignals] = useState([]);
  const [history, setHistory] = useState([]);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(localStorage.getItem('selectedHospitalCode') || '');
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [incidentType, setIncidentType] = useState('');
  const [startError, setStartError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    loadAmbulanceHospitals({
      setHospitals,
      setSelectedHospitalId,
      setStartError,
      setHospitalLoading
    });
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadAmbulanceEmergencyState({
        userId: user.id,
        setStatus,
        setEmergencyId,
        setRoute,
        setEta,
        setCongestionLevel,
        setAiWorkflow,
        setClearedSignals,
        setLocation,
        setHistory
      });
    }
  }, [user?.id]);

  const nearestHospital = hospitals.reduce((nearest, hospital) => {
    if (!nearest) {
      return hospital;
    }

    const nearestDistance = distanceInKm(location, nearest);
    const currentDistance = distanceInKm(location, hospital);
    return currentDistance < nearestDistance ? hospital : nearest;
  }, null);

  const selectedHospital = hospitals.find((hospital) => hospital.code === selectedHospitalId) || nearestHospital;
  const selectedHospitalDistance = selectedHospital ? distanceInKm(location, selectedHospital) : 0;
  const emergencyButtonLabel = getEmergencyButtonLabel(status, actionLoading);
  const showEmergencyButtonIcon = status === 'idle' && !actionLoading;
  const currentStepIndex = status === 'active' ? 2 : 0;

  useEffect(() => {
    if (selectedHospitalId) {
      localStorage.setItem('selectedHospitalCode', selectedHospitalId);
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const onRouteUpdate = (data) => {
      if (data.emergency_id !== emergencyId) {
        return;
      }
      setRoute(data.route || []);
      setEta(data.eta || '--');
      setCongestionLevel(data.congestion_level || 0);
      setAiWorkflow(data.ai_workflow || []);
      setClearedSignals(data.cleared_signals || []);
    };

    const onEmergencyResolved = (data) => {
      if (data.emergency_id !== emergencyId) {
        return;
      }

      setHistory((prev) => {
        const nextHistory = dedupeHistoryEntries([
          {
            _id: data.emergency_id,
            emergency_id: data.emergency_id,
            status: 'resolved',
            eta,
            incident_note: incidentType,
            resolved_at: new Date().toISOString()
          },
          ...prev
        ]);

        return nextHistory.slice(0, 20);
      });

      setStatus('idle');
      setRoute([]);
      setEta('--');
      setCongestionLevel(0);
      setAiWorkflow([]);
      setClearedSignals([]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    socket.on('route_update', onRouteUpdate);
    socket.on('emergency_resolved', onEmergencyResolved);

    return () => {
      socket.off('route_update', onRouteUpdate);
      socket.off('emergency_resolved', onEmergencyResolved);
    };
  }, [socket, emergencyId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const endEmergency = (id = emergencyId) => endAmbulanceEmergency({
    emergencyId: id,
    actionLoading,
    eta,
    incidentType,
    setActionLoading,
    setHistory,
    setStatus,
    setRoute,
    setEta,
    setCongestionLevel,
    setAiWorkflow,
    setClearedSignals,
    timerRef
  });

  const startEmergency = () => startAmbulanceEmergency({
    actionLoading,
    selectedHospital,
    location,
    incidentType,
    setStartError,
    setActionLoading,
    setStatus,
    setEmergencyId,
    setRoute,
    setEta,
    setCongestionLevel,
    setAiWorkflow,
    setClearedSignals,
    setIncidentType,
    setLocation,
    setHistory,
    endEmergency,
    timerRef
  });

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
            Ambulance Command
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ambulance Command
          </h1>
          <p className="mt-2 text-slate-400">Unit: {user.name}</p>
          <p className="mt-1 text-xs text-emerald-300">
            Nearest suggested hospital: {nearestHospital?.name || 'Loading...'}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {status === 'idle' && !hospitalLoading && (
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="w-full lg:w-72"
            >
              {hospitals.map((hospital) => (
                <option key={hospital.code} value={hospital.code}>
                  {hospital.name}
                  {nearestHospital?.code === hospital.code ? ' (Nearest)' : ''}
                </option>
              ))}
            </select>
          )}

          <div className="w-96">
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="mb-2 w-full"
              disabled={status !== 'idle'}
            >
              <option value="">Select incident type (optional)</option>
              {INCIDENT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <button
            onClick={status === 'idle' ? startEmergency : () => endEmergency()}
            disabled={actionLoading || (status === 'idle' && (hospitalLoading || !selectedHospital))}
            className={`action-button px-8 py-4 text-base lg:text-lg shadow-lg
              ${status === 'idle'
                ? 'action-button--danger text-white shadow-rose-500/20'
                : 'action-button--secondary text-slate-100 shadow-slate-950/20'}`}
          >
            {showEmergencyButtonIcon && <Zap className="w-6 h-6 animate-pulse" />}
            {emergencyButtonLabel}
          </button>
        </div>
      </header>

      {startError && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-sm">
          {startError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 flex-1 min-h-0 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
          <div className="map-shell p-1 flex flex-col relative h-[460px] md:h-[560px] lg:h-[620px]">
            {status === 'active' && (
              <div className="absolute top-4 left-4 z-20 bg-emerald-500/90 backdrop-blur text-white px-4 py-2 rounded-lg font-semibold shadow-lg animate-bounce duration-1000">
                Live Routing Active
              </div>
            )}
            <LiveMap
              key={`${status}-${emergencyId || 'none'}-${selectedHospitalId || 'auto'}`}
              route={status === 'active' ? route : []}
              ambulanceCoords={location}
              hospitalCoords={selectedHospital ? { lat: selectedHospital.lat, lng: selectedHospital.lng } : null}
            />
          </div>

          <div className="panel-card overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2 mb-4">Emergency History</h3>
            {history.length === 0 ? (
              <div className="text-slate-500 text-sm">No ended emergencies yet.</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-emerald-300">Resolved #{(item.emergency_id || item._id)?.slice(-4)}</span>
                      <span>{item.resolved_at ? new Date(item.resolved_at).toLocaleTimeString() : '--'}</span>
                    </div>
                    {item.incident_note && (
                      <div className="text-slate-400 mt-1">{item.incident_note}</div>
                    )}
                    <div className="text-slate-500 mt-1">Final ETA: {item.eta || '--'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel-card flex flex-col gap-6 overflow-y-auto min-h-0">
          <div className="surface-card surface-card--soft p-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Selected Hospital Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-400">Hospital</div>
                <div className="text-white font-semibold">{selectedHospital?.name || '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">Area</div>
                <div className="text-white font-semibold">{selectedHospital?.area || '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">Trauma Level</div>
                <div className="text-emerald-300 font-semibold">{selectedHospital?.trauma_level || '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">Available Beds</div>
                <div className="text-cyan-300 font-semibold">{selectedHospital?.available_beds ?? '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">Distance</div>
                <div className="text-amber-300 font-semibold">{selectedHospitalDistance.toFixed(2)} km</div>
              </div>
              <div>
                <div className="text-slate-400">Contact</div>
                <div className="text-white font-semibold">{selectedHospital?.contact_number || '--'}</div>
              </div>
            </div>
          </div>

          <div className="surface-card surface-card--soft p-4">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2 mb-4">Status Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="surface-card surface-card--soft p-4">
                <div className="text-sm text-slate-400 mb-1">Current State</div>
                <div className={`font-bold text-xl flex items-center gap-2 ${status === 'active' ? 'text-red-400' : 'text-emerald-400'}`}>
                  <Activity className="w-5 h-5" />
                  {status === 'active' ? 'EMERGENCY' : 'STANDBY'}
                </div>
              </div>
              <div className="surface-card surface-card--soft p-4">
                <div className="text-sm text-slate-400 mb-1">ETA to Hospital</div>
                <div className="font-bold text-xl text-cyan-400">{eta}</div>
                <div className="text-xs text-slate-400 mt-1">{selectedHospital?.name || '--'}</div>
              </div>
            </div>
          </div>

          <div className="surface-card surface-card--soft p-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Emergency Steps</h3>
            <div className="space-y-2">
              {EMERGENCY_STEPS.map((step, index) => {
                const isActiveStep = index === currentStepIndex;
                const isCompletedStep = status === 'active' && index < currentStepIndex;
                const stepCardClass = getStepCardClass(isActiveStep, isCompletedStep);
                const stepBadgeClass = getStepBadgeClass(isActiveStep, isCompletedStep);
                const stepLabel = getStepLabel(isActiveStep, isCompletedStep);

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${stepCardClass}`}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${stepBadgeClass}`}
                    >
                      {index + 1}
                    </div>
                    <span className="flex-1">{step}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      {stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {status === 'active' && (
            <>
              <div className="surface-card surface-card--soft p-4">
                <div className="text-sm text-slate-400 mb-1">Predicted Congestion</div>
                <div className="font-bold text-2xl text-amber-400">{congestionLevel}%</div>
              </div>

              <div className="mt-1">
                <h3 className="text-lg font-semibold text-emerald-400 border-b border-emerald-900 pb-2 mb-4">AI Corridors Cleared</h3>
                <div className="space-y-3">
                  {clearedSignals.map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                        <span className="text-emerald-100 font-medium">{sig.id}</span>
                      </div>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                        {sig.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-900 pb-2 mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5" /> AI Workflow
                </h3>
                <div className="space-y-2">
                  {aiWorkflow.length === 0 ? (
                    <div className="text-sm text-slate-500">Workflow steps will appear after emergency activation.</div>
                  ) : (
                    aiWorkflow.map((step, index) => (
                      <div key={step} className="text-sm bg-cyan-900/20 border border-cyan-500/20 p-3 rounded-lg text-cyan-100">
                        Step {index + 1}: {step}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmbulanceDashboard;
