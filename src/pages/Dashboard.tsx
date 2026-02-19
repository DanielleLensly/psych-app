import { Users, Calendar, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import PatientNotes from '../components/PatientNotes';

export default function Dashboard() {
  return (
    <Layout title="Dashboard" subtitle="Welcome back">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Total Patients</h3>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">124</p>
          <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
            +3 this week
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Appointments</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">8</p>
          <p className="text-slate-600 text-sm mt-2">
            Scheduled for today
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Pending Notes</h3>
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">2</p>
          <p className="text-amber-600 text-sm mt-2">
            Action required
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Recent Patients</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium">
                  JD
                </div>
                <div>
                  <h4 className="font-medium text-slate-800">John Doe</h4>
                  <p className="text-sm text-slate-500">Last session: 2 days ago</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Profile
              </button>
            </div>
          ))}
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
