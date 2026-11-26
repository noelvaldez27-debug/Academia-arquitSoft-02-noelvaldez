import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Aplicacion } from './app/aplicacion';
import '@fontsource-variable/inter';
import './estilos.css';

const rutas = createBrowserRouter([{ path: '*', element: <Aplicacion /> }]);

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <RouterProvider router={rutas} />
  </StrictMode>,
);
