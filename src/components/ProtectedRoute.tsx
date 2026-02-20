import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { UserRole } from '../types/index';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If user has a role but it's not allowed, redirect to a "not authorized" page or home
    // For now, redirecting to login or we could create an explicit 403 page.
    // Let's just log it and redirect to login or show alert? 
    // Redirecting to root/login seems safest for now.
    console.warn(`User role ${role} not authorized for this route.`);
    return <Navigate to="/login" replace />;
    // Alternatively: return <div>Not Authorized</div>;
  }

  // If allowedRoles is provided but user has NO role, we also deny access
  if (allowedRoles && !role) {
    console.warn('User has no role assigned.');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
