import { useState, useEffect } from 'react';
import { Users, Calendar, FileText, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PatientNotes from '../components/PatientNotes';
import { Profile } from '../types/index';

export default function Dashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('profiles')
          .select('*')
          .order('updated_at', { ascending: false });

        if (searchQuery) {
          query = query.ilike('full_name', `%${searchQuery}%`);
        }

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter]);

  return (
    <Layout title="Dashboard" subtitle="Welcome back">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Total Patients</h3>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{patients.length}</p>
          <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
            Active Records
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Appointments</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">0</p>
          <p className="text-slate-600 text-sm mt-2">
            Scheduled for today
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Pending Notes</h3>
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">0</p>
          <p className="text-amber-600 text-sm mt-2">
            Action required
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">Recent Patients</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="in-patient">In-Patient</option>
                  <option value="out-patient">Out-Patient</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No patients found.</div>
          ) : (
            patients.map((patient) => (
              <div key={patient.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium">
                    {patient.full_name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{patient.full_name || 'Unnamed Patient'}</h4>
                    <p className="text-sm text-slate-500">Last updated: {new Date(patient.updated_at || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Profile
                </button>
              </div>
            ))
          )}
        </div>
      </div>


      {/* Patient Notes - Encrypted */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
        <PatientNotes />

        {/* Placeholder for future features or additional encrypted data */}
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 p-8">
          <h3 className="font-medium text-slate-500 mb-2">Upcoming Feature</h3>
          <p className="text-sm text-center max-w-xs">
            More encrypted modules will be available here soon.
          </p>
        </div>
      </div>
    </Layout >
  );
}
