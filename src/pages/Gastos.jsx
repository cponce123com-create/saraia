import { useState } from 'react';
import { Search, X, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useGastosStore from '../store/gastosStore';
import GastosLista from '../components/GastosLista';
import SubirExcel from '../components/SubirExcel';
import CamaraModal from '../components/CamaraModal';
import ComprobanteModal from '../components/ComprobanteModal';

export default function Gastos() {
  const gastos = useGastosStore((s) => s.gastos);
  const facturas = useGastosStore((s) => s.facturas);
  const eliminarGasto = useGastosStore((s) => s.eliminarGasto);
  const limpiarTodo = useGastosStore((s) => s.limpiarTodo);

  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [camaraModal, setCamaraModal] = useState(null);
  const [verFactura, setVerFactura] = useState(null);
  const [showImport, setShowImport] = useState(gastos.length === 0);

  const gastosFiltrados = gastos.filter((g) => {
    if (filtro === 'pendientes' && g.estado !== 'pendiente') return false;
    if (filtro === 'verificados' && g.estado !== 'verificado') return false;
    if (filtro === 'conflictos' && g.estado !== 'conflicto') return false;
    if (filtro === 'sin_factura' && g.estado !== 'sin_factura') return false;
    if (busqueda && !g.descripcion.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendientes', label: 'Pendientes' },
    { value: 'verificados', label: 'Verificados' },
    { value: 'conflictos', label: 'Conflictos' },
    { value: 'sin_factura', label: 'Sin factura' },
  ];

  return (
    <div className="space-y-4">
      {/* Cabecera: título + botones */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Gastos {gastos.length > 0 && <span className="text-gray-400 font-normal text-sm ml-1">({gastos.length})</span>}
        </h2>
        <div className="flex items-center gap-2">
          {gastos.length > 0 && !showImport && (
            <button
              onClick={() => {
                if (window.confirm('Eliminar TODOS los gastos y facturas?')) {
                  limpiarTodo();
                  toast.success('Datos eliminados');
                }
              }}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 px-2.5 py-2 rounded-xl hover:bg-red-50 transition-colors"
              title="Limpiar todos los datos"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
          <button
            onClick={() => setShowImport(!showImport)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-all ${
              showImport
                ? 'bg-gray-100 text-gray-600'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
            }`}
          >
            {showImport ? <>Cancelar</> : <><Upload size={16} /> Importar</>}
          </button>
        </div>
      </div>

      {/* Subir Excel (colapsable, siempre accesible) */}
      {showImport && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <SubirExcel />
          {gastos.length > 0 && (
            <button
              onClick={() => setShowImport(false)}
              className="w-full mt-2 text-center text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              ← Ver mis gastos
            </button>
          )}
        </div>
      )}

      {/* Filtros y lista (solo si hay gastos) */}
      {gastos.length > 0 && !showImport && (
        <>
          {/* Tabs de filtro */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setFiltro(t.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  filtro === t.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Lista de gastos */}
          <GastosLista
            gastos={gastosFiltrados}
            onAdjuntarFactura={(gasto) => setCamaraModal(gasto)}
            onVerFactura={(gasto) => {
              const factura = facturas.find((f) => f.id === gasto.facturaId);
              if (factura) setVerFactura(factura);
            }}
            onEliminar={(id) => {
              eliminarGasto(id);
              toast.success('Gasto eliminado');
            }}
          />
        </>
      )}

      {/* Estado vacío */}
      {gastos.length === 0 && !showImport && (
        <div className="text-center py-16 text-gray-400">
          <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-base font-medium">No hay gastos cargados</p>
          <p className="text-sm mt-1">Presiona "Importar YAPE" para subir tu primer reporte</p>
        </div>
      )}

      {/* Modales */}
      {camaraModal && (
        <CamaraModal gasto={camaraModal} onClose={() => setCamaraModal(null)} />
      )}
      {verFactura && (
        <ComprobanteModal factura={verFactura} onClose={() => setVerFactura(null)} />
      )}
    </div>
  );
}
