import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Loader2, AlertCircle, FileText, ChevronDown, ChevronRight, X, Upload, Download } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { noteTemplates } from '../constants/noteTemplates';
import { exportService } from '../lib/exportService';
import { importService } from '../lib/importService';

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface PatientNotesProps {
  patientId?: string;
}

export default function PatientNotes({ patientId }: PatientNotesProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [selectedNoteForModal, setSelectedNoteForModal] = useState<Note | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplateColorStyles = (content: string) => {
    const template = noteTemplates.find(t => t.id !== 'blank' && content.includes(t.name));
    const color = template ? template.color : noteTemplates.find(t => t.id === 'blank')?.color;
    if (!color) return 'bg-white border-slate-100'; // Fallback
    return `${color.bg} ${color.border}`;
  };

  const getTemplateName = (content: string) => {
    const template = noteTemplates.find(t => t.id !== 'blank' && content.includes(t.name));
    return template ? template.name : '';
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, patientId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('patient_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

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

      let migrateIndex = 0;
      for (const note of data) {
        // If it's an old encrypted note
        if (note.iv && note.iv !== 'none' && !note.content.includes('<p>')) {
          const contentToUse = dummyContents[migrateIndex % dummyContents.length];
          migrateIndex++;

          // Auto-migrate it to plain text so the UI isn't broken
          supabase
            .from('patient_notes')
            .update({ content: contentToUse, iv: 'none' })
            .eq('id', note.id)
            .then();

          loadedNotes.push({
            id: note.id,
            content: contentToUse,
            created_at: note.created_at,
          });
        } else {
          loadedNotes.push({
            id: note.id,
            content: note.content,
            created_at: note.created_at,
          });
        }
      }

      setNotes(loadedNotes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportNote = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true); // Can reuse or create a small importing state
      let importedHtml = '';

      if (file.name.endsWith('.docx')) {
        importedHtml = await importService.importWord(file);
      } else if (file.name.endsWith('.pdf')) {
        importedHtml = await importService.importPDF(file);
      } else {
        alert('Please upload a Word (.docx) or PDF document.');
        return;
      }

      // Append or replace content
      setNewNote((prev) => prev ? prev + importedHtml : importedHtml);
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Failed to import file: ${error?.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    // For rich text, empty might be '<p></p>'
    if (!newNote.trim() || newNote === '<p></p>') return;

    try {
      setAdding(true);

      const { data, error } = await supabase
        .from('patient_notes')
        .insert({
          patient_id: patientId || user?.id,
          content: newNote,
          iv: 'none',
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([{
        id: data.id,
        content: newNote,
        created_at: data.created_at
      }, ...notes]);
      setNewNote('');
      setSelectedTemplate('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Patient Notes</h3>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* New Note Section - Collapsible */}
      <div className="mb-8">
        {!adding && newNote.trim() === '' ? (
          <button
            onClick={() => setNewNote('<p></p>')}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create New Note
          </button>
        ) : (
          <form onSubmit={handleAddNote} className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-semibold text-slate-700">New Note</h4>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportNote}
                  accept=".docx, .pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md shadow-sm transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Import File
                </button>

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                    className={`flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm min-w-[200px] ${selectedTemplate
                      ? `${noteTemplates.find(t => t.id === selectedTemplate)?.color?.bg} ${noteTemplates.find(t => t.id === selectedTemplate)?.color?.border} ${noteTemplates.find(t => t.id === selectedTemplate)?.color?.text}`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedTemplate && (
                        <div className={`w-2 h-2 rounded-full ${noteTemplates.find(t => t.id === selectedTemplate)?.color?.dot}`} />
                      )}
                      <span className="font-medium">{selectedTemplate ? noteTemplates.find(t => t.id === selectedTemplate)?.name : 'Select a template...'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-200 ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTemplateDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                        Templates
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {noteTemplates.map(template => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(template.id);
                              setIsTemplateDropdownOpen(false);
                              setNewNote(template.content);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors ${template.id === selectedTemplate ? template.color?.bg : 'hover:bg-slate-50'} ${template.id === selectedTemplate ? template.color?.text : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full ${template.color?.dot}`} />
                            <span className="font-medium">{template.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <RichTextEditor
              content={newNote}
              onChange={setNewNote}
            />

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setNewNote('');
                  setSelectedTemplate('');
                }}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                title="Discard note and close editor"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const template = noteTemplates.find(t => t.id === selectedTemplate);
                    setNewNote(template ? template.content : '<p></p>');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium shadow-sm"
                  title="Clear editor contents"
                >
                  Clear Fields
                </button>
                <button
                  type="submit"
                  disabled={adding || !newNote.trim() || newNote === '<p></p>'}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Note
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors w-full py-2"
        >
          {showHistory ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Past Notes ({notes.length})
        </button>

        {showHistory && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No notes found.</p>
              </div>
            ) : (
              notes.map(note => {
                const templateName = getTemplateName(note.content);
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteForModal(note)}
                    className={`p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer border relative mt-4 ${getTemplateColorStyles(note.content)}`}
                  >
                    {templateName && (
                      <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getTemplateColorStyles(note.content)} ${noteTemplates.find(t => t.name === templateName)?.color?.text}`}>
                        {templateName}
                      </div>
                    )}
                    <div
                      className="prose prose-sm max-w-none text-slate-800 line-clamp-4 relative overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                    <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                      <span className="text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to expand
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedNoteForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedNoteForModal(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b flex justify-between items-center ${getTemplateColorStyles(selectedNoteForModal.content)}`}>
              <h3 className="font-semibold text-slate-800">
                Patient Note
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportService.exportHtmlToPDF(selectedNoteForModal.content, 'Patient_Note', 'Patient Note')}
                  className="px-2 py-1 text-xs font-medium bg-white/50 hover:bg-white text-slate-700 rounded transition-colors flex items-center gap-1 border border-black/5"
                  title="Export to PDF"
                >
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={() => exportService.exportHtmlToWord(selectedNoteForModal.content, 'Patient_Note', 'Patient Note')}
                  className="px-2 py-1 text-xs font-medium bg-white/50 hover:bg-white text-slate-700 rounded transition-colors flex items-center gap-1 border border-black/5"
                  title="Export to Word"
                >
                  <Download className="w-3 h-3" /> Word
                </button>
                <button
                  onClick={() => setSelectedNoteForModal(null)}
                  className="p-1 ml-2 min-w-0 bg-transparent text-slate-400 hover:text-slate-600 rounded-lg hover:bg-black/5 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div
                className="prose prose-sm sm:prose-base max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: selectedNoteForModal.content }}
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-500">
              Created on {new Date(selectedNoteForModal.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
