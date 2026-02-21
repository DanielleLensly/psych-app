import { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { Calendar, Clock, User, X, Edit2, Trash2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AppointmentWithPatient extends Appointment {
  profiles?: {
    full_name: string;
  };
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithPatient | null;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

type ModalMode = 'view' | 'edit' | 'reschedule';

const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AppointmentModal({ isOpen, onClose, appointment, onDelete, onUpdate }: AppointmentModalProps) {
  const [mode, setMode] = useState<ModalMode>('view');
  const [formData, setFormData] = useState<Partial<Appointment>>({});
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleDuration, setRescheduleDuration] = useState(60);

  useEffect(() => {
    if (appointment) {
      setFormData(appointment);
      setMode('view');
      setRescheduleDate(appointment.date?.split('T')[0] || '');
      setRescheduleTime(appointment.date?.includes('T') ? appointment.date.split('T')[1].substring(0, 5) : '09:00');
      setRescheduleDuration(appointment.duration || 60);
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

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

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ date: formData.date, type: formData.type, duration: formData.duration, status: formData.status, notes: formData.notes })
        .eq('id', appointment.id);
      if (error) throw error;
      setMode('view');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment');
    }
  };

  const handleConfirmReschedule = async () => {
    try {
      const newDatetime = `${rescheduleDate}T${rescheduleTime}`;
      const { error } = await supabase
        .from('appointments')
        .update({ date: newDatetime, duration: rescheduleDuration, status: 'Scheduled' })
        .eq('id', appointment.id);
      if (error) throw error;
      setMode('view');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Failed to reschedule appointment');
    }
  };

  const newDatetime = `${rescheduleDate}T${rescheduleTime}`;
  const dateChanged = rescheduleDate !== appointment.date.split('T')[0] || rescheduleTime !== appointment.date.split('T')[1]?.substring(0, 5);
  const hasChanged = dateChanged || rescheduleDuration !== appointment.duration;

  const headerTitle = mode === 'reschedule' ? 'Reschedule Appointment' : mode === 'edit' ? 'Edit Appointment' : 'Appointment Details';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {headerTitle}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">

          {/* ── VIEW MODE ── */}
          {mode === 'view' && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-400" />
                    {appointment.profiles?.full_name || 'Patient'}
                  </h4>
                  <p className="text-slate-500 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    {fmtDateTime(appointment.date)} · {appointment.duration} min
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full border flex items-center gap-1.5 text-sm font-medium ${getStatusColor(appointment.status)}`}>
                  {getStatusIcon(appointment.status)}
                  {appointment.status}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-1">Appointment Type</h5>
                <p className="text-slate-800 font-medium">{appointment.type}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes & Details</h5>
                {appointment.notes
                  ? <p className="text-slate-700 whitespace-pre-wrap text-sm">{appointment.notes}</p>
                  : <p className="text-slate-400 italic text-sm">No notes provided.</p>}
              </div>
            </div>
          )}

          {/* ── EDIT MODE ── */}
          {mode === 'edit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date?.split('T')[0] || ''}
                    onChange={e => {
                      const d = e.target.value;
                      const t = formData.date?.includes('T') ? formData.date.split('T')[1].substring(0, 5) : '09:00';
                      setFormData({ ...formData, date: `${d}T${t}` });
                    }}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
                  <select
                    value={formData.date?.includes('T') ? formData.date.split('T')[1].substring(0, 5) : '09:00'}
                    onChange={e => {
                      const t = e.target.value;
                      const d = formData.date?.split('T')[0] || new Date().toISOString().split('T')[0];
                      setFormData({ ...formData, date: `${d}T${t}` });
                    }}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
                  <select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white">
                    <option>Consultation</option>
                    <option>Therapy</option>
                    <option>Follow-up</option>
                    <option>Assessment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration (min)</label>
                  <select value={formData.duration || 60} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                    <option value={120}>120</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white">
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
                <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white" rows={3} />
              </div>
            </div>
          )}

          {/* ── RESCHEDULE MODE ── */}
          {mode === 'reschedule' && (
            <div className="space-y-5">
              {/* Pick new date/time */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-3">Select a new date and time:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={rescheduleDate}
                      onChange={e => setRescheduleDate(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
                    <select value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration (min)</label>
                    <select value={rescheduleDuration} onChange={e => setRescheduleDuration(parseInt(e.target.value))}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                      <option value={90}>90</option>
                      <option value={120}>120</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Before → After preview */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Summary of Change</p>
                </div>
                <div className="flex items-center p-4 gap-3">
                  {/* Old */}
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-red-500 uppercase mb-1">Current</p>
                    <p className="text-sm font-bold text-slate-700">{new Date(appointment.date).toLocaleDateString([], { dateStyle: 'medium' })}</p>
                    <p className="text-sm text-slate-500">{new Date(appointment.date).toLocaleTimeString([], { timeStyle: 'short' })} · {appointment.duration}m</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
                  {/* New */}
                  <div className={`flex-1 rounded-lg p-3 text-center border ${hasChanged ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`text-xs font-semibold uppercase mb-1 ${hasChanged ? 'text-green-600' : 'text-slate-400'}`}>New</p>
                    <p className="text-sm font-bold text-slate-700">
                      {rescheduleDate ? new Date(`${rescheduleDate}T12:00`).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                    </p>
                    <p className="text-sm text-slate-500">{rescheduleTime} · {rescheduleDuration}m</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {mode === 'view' && onDelete && (
              <button onClick={() => { onDelete(appointment.id); onClose(); }}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {mode === 'view' && (
              <>
                <button onClick={() => setMode('reschedule')}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Reschedule
                </button>
                <button onClick={() => setMode('edit')}
                  className="px-4 py-2 text-sm font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button onClick={onClose}
                  className="px-4 py-2 text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-colors">
                  Close
                </button>
              </>
            )}
            {mode === 'edit' && (
              <>
                <button onClick={() => setMode('view')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  Save Changes
                </button>
              </>
            )}
            {mode === 'reschedule' && (
              <>
                <button onClick={() => setMode('view')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={!rescheduleDate || !hasChanged}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Confirm Reschedule
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
