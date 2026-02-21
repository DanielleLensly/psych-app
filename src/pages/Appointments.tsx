import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment, Patient } from '../types';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import AppointmentModal from '../components/AppointmentModal';

interface AppointmentWithPatient extends Appointment {
  profiles?: {
    full_name: string;
  };
}

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patient_id: '',
    type: 'Consultation',
    duration: 60,
    status: 'Scheduled',
    date: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch patients for the dropdown
      const { data: patientsData, error: patientsError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // If we have default patient, set it
      if (patientsData && patientsData.length > 0 && !formData.patient_id) {
        setFormData(prev => ({ ...prev, patient_id: patientsData[0].id }));
      }

      // Fetch all appointments
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('date', { ascending: true }); // Order upcoming first could be handled here or manually

      if (aptError) throw aptError;

      // Filter out past appointments easily or just sort them
      const sortedApts = (aptData || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAppointments(sortedApts as AppointmentWithPatient[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.patient_id) {
      alert('Please select a patient');
      return;
    }
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([{
          ...formData
        }]);

      if (error) throw error;
      setIsCreating(false);
      fetchData();
      // Reset form but keep defaults mostly
      setFormData({
        patient_id: patients.length > 0 ? patients[0].id : '',
        type: 'Consultation',
        duration: 60,
        status: 'Scheduled',
        date: new Date().toISOString().slice(0, 16)
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-50 border-green-100';
      case 'Cancelled': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      case 'Cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Layout title="Appointments" subtitle="Manage patient sessions and schedule">

      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-slate-800 text-lg">All Appointments</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">New Appointment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Patient</label>
              <select
                value={formData.patient_id}
                onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || 'Unnamed Patient'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.date?.split('T')[0] || ''}
                onChange={e => {
                  const newDate = e.target.value;
                  const currentTime = formData.date?.includes('T') ? formData.date.split('T')[1].substring(0, 5) : '09:00';
                  setFormData({ ...formData, date: `${newDate}T${currentTime}` });
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
              <select
                value={formData.date?.includes('T') ? formData.date.split('T')[1].substring(0, 5) : '09:00'}
                onChange={e => {
                  const newTime = e.target.value;
                  const currentDate = formData.date?.split('T')[0] || new Date().toISOString().split('T')[0];
                  setFormData({ ...formData, date: `${currentDate}T${newTime}` });
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {Array.from({ length: 21 }, (_, i) => {
                  const h = Math.floor(i / 2) + 8;
                  const m = i % 2 === 0 ? '00' : '30';
                  return `${h.toString().padStart(2, '0')}:${m}`;
                }).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Consultation">Consultation</option>
                <option value="Therapy">Therapy</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Assessment">Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration (min)</label>
              <select
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
                <option value={120}>120</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes (Optional)</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={2}
                placeholder="Appointment notes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              Save Appointment
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Calendar className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No appointments scheduled.</p>
            <p className="text-slate-400 text-sm mt-1">Click the button above to book a new session.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map(apt => (
              <div
                key={apt.id}
                className="group flex items-start justify-between p-5 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => setSelectedAppointment(apt)}
              >
                <div className="flex gap-5">
                  <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 shrink-0">
                    <span className="text-xs font-bold uppercase">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-bold leading-none">{new Date(apt.date).getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4
                        className="font-bold text-slate-800 hover:text-blue-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/patients/${apt.patient_id}`);
                        }}
                      >
                        {apt.profiles?.full_name || 'Unknown Patient'}
                      </h4>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-medium ${getStatusColor(apt.status)}`}>
                        {getStatusIcon(apt.status)}
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                      <span className="font-medium text-slate-700">{apt.type}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({apt.duration}m)
                      </span>
                    </div>
                    {apt.notes && (
                      <p className="text-sm text-slate-600 bg-white border border-slate-100 p-2.5 rounded-lg w-full max-w-2xl shadow-sm">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(apt.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete Appointment"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppointmentModal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onDelete={handleDelete}
        onUpdate={fetchData}
      />
    </Layout>
  );
}
