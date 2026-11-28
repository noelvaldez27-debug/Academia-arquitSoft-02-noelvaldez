import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Campo, Estado } from '../../compartido/controles';

import { descargar } from '../../compartido/descargar';

interface Sede { id: string; nombre: string }
interface Ciclo { id: string; nombre: string; iniciaEl: string; terminaEl: string; cerradoEn: string | null }
interface Usuario { id: string; nombre: string; dni: string | null; correo: string; rol: string; activo: boolean; sedeId: string | null; carrera: string | null }
interface Pagina { usuarios: Usuario[]; total: number; pagina: number; limite: number }
interface HistorialCredenciales {
  estado: { cambioObligatorio: boolean; venceEn: string | null };
  eventos: { id: string; evento: string; creadoEn: string; actor: { id: string; nombre: string } }[];
  paginacion: { pagina: number; limite: number; total: number };
}
interface PasswordTemporal { passwordTemporal: string; venceEn: string; nombre: string }
const api = '/api/usuarios';
const opciones = [{ valor: 'POSTULANTE', texto: 'Estudiantes' }, { valor: 'DOCENTE', texto: 'Docentes' }, { valor: 'ADMINISTRADOR', texto: 'Administradores' }];
const condiciones = [{ valor: 'MATRICULADO', texto: 'Matriculado' }, { valor: 'LIBRE', texto: 'Libre' }];
const mensaje = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

