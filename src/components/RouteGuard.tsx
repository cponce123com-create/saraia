import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldOff } from 'lucide-react';

type Rol = 'gerente' | 'contador' | 'supervisor' | 'lectura';

interface RouteGuardProps {
  children: React.ReactNode;
  rolesPermitidos?: Rol[];
}

export default function RouteGuard({ children, rolesPermitidos }: RouteGuardProps) {
  const { user, perfil, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (rolesPermitidos && perfil && !rolesPermitidos.includes(perfil.rol)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldOff size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso restringido</h2>
          <p className="text-gray-500 text-sm mb-6">
            No tienes permisos suficientes para acceder a esta sección.
            {perfil && (
              <span className="block mt-1 text-xs text-gray-400">
                Tu rol actual: <strong>{perfil.rol}</strong>
              </span>
            )}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
