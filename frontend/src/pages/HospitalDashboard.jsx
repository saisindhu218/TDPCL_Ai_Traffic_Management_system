import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import apiClient from '../utils/apiClient';
import { HeartPulse, Clock, Activity, Users, Save, Stethoscope } from 'lucide-react';

const SELECTED_HOSPITAL_KEY = 'selectedHospitalCode';

const HospitalDashboard = () => {
  const { socket } = useContext(SocketContext);
  const [incoming, setIncoming] = useState({});
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalCode, setSelectedHospitalCode] = useState(() => localStorage.getItem(SELECTED_HOSPITAL_KEY) || '');
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    area: '',
    lat: '',
    lng: '',
    contact_number: '',
    emergency_number: '',
    trauma_level: 'Level 2',
    available_beds: 0,
    icu_beds: 0,
    ventilators: 0,
    specialties: '',
    status: 'available',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (selectedHospitalCode) {
      localStorage.setItem(SELECTED_HOSPITAL_KEY, selectedHospitalCode);
    }
  }, [selectedHospitalCode]);

  useEffect(() => {
    setIsEditingProfile(false);
  }, [selectedHospitalCode]);

  useEffect(() => {
    const handleHospitalSelected = (event) => {
      if (event.detail) {
        setSelectedHospitalCode(event.detail);
      }
    };

    globalThis.addEventListener('hospital:selected', handleHospitalSelected);
    return () => globalThis.removeEventListener('hospital:selected', handleHospitalSelected);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [emergencyRes, hospitalRes] = await Promise.all([
          apiClient.get('/emergencies/active'),
          apiClient.get('/hospitals')
        ]);

        const emergenciesMap = {};
        emergencyRes.data.forEach((em) => {
          emergenciesMap[em._id] = em;
        });
        setIncoming(emergenciesMap);

        setHospitals(hospitalRes.data);
        if (hospitalRes.data.length > 0) {
          const preferredCode = hospitalRes.data.find((hospital) => hospital.code === selectedHospitalCode)?.code
            || localStorage.getItem(SELECTED_HOSPITAL_KEY)
            || hospitalRes.data[0].code;
          setSelectedHospitalCode(preferredCode);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadData();

    return undefined;
  }, [socket]);

  useEffect(() => {
    if (!socket || !selectedHospitalCode) {
      return undefined;
    }

    socket.emit('join_hospital', selectedHospitalCode);

    const onEmergencyResolved = (data) => {
      setIncoming((prev) => {
        const newAll = { ...prev };
        delete newAll[data.emergency_id];
        return newAll;
      });
    };

    const onHospitalAlert = (data) => {
      if (data.hospital_code && data.hospital_code !== selectedHospitalCode) {
        return;
      }

      setIncoming((prev) => ({
        ...prev,
        [data.emergency_id]: {
          ...prev[data.emergency_id],
          ...data
        }
      }));
    };

    socket.on('hospital_alert', onHospitalAlert);
    socket.on('emergency_resolved', onEmergencyResolved);

    return () => {
      socket.off('hospital_alert', onHospitalAlert);
      socket.off('emergency_resolved', onEmergencyResolved);
    };
  }, [socket, selectedHospitalCode]);

  useEffect(() => {
    if (!selectedHospitalCode || hospitals.length === 0) {
      return;
    }

    const selectedHospital = hospitals.find((hospital) => hospital.code === selectedHospitalCode);
    if (!selectedHospital) {
      return;
    }

    setForm({
      code: selectedHospital.code || '',
      name: selectedHospital.name || '',
      address: selectedHospital.address || '',
      area: selectedHospital.area || '',
      lat: selectedHospital.lat ?? '',
      lng: selectedHospital.lng ?? '',
      contact_number: selectedHospital.contact_number || '',
      emergency_number: selectedHospital.emergency_number || '',
      trauma_level: selectedHospital.trauma_level || 'Level 2',
      available_beds: selectedHospital.available_beds ?? 0,
      icu_beds: selectedHospital.icu_beds ?? 0,
      ventilators: selectedHospital.ventilators ?? 0,
      specialties: Array.isArray(selectedHospital.specialties) ? selectedHospital.specialties.join(', ') : '',
      status: selectedHospital.status || 'available',
      notes: selectedHospital.notes || ''
    });
  }, [selectedHospitalCode, hospitals]);

  const selectedHospital = hospitals.find((hospital) => hospital.code === selectedHospitalCode) || hospitals[0] || null;
  const getStatusClass = (status) => {
    if (status === 'available') {
      return 'bg-emerald-500/20 text-emerald-300';
    }

    if (status === 'busy') {
      return 'bg-amber-500/20 text-amber-300';
    }

    return 'bg-red-500/20 text-red-300';
  };

  const emergencyArray = Object.keys(incoming).map(key => incoming[key]);
  const hospitalEmergencyArray = emergencyArray.filter((emergency) => {
    if (!selectedHospitalCode) {
      return true;
    }

    return emergency.hospital_code === selectedHospitalCode;
  });

  const trackedEmergency = [...hospitalEmergencyArray]
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0] || null;

  const trackedAmbulanceCoords = trackedEmergency?.ambulance_location || trackedEmergency?.current_location || null;
  const trackedHospitalCoords = trackedEmergency?.destination || (selectedHospital ? { lat: selectedHospital.lat, lng: selectedHospital.lng } : null);
  const trackedRoute = trackedEmergency?.route || [];

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveHospital = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await apiClient.post('/hospitals', {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        available_beds: Number(form.available_beds),
        icu_beds: Number(form.icu_beds),
        ventilators: Number(form.ventilators),
        specialties: form.specialties
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });

      const refreshed = await apiClient.get('/hospitals');
      setHospitals(refreshed.data);
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100 w-fit">
            Hospital Operations
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white flex items-center gap-3 sm:text-4xl">
            <HeartPulse className="w-8 h-8 text-emerald-400" />
            Hospital Operations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">Maintain live hospital capacity, emergency contact details, and specialty coverage</p>
        </div>
        <div className="surface-card surface-card--soft px-6 py-4 flex items-center gap-6 shadow-inner z-10">
          <div className="text-center">
            <div className="text-emerald-300 text-xs font-bold uppercase tracking-[0.24em] mb-1">Hospitals</div>
            <div className="text-3xl font-semibold text-white">{hospitals.length}</div>
          </div>
          <div className="h-10 w-px bg-emerald-800"></div>
          <div className="text-center">
            <div className="text-emerald-300 text-xs font-bold uppercase tracking-[0.24em] mb-1">Incoming</div>
            <div className="text-3xl font-semibold text-white">{hospitalEmergencyArray.length}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 min-h-0 flex-1 xl:grid-cols-4">
        <div className="xl:col-span-2 panel-card overflow-y-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
              Hospital Profile
            </h3>
            <div className="flex items-center gap-2">
              {selectedHospital && (
                <div className={`text-[10px] uppercase px-2 py-1 rounded ${getStatusClass(selectedHospital.status)}`}>
                  {selectedHospital.status}
                </div>
              )}
              {selectedHospital && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile((prev) => !prev)}
                  className="action-button action-button--secondary px-3 py-2 text-xs"
                >
                  {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              )}
            </div>
          </div>

          {selectedHospital ? (
            <>
              {isEditingProfile ? (
                <form className="space-y-4" onSubmit={handleSaveHospital}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Code</span>
                      <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.code} onChange={(e) => handleFieldChange('code', e.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Hospital Name</span>
                      <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.name} onChange={(e) => handleFieldChange('name', e.target.value)} required />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Address</span>
                    <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.address} onChange={(e) => handleFieldChange('address', e.target.value)} required />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Area</span>
                      <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.area} onChange={(e) => handleFieldChange('area', e.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Trauma Level</span>
                      <select className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.trauma_level} onChange={(e) => handleFieldChange('trauma_level', e.target.value)}>
                        <option value="Level 1">Level 1</option>
                        <option value="Level 2">Level 2</option>
                        <option value="Level 3">Level 3</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Latitude</span>
                      <input type="number" step="any" className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.lat} onChange={(e) => handleFieldChange('lat', e.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Longitude</span>
                      <input type="number" step="any" className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.lng} onChange={(e) => handleFieldChange('lng', e.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                      <select className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                        <option value="available">available</option>
                        <option value="busy">busy</option>
                        <option value="full">full</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Available Beds</span>
                      <input type="number" className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.available_beds} onChange={(e) => handleFieldChange('available_beds', e.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">ICU Beds</span>
                      <input type="number" className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.icu_beds} onChange={(e) => handleFieldChange('icu_beds', e.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Ventilators</span>
                      <input type="number" className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.ventilators} onChange={(e) => handleFieldChange('ventilators', e.target.value)} />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Contact Number</span>
                      <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.contact_number} onChange={(e) => handleFieldChange('contact_number', e.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Emergency Number</span>
                      <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.emergency_number} onChange={(e) => handleFieldChange('emergency_number', e.target.value)} />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Specialties</span>
                    <input className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white" value={form.specialties} onChange={(e) => handleFieldChange('specialties', e.target.value)} placeholder="Trauma, Cardiology, Critical Care" />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Notes</span>
                    <textarea className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white min-h-[120px]" value={form.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} />
                  </label>

                  <button type="submit" disabled={saving} className="action-button action-button--primary w-full justify-center">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Hospital Details'}
                  </button>
                </form>
              ) : (
                <div className="surface-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10 bg-white/5">
                    <p className="text-xs uppercase tracking-wider text-emerald-300/80">Profile Summary</p>
                    <h4 className="text-xl font-semibold text-white mt-1">{selectedHospital.name}</h4>
                  </div>

                  <dl className="px-5 py-3 divide-y divide-slate-700/60">
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Hospital Code</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.code || '--'}</dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Area</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.area || '--'}</dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Address</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.address || '--'}</dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Capacity</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.available_beds} beds, {selectedHospital.icu_beds} ICU beds, {selectedHospital.ventilators} ventilators</dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Trauma Level</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.trauma_level || '--'}</dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Contact Numbers</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.contact_number || '--'} | Emergency: {selectedHospital.emergency_number || '--'}</dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Specialties</dt>
                      <dd className="text-sm text-slate-100">
                        {Array.isArray(selectedHospital.specialties) && selectedHospital.specialties.length > 0
                          ? selectedHospital.specialties.join(', ')
                          : '--'}
                      </dd>
                    </div>
                    <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm text-slate-400">Coordinates</dt>
                      <dd className="text-sm text-slate-100">{selectedHospital.lat}, {selectedHospital.lng}</dd>
                    </div>
                    {selectedHospital.notes && (
                      <div className="py-2 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4">
                        <dt className="text-sm text-slate-400">Notes</dt>
                        <dd className="text-sm text-slate-100">{selectedHospital.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400">No hospital selected.</div>
          )}
        </div>

        <div className="xl:col-span-2 grid grid-cols-1 gap-6 min-h-0">
          <div className="map-shell overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/60 bg-slate-900/70">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Live Location View</h3>
            </div>
            <div className="relative h-[300px] lg:h-[340px]">
              <LiveMap
                key={`${selectedHospitalCode || 'none'}-${trackedEmergency?._id || trackedEmergency?.emergency_id || 'idle'}`}
                route={trackedRoute}
                ambulanceCoords={trackedAmbulanceCoords}
                hospitalCoords={trackedHospitalCoords}
              />
            </div>
          </div>

          <div className="panel-card overflow-y-auto flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Inbound Units
              </h3>
              <div className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                {hospitalEmergencyArray.length} active
              </div>
            </div>

            {hospitalEmergencyArray.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 pt-10">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No incoming units for this hospital</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {hospitalEmergencyArray.map((em) => (
                  <div key={em.emergency_id || em._id} className="surface-card surface-card--soft p-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <span className="text-white font-semibold flex items-center gap-2">
                        Unit #{em.emergency_id?.slice(-4) || em._id?.slice(-4)}
                      </span>
                    </div>

                    {em.incident_note && (
                      <div className="pl-2 pr-1 mb-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                        {em.incident_note}
                      </div>
                    )}

                    <div className="mt-4 pl-2 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl p-2 border border-white/10 bg-white/5 flex flex-col items-center justify-center">
                        <Clock className="w-4 h-4 text-cyan-400 mb-1" />
                        <span className="text-lg font-bold text-white leading-none">{em.eta || '--'}</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase">ETA</span>
                      </div>
                      <div className="rounded-2xl p-2 border border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                        <Users className="w-4 h-4 text-rose-400 mb-1" />
                        <span className="text-xs font-semibold text-white leading-tight">Trauma Team</span>
                        <span className="text-[10px] text-emerald-400 mt-1 uppercase">Alerted</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
