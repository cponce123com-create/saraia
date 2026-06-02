import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import Dashboard from './pages/Dashboard';
import Gastos from './pages/Gastos';
import Escanear from './pages/Escanear';
import ResolverConflictos from './components/ResolverConflictos';
import Exportacion from './pages/Exportacion';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/escanear" element={<Escanear />} />
        <Route path="/resolver" element={<ResolverConflictos />} />
        <Route path="/exportar" element={<Exportacion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
