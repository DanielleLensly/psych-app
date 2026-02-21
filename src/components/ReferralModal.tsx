import { useState, useRef } from 'react';
import { X, Upload, User, Phone, Mail, MessageSquare, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubmitState = 'idle' | 'uploading' | 'success' | 'error';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

// Defined OUTSIDE the modal to prevent React unmounting inputs on every render
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit phone number (e.g. 0821234567).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected && selected.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitState('uploading');
    setErrorMsg('');

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('referrals')
          .upload(uniqueName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('referrals')
          .getPublicUrl(uploadData.path);

        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const { error: dbError } = await supabase.from('referrals').insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
      });

      if (dbError) throw dbError;

      setSubmitState('success');
    } catch (err: any) {
      console.error('Referral submission error:', err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setSubmitState('error');
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', phone: '', message: '' });
    setErrors({});
    setFile(null);
    setSubmitState('idle');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">New Patient Referral</h2>
              <p className="text-emerald-100 text-sm mt-0.5">Submit your details and we will be in touch.</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">
          {submitState === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Referral Submitted!</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Thank you. We have received your referral and will be in contact with you shortly.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <Field label="Full Name" required error={errors.name}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Patient or referring doctor's name"
                    value={formData.name}
                    onChange={e => { setFormData({ ...formData, name: e.target.value }); setErrors(prev => ({ ...prev, name: undefined })); }}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                </div>
              </Field>

              {/* Email */}
              <Field label="Email Address" required error={errors.email}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={e => { setFormData({ ...formData, email: e.target.value }); setErrors(prev => ({ ...prev, email: undefined })); }}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                </div>
              </Field>

              {/* Phone */}
              <Field label="Phone Number" required error={errors.phone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="082 000 0000"
                    value={formData.phone}
                    onChange={e => {
                      let val = e.target.value;
                      // Auto-convert +27 prefix to 0
                      if (val.startsWith('+27')) val = '0' + val.slice(3);
                      // Keep only digits, cap at 10
                      val = val.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: val });
                      setErrors(prev => ({ ...prev, phone: undefined }));
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${errors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                </div>
              </Field>

              {/* Message */}
              <Field label="Additional Notes">
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    placeholder="Reason for referral, urgency, etc."
                    rows={3}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                </div>
              </Field>

              {/* File Upload */}
              <Field label="Upload Script / Referral Letter">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-lg p-4 text-center cursor-pointer transition-colors group"
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-medium truncate max-w-[220px]">{file.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">Click to upload PDF, Word, or image</span>
                      <span className="text-xs text-slate-300">Max 10MB</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </Field>

              {/* Server Error */}
              {submitState === 'error' && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitState === 'uploading'}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitState === 'uploading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Referral'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
