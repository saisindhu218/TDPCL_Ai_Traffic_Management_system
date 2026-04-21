import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import apiClient from '../utils/apiClient';
import { Activity, Zap } from 'lucide-react';

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

function getHospitalOptionLabel(hospital, nearestHospitalCode) {
  if (!hospital) {
    return '';
  }

  return nearestHospitalCode === hospital.code
    ? `${hospital.name} (Nearest)`
    : hospital.name;
}

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

function formatSignalLaneLabel(signal) {
  const signalName = signal?.signal_name || signal?.id || 'Signal';
  const laneDirection = signal?.lane_direction || (signal?.from && signal?.to ? `${signal.from} to ${signal.to}` : 'Direction pending');

  if (signal?.id?.includes(' - ')) {
    return signal.id;
  }

  return `${signalName} - ${laneDirection}`;
}

function isDateToday(dateValue) {
  if (!dateValue) {
    return false;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  return parsed.toDateString() === now.toDateString();
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
  setStatus,
  setEmergencyId,
  setRoute,
  setEta,
  setCongestionLevel,
  setClearedSignals,
  setSelectedHospitalId,
  setActiveHospitalName,
  setLocation,
  setHistory,
  setTotalCompletedCount
}) {
  try {
    const [activeRes, historyRes] = await Promise.all([
      apiClient.get('/emergencies/active'),
      apiClient.get('/emergencies/history')
    ]);

    setHistory(historyRes.data);
    setTotalCompletedCount(historyRes.data.length);

    const activeMine = activeRes.data.find((em) => String(em.ambulance_id?._id || em.ambulance_id) === String(user?.id) && em.status === 'active');
    if (activeMine) {
      setStatus('active');
      setEmergencyId(activeMine._id);
      setRoute(activeMine.route || []);
      setEta(activeMine.eta || '--');
      setCongestionLevel(activeMine.congestion_level || 0);
      setClearedSignals(activeMine.cleared_signals || []);
      if (activeMine.hospital_code) {
        setSelectedHospitalId(activeMine.hospital_code);
      }
      setActiveHospitalName(activeMine.hospital_name || '');
    }
  } catch (err) {
    console.error(err);
  }
}

