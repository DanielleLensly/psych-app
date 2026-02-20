import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EncryptionService } from '../lib/encryption';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Unlock, Plus, Loader2, AlertCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface Note {
  id: string;
  content: string; // decrypted content (HTML)
  created_at: string;
}

interface PatientNotesProps {
  patientId?: string;
}

export default function PatientNotes({ patientId }: PatientNotesProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUnlocked && user) {
      fetchNotes();
    }
  }, [isUnlocked, user]);

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

      const decryptedNotes: Note[] = [];
      for (const note of data) {
        try {
          const [iv, salt] = note.iv.split(':');
          if (!iv || !salt) continue;

          const content = await EncryptionService.decrypt(note.content, iv, salt, password);
          decryptedNotes.push({
            id: note.id,
            content,
            created_at: note.created_at,
          });
        } catch (e) {
          console.error("Failed to decrypt note", note.id, e);
        }
      }
      setNotes(decryptedNotes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsUnlocked(true);
    setError(null);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    // For rich text, empty might be '<p></p>'
    if (!newNote.trim() || newNote === '<p></p>') return;

    try {
      setAdding(true);
      const { ciphertext, iv, salt } = await EncryptionService.encrypt(newNote, password);
      const packedIv = `${iv}:${salt}`;

      const { data, error } = await supabase
        .from('patient_notes')
        .insert({
          patient_id: patientId || user?.id,
          content: ciphertext,
          iv: packedIv,
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPassword('');
    setNotes([]);
  };

  if (!isUnlocked) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Encrypted Patient Notes</h3>
        <p className="text-slate-500 mb-6 max-w-xs">
          Enter your secret key to access patient notes.
          <br />
          <span className="text-xs text-amber-600 font-medium">Warning: If you lose this key, data is lost forever.</span>
        </p>

        <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Secret Key"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Unlock Notes
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Unlock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Patient Notes</h3>
            <p className="text-xs text-green-600 font-medium">Decrypted & Secure</p>
          </div>
        </div>
        <button
          onClick={handleLock}
          className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-colors"
          title="Lock Notes"
        >
          <Lock className="w-5 h-5" />
        </button>
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
              <h4 className="text-sm font-semibold text-slate-700">New Note</h4>
              <button
                type="button"
                onClick={() => setNewNote('')}
                className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
              >
                Cancel
              </button>
            </div>

            <RichTextEditor
              content={newNote}
              onChange={setNewNote}
            />

            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={adding || !newNote.trim() || newNote === '<p></p>'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Note
              </button>
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
              notes.map(note => (
                <div key={note.id} className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                    {/* Future: Add delete/edit buttons here */}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
