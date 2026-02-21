import { useState } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReferralModal from '../components/ReferralModal';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-blue-100 mt-2">Sign in to access patient records</p>
        </div>

        <div className="p-8">
          <div className="space-y-4">
            {/* Staff Sign In */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-sm"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Sign in with Google
                </>
              )}
            </button>

            <div className="text-center text-sm text-slate-500">
              Only authorized personnel may access this system.
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* New Patient CTA */}
            <button
              onClick={() => setShowReferral(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              New Patient? Submit a Referral
            </button>
            <p className="text-center text-xs text-slate-400">
              Patients and referring doctors can upload a script or referral letter here.
            </p>
          </div>
        </div>
      </div>

      <ReferralModal isOpen={showReferral} onClose={() => setShowReferral(false)} />
    </div>
  );
}
