import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PatientComment } from '../types';
import { MessageSquare, Plus, Trash2, User } from 'lucide-react';

interface CommentsListProps {
  patientId: string;
}

export default function CommentsList({ patientId }: CommentsListProps) {
  const [comments, setComments] = useState<PatientComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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

  return (
    <div className="space-y-6 pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          Administrative Logs
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Log
        </button>
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
