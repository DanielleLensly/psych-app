import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Phone, MapPin, Edit2, Save, X, Loader2, Download, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import PatientNotes from '../components/PatientNotes';
import PatientHistory from '../components/PatientHistory';
import ExportProfileModal from '../components/ExportProfileModal';
import { Patient } from '../types/index';
import { exportService } from '../lib/exportService';

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'history'>('notes');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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
    fetchPatient();
  }, [id]);

  async function fetchPatient() {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPatient(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!id || !patient) return;

    try {
      setSaving(true);
      const updates = {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        status: formData.status,
        mental_hospital_history: formData.mental_hospital_history,
        doctors_history: formData.doctors_history,
        date_of_birth: formData.date_of_birth,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPatient(data as Patient);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(patient || {});
    setIsEditing(false);
  };

  const handleExportProfile = (format: 'pdf' | 'word') => {
    if (!patient) return;

    // Construct HTML summary of patient profile
    const htmlContent = `
      <h2>Patient Profile: ${patient.full_name || 'N/A'}</h2>
      <p><strong>Status:</strong> ${patient.status === 'in-patient' ? 'In-Patient' : 'Out-Patient'}</p>
      <p><strong>Date of Birth:</strong> ${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}</p>
      <p><strong>Phone:</strong> ${patient.phone || 'N/A'}</p>
      <p><strong>Address:</strong> ${patient.address || 'N/A'}</p>
      <hr />
      <h3>Mental Hospital History</h3>
      <p>${patient.mental_hospital_history || 'None recorded'}</p>
      <h3>Doctors History</h3>
      <p>${patient.doctors_history || 'None recorded'}</p>
    `;

    if (format === 'word') {
      exportService.exportHtmlToWord(htmlContent, `Profile_${patient.full_name || 'Unknown'}`, `Patient Profile - ${patient.full_name}`);
    } else {
      exportService.exportHtmlToPDF(htmlContent, `Profile_${patient.full_name || 'Unknown'}`, `Patient Profile - ${patient.full_name}`);
    }
    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <Layout title="Patient Profile" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!patient) {
    // ... existing not found rendering
    return (
      <Layout title="Patient Not Found" subtitle="Error">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-slate-900">Patient not found</h3>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout
        title={isEditing ? 'Reference: ' + patient.full_name : (patient.full_name || 'Unknown Patient')}
        subtitle="Patient Details"
        actions={
          <div className="flex items-center gap-4">
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-20">
                  <button onClick={() => { setShowExportModal(true); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-blue-600 font-medium hover:bg-slate-50">Custom Full Export...</button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button onClick={() => handleExportProfile('pdf')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600">Quick Export as PDF</button>
                  <button onClick={() => handleExportProfile('word')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600">Quick Export as Word</button>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative">

              {/* Edit Toggle */}
              <div className="absolute top-4 right-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Save Changes"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  {patient.full_name ? <span className="text-3xl font-bold text-slate-400">{patient.full_name[0].toUpperCase()}</span> : <User className="w-12 h-12" />}
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="text-center text-xl font-bold text-slate-800 border-b border-blue-300 focus:outline-none focus:border-blue-600 bg-transparent w-full"
                    placeholder="Full Name"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-slate-800">{patient.full_name || 'Unnamed'}</h2>
                )}

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                  Active Patient
                </span>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                {/* DOB */}
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="text-sm border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    <span className="text-sm">
                      {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'DOB not set'}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="text-sm border rounded px-2 py-1 w-full"
                      placeholder="Phone Number"
                    />
                  ) : (
                    <span className="text-sm">{patient.phone || 'No phone provided'}</span>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  {isEditing ? (
                    <textarea
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="text-sm border rounded px-2 py-1 w-full resize-none"
                      placeholder="Address"
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm">{patient.address || 'No address provided'}</span>
                  )}
                </div>

                {/* Email (Read Only usually, but let's show it) */}
              </div>

              {/* Patient Status - In/Out Patient */}
              <div className="pt-4 border-t border-slate-50">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Patient Status
                </label>
                {isEditing ? (
                  <select
                    value={formData.status || 'out-patient'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="text-sm border rounded px-2 py-1 w-full"
                  >
                    <option value="out-patient">Out-Patient</option>
                    <option value="in-patient">In-Patient</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patient.status === 'in-patient' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {patient.status === 'in-patient' ? 'In-Patient' : 'Out-Patient'}
                  </span>
                )}
              </div>

              {/* Medical History Section */}
              <div className="pt-4 border-t border-slate-50 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                    Mental Hospital History
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.mental_hospital_history || ''}
                      onChange={e => setFormData({ ...formData, mental_hospital_history: e.target.value })}
                      className="text-sm border rounded px-2 py-1 w-full resize-none min-h-[80px]"
                      placeholder="List dates and hospitals..."
                    />
                  ) : (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.mental_hospital_history || 'None recorded'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                    Doctors History
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.doctors_history || ''}
                      onChange={e => setFormData({ ...formData, doctors_history: e.target.value })}
                      className="text-sm border rounded px-2 py-1 w-full resize-none min-h-[80px]"
                      placeholder="List previous doctors..."
                    />
                  ) : (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.doctors_history || 'None recorded'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs & Content Section */}
          <div className="lg:col-span-2 flex flex-col h-[600px]">



            {/* Tabs Header */}
            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg mb-4 w-fit">
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'notes'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Clinical Notes
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                History & Appointments
              </button>
            </div>

            {/* Wrapper for scrollable content */}
            <div className="flex-1 min-h-0">
              {activeTab === 'notes' ? (
                <PatientNotes patientId={id!} />
              ) : (
                <PatientHistory patientId={id!} />
              )}
            </div>
          </div>
        </div>
      </Layout>
      {showExportModal && patient && (
        <ExportProfileModal
          patient={patient}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}
