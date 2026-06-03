import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import AppLayout from './AppLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Escanear = lazy(() => import('./pages/Escanear'));
const ResolverConflictos = lazy(() => import('./components/ResolverConflictos'));
const Exportacion = lazy(() => import('./pages/Exportacion'));
const Empresas = lazy(() => import('./pages/Empresas'));
const Personal = lazy(() => import('./pages/Personal'));
const Asistencia = lazy(() => import('./pages/Asistencia'));
const ReportesHR = lazy(() => import('./pages/Reportes'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

function FallbackError({ error, resetError }: { error: unknown; componentStack: string; eventId: string; resetError(): void }) {
  const message = error instanceof Error ? error.message : 'Error inesperado en la aplicaci\u00f3n';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-red-600 text-2xl font-bold">!</span>
      </div>
      <p className="text-lg font-semibold text-gray-900">Algo sali&oacute; mal</p>
      <p className="text-sm text-gray-500 mt-1 max-w-md">{message}</p>
      <button
        onClick={() => { resetError(); window.location.reload(); }}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Recargar p&aacute;gina
      </button>
    </div>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={FallbackError}>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/escanear" element={<Escanear />} />
            <Route path="/resolver" element={<ResolverConflictos />} />
            <Route path="/exportar" element={<Exportacion />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/asistencia" element={<Asistencia />} />
            <Route path="/reportes-hr" element={<ReportesHR />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.withProfiler(App);
