import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, Patient, PersonalBlock } from '../types';
import Layout from '../components/Layout';
import AppointmentModal from '../components/AppointmentModal';
import BlockTimeModal from '../components/BlockTimeModal';

interface AppointmentWithPatient extends Appointment {
  profiles?: { full_name: string };
}

const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Block colour helpers ──────────────────────────────────────────────
const BLOCK_COLORS: Record<string, { dot: string; pill: string; row: string }> = {
  purple: { dot: 'bg-purple-500', pill: 'bg-purple-50 border-purple-200 text-purple-700', row: 'border-l-4 border-l-purple-400' },
  amber: { dot: 'bg-amber-500', pill: 'bg-amber-50  border-amber-200  text-amber-700', row: 'border-l-4 border-l-amber-400' },
  slate: { dot: 'bg-slate-500', pill: 'bg-slate-50  border-slate-200  text-slate-700', row: 'border-l-4 border-l-slate-400' },
  rose: { dot: 'bg-rose-500', pill: 'bg-rose-50   border-rose-200   text-rose-700', row: 'border-l-4 border-l-rose-400' },
  teal: { dot: 'bg-teal-500', pill: 'bg-teal-50   border-teal-200   text-teal-700', row: 'border-l-4 border-l-teal-400' },
};
function blockColor(color: string) { return BLOCK_COLORS[color] ?? BLOCK_COLORS.purple; }

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [blocks, setBlocks] = useState<PersonalBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<PersonalBlock | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [formData, setFormData] = useState<Partial<Appointment>>({
    patient_id: '',
    type: 'Consultation',
    duration: 60,
    status: 'Scheduled',
    date: new Date().toISOString().slice(0, 10),
  });
  const [formTime, setFormTime] = useState('09:00');

  useEffect(() => { fetchData(); }, [user?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: patientsData } = await supabase.from('profiles').select('*').order('full_name');
      setPatients(patientsData || []);
      if (patientsData?.length && !formData.patient_id) {
        setFormData(prev => ({ ...prev, patient_id: patientsData[0].id }));
      }

      const { data: aptData } = await supabase
        .from('appointments')
        .select('*, profiles(full_name)')
        .order('date', { ascending: true });

      setAppointments((aptData || []) as AppointmentWithPatient[]);

      // Fetch personal blocks for this user
      if (user) {
        const { data: blockData } = await supabase
          .from('personal_blocks')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        setBlocks((blockData || []) as PersonalBlock[]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.patient_id) { alert('Please select a patient'); return; }
    try {
      const fullDate = `${formData.date}T${formTime}`;
      await supabase.from('appointments').insert([{ ...formData, date: fullDate }]);
      setIsCreating(false);
      fetchData();
      setFormData({ patient_id: patients[0]?.id || '', type: 'Consultation', duration: 60, status: 'Scheduled', date: new Date().toISOString().slice(0, 10) });
      setFormTime('09:00');
    } catch (err) {
      console.error('Error creating appointment:', err);
      alert('Failed to create appointment');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await supabase.from('appointments').delete().eq('id', id);
      fetchData();
    } catch { alert('Failed to delete'); }
  }

  // ── Calendar helpers ──
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
  ];

  const statusPriority: Record<string, number> = { Scheduled: 3, Completed: 2, Cancelled: 1 };
  const dayStatusMap = new Map<string, string>();
  appointments.forEach(a => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = dayStatusMap.get(key);
    if (!existing || (statusPriority[a.status] ?? 0) > (statusPriority[existing] ?? 0)) {
      dayStatusMap.set(key, a.status);
    }
  });

  // Track which days have personal blocks
  const blockDaySet = new Set<string>();
  const blockColorMap = new Map<string, string>(); // day key → dominant block color
  blocks.forEach(b => {
    const d = new Date(b.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    blockDaySet.add(key);
    if (!blockColorMap.has(key)) blockColorMap.set(key, b.color);
  });

  function dayStatus(date: Date) {
    return dayStatusMap.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  }
  function dayBlockColor(date: Date) {
    return blockColorMap.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  }

  const dotColor = (status: string | undefined, selected: boolean) => {
    if (selected) return 'bg-white';
    if (status === 'Completed') return 'bg-green-500';
    if (status === 'Cancelled') return 'bg-red-500';
    return 'bg-blue-500';
  };

  // ── Lists ──
  const today = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.date) >= today && a.status === 'Scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingBlocks = blocks
    .filter(b => new Date(b.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const dayAppointments = selectedDay
    ? appointments.filter(a => isSameDay(new Date(a.date), selectedDay))
    : [];
  const dayBlocks = selectedDay
    ? blocks.filter(b => isSameDay(new Date(b.date), selectedDay))
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'Cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };
  const getRowAccent = (status: string) => {
    if (status === 'Completed') return 'border-l-4 border-l-green-400';
    if (status === 'Cancelled') return 'border-l-4 border-l-red-400';
    return 'border-l-4 border-l-blue-400';
  };
  const getBadgeColor = (status: string) => {
    if (status === 'Completed') return 'bg-green-50 border-green-200 text-green-700';
    if (status === 'Cancelled') return 'bg-red-50 border-red-200 text-red-700';
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };
  const getStatusIcon = (status: string) => {
    if (status === 'Completed') return <CheckCircle className="w-3.5 h-3.5" />;
    if (status === 'Cancelled') return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  // Shared appointment row renderer
  function AppointmentRow({ apt, showDate = true }: { apt: AppointmentWithPatient; showDate?: boolean }) {
    return (
      <div
        className={`group flex items-start justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors ${getRowAccent(apt.status)}`}
        onClick={() => setSelectedAppointment(apt)}
      >
        {showDate && (
          <div className={`flex flex-col items-center justify-center w-10 h-10 border rounded-lg shrink-0 text-center mr-3 ${getBadgeColor(apt.status)}`}>
            <span className="text-xs font-bold leading-none">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
            <span className="text-base font-bold leading-none">{new Date(apt.date).getDate()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{apt.profiles?.full_name || 'Unknown'}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {apt.duration}m · {apt.type}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${getStatusColor(apt.status)}`}>
            {getStatusIcon(apt.status)} {apt.status}
          </span>
          <button onClick={e => { e.stopPropagation(); handleDelete(apt.id); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Personal block row renderer
  function BlockRow({ block: b }: { block: PersonalBlock }) {
    const bc = blockColor(b.color);
    const d = new Date(b.date);
    return (
      <div
        className={`group flex items-start justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors ${bc.row}`}
        onClick={() => setSelectedBlock(b)}
      >
        <div className="flex gap-3 items-start flex-1 min-w-0">
          <div className={`flex flex-col items-center justify-center w-10 h-10 border rounded-lg shrink-0 text-center ${bc.pill}`}>
            <span className="text-xs font-bold leading-none">{d.toLocaleString('default', { month: 'short' })}</span>
            <span className="text-base font-bold leading-none">{d.getDate()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{b.label}</span>
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.duration < 60 ? `${b.duration}m` : `${b.duration / 60}h`}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ml-2 ${bc.pill}`}>
          Blocked
        </span>
      </div>
    );
  }

  return (
    <Layout title="Appointments" subtitle="Manage patient sessions and schedule">

      {/* ── Top bar ── */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-slate-800 text-lg">Schedule</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBlocking(true)}
            className="text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4" /> Block Time
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </button>
        </div>
      </div>

      {/* ── Booking form ── */}
      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">New Appointment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Patient</label>
              <select value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Unnamed Patient'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={formData.date || ''}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
              <select value={formTime} onChange={e => setFormTime(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                <option>Consultation</option><option>Therapy</option><option>Follow-up</option><option>Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration (min)</label>
              <select value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                <option value={30}>30</option><option value={60}>60</option><option value={90}>90</option><option value={120}>120</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none">
                <option>Scheduled</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes (Optional)</label>
              <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none" rows={2} placeholder="Appointment notes..." />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm">Save Appointment</button>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT — Upcoming list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-slate-100">
              <h4 className="font-semibold text-slate-800">
                {selectedDay ? `${selectedDay.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'Upcoming Sessions'}
              </h4>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="text-xs text-blue-500 hover:underline mt-0.5">
                  ← Back to upcoming
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading appointments...</div>
            ) : selectedDay ? (
              // ── Day drill-down ──
              (dayAppointments.length === 0 && dayBlocks.length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-sm">No appointments or blocks on this day.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dayAppointments.map(apt => <AppointmentRow key={apt.id} apt={apt} />)}
                  {dayBlocks.map(b => <BlockRow key={b.id} block={b} />)}
                </div>
              )
            ) : (upcoming.length === 0 && upcomingBlocks.length === 0) ? (
              <div className="p-8 text-center flex flex-col items-center text-slate-400">
                <Calendar className="w-10 h-10 mb-2 text-slate-200" />
                <p className="text-sm">No upcoming appointments.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Merge and sort appointments + blocks by date */}
                {[
                  ...upcoming.map(a => ({ type: 'apt' as const, date: new Date(a.date), data: a })),
                  ...upcomingBlocks.map(b => ({ type: 'block' as const, date: new Date(b.date), data: b })),
                ]
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map(item =>
                    item.type === 'apt'
                      ? <AppointmentRow key={`apt-${item.data.id}`} apt={item.data as AppointmentWithPatient} />
                      : <BlockRow key={`blk-${item.data.id}`} block={item.data as PersonalBlock} />
                  )
                }
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-slate-800 text-lg">{MONTHS[month]} {year}</h4>
              <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase py-1">{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((date, i) => {
                if (!date) return <div key={i} />;
                const isToday = isSameDay(date, today);
                const isSelected = selectedDay && isSameDay(date, selectedDay);
                const status = dayStatus(date);
                const bColor = dayBlockColor(date);
                return (
                  <button key={i} onClick={() => setSelectedDay(isSelected ? null : date)}
                    className={`relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-medium transition-all
                      ${isSelected ? 'bg-blue-600 text-white shadow-md' : isToday ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                    {date.getDate()}
                    {/* Dots row */}
                    <span className="absolute bottom-1.5 flex gap-0.5">
                      {status && (
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor(status, !!isSelected)}`} />
                      )}
                      {bColor && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : BLOCK_COLORS[bColor]?.dot ?? 'bg-purple-500'}`} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Scheduled</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Cancelled</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Blocked</span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-blue-50 border border-blue-200 inline-flex items-center justify-center text-blue-700 text-[10px] font-bold">T</span>
                Today
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Modals ── */}
      <AppointmentModal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onDelete={handleDelete}
        onUpdate={fetchData}
      />

      <BlockTimeModal
        isOpen={isBlocking || !!selectedBlock}
        onClose={() => { setIsBlocking(false); setSelectedBlock(null); }}
        block={selectedBlock}
        onSaved={fetchData}
        defaultDate={selectedDay?.toISOString().slice(0, 10)}
      />
    </Layout>
  );
}
