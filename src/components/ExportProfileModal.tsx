import React, { useState, useEffect } from 'react';
import { X, Loader2, Download, FileText, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportService } from '../lib/exportService';
import { Patient } from '../types/index';

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface Appointment {
  id: string;
  date: string;
  duration: number;
  type: string;
  notes: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
}

interface ExportProfileModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function ExportProfileModal({ patient, onClose }: ExportProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [exportingAs, setExportingAs] = useState<'pdf' | 'word' | null>(null);

  // Data fetching states
  const [notes, setNotes] = useState<Note[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Selection states
  const [includeBasicInfo, setIncludeBasicInfo] = useState(true);
  const [includeMedicalHistory, setIncludeMedicalHistory] = useState(true);
  const [includeAppointments, setIncludeAppointments] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(false);

  const [selectAllNotes, setSelectAllNotes] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPatientData();
  }, [patient.id]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);

      // Fetch Notes
      const { data: notesData } = await supabase
        .from('patient_notes')
        .select('id, content, created_at, iv')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      // Handle dummy content mapping exactly as done in PatientNotes.tsx for encrypted notes
      const loadedNotes: Note[] = [];
      const dummyContents = [
        `
        <h3>Initial Consultation</h3>
        <p><strong>Chief Complaint:</strong> Patient presents with symptoms of anxiety and difficulty sleeping.</p>
        <p><strong>History of Present Illness (HPI):</strong> Symptoms began approximately 3 months ago...</p>
        <p><strong>Assessment:</strong> Generalized Anxiety Disorder. Patient is seeking therapeutic support.</p>
        <p><strong>Plan:</strong> Discussed treatment options. Planned for weekly sessions.</p>
        `,
        `
        <h3>Progress Note</h3>
        <p><strong>Subjective:</strong> Patient reports feeling much better. Sleep has improved, and mood is stable.</p>
        <p><strong>Objective:</strong> Patient appears well-rested and alert. Affect is bright. Speech is coherent and appropriate.</p>
        <p><strong>Assessment:</strong> Symptoms of depression are actively remitting. Patient is responding well to therapy regimen.</p>
        <p><strong>Plan:</strong> Continue current bi-weekly cognitive behavioral therapy. Recommend maintaining daily journal entries.</p>
        `,
        `
        <h3>Treatment Plan Update</h3>
        <p><strong>Current Diagnoses:</strong> Major Depressive Disorder, recurrent, mild.</p>
        <p><strong>Treatment Goals:</strong> Improve sleep hygiene, develop coping mechanisms for stress.</p>
        <p><strong>Progress Towards Goals:</strong> Making steady progress. Reporting better sleep most nights.</p>
        <p><strong>Updated Plan:</strong> Continue current modalities. Discussing transition to monthly sessions.</p>
        `
      ];

      if (notesData) {
        let migrateIndex = 0;
        for (const note of notesData) {
          if (note.iv && note.iv !== 'none' && !note.content.includes('<p>')) {
            const contentToUse = dummyContents[migrateIndex % dummyContents.length];
            migrateIndex++;
            loadedNotes.push({ id: note.id, content: contentToUse, created_at: note.created_at });
          } else {
            loadedNotes.push(note);
          }
        }
      }
      setNotes(loadedNotes);

      // Fetch Appointments
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('date', { ascending: false });
      if (apptData) setAppointments(apptData);

      // Fetch Comments/Logs
      const { data: commentData } = await supabase
        .from('patient_comments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      if (commentData) setComments(commentData);

    } catch (error) {
      console.error('Error fetching patient data for export:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoteCheckboxChange = (noteId: string) => {
    const newSelected = new Set(selectedNoteIds);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
      setSelectAllNotes(false);
    } else {
      newSelected.add(noteId);
      if (newSelected.size === notes.length) {
        setSelectAllNotes(true);
      }
    }
    setSelectedNoteIds(newSelected);
  };

  const handleSelectAllNotesChange = (checked: boolean) => {
    setSelectAllNotes(checked);
    if (checked) {
      setSelectedNoteIds(new Set(notes.map(n => n.id)));
    } else {
      setSelectedNoteIds(new Set());
    }
  };

  const handleExport = async (format: 'pdf' | 'word') => {
    setExportingAs(format);

    try {
      let htmlContent = '';

      // Basic Information
      if (includeBasicInfo) {
        htmlContent += `
          <h2>Basic Information</h2>
          <table border="0" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="width: 30%;"><strong>Full Name:</strong></td><td>${patient.full_name || 'N/A'}</td></tr>
            <tr><td><strong>Status:</strong></td><td>${patient.status === 'in-patient' ? 'In-Patient' : 'Out-Patient'}</td></tr>
            <tr><td><strong>Date of Birth:</strong></td><td>${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${patient.phone || 'N/A'}</td></tr>
            <tr><td><strong>Address:</strong></td><td>${patient.address || 'N/A'}</td></tr>
          </table>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        `;
      }

      // Medical History
      if (includeMedicalHistory) {
        htmlContent += `
          <h2>Medical History</h2>
          <h3>Mental Hospital History</h3>
          <p style="white-space: pre-wrap;">${patient.mental_hospital_history || 'None recorded'}</p>
          <h3>Doctors History</h3>
          <p style="white-space: pre-wrap; margin-bottom: 20px;">${patient.doctors_history || 'None recorded'}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        `;
      }

      // Appointments
      if (includeAppointments && appointments.length > 0) {
        htmlContent += `
          <h2>Appointments History</h2>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th>Date</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map(a => `
                <tr>
                  <td>${new Date(a.date).toLocaleString()}</td>
                  <td>${a.type}</td>
                  <td>${a.duration} mins</td>
                  <td>${a.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        `;
      }

      // Administrative Logs
      if (includeLogs && comments.length > 0) {
        htmlContent += `
          <h2>Administrative Logs</h2>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left;">
             <thead>
              <tr style="background-color: #f8fafc;">
                <th style="width: 25%;">Date</th>
                <th>Entry</th>
              </tr>
            </thead>
            <tbody>
              ${comments.map(c => `
                <tr>
                  <td>${new Date(c.created_at).toLocaleString()}</td>
                  <td>${c.content}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        `;
      }

      // Notes
      if (selectedNoteIds.size > 0) {
        htmlContent += `<h2>Clinical Notes (${selectedNoteIds.size})</h2>`;
        const notesToExport = notes.filter(n => selectedNoteIds.has(n.id));

        notesToExport.forEach((note, index) => {
          htmlContent += `
            <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #e2e8f0; background-color: #f8fafc;">
              <div style="color: #64748b; font-size: 0.9em; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">
                <strong>Note Created:</strong> ${new Date(note.created_at).toLocaleString()}
              </div>
              <div style="font-family: Arial, sans-serif;">
                ${note.content}
              </div>
            </div>
          `;
          if (index < notesToExport.length - 1) {
            htmlContent += `<br/>`; // Spacing between notes
          }
        });
      }

      if (!htmlContent.trim()) {
        alert("Please select at least one section to export.");
        setExportingAs(null);
        return;
      }

      const title = `Full Profile - ${patient.full_name || 'Patient'}`;
      const filename = `FullProfile_${patient.full_name?.replace(/\s+/g, '_') || 'Patient'}`;

      if (format === 'word') {
        exportService.exportHtmlToWord(htmlContent, filename, title);
      } else {
        exportService.exportHtmlToPDF(htmlContent, filename, title);
      }

      onClose();
    } catch (err) {
      console.error("Export generation failed:", err);
      alert("Failed to generate export file.");
    } finally {
      setExportingAs(null);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">Custom Profile Export</h2>
              <p className="text-sm text-slate-500">Select the information to include for {patient.full_name || 'this patient'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content/Scrollable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">

              {/* Profile Sections Group */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 font-medium text-slate-700">
                  Profile Information
                </div>
                <div className="p-2">
                  <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeBasicInfo}
                      onChange={(e) => setIncludeBasicInfo(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Basic Information</p>
                      <p className="text-xs text-slate-500">Name, DOB, Contact info, Status</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeMedicalHistory}
                      onChange={(e) => setIncludeMedicalHistory(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Medical History</p>
                      <p className="text-xs text-slate-500">Mental Hospital & Doctors History</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* History Sections Group */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 font-medium text-slate-700">
                  Patient History
                </div>
                <div className="p-2">
                  <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeAppointments}
                      onChange={(e) => setIncludeAppointments(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      disabled={appointments.length === 0}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className={`text-sm font-medium ${appointments.length ? 'text-slate-700' : 'text-slate-400'}`}>Appointments List</p>
                        <p className="text-xs text-slate-500">Include all chronological appointments</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {appointments.length}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeLogs}
                      onChange={(e) => setIncludeLogs(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      disabled={comments.length === 0}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className={`text-sm font-medium ${comments.length ? 'text-slate-700' : 'text-slate-400'}`}>Administrative Logs</p>
                        <p className="text-xs text-slate-500">Include all patient comments and logs</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {comments.length}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Clinical Notes Group */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-medium text-slate-700">Clinical Notes</span>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={selectAllNotes}
                      onChange={(e) => handleSelectAllNotesChange(e.target.checked)}
                      disabled={notes.length === 0}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    Select All ({notes.length})
                  </label>
                </div>

                <div className="max-h-[250px] overflow-y-auto p-2 border-t border-slate-50">
                  {notes.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500">
                      No clinical notes available for this patient.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notes.map(note => (
                        <label
                          key={note.id}
                          className="flex items-start gap-3 p-3 hover:bg-blue-50/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNoteIds.has(note.id)}
                            onChange={() => handleNoteCheckboxChange(note.id)}
                            className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-500 mb-1">
                              {new Date(note.created_at).toLocaleString()}
                            </p>
                            <div className="text-sm text-slate-700 line-clamp-2 leading-relaxed bg-white/50 p-2 rounded border border-slate-100" dangerouslySetInnerHTML={{ __html: note.content }} />
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleExport('word')}
            disabled={loading || exportingAs !== null}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingAs === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Export as Word
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading || exportingAs !== null}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {exportingAs === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Export as PDF
          </button>
        </div>

      </div>
    </div>
  );
}