export function Selector({ nombre, etiqueta, opciones, vacio, onChange, valor, requerido, inicial }:
  { nombre: string; etiqueta: string; opciones: { valor: string; texto: string }[]; vacio?: string;
    onChange?: (valor: string) => void; valor?: string; requerido?: boolean; inicial?: string }) {
  return <label className="grid gap-2 text-sm font-semibold">{etiqueta}
    <select className="campo" name={nombre} value={valor} defaultValue={inicial} required={requerido} onChange={event => onChange?.(event.currentTarget.value)}>
      {vacio !== undefined && <option value="">{vacio}</option>}
      {opciones.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  </label>;
}

export function GestionUsuarios({ seccion }: { seccion: string }) {
  const { sesion, solicitar } = usarSesion();
  const general = sesion?.perfil === 'general';
  const [rol, cambiarRol] = useState('POSTULANTE');
  const [sede, cambiarSede] = useState('');
  const [archivados, cambiarArchivados] = useState(false);
  const [busqueda, buscar] = useState('');
  const [termino, aplicarBusqueda] = useState('');
  const [pagina, cambiarPagina] = useState(1);
  const [datos, cambiarDatos] = useState<Pagina>();
  const [sedes, cambiarSedes] = useState<Sede[]>();
  const [ciclos, cambiarCiclos] = useState<Ciclo[]>();
  const [seleccion, seleccionar] = useState<string[]>([]);
  const [error, cambiarError] = useState('');
  const [exito, cambiarExito] = useState('');
  const [version, refrescar] = useState(0);
  const [ocupado, ocupar] = useState(false);
  const [recuperar, cambiarRecuperacion] = useState<Usuario>();
  const [entrega, cambiarEntrega] = useState<string>();
  const [credencialesDe, seleccionarCredenciales] = useState<Usuario>();
  const [historial, cambiarHistorial] = useState<HistorialCredenciales>();
  const [cargandoHistorial, ocuparHistorial] = useState(false);
  const [paginaHistorial, cambiarPaginaHistorial] = useState(1);
  const [restablecerPara, prepararRestablecimiento] = useState<Usuario>();
  const [identidadVerificada, confirmarIdentidad] = useState(false);
  const [passwordTemporal, mostrarPasswordTemporal] = useState<PasswordTemporal>();
  const mutacion = useRef(false);
  const controla = seccion === 'usuarios' || seccion === 'estudiantes';
  const estudiantes = rol === 'POSTULANTE';
  useEffect(() => {
    const control = new AbortController();
    void Promise.all([
      solicitar<Sede[]>(api + '/sedes', { signal: control.signal }),
      solicitar<Ciclo[]>(api + '/ciclos', { signal: control.signal }),
    ]).then(([s, c]) => { cambiarSedes(s); cambiarCiclos(c); })
      .catch(e => { if (!control.signal.aborted) cambiarError(mensaje(e)); });
    return () => control.abort();
  }, [solicitar, version]);
  useEffect(() => {
    const normalizada = busqueda.trim();
    if (normalizada === termino) return;
    const reloj = setTimeout(() => {
      aplicarBusqueda(normalizada);
      cambiarPagina(1);
      seleccionar([]);
      cambiarError('');
    }, 300);
    return () => clearTimeout(reloj);
  }, [busqueda, termino]);
  useEffect(() => {
    if (!controla) return;
    const control = new AbortController();
    cambiarDatos(undefined);
    const query = new URLSearchParams({ rol, pagina: String(pagina), ...(sede && { sedeId: sede }),
      ...(archivados && { archivados: 'true' }), ...(termino && { q: termino }) });
    void solicitar<Pagina>(api + '?' + query, { signal: control.signal })
      .then(r => { if (!control.signal.aborted) {
        if (r.usuarios.length === 0 && pagina > 1) cambiarPagina(p => p - 1);
        else cambiarDatos(r);
      } })
      .catch(e => { if (!control.signal.aborted) cambiarError(mensaje(e)); });
    return () => control.abort();
  }, [controla, solicitar, rol, sede, pagina, archivados, termino, version]);

  async function operar(accion: () => Promise<void>, texto: string | (() => string)) {
    if (mutacion.current) return;
    mutacion.current = true;
    ocupar(true);
    cambiarError('');
    cambiarExito('');
    try {
      await accion();
      cambiarExito(typeof texto === 'function' ? texto() : texto);
      seleccionar([]);
      refrescar(n => n + 1);
    } catch (e) { cambiarError(mensaje(e)); }
    finally { mutacion.current = false; ocupar(false); }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const campos = Object.fromEntries(new FormData(formulario));
    const valores = Object.fromEntries(Object.entries(campos).filter(([, valor]) => valor !== ''));
    if (controla && estudiantes && !general) valores.sedeId = sesion?.sedeId ?? '';
    const recurso = controla ? estudiantes ? 'estudiantes' : rol === 'DOCENTE' ? 'docentes' : 'administradores-sede' : seccion;
    let textoResultado = 'Registro guardado.';
    void operar(async () => {
      cambiarEntrega(undefined);
      const creado = await solicitar<{ id: string; credencialesDisponibles?: boolean; cicloResultado?: string }>(api + '/' + recurso, { method: 'POST', datos: valores });
      if (recurso === 'estudiantes' && creado.credencialesDisponibles) cambiarEntrega(creado.id);
      if (recurso === 'estudiantes') textoResultado = ({
        creada: 'Estudiante registrado en el ciclo.',
        recuperada: 'Cuenta archivada recuperada para el ciclo.',
        vinculada: 'Cuenta activa vinculada al ciclo sin cambiar sus credenciales.',
        existente: 'La cuenta ya estaba vinculada a este ciclo.',
      } as Record<string, string>)[creado.cicloResultado ?? ''] ?? textoResultado;
      cambiarRecuperacion(undefined);
      formulario.reset();
    }, () => textoResultado);
  }

  const sedesVisibles = (sedes ?? []).filter(s => general || String(s.id) === String(sesion?.sedeId));
  const sedesOpciones = sedesVisibles.map(s => ({ valor: s.id, texto: s.nombre }));
  const ciclosOpciones = (ciclos ?? []).filter(c => !c.cerradoEn).map(c => ({ valor: c.id, texto: c.nombre }));
  const actualizarFiltro = (accion: () => void) => { accion(); cambiarPagina(1); seleccionar([]); cambiarError(''); };
  const archivar = (ids: string[]) => {
    if (window.confirm('Se archivarán las cuentas seleccionadas y se invalidarán sus sesiones. Se conservará el historial académico. ¿Continuar?')) {
      void operar(async () => { await solicitar(api + '/estudiantes/archivar', { method: 'POST', datos: { ids } }); }, 'Archivo completado.');
    }
  };

  async function consultarHistorial(usuario: Usuario, paginaSolicitada = 1) {
    seleccionarCredenciales(usuario);
    cambiarPaginaHistorial(paginaSolicitada);
    cambiarHistorial(undefined);
    cambiarError('');
    ocuparHistorial(true);
    try {
      const query = new URLSearchParams({ pagina: String(paginaSolicitada), limite: '20' });
      cambiarHistorial(await solicitar<HistorialCredenciales>(api + '/estudiantes/' + usuario.id + '/credenciales/historial?' + query));
    } catch (e) { cambiarError(mensaje(e)); }
    finally { ocuparHistorial(false); }
  }

  async function restablecerPassword() {
    if (!restablecerPara || !identidadVerificada || ocupado) return;
    ocupar(true);
    cambiarError('');
    cambiarExito('');
    mostrarPasswordTemporal(undefined);
    try {
      const temporal = await solicitar<{ passwordTemporal: string; venceEn: string }>(
        api + '/estudiantes/' + restablecerPara.id + '/password/restablecer',
        { method: 'POST', datos: { identidadVerificada: true } },
      );
      mostrarPasswordTemporal({ ...temporal, nombre: restablecerPara.nombre });
      cambiarExito('Contraseña temporal generada. Entrégala al estudiante en privado.');
      prepararRestablecimiento(undefined);
      confirmarIdentidad(false);
      refrescar(n => n + 1);
      if (credencialesDe?.id === restablecerPara.id) void consultarHistorial(restablecerPara, paginaHistorial);
    } catch (e) { cambiarError(mensaje(e)); }
    finally { ocupar(false); }
  }


  return <div className="mt-6 grid gap-6">
    {error && <div><Estado tipo="error">{error}</Estado><Boton className="boton-secundario mt-2" onClick={() => { cambiarError(''); refrescar(n => n + 1); }}>Actualizar datos</Boton></div>}
    {exito && <Estado>{exito}</Estado>}
    {!sedes && !error && <Estado tipo="carga">Cargando catálogos…</Estado>}
    {controla && <>
      <div className="grid gap-4 sm:grid-cols-3">
        {general && <Selector nombre="rol" etiqueta="Tipo de usuario" opciones={opciones} valor={rol} onChange={v => actualizarFiltro(() => { cambiarRol(v); cambiarArchivados(false); cambiarRecuperacion(undefined); })} />}
        {general && <Selector nombre="filtroSede" etiqueta="Sede" opciones={sedesOpciones} vacio="Todas las sedes" valor={sede} onChange={v => actualizarFiltro(() => cambiarSede(v))} />}
        {estudiantes && <label className="flex items-center gap-2"><input type="checkbox" checked={archivados} onChange={e => actualizarFiltro(() => cambiarArchivados(e.currentTarget.checked))} /> Solo archivados</label>}
      </div>
      <Campo id="filtrar-pagina" etiqueta="Buscar por nombre, DNI o correo" type="search" maxLength={160} value={busqueda} onChange={e => buscar(e.currentTarget.value)} />
      {!datos && !error && <Estado tipo="carga">Cargando usuarios…</Estado>}
      {datos && datos.usuarios.length === 0 && <Estado>No hay usuarios para estos filtros.</Estado>}
      {datos && datos.usuarios.length > 0 && <>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" tabIndex={0} role="region" aria-label="Listado de usuarios">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100"><tr><th scope="col" className="p-3">Usuario</th><th scope="col" className="p-3">Sede / carrera</th><th scope="col" className="p-3">Estado</th><th scope="col" className="p-3">Acciones</th></tr></thead>
            <tbody>{datos.usuarios.map(u => <tr key={u.id} className="border-t border-slate-200">
              <td className="p-3"><strong>{u.nombre}</strong><div>{u.correo}</div>{u.dni && <div>DNI {u.dni}</div>}</td>
              <td className="p-3">{(sedes ?? []).find(s => String(s.id) === String(u.sedeId))?.nombre ?? '—'}<div>{u.carrera}</div></td>
              <td className="p-3">{archivados && estudiantes ? 'Archivado' : u.activo ? 'Activo' : 'Inactivo'}</td>
              <td className="p-3"><div className="flex flex-wrap gap-2">
                {estudiantes && u.activo && <label className="flex items-center gap-2"><input type="checkbox" aria-label={'Seleccionar a ' + u.nombre} checked={seleccion.includes(u.id)} onChange={e => seleccionar(e.currentTarget.checked ? [...seleccion, u.id] : seleccion.filter(id => id !== u.id))} /> Seleccionar</label>}
                {estudiantes && u.activo && <Boton className="boton-secundario" disabled={ocupado} onClick={() => archivar([u.id])}>Archivar</Boton>}
                {estudiantes && <Boton className="boton-secundario" disabled={ocupado} onClick={() => {
                  mostrarPasswordTemporal(undefined);
                  void consultarHistorial(u);
                }}>Ver credenciales</Boton>}
                {estudiantes && u.activo && <Boton className="boton-secundario" disabled={ocupado} onClick={() => {
                  mostrarPasswordTemporal(undefined);
                  confirmarIdentidad(false);
                  prepararRestablecimiento(u);
                }}>Restablecer contraseña</Boton>}
                {estudiantes && archivados && <Boton className="boton-secundario" disabled={ocupado} onClick={() => {
                  cambiarRecuperacion(u);
                  requestAnimationFrame(() => document.getElementById('gestion-nombre')?.focus());
                }}>Recuperar por DNI</Boton>}
                {u.id !== sesion?.id && !(u.rol === 'ADMINISTRADOR' && u.sedeId == null) && (!estudiantes || !u.activo) && !archivados &&
                  <Boton className="boton-secundario" disabled={ocupado} onClick={() =>
                    void operar(async () => { await solicitar(api + '/' + u.id + '/' + (u.activo ? 'desactivar' : 'reactivar'), { method: 'PATCH' }); }, 'Estado actualizado.')
                  }>{u.activo ? 'Desactivar' : 'Reactivar'}</Boton>}
                {estudiantes && u.activo && <form onSubmit={e => {
                  e.preventDefault();
                  const condicion = new FormData(e.currentTarget).get('condicion');
                  void operar(async () => { await solicitar(api + '/estudiantes/' + u.id + '/condicion', { method: 'PATCH', datos: { condicion } }); }, 'Condición actualizada.');
                }} className="flex items-end gap-2">
                  <Selector nombre="condicion" etiqueta="Nueva condición" opciones={condiciones} />
                  <Boton className="boton-secundario" disabled={ocupado}>Guardar</Boton>
                </form>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Boton className="boton-secundario" disabled={pagina <= 1} onClick={() => { seleccionar([]); cambiarPagina(p => p - 1); }}>Anterior</Boton>
          <span>Página {datos.pagina} · {datos.total} registros</span>
          <Boton className="boton-secundario" disabled={datos.pagina * datos.limite >= datos.total} onClick={() => { seleccionar([]); cambiarPagina(p => p + 1); }}>Siguiente</Boton>
          {seleccion.length > 0 && <Boton disabled={ocupado} onClick={() => archivar(seleccion)}>Archivar seleccionados ({seleccion.length})</Boton>}
        </div>
      </>}
    </>}
    {cargandoHistorial && <Estado tipo="carga">Consultando credenciales…</Estado>}
    {credencialesDe && historial && <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5" aria-label="Historial de credenciales">
      <h2 className="text-lg font-bold">Credenciales de {credencialesDe.nombre}</h2>
      <p>Estado: {historial.estado.cambioObligatorio ? 'Cambio obligatorio pendiente' : 'Sin cambio obligatorio'}
        {historial.estado.venceEn && <> · Vence {new Date(historial.estado.venceEn).toLocaleString()}</>}</p>
      {historial.eventos.length === 0 ? <Estado>Sin registro disponible.</Estado> : <ul className="grid gap-2">
        {historial.eventos.map(evento => <li key={evento.id} className="border-t border-slate-200 pt-2">
          <strong>{evento.evento.replaceAll('_', ' ')}</strong> · {new Date(evento.creadoEn).toLocaleString()} · Responsable: {evento.actor.nombre}
        </li>)}
      </ul>}
      <div className="flex flex-wrap items-center gap-3">
        <Boton className="boton-secundario" disabled={paginaHistorial <= 1 || cargandoHistorial}
          onClick={() => void consultarHistorial(credencialesDe, paginaHistorial - 1)}>Eventos más recientes</Boton>
        <span>Página {historial.paginacion.pagina} · {historial.paginacion.total} eventos</span>
        <Boton className="boton-secundario" disabled={paginaHistorial * historial.paginacion.limite >= historial.paginacion.total || cargandoHistorial}
          onClick={() => void consultarHistorial(credencialesDe, paginaHistorial + 1)}>Eventos anteriores</Boton>
        <Boton className="boton-secundario" onClick={() => { seleccionarCredenciales(undefined); cambiarHistorial(undefined); }}>Cerrar historial</Boton>
      </div>
    </section>}
    {restablecerPara && <section role="dialog" aria-modal="true" aria-label="Confirmar restablecimiento de contraseña" className="grid gap-4 rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h2 className="text-lg font-bold">Restablecer contraseña de {restablecerPara.nombre}</h2>
      <p>El estudiante deberá cambiar esta contraseña temporal al iniciar sesión. Se mostrará una sola vez.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={identidadVerificada}
        onChange={e => confirmarIdentidad(e.currentTarget.checked)} /> Confirmo que verifiqué la identidad del estudiante y le entregaré la clave en privado.</label>
      <div className="flex gap-2">
        <Boton disabled={!identidadVerificada || ocupado} onClick={() => void restablecerPassword()}>
          {ocupado ? 'Restableciendo…' : 'Restablecer y mostrar clave temporal'}
        </Boton>
        <Boton className="boton-secundario" disabled={ocupado} onClick={() => prepararRestablecimiento(undefined)}>Cancelar</Boton>
      </div>
    </section>}
    {passwordTemporal && <section aria-label="Contraseña temporal de un solo uso" aria-live="polite" className="grid gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
      <h2 className="text-lg font-bold">Contraseña temporal de {passwordTemporal.nombre}</h2>
      <p>Vence {new Date(passwordTemporal.venceEn).toLocaleString()}. Entrégala al estudiante en privado. No volverá a mostrarse.</p>
      <output className="select-all break-all rounded bg-white p-3 font-mono" aria-label="Contraseña temporal">{passwordTemporal.passwordTemporal}</output>
      <Boton className="boton-secundario w-fit" onClick={() => mostrarPasswordTemporal(undefined)}>Ocultar contraseña temporal</Boton>
    </section>}
    {seccion === 'sedes' && sedes && <ul className="grid gap-2">{sedesVisibles.map(s => <li className="panel-acceso" key={s.id}>{s.nombre}</li>)}</ul>}
    {seccion === 'ciclos' && ciclos && (ciclos.length ? <ul className="grid gap-2">{ciclos.map(c =>
      <li className="panel-acceso flex-wrap" key={c.id}><div>{c.nombre}<div className="text-sm">{c.iniciaEl} a {c.terminaEl} · {c.cerradoEn ? 'Cerrado' : 'Abierto'}</div></div>
        {general && !c.cerradoEn && <Boton disabled={ocupado} onClick={() => {
          if (window.confirm('Cerrar el ciclo archivará a los estudiantes vinculados y revocará sus sesiones. Se conservará el historial. ¿Continuar?')) {
            void operar(async () => { await solicitar(api + '/ciclos/' + c.id + '/cierre', { method: 'POST' }); }, 'Ciclo cerrado.');
          }
        }}>Cerrar ciclo</Boton>}</li>)}</ul> : <Estado>No hay ciclos registrados.</Estado>)}
    {(controla || general) && sedes && ciclos && <form key={seccion + rol + (recuperar?.id ?? '')} onSubmit={enviar} className="grid max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">{controla ? estudiantes ? 'Registrar o recuperar estudiante' : rol === 'DOCENTE' ? 'Registrar docente' : 'Registrar administrador de sede' : seccion === 'ciclos' ? 'Nuevo ciclo' : 'Nueva sede'}</h2>
      <Campo id="gestion-nombre" name="nombre" etiqueta="Nombre" defaultValue={recuperar?.nombre} maxLength={120} required />
      {controla && rol !== 'ADMINISTRADOR' && <Campo id="gestion-dni" name="dni" etiqueta="DNI" defaultValue={recuperar?.dni ?? undefined} readOnly={Boolean(recuperar)} inputMode="numeric" pattern="[0-9]{8}" required />}
      {controla && rol === 'ADMINISTRADOR' && <>
        <Campo id="gestion-correo" name="correo" etiqueta="Correo" type="email" required />
        <Campo id="gestion-clave" name="passwordInicial" etiqueta="Contraseña inicial" type="password" minLength={8} autoComplete="new-password" required />
      </>}
      {controla && general && rol !== 'DOCENTE' && <Selector nombre="sedeId" etiqueta="Sede del usuario" opciones={sedesOpciones} vacio="Selecciona una sede" inicial={recuperar?.sedeId ?? undefined} requerido />}
      {controla && estudiantes && <>
        <Campo id="gestion-carrera" name="carrera" etiqueta="Carrera" defaultValue={recuperar?.carrera ?? undefined} maxLength={100} required />
        <Selector nombre="condicion" etiqueta="Condición opcional" opciones={condiciones} vacio="Sin indicar" />
        <Selector nombre="cicloId" etiqueta="Ciclo académico" opciones={ciclosOpciones}
          vacio={ciclosOpciones.length === 1 ? undefined : 'Selecciona un ciclo'}
          inicial={ciclosOpciones.length === 1 ? ciclosOpciones[0].valor : undefined} requerido />
      </>}
      {seccion === 'ciclos' && <>
        <Campo id="gestion-inicio" name="iniciaEl" etiqueta="Fecha de inicio" type="date" required />
        <Campo id="gestion-fin" name="terminaEl" etiqueta="Fecha de fin" type="date" required />
      </>}
      {recuperar && <Boton type="button" className="boton-secundario" onClick={() => cambiarRecuperacion(undefined)}>Cancelar recuperación</Boton>}
      <Boton type="submit" disabled={ocupado || (estudiantes && ciclosOpciones.length === 0)}>{ocupado ? 'Guardando…' : 'Guardar registro'}</Boton>
    </form>}
    {entrega && <Boton disabled={ocupado} onClick={() => void operar(async () => {
      const archivo = await solicitar<Blob>(api + '/estudiantes/' + entrega + '/credenciales', { method: 'POST', formato: 'archivo' });
      descargar(archivo, 'credenciales-provisionales.xlsx');
      cambiarEntrega(undefined);
    }, 'Archivo de credenciales descargado.')}>Descargar credenciales de un solo uso</Boton>}
  </div>;
}
