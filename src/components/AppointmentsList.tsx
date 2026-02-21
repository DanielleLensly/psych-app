import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { Plus, Calendar, Clock, Trash2, CheckCircle, XCircle, Download, Upload, ChevronDown } from 'lucide-react';
import AppointmentModal from './AppointmentModal';
import { exportService } from '../lib/exportService';
import { importService } from '../lib/importService';

interface AppointmentsListProps {
  patientId: string;
}

export default function AppointmentsList({ patientId }: AppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [formData, setFormData] = useState<Partial<Appointment>>({
    type: 'Consultation',
    duration: 60,
    status: 'Scheduled',
    date: new Date().toISOString().slice(0, 16) // Default to now
  });

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  async function fetchAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, profiles(full_name)')
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

  const handleExport = (format: 'excel' | 'pdf') => {
    const exportData = appointments.map(a => ({
      Date: new Date(a.date).toLocaleString(),
      Type: a.type,
      Duration: a.duration + ' min',
      Status: a.status,
      Notes: a.notes || 'N/A'
    }));

    if (format === 'excel') {
      exportService.exportToExcel(exportData, 'Appointments_History');
    } else if (format === 'pdf') {
      const headers = ['Date', 'Type', 'Duration', 'Status', 'Notes'];
      const rows = appointments.map(a => [
        new Date(a.date).toLocaleString(),
        a.type,
        a.duration + 'm',
        a.status,
        a.notes || 'N/A'
      ]);
      exportService.exportListToPDF(headers, rows, 'Appointments History', 'Appointments_History');
    }
    setShowExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await importService.importExcel(file);
        alert(`Successfully parsed ${data.length} appointments. (Logic for inserting records to database is pending)`);
        console.log('Imported Appointments Data:', data);
      } else {
        alert('Please upload an Excel file for bulk appointment import.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 transition-colors"
            title="Import from Excel"
          >
            <Upload className="w-4 h-4" /> Import
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-100 transition-colors"
              title="Export History"
            >
              <Download className="w-4 h-4" /> Export
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-20">
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Excel</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">PDF</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm transition-colors ml-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                className="w-full text-sm border rounded px-3 py-2 bg-white"
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
                className="w-full text-sm border rounded px-3 py-2 bg-white"
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
              <select
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full text-sm border rounded px-3 py-2 bg-white"
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
            <div
              key={apt.id}
              className="group flex items-start justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedAppointment(apt)}
            >
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(apt.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 transition-all"
                title="Delete Appointment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AppointmentModal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onDelete={handleDelete}
        onUpdate={fetchAppointments}
      />
    </div>
  );
}
