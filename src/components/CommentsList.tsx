import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PatientComment } from '../types';
import { MessageSquare, Plus, Trash2, User, Download, Upload, ChevronDown } from 'lucide-react';
import { exportService } from '../lib/exportService';
import { importService } from '../lib/importService';

interface CommentsListProps {
  patientId: string;
}

export default function CommentsList({ patientId }: CommentsListProps) {
  const [comments, setComments] = useState<PatientComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
    fetchComments();
  }, [patientId]);

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('patient_comments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('patient_comments')
        .insert([{
          patient_id: patientId,
          content: newComment.trim()
        }]);

      if (error) throw error;
      setNewComment('');
      setIsAdding(false);
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      const { error } = await supabase
        .from('patient_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }

  const handleExport = (format: 'excel' | 'pdf') => {
    const exportData = comments.map(c => ({
      Date: new Date(c.created_at).toLocaleString(),
      Author: 'Admin',
      Log: c.content
    }));

    if (format === 'excel') {
      exportService.exportToExcel(exportData, 'Administrative_Logs');
    } else if (format === 'pdf') {
      const headers = ['Date', 'Author', 'Log Detail'];
      const rows = comments.map(c => [
        new Date(c.created_at).toLocaleString(),
        'Admin',
        c.content
      ]);
      exportService.exportListToPDF(headers, rows, 'Administrative Logs', 'Administrative_Logs');
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
        alert(`Successfully parsed ${data.length} logs. (Logic for inserting records to database is pending)`);
        console.log('Imported Logs Data:', data);
      } else {
        alert('Please upload an Excel file for bulk log import.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          Administrative Logs
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
              title="Export Logs"
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
            onClick={() => setIsAdding(true)}
            className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm transition-colors ml-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="w-full text-sm border rounded px-3 py-2 mb-2"
            rows={2}
            placeholder="Log entry (e.g. Sent invoice, Patient called)..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newComment.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
            >
              Save Log
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-slate-400 text-sm">Loading logs...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-slate-400 text-sm italic">
          No administrative logs recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="group flex gap-3 text-sm">
              <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-slate-900">Admin</span>
                  <span className="text-xs text-slate-400">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{comment.content}</p>
              </div>
              <button
                onClick={() => handleDelete(comment.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                title="Delete Log"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