async function endAmbulanceEmergency({
  emergencyId,
  actionLoading,
  eta,
  incidentType,
  selectedHospital,
  activeHospitalName,
  setActionLoading,
  setHistory,
  setStatus,
  setRoute,
  setEta,
  setCongestionLevel,
  setClearedSignals,
  setActiveHospitalName,
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
          hospital_name: res.data.emergency?.hospital_name || activeHospitalName || selectedHospital?.name || '',
          hospital_code: res.data.emergency?.hospital_code || selectedHospital?.code || '',
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
    setClearedSignals([]);
    setActiveHospitalName('');
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
  useLiveGps,
  incidentType,
  setStartError,
  setActionLoading,
  setStatus,
  setEmergencyId,
  setRoute,
  setEta,
  setCongestionLevel,
  setClearedSignals,
  setSelectedHospitalId,
  setActiveHospitalName,
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

    const res = await apiClient.post(
      '/emergency/start-emergency',
      {
        current_location: location,
        destination: {
          lat: selectedHospital.lat,
          lng: selectedHospital.lng
        },
        hospital_code: selectedHospital.code,
        incident_note: incidentSummary
      },
      { timeout: 20000 }
    );

    const createdEmergency = res.data;

    setStatus('active');
    setEmergencyId(createdEmergency._id);
    setRoute(createdEmergency.route || []);
    setEta(createdEmergency.eta || '--');
    setCongestionLevel(createdEmergency.congestion_level || 0);
    setClearedSignals(createdEmergency.cleared_signals || []);
    setSelectedHospitalId(createdEmergency.hospital_code || selectedHospital.code);
    setActiveHospitalName(createdEmergency.hospital_name || selectedHospital.name || '');
    setIncidentType('');

    if (!useLiveGps) {
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
    }

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
  const [clearedSignals, setClearedSignals] = useState([]);
  const [history, setHistory] = useState([]);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(localStorage.getItem('selectedHospitalCode') || '');
  const [hospitalSearchInput, setHospitalSearchInput] = useState('');
  const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState(false);
  const [activeHospitalName, setActiveHospitalName] = useState('');
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [gpsSupported] = useState(() => typeof navigator !== 'undefined' && 'geolocation' in navigator);
  const [gpsState, setGpsState] = useState('checking');
  const [gpsError, setGpsError] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [startError, setStartError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [totalCompletedCount, setTotalCompletedCount] = useState(0);

  const timerRef = useRef(null);
  const geolocationWatchIdRef = useRef(null);
  const lastLocationSyncRef = useRef({ lat: null, lng: null, timestamp: 0 });
  const hospitalDropdownTimeoutRef = useRef(null);

  useEffect(() => {
    loadAmbulanceHospitals({
      setHospitals,
      setSelectedHospitalId,
      setStartError,
      setHospitalLoading
    });
  }, []);

  useEffect(() => {
    if (!gpsSupported) {
      setGpsState('unavailable');
      setGpsError('Device GPS is not supported in this browser.');
      return undefined;
    }

    const handleSuccess = (position) => {
      const nextLocation = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude)
      };

      if (!Number.isFinite(nextLocation.lat) || !Number.isFinite(nextLocation.lng)) {
        return;
      }

      setLocation(nextLocation);
      setGpsState('active');
      setGpsError('');
    };

    const handleError = (error) => {
      if (error?.code === error.PERMISSION_DENIED) {
        setGpsState('denied');
        setGpsError('Location access denied. Enable GPS permission to track device location.');
        return;
      }

      setGpsState('error');
      setGpsError('Unable to read GPS location. Check signal and browser permissions.');
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    });

    geolocationWatchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000
    });

    return () => {
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }
    };
  }, [gpsSupported]);

  useEffect(() => {
    if (status !== 'active' || !emergencyId) {
      return;
    }

    const now = Date.now();
    const lastLocation = lastLocationSyncRef.current;
    const lastCoordsAvailable = Number.isFinite(lastLocation.lat) && Number.isFinite(lastLocation.lng);
    const movedDistance = lastCoordsAvailable
      ? distanceInKm(location, { lat: lastLocation.lat, lng: lastLocation.lng })
      : Number.POSITIVE_INFINITY;
    const elapsedMs = now - lastLocation.timestamp;
    const shouldSync = !lastCoordsAvailable || movedDistance >= 0.01 || elapsedMs >= 10000;

    if (!shouldSync) {
      return;
    }

    lastLocationSyncRef.current = {
      lat: location.lat,
      lng: location.lng,
      timestamp: now
    };

    apiClient.post('/location/update-location', {
      emergency_id: emergencyId,
      current_location: location
    }).catch((err) => {
      console.error(err);
    });
  }, [status, emergencyId, location]);

  useEffect(() => {
    if (user?.id) {
      loadAmbulanceEmergencyState({
        setStatus,
        setEmergencyId,
        setRoute,
        setEta,
        setCongestionLevel,
        setClearedSignals,
        setSelectedHospitalId,
        setActiveHospitalName,
        setLocation,
        setHistory,
        setTotalCompletedCount
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
  const displayHospitalName = selectedHospital?.name || activeHospitalName || '--';
  const hospitalSearchTerm = hospitalSearchInput.trim().toLowerCase();
  const filteredHospitals = hospitals.filter((hospital) => {
    if (!hospitalSearchTerm) {
      return true;
    }

    const hospitalName = String(hospital.name || '').toLowerCase();
    const hospitalCode = String(hospital.code || '').toLowerCase();
    return hospitalName.includes(hospitalSearchTerm) || hospitalCode.includes(hospitalSearchTerm);
  });
  const selectedHospitalDistance = selectedHospital ? distanceInKm(location, selectedHospital) : 0;
  const emergencyButtonLabel = getEmergencyButtonLabel(status, actionLoading);
  const showEmergencyButtonIcon = status === 'idle' && !actionLoading;
  const currentStepIndex = status === 'active' ? 2 : 0;
  const completedEmergencyCount = Math.max(totalCompletedCount, history.length);
  const todaysEmergencyHistory = history.filter((item) => isDateToday( item.end_time || item.updatedAt || item.createdAt));

  useEffect(() => {
    const currentHospital = hospitals.find((hospital) => hospital.code === selectedHospitalId);
    if (currentHospital?.name) {
      setHospitalSearchInput(currentHospital.name);
    }
  }, [hospitals, selectedHospitalId]);

  useEffect(() => {
    if (selectedHospitalId) {
      localStorage.setItem('selectedHospitalCode', selectedHospitalId);
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    return () => {
      if (hospitalDropdownTimeoutRef.current) {
        clearTimeout(hospitalDropdownTimeoutRef.current);
      }
    };
  }, []);

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
      setClearedSignals(data.cleared_signals || []);
      if (data.hospital_code) {
        setSelectedHospitalId(data.hospital_code);
      }
      if (data.hospital_name) {
        setActiveHospitalName(data.hospital_name);
      }
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
            eta: data.eta || eta,
            incident_note: data.incident_note || incidentType,
            hospital_name: data.hospital_name || activeHospitalName || selectedHospital?.name || '',
            hospital_code: data.hospital_code || selectedHospital?.code || '',
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
      setClearedSignals([]);
      setActiveHospitalName('');
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
  }, [socket, emergencyId, eta, incidentType, activeHospitalName, selectedHospital]);

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
    selectedHospital,
    activeHospitalName,
    setActionLoading,
    setHistory,
    setStatus,
    setRoute,
    setEta,
    setCongestionLevel,
    setClearedSignals,
    setActiveHospitalName,
    timerRef
  });

  useEffect(() => {
    setTotalCompletedCount((prev) => Math.max(prev, history.length));
  }, [history.length]);

  const startEmergency = () => startAmbulanceEmergency({
    actionLoading,
    selectedHospital,
    location,
    useLiveGps: gpsSupported && gpsState === 'active',
    incidentType,
    setStartError,
    setActionLoading,
    setStatus,
    setEmergencyId,
    setRoute,
    setEta,
    setCongestionLevel,
    setClearedSignals,
    setSelectedHospitalId,
    setActiveHospitalName,
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
          <p className="mt-2 text-slate-400">Unit: {user?.name || 'Ambulance Unit'}</p>
          <p className="mt-1 text-xs text-emerald-300">
            Nearest suggested hospital: {nearestHospital?.name || 'Loading...'}
          </p>
          <p className={`mt-1 text-xs ${gpsState === 'active' ? 'text-cyan-300' : 'text-amber-300'}`}>
            GPS: {gpsState === 'active' ? 'Live device tracking active' : gpsError || 'Attempting to get device location...'}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {!hospitalLoading && (
            <div className="relative w-full lg:w-72">
              <input
                value={hospitalSearchInput}
                onFocus={() => {
                  if (status !== 'idle') {
                    return;
                  }
                  setHospitalDropdownOpen(true);
                }}
                onBlur={() => {
                  if (status !== 'idle') {
                    return;
                  }
                  hospitalDropdownTimeoutRef.current = setTimeout(() => {
                    setHospitalDropdownOpen(false);
                  }, 120);
                }}
                onChange={(event) => {
                  if (status !== 'idle') {
                    return;
                  }
                  const nextValue = event.target.value;
                  setHospitalSearchInput(nextValue);
                  setHospitalDropdownOpen(true);

                  const selectedByName = hospitals.find((hospital) => hospital.name.toLowerCase() === nextValue.trim().toLowerCase());
                  const selectedByCode = hospitals.find((hospital) => hospital.code.toLowerCase() === nextValue.trim().toLowerCase());
                  const matchedHospital = selectedByName || selectedByCode;

                  if (matchedHospital) {
                    setSelectedHospitalId(matchedHospital.code);
                  }
                }}
                placeholder="Search and select hospital"
                className="w-full"
                disabled={status !== 'idle'}
              />

              {status === 'idle' && hospitalDropdownOpen && (
                <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/95 shadow-xl backdrop-blur">
                  {filteredHospitals.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No hospital matches your search.</div>
                  ) : (
                    filteredHospitals.map((hospital) => (
                      <button
                        key={hospital.code}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setSelectedHospitalId(hospital.code);
                          setHospitalSearchInput(hospital.name);
                          setHospitalDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800/80"
                      >
                        <span>{hospital.name}</span>
                        <span className="text-[11px] text-slate-400">{nearestHospital?.code === hospital.code ? 'Nearest' : hospital.code}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
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
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4 gap-3">
              <h3 className="text-lg font-semibold text-slate-200">Emergency History</h3>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Today: {todaysEmergencyHistory.length}
                </div>
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Total: {completedEmergencyCount}
                </div>
              </div>
            </div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Today&apos;s Details</div>
            {todaysEmergencyHistory.length === 0 && (
              <div className="text-slate-500 text-sm mb-2">No emergencies completed today.</div>
            )}
            {todaysEmergencyHistory.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-4">
                {todaysEmergencyHistory.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-emerald-300">Resolved #{(item.emergency_id || item._id)?.slice(-4)}</span>
                      <span>{item.end_time ? new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                    </div>
                    <div className="mt-1 text-slate-400">Hospital: {item.hospital_name || item.hospital_code || 'Not specified'}</div>
                    {item.incident_note && (
                      <div className="text-slate-400 mt-1">{item.incident_note}</div>
                    )}
                    <div className="text-slate-500 mt-1">Final ETA: {item.eta || '--'} | Status: {item.status || 'resolved'}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent History</div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {history.filter(item => !isDateToday( item.end_time || item.updatedAt || item.createdAt)).length === 0 ? (
                <div className="text-slate-500 text-sm">No older emergencies found.</div>
              ) : (
                history.filter(item => !isDateToday( item.end_time || item.updatedAt || item.createdAt)).map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-cyan-300">Emergency #{(item.emergency_id || item._id)?.slice(-4)}</span>
                      <span>{item.end_time ? new Date(item.end_time).toLocaleDateString([], { month: 'short', day: '2-digit' }) : '--'}</span>
                    </div>
                    <div className="mt-1 text-slate-400">Hospital: {item.hospital_name || item.hospital_code || 'Not specified'}</div>
                    {item.incident_note && (
                      <div className="text-slate-400 mt-1">{item.incident_note}</div>
                    )}
                    <div className="text-slate-500 mt-1">Final ETA: {item.eta || '--'} | Status: {item.status || 'resolved'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="panel-card flex flex-col gap-6 overflow-y-auto min-h-0">
          <div className="surface-card surface-card--soft p-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Selected Hospital Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-400">Hospital</div>
                <div className="text-white font-semibold">{displayHospitalName}</div>
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
              <div className="surface-card surface-card--soft p-4 overflow-hidden">
                <div className="text-sm text-slate-400 mb-1">Current State</div>
                <div className={`font-bold text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap break-words ${status === 'active' ? 'text-red-400' : 'text-emerald-400'}`}>
                  <Activity className="w-5 h-5 shrink-0" />
                  {status === 'active' ? 'EMERGENCY' : 'STANDBY'}
                </div>
              </div>
              <div className="surface-card surface-card--soft p-4 overflow-hidden">
                <div className="text-sm text-slate-400 mb-1">ETA to Hospital</div>
                <div className="font-bold text-xl text-cyan-400">{eta}</div>
                <div className="text-xs text-slate-400 mt-1">{displayHospitalName}</div>
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
                        <div>
                          <div className="text-emerald-100 font-medium">{formatSignalLaneLabel(sig)}</div>
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                        {sig.status}
                      </span>
                    </div>
                  ))}
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
