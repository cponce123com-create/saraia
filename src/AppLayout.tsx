import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, Camera, AlertTriangle,
  Download, Upload, Building2, Users, Clock, FileSpreadsheet,
  LogOut, User,
} from 'lucide-react';
import useGastosStore from './store/gastosStore';
import { useYapeImport } from './hooks/useYapeImport';
import { useAuth } from './hooks/useAuth';

const navGastos = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/gastos', label: 'Gastos', icon: ArrowRightLeft },
  { path: '/escanear', label: 'Escanear', icon: Camera },
  { path: '/resolver', label: 'Resolver', icon: AlertTriangle },
  { path: '/exportar', label: 'Exportar', icon: Download },
];

const navHR = [
  { path: '/empresas', label: 'Empresas', icon: Building2 },
  { path: '/personal', label: 'Personal', icon: Users },
  { path: '/asistencia', label: 'Asistencia', icon: Clock },
  { path: '/reportes-hr', label: 'Reportes RR.HH.', icon: FileSpreadsheet },
];

const allPaths = [...navGastos, ...navHR];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/gastos': 'Gastos',
  '/escanear': 'Escáner Masivo',
  '/resolver': 'Resolver Conflictos',
  '/exportar': 'Exportar Balance',
  '/empresas': 'Empresas',
  '/personal': 'Personal',
  '/asistencia': 'Control de Asistencia',
  '/reportes-hr': 'Reportes RR.HH.',
};

const ROLE_LABELS: Record<string, string> = {
  gerente: 'Gerente',
  contador: 'Contador',
  supervisor: 'Supervisor',
  almacenero: 'Almacenero',
};

const ROLE_COLORS: Record<string, string> = {
  gerente: 'bg-purple-100 text-purple-700',
  contador: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-green-100 text-green-700',
  almacenero: 'bg-orange-100 text-orange-700',
};

export default function AppLayout() {
  const location = useLocation();
  const { perfil, signOut } = useAuth();
  const gastos = useGastosStore((s) => s.gastos);
  const conflictos = gastos.filter((g) => g.estado === 'conflicto').length;
  const { importar, importando } = useYapeImport();

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) importar(file);
    };
    input.click();
  };

  return (
    <div className="flex h-dvh bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white border-r border-gray-200 z-30">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">SA</span>
          </div>
          <span className="font-bold text-xl text-gray-900">SaraIA</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Gastos</p>
          {navGastos.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.path === '/resolver' && conflictos > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {conflictos}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="my-3 border-t border-gray-200" />
          <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">RR.HH.</p>
          {navHR.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Usuario + Logout */}
        <div className="border-t border-gray-100 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{perfil?.nombre || ''}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_COLORS[perfil?.rol || ''] || ''}`}>
                {ROLE_LABELS[perfil?.rol || ''] || perfil?.rol || ''}
              </span>
            </div>
          </div>
          <button
            onClick={handleImportClick}
            disabled={importando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-sm"
          >
            <Upload size={18} />
            {importando ? 'Importando...' : 'Importar YAPE'}
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-bold text-xs">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">{pageTitles[location.pathname] || 'SaraIA'}</p>
            </div>
            <div className="flex items-center gap-1">
              {perfil && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[perfil.rol] || ''}`}>
                  {ROLE_LABELS[perfil.rol] || perfil.rol}
                </span>
              )}
              <button onClick={signOut} className="p-2 text-gray-400 hover:text-red-500 active:bg-red-50 rounded-lg transition-colors" title="Cerrar sesión">
                <LogOut size={18} />
              </button>
              <button
                onClick={handleImportClick}
                className="bg-blue-600 text-white p-2 rounded-xl active:bg-blue-700 transition-colors"
                title="Importar YAPE"
              >
                <Upload size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav Móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe">
        <div className="flex items-center justify-around overflow-x-auto">
          {allPaths.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-2 px-2 min-w-0 flex-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  {item.path === '/resolver' && conflictos > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-sm">
                      {conflictos > 9 ? '9+' : conflictos}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-medium leading-tight ${isActive ? 'font-semibold' : ''}`}>
                  {item.label === 'Reportes RR.HH.' ? 'Reportes' : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
