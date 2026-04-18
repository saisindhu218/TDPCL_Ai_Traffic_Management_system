import React, { useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';

const initialForm = {
  phone: '',
  date_of_birth: '',
  blood_group: '',
  address: '',
  driver_license_number: '',
  driver_license_expiry: '',
  ambulance_vehicle_number: '',
  ambulance_unit_code: '',
  years_of_experience: 0,
  shift_type: '',
  base_hospital: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  profile_note: ''
};

const AmbulanceProfile = () => {
  const [form, setForm] = useState(initialForm);
  const [savedProfile, setSavedProfile] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        const profile = res.data.ambulance_profile || {};
        const nextProfile = {
          ...initialForm,
          ...profile
        };

        setForm(nextProfile);
        setSavedProfile(nextProfile);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'years_of_experience' ? Number(value) : value
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await apiClient.put('/ambulance/profile', form);
      setSavedProfile(form);
      setIsEditing(false);
      setMessage('Profile saved successfully.');
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.msg || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-300">Loading ambulance profile...</div>;
  }

  const profileDisplay = savedProfile;

  return (
    <div className="dashboard-page max-w-5xl mx-auto">
      <header className="dashboard-hero">
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 sm:text-4xl">Ambulance Driver Profile</h1>
        <p className="max-w-2xl text-slate-400">Manage official driver and vehicle details used during emergency operations.</p>
      </header>

      <div className="panel-card space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-white">Saved Profile Information</h2>
            <p className="text-sm text-slate-400">These details are stored in MongoDB and used for emergency routing and contact reference.</p>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="action-button action-button--secondary px-4 py-2"
            >
              Close Edit Mode
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="action-button action-button--primary px-4 py-2"
            >
              Change Profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-card surface-card--soft p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Driver Details</div>
            <div className="space-y-1 text-sm text-slate-200">
              <div><span className="text-slate-400">Phone:</span> {profileDisplay.phone || '--'}</div>
              <div><span className="text-slate-400">Date of Birth:</span> {profileDisplay.date_of_birth || '--'}</div>
              <div><span className="text-slate-400">Blood Group:</span> {profileDisplay.blood_group || '--'}</div>
              <div><span className="text-slate-400">Experience:</span> {profileDisplay.years_of_experience || 0} years</div>
              <div><span className="text-slate-400">Shift:</span> {profileDisplay.shift_type || '--'}</div>
            </div>
          </div>

          <div className="surface-card surface-card--soft p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Vehicle Details</div>
            <div className="space-y-1 text-sm text-slate-200">
              <div><span className="text-slate-400">Ambulance No:</span> {profileDisplay.ambulance_vehicle_number || '--'}</div>
              <div><span className="text-slate-400">Unit Code:</span> {profileDisplay.ambulance_unit_code || '--'}</div>
              <div><span className="text-slate-400">Base Hospital:</span> {profileDisplay.base_hospital || '--'}</div>
              <div><span className="text-slate-400">License No:</span> {profileDisplay.driver_license_number || '--'}</div>
              <div><span className="text-slate-400">License Expiry:</span> {profileDisplay.driver_license_expiry || '--'}</div>
            </div>
          </div>

          <div className="surface-card surface-card--soft p-4 md:col-span-2">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Contact and Notes</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-200">
              <div>
                <div><span className="text-slate-400">Address:</span> {profileDisplay.address || '--'}</div>
                <div className="mt-2"><span className="text-slate-400">Emergency Contact Name:</span> {profileDisplay.emergency_contact_name || '--'}</div>
              </div>
              <div>
                <div><span className="text-slate-400">Emergency Contact Phone:</span> {profileDisplay.emergency_contact_phone || '--'}</div>
                <div className="mt-2"><span className="text-slate-400">Note:</span> {profileDisplay.profile_note || '--'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
      <form onSubmit={onSubmit} className="panel-card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="field-label">Phone</label>
            <input id="phone" name="phone" value={form.phone} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="field-label">Date of Birth</label>
            <input id="date_of_birth" type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="blood_group" className="field-label">Blood Group</label>
            <input id="blood_group" name="blood_group" value={form.blood_group} onChange={onChange} placeholder="e.g. O+" className="w-full" />
          </div>
          <div>
            <label htmlFor="years_of_experience" className="field-label">Years of Experience</label>
            <input id="years_of_experience" type="number" min="0" name="years_of_experience" value={form.years_of_experience} onChange={onChange} className="w-full" />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="field-label">Address</label>
          <textarea id="address" name="address" value={form.address} onChange={onChange} rows={2} className="w-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="driver_license_number" className="field-label">Driver License Number</label>
            <input id="driver_license_number" name="driver_license_number" value={form.driver_license_number} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="driver_license_expiry" className="field-label">License Expiry</label>
            <input id="driver_license_expiry" type="date" name="driver_license_expiry" value={form.driver_license_expiry} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="ambulance_vehicle_number" className="field-label">Ambulance Vehicle Number</label>
            <input id="ambulance_vehicle_number" name="ambulance_vehicle_number" value={form.ambulance_vehicle_number} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="ambulance_unit_code" className="field-label">Ambulance Unit Code</label>
            <input id="ambulance_unit_code" name="ambulance_unit_code" value={form.ambulance_unit_code} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="shift_type" className="field-label">Shift Type</label>
            <select id="shift_type" name="shift_type" value={form.shift_type} onChange={onChange} className="w-full">
              <option value="">Select shift</option>
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="rotational">Rotational</option>
            </select>
          </div>
          <div>
            <label htmlFor="base_hospital" className="field-label">Base Hospital</label>
            <input id="base_hospital" name="base_hospital" value={form.base_hospital} onChange={onChange} className="w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergency_contact_name" className="field-label">Emergency Contact Name</label>
            <input id="emergency_contact_name" name="emergency_contact_name" value={form.emergency_contact_name} onChange={onChange} className="w-full" />
          </div>
          <div>
            <label htmlFor="emergency_contact_phone" className="field-label">Emergency Contact Phone</label>
            <input id="emergency_contact_phone" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={onChange} className="w-full" />
          </div>
        </div>

        <div>
          <label htmlFor="profile_note" className="field-label">Profile Note</label>
          <textarea id="profile_note" name="profile_note" value={form.profile_note} onChange={onChange} rows={3} className="w-full" />
        </div>

        {message && <div className="text-sm text-cyan-300">{message}</div>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="action-button action-button--primary px-5 py-3">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="action-button action-button--secondary px-5 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

export default AmbulanceProfile;
