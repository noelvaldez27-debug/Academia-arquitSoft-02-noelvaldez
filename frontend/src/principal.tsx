import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Aplicacion } from './app/aplicacion';
import '@fontsource-variable/inter';
import './estilos.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter>
      <Aplicacion />
    </BrowserRouter>
  </StrictMode>,
);
