import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { Plus, Calendar, Clock, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface AppointmentsListProps {
  patientId: string;
}

export default function AppointmentsList({ patientId }: AppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Appointment>>({
    type: 'Consultation',
    duration: 60,
    status: 'Scheduled',
    date: new Date().toISOString().slice(0, 16) // Default to now
  });

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  async function fetchAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patientId,
          ...formData
        }]);

      if (error) throw error;
      setIsCreating(false);
      fetchAppointments();
      // Reset form
      setFormData({
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
      fetchAppointments();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          Appointments
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Appointment
        </button>
      </div>

      {isCreating && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full text-sm border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full text-sm border rounded px-3 py-2"
              >
                <option value="Consultation">Consultation</option>
                <option value="Therapy">Therapy</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Assessment">Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration (min)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full text-sm border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-sm border rounded px-3 py-2"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-sm border rounded px-3 py-2"
                rows={2}
                placeholder="Appointment notes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              Save Appointment
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">No appointments recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <div key={apt.id} className="group flex items-start justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 rounded-lg border border-slate-100 text-slate-600">
                  <span className="text-xs font-bold uppercase">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-lg font-bold">{new Date(apt.date).getDate()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-800">{apt.type}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getStatusColor(apt.status)}`}>
                      {getStatusIcon(apt.status)}
                      {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({apt.duration}m)
                    </span>
                  </div>
                  {apt.notes && (
                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded block">
                      {apt.notes}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(apt.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 transition-all"
                title="Delete Appointment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
