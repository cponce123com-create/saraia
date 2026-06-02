import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Camera, AlertTriangle, Download, Upload } from 'lucide-react';
import useGastosStore from './store/gastosStore';
import { useYapeImport } from './hooks/useYapeImport';

const navItems = [
  { path: '/', label: 'Inicio', icon: LayoutDashboard },
  { path: '/gastos', label: 'Gastos', icon: ArrowRightLeft },
  { path: '/escanear', label: 'Escanear', icon: Camera },
  { path: '/resolver', label: 'Resolver', icon: AlertTriangle },
  { path: '/exportar', label: 'Exportar', icon: Download },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const gastos = useGastosStore((s) => s.gastos);
  const conflictos = gastos.filter((g) => g.estado === 'conflicto').length;
  const { importar, importando } = useYapeImport();

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) importar(file);
    };
    input.click();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white border-r border-gray-200 z-30">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="font-bold text-lg text-gray-900">CajaChica</span>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.path === '/resolver' && conflictos > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                    {conflictos}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={handleImportClick}
            disabled={importando}
            className="w-full flex items-center gap-2 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Upload size={18} />
            {importando ? 'Importando...' : 'Importar YAPE'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex items-center justify-around py-1">
          <button
            onClick={handleImportClick}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs font-medium text-blue-600"
          >
            <Upload size={22} />
            <span>Importar</span>
          </button>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <div className="relative">
                  <item.icon size={22} />
                  {item.path === '/resolver' && conflictos > 0 && (
                    <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {conflictos > 9 ? '9+' : conflictos}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
