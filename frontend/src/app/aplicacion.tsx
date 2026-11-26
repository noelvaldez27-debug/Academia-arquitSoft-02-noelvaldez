import { Rendicion } from '../funcionalidades/rendicion/rendicion';
import { MiNota } from '../funcionalidades/resultados/mi-nota';
import { MiPosicion } from '../funcionalidades/ranking-reportes/ranking';
import { DesempenoDocente, PanelRanking } from '../funcionalidades/ranking-reportes/reportes';
import { GestionSeparatas } from '../funcionalidades/banco-preguntas/separatas';
import { GestionBanco } from '../funcionalidades/banco-preguntas/banco';
import { GestionSimulacros } from '../funcionalidades/banco-preguntas/simulacros';
import { Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { FormularioCuenta } from './cuenta';
import { CargasExcel } from '../funcionalidades/usuarios/cargas';
import { GestionUsuarios } from '../funcionalidades/usuarios/gestion';
import { Acceso } from './acceso';
import { navegacion, nombresPerfil } from './navegacion';
import { ProveedorSesion, usarSesion } from './sesion';
import { Marca } from '../compartido/marca';
import { Boton, Estado } from '../compartido/controles';

function VistaMensaje({ titulo, detalle, salir }: { titulo: string; detalle: string; salir?: () => void }) {
  return (
    <main className="mx-auto grid min-h-svh max-w-xl content-center gap-5 px-6 py-12">
      <Marca />
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
      <Estado>{detalle}</Estado>
      {salir
        ? <Boton onClick={salir}>Cerrar sesión</Boton>
        : <NavLink className="enlace" to="/">Volver al inicio</NavLink>}
    </main>
  );
}

function ClaveInicial() {
  const { sesion, salir } = usarSesion();
  if (!sesion) return <Navigate to="/acceso" replace />;
  if (!sesion.cambioInicial) return <Navigate to={`/panel/${sesion.perfil}`} replace />;
  return (
    <main className="mx-auto grid max-w-xl gap-6 px-6 py-12">
      <Marca />
      <h1 className="text-3xl font-bold">Cambia tu contraseña provisional</h1>
      <Estado>El cambio es obligatorio para acceder al panel.</Estado>
      <FormularioCuenta inicial />
      <Boton className="boton-secundario" onClick={salir}>Cerrar sesión</Boton>
    </main>
  );
}

function Panel() {
  const { sesion, salir } = usarSesion();
  const { perfil, seccion } = useParams();
  if (!sesion) return <Navigate to="/acceso" replace />;
  if (sesion.cambioInicial) return <Navigate to="/cuenta/clave-inicial" replace />;
  if (perfil !== sesion.perfil) {
    return <VistaMensaje titulo="Acceso restringido" detalle="Tu perfil no tiene acceso a esta área." />;
  }
  const items = [...navegacion[sesion.perfil], { ruta: "cuenta", titulo: "Mi cuenta" }];
  const base = `/panel/${sesion.perfil}`;
  const activa = items.find(item => item.ruta === seccion);
  if (seccion && !activa) return <VistaMensaje titulo="Página no disponible" detalle="Esta sección no está disponible para tu perfil." />;

  return (
    <div className="panel">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3" href="#contenido">Saltar al contenido</a>
      <aside className="panel-lateral">
        <Marca />
        <nav aria-label="Navegación principal" className="panel-menu">
          <NavLink to={base} end>Inicio</NavLink>
          {items.map(item => <NavLink key={item.ruta} to={`${base}/${item.ruta}`}>{item.titulo}</NavLink>)}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="panel-encabezado">
          <div>
            <p className="text-sm font-semibold text-slate-600">{nombresPerfil[sesion.perfil]}</p>
            <p className="mt-1 font-semibold">{sesion.nombre}</p>
          </div>
          <Boton className="boton-secundario" onClick={salir}>Cerrar sesión</Boton>
        </header>
        <main className="panel-contenido" id="contenido">
          <h1 className="text-3xl font-bold tracking-tight">{activa?.titulo ?? 'Inicio'}</h1>
          {seccion === 'ranking' && perfil === 'postulante' ? <MiPosicion />
            : seccion === 'reportes' && (perfil === 'general' || perfil === 'sede') ? <PanelRanking general={perfil === 'general'} />
            : seccion === 'desempeno' && perfil === 'docente' ? <DesempenoDocente />
            : seccion === 'cuenta' ? (
            <div className="mt-6 grid gap-8">
              <section className="grid gap-4"><h2 className="text-lg font-semibold">Contraseña</h2><FormularioCuenta /></section>
              {(perfil === 'general' || perfil === 'sede') && (
                <section className="grid gap-4"><h2 className="text-lg font-semibold">Correo</h2><FormularioCuenta correo /></section>
              )}
            </div>
          ) : seccion === 'nota' && perfil === 'postulante' ? <MiNota /> : seccion === 'separatas' ? <GestionSeparatas /> : seccion === 'banco' ? <GestionBanco /> : seccion === 'simulacros' && perfil === 'general' ? <GestionSimulacros /> : seccion === 'simulacros' && perfil === 'postulante' ? <Rendicion /> : seccion === 'cargas' ? <CargasExcel /> : seccion && ['usuarios', 'estudiantes', 'sedes', 'ciclos'].includes(seccion) ? <GestionUsuarios key={seccion} seccion={seccion} /> : activa ? <div className="mt-6"><Estado>Esta sección se habilitará en su fase de desarrollo.</Estado></div> : (
            <>
              <p className="mt-2 text-slate-600">Selecciona una sección de tu área de trabajo.</p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map(item => (
                  <li key={item.ruta}>
                    <NavLink to={`${base}/${item.ruta}`} className="panel-acceso">
                      {item.titulo}<span aria-hidden="true">→</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export function Aplicacion() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/" element={<Navigate to="/acceso" replace />} />
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/cuenta/clave-inicial" element={<ClaveInicial />} />
        <Route path="/panel/:perfil/:seccion?" element={<Panel />} />
        <Route path="*" element={<VistaMensaje titulo="Página no disponible" detalle="Revisa la dirección e inténtalo nuevamente." />} />
      </Routes>
    </ProveedorSesion>
  );
}
