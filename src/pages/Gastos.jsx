import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import useGastosStore from '../store/gastosStore';
import GastosLista from '../components/GastosLista';
import SubirExcel from '../components/SubirExcel';
import CamaraModal from '../components/CamaraModal';
import ComprobanteModal from '../components/ComprobanteModal';

export default function Gastos() {
  const gastos = useGastosStore((s) => s.gastos);
  const facturas = useGastosStore((s) => s.facturas);

  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [camaraModal, setCamaraModal] = useState(null);
  const [verFactura, setVerFactura] = useState(null);

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
      {/* Subir Excel (solo visible si no hay gastos) */}
      {gastos.length === 0 && <SubirExcel />}

      {/* Filtros */}
      {gastos.length > 0 && (
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
          />
        </>
      )}

      {/* Modal de cámara */}
      {camaraModal && (
        <CamaraModal
          gasto={camaraModal}
          onClose={() => setCamaraModal(null)}
        />
      )}

      {/* Modal ver factura */}
      {verFactura && (
        <ComprobanteModal
          factura={verFactura}
          onClose={() => setVerFactura(null)}
        />
      )}
    </div>
  );
}
