import { Wallet, Receipt, Clock, TrendingDown } from 'lucide-react';
import useGastosStore from '../store/gastosStore';

export default function Dashboard() {
  const gastos = useGastosStore((s) => s.gastos);
  const facturas = useGastosStore((s) => s.facturas);

  const totalGastos = gastos.filter((g) => g.tipo === 'gasto').reduce((sum, g) => sum + g.monto, 0);

  const totalIngresos = gastos.filter((g) => g.tipo === 'ingreso').reduce((sum, g) => sum + g.monto, 0);

  const facturasSubidas = facturas.length;
  const pendientes = gastos.filter((g) => g.estado === 'pendiente').length;
  const verificados = gastos.filter((g) => g.estado === 'verificado').length;
  const conflictos = gastos.filter((g) => g.estado === 'conflicto').length;

  const docPercent = gastos.length > 0 ? Math.round((verificados / gastos.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="p-2 bg-red-50 rounded-lg w-fit mb-3">
            <TrendingDown size={20} className="text-red-600" />
          </div>
          <p className="text-xs text-gray-500">Total Gastos</p>
          <p className="text-xl font-bold text-gray-900">S/ {totalGastos.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="p-2 bg-green-50 rounded-lg w-fit mb-3">
            <Wallet size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Total Ingresos</p>
          <p className="text-xl font-bold text-gray-900">S/ {totalIngresos.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="p-2 bg-blue-50 rounded-lg w-fit mb-3">
            <Receipt size={20} className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-500">Facturas Subidas</p>
          <p className="text-xl font-bold text-gray-900">{facturasSubidas}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="p-2 bg-orange-50 rounded-lg w-fit mb-3">
            <Clock size={20} className="text-orange-600" />
          </div>
          <p className="text-xs text-gray-500">Pendientes</p>
          <p className="text-xl font-bold text-gray-900">{pendientes}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Gastos documentados</p>
          <p
            className="text-sm font-bold"
            style={{
              color: docPercent < 50 ? '#dc2626' : docPercent < 80 ? '#ca8a04' : '#16a34a',
            }}
          >
            {docPercent}%
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all"
            style={{
              width: `${docPercent}%`,
              backgroundColor: docPercent < 50 ? '#dc2626' : docPercent < 80 ? '#ca8a04' : '#16a34a',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{verificados} verificados</span>
          <span>{conflictos} en conflicto</span>
          <span>{pendientes} pendientes</span>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-sm mb-3">Resumen rápido</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500">Balance</p>
            <p className={`font-bold ${totalIngresos - totalGastos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              S/ {(totalIngresos - totalGastos).toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500">Total gastos</p>
            <p className="font-bold text-gray-900">{gastos.length} movimientos</p>
          </div>
        </div>
      </div>

      {gastos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-base">Sube tu primer reporte YAPE para ver el dashboard</p>
        </div>
      )}
    </div>
  );
}
