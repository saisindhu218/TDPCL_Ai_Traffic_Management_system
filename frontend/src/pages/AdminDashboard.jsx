import React, { useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Activity, Database, Shield, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

function getEventTitle(type) {
  const titleByType = {
    EMERGENCY_STARTED: 'Emergency Started',
    LOCATION_UPDATED: 'Ambulance Location Updated',
    ROUTE_UPDATED: 'Route Re-Optimized',
    TRAFFIC_INPUT: 'Traffic Update Received',
    EMERGENCY_ENDED: 'Emergency Closed',
    LANE_CLEARED: 'Signal + Lane Cleared'
  };

  return titleByType[type] || 'System Event';
}

function getActorLabel(role) {
  const roleByLabel = {
    ambulance: 'Ambulance Team',
    police: 'Police Control',
    hospital: 'Hospital Team',
    admin: 'Admin Control',
    system: 'System'
  };

  return roleByLabel[role] || 'System';
}

function formatDuration(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes <= 0) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatEmergencyStartedSummary(payload) {
  if (payload.ride_from && payload.ride_to) {
    return `Trip started: ${payload.ride_from} to ${payload.ride_to}.`;
  }

  if (payload.hospital_name) {
    return `Emergency activated for ${payload.hospital_name}.`;
  }

  return 'Emergency activated.';
}

function formatLocationUpdatedSummary(payload) {
  if (payload.eta) {
    return `Ambulance position updated, latest ETA ${payload.eta}.`;
  }

  return 'Ambulance position updated.';
}

function formatTrafficSummary(payload) {
  return typeof payload.congestion_level === 'number'
    ? `Traffic congestion reported at ${payload.congestion_level}%.`
    : 'Traffic congestion update submitted.';
}

function formatEmergencyEndedSummary(payload) {
  const formattedDuration = formatDuration(payload.duration_minutes);
  if (payload.ride_from && payload.ride_to && formattedDuration) {
    return `Trip completed: ${payload.ride_from} to ${payload.ride_to} in ${formattedDuration}.`;
  }

  return 'Emergency marked as completed.';
}

function formatLaneClearedSummary(payload) {
  const lane = payload.signal_id || payload.lane_name;
  return lane ? `${lane} was marked clear by police control.` : 'A corridor checkpoint was cleared.';
}

function getEventSummary(log) {
  const payload = log?.payload || {};
  const formatterByType = {
    EMERGENCY_STARTED: formatEmergencyStartedSummary,
    LOCATION_UPDATED: formatLocationUpdatedSummary,
    ROUTE_UPDATED: () => 'AI updated the recommended route based on live conditions.',
    TRAFFIC_INPUT: formatTrafficSummary,
    EMERGENCY_ENDED: formatEmergencyEndedSummary,
    LANE_CLEARED: formatLaneClearedSummary
  };

  const formatter = formatterByType[log?.type];
  return formatter ? formatter(payload) : (log?.message || 'System event received.');
}

function getEventMeta(log) {
  const payload = log?.payload || {};
  const items = [];

  if (log?.emergency_id) {
    items.push(`Emergency #${String(log.emergency_id).slice(-4)}`);
  }

  if (payload.hospital_name) {
    items.push(`Hospital: ${payload.hospital_name}`);
  }

  if (payload.hospital_code) {
    items.push(`Code: ${payload.hospital_code}`);
  }

  if (payload.eta) {
    items.push(`ETA: ${payload.eta}`);
  }

  if (payload.ride_from && payload.ride_to) {
    items.push(`Route: ${payload.ride_from} -> ${payload.ride_to}`);
  }

  const formattedDuration = formatDuration(payload.duration_minutes);
  if (formattedDuration) {
    items.push(`Duration: ${formattedDuration}`);
  }

  if (typeof payload.congestion_level === 'number') {
    items.push(`Congestion: ${payload.congestion_level}%`);
  }

  if (payload.performed_by) {
    items.push(`By: ${payload.performed_by}`);
  }

  return items;
}

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [selectedPanel, setSelectedPanel] = useState('users');
  const [analytics, setAnalytics] = useState({
    activeEmergencies: 0,
    totalEmergencies: 0,
    totalUsers: 0,
    trafficPoints: 0,
    totalRouteRecords: 0,
    totalEvents: 0,
    logs: []
  });
  const [users, setUsers] = useState([]);
  const totalEventsDisplay = (() => {
    const apiTotal = Number(analytics.totalEvents);
    if (Number.isFinite(apiTotal) && apiTotal > 0) {
      return apiTotal;
    }

    const visibleLogs = Array.isArray(analytics.logs) ? analytics.logs.length : 0;
    const emergencies = Number(analytics.totalEmergencies) || 0;
    return visibleLogs + emergencies;
  })();

  useEffect(() => {
    if (user?.role !== 'admin') {
      return undefined;
    }

    const fetchAdminData = async () => {
      try {
        const [analyticsRes, usersRes] = await Promise.all([
          apiClient.get('/admin/analytics'),
          apiClient.get('/admin/users')
        ]);

        setAnalytics(analyticsRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAdminData();
    const refreshTimer = setInterval(fetchAdminData, 10000);

    return () => clearInterval(refreshTimer);
  }, [user?.role]);

  if (user?.role && user.role !== 'admin') {
    return (
      <div className="dashboard-page">
        <header className="dashboard-hero flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">System Administration</h1>
          <p className="max-w-2xl text-sm text-slate-400 sm:text-base">Admin access only.</p>
        </header>
        <div className="panel-card text-slate-300">
          You do not have permission to view admin analytics from this account.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3 sm:text-4xl">
          <Shield className="w-8 h-8 text-purple-500" />
          System Administration
        </h1>
        <p className="max-w-2xl text-sm text-slate-400 sm:text-base">Platform analytics and system health</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="metric-card flex items-center gap-4 border-t-2 border-purple-400/70">
          <div className="metric-card__icon bg-purple-500/10">
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Active Emergencies</div>
            <div className="text-3xl font-semibold text-white tracking-tight">{analytics.activeEmergencies}</div>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4 border-t-2 border-sky-400/70">
          <div className="metric-card__icon bg-sky-500/10">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">System Users</div>
            <div className="text-3xl font-semibold text-white tracking-tight">{analytics.totalUsers}</div>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4 border-t-2 border-emerald-400/70">
          <div className="metric-card__icon bg-emerald-500/10">
            <Database className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Traffic Points</div>
            <div className="text-3xl font-semibold text-emerald-300 tracking-tight">{analytics.trafficPoints}</div>
          </div>
        </div>

        <div className="metric-card flex flex-col gap-2 border-t-2 border-cyan-400/70">
          <div className="flex items-center gap-4">
            <div className="metric-card__icon bg-cyan-500/10">
              <Activity className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400 font-medium">Total Emergencies (All Time)</div>
              <div className="text-2xl font-semibold text-white tracking-tight">{analytics.totalEmergencies}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-2">
            <div className="text-xs text-emerald-400 font-medium">Completed (Resolved):</div>
            <div className="text-lg font-semibold text-emerald-300">{analytics.completedEmergencies}</div>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4 border-t-2 border-amber-400/70">
          <div className="metric-card__icon bg-amber-500/10">
            <Activity className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Route Replans</div>
            <div className="text-3xl font-semibold text-white tracking-tight">{analytics.totalRouteRecords}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 flex-1 min-h-0 lg:grid-cols-2">
        <div className="panel-card lg:col-span-2">
          <div className="panel-title mb-3">Admin Options</div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedPanel('users')}
              className={`action-button ${selectedPanel === 'users' ? 'action-button--primary' : 'action-button--secondary'}`}
            >
              System Users
            </button>
            <button
              type="button"
              onClick={() => setSelectedPanel('logs')}
              className={`action-button ${selectedPanel === 'logs' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100' : 'action-button--secondary'}`}
            >
              Live Event Logs
            </button>
          </div>
        </div>

        <div className="panel-card overflow-hidden flex flex-col lg:col-span-2 min-h-0">
          {selectedPanel === 'users' ? (
            <>
              <h3 className="text-xl font-bold text-white mb-4">System Users</h3>
              <div className="table-shell overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-sm">
                      <th className="pb-3 pt-2 px-4 font-semibold">Name</th>
                      <th className="pb-3 pt-2 px-4 font-semibold">Email</th>
                      <th className="pb-3 pt-2 px-4 font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-8 text-slate-500">No users found.</td>
                      </tr>
                    ) : users.map((u) => (
                      <tr key={u._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4 text-white">{u.name}</td>
                        <td className="py-4 px-4 text-slate-300">{u.email}</td>
                        <td className="py-4 px-4 text-cyan-300 capitalize">{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-white">Live Event Logs</h3>
                <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                  Total Events (All Time): {totalEventsDisplay}
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto min-h-0">
                {(analytics.logs || []).length === 0 ? (
                  <div className="text-slate-500 text-sm">No live logs available.</div>
                ) : (
                  (analytics.logs || []).map((log) => (
                    <div key={log._id} className="p-3 rounded-lg border border-slate-700 bg-slate-800/40">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-100 font-semibold">{getEventTitle(log.type)}</div>
                        <div className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <div className="text-sm text-slate-300 mt-1">{getEventSummary(log)}</div>
                      {getEventMeta(log).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getEventMeta(log).map((item) => (
                            <span key={`${log._id}-${item}`} className="rounded-full border border-slate-600 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-300">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-2">Actor: {getActorLabel(log.actor_role)}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
