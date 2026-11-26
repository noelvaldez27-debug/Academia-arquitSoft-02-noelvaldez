import { Navigate, Route, Routes } from 'react-router-dom';
import { Marca } from '../compartido/marca';

export function Aplicacion() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/acceso" replace />} />
      <Route path="/acceso" element={<main className="mx-auto max-w-lg p-8"><Marca /></main>} />
    </Routes>
  );
}
