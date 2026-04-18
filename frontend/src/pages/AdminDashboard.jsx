import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Activity, Database, Shield, Users } from 'lucide-react';

const AdminDashboard = () => {
  const [selectedPanel, setSelectedPanel] = useState('users');
  const [analytics, setAnalytics] = useState({
    activeEmergencies: 0,
    totalEmergencies: 0,
    totalUsers: 0,
    trafficPoints: 0,
    totalRouteRecords: 0,
    logs: []
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
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
  }, []);

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

        <div className="metric-card flex items-center gap-4 border-t-2 border-cyan-400/70">
          <div className="metric-card__icon bg-cyan-500/10">
            <Activity className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Total Emergencies</div>
            <div className="text-3xl font-semibold text-white tracking-tight">{analytics.totalEmergencies}</div>
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
              <h3 className="text-xl font-bold text-white mb-4">Live Event Logs</h3>
              <div className="space-y-3 overflow-y-auto min-h-0">
                {(analytics.logs || []).length === 0 ? (
                  <div className="text-slate-500 text-sm">No live logs available.</div>
                ) : (
                  (analytics.logs || []).map((log) => (
                    <div key={log._id} className="p-3 rounded-lg border border-slate-700 bg-slate-800/40">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-200 font-semibold">{log.type}</div>
                        <div className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <div className="text-sm text-slate-300 mt-1">{log.message}</div>
                      <div className="text-xs text-slate-500 mt-1 capitalize">Actor: {log.actor_role}</div>
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
