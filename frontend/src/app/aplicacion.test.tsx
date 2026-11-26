import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Aplicacion } from './aplicacion';

function montar(ruta: string) {
  render(<MemoryRouter initialEntries={[ruta]}><Aplicacion /></MemoryRouter>);
}

function simularAcceso(cambioPasswordRequerido = false, estado = 200) {
  const token = 'cabecera.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })) + '.firma';
  const api = jest.fn().mockResolvedValue({
    status: estado, ok: estado === 200,
    json: async () => ({ token, cambioPasswordRequerido, usuario: {
      id: 'u1', nombre: 'Docente sintético', correo: 'docente@example.test', rol: 'DOCENTE', sedeId: null,
    } }),
  });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: api });
  return api;
}

async function ingresar() {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Correo institucional'), 'docente@example.test');
  await usuario.type(screen.getByLabelText('Contraseña'), 'clave local de prueba');
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
  return usuario;
}

it('protege una URL directa sin sesión', async () => {
  montar('/panel/general/usuarios');
  expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

it('inicia, muestra el menú docente y limpia la sesión al salir', async () => {
  const api = simularAcceso();
  montar('/acceso');
  const usuario = await ingresar();
  expect(await screen.findByRole('navigation')).toBeVisible();
  expect(screen.getByRole('navigation').getAttribute('aria-label')).toBe('Navegación principal');
  expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/usuarios/login', expect.objectContaining({ method: 'POST' }));
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

it('separa la credencial provisional de las rutas del panel', async () => {
  simularAcceso(true);
  montar('/acceso');
  await ingresar();
  expect(await screen.findByRole('heading', { name: 'Cambia tu contraseña provisional' })).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

it('muestra un error comprensible ante credenciales rechazadas', async () => {
  simularAcceso(false, 401);
  montar('/acceso');
  await ingresar();
  expect(await screen.findByRole('alert')).toHaveTextContent('Verifica tu correo');
});

it('cambia la contraseña provisional y vuelve al acceso', async () => {
  const api = simularAcceso(true);
  api.mockResolvedValueOnce(await api()).mockResolvedValue({ status: 204, ok: true });
  montar('/acceso');
  const usuario = await ingresar();
  await usuario.type(await screen.findByLabelText('Contraseña provisional'), 'clave local de prueba');
  await usuario.type(screen.getByLabelText('Nueva contraseña', { exact: true }), 'otra clave de prueba');
  await usuario.type(screen.getByLabelText('Confirmar nueva contraseña'), 'otra clave de prueba');
  await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  expect(await screen.findByText('Contraseña actualizada. Vuelve a ingresar.')).toBeVisible();
  expect(api).toHaveBeenLastCalledWith('/api/usuarios/password', expect.objectContaining({ method: 'PATCH' }));
});

function apiAdministrativa(sedeId: string | null, responder: (ruta: string) => unknown) {
  const token = 'cabecera.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })) + '.firma';
  const api = jest.fn(async (ruta: string, _opciones?: RequestInit) => {
    const json = ruta.endsWith('/login') ? { token, usuario: {
      id: '1', nombre: 'Administración de prueba', rol: 'ADMINISTRADOR', sedeId,
    } } : responder(ruta);
    return { status: json === undefined ? 403 : 200, ok: json !== undefined, json: async () => json };
  });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: api });
  return api;
}

it('muestra el detalle de una carga histórica sin permitir descargar una entrega ajena', async () => {
  const api = apiAdministrativa('2', ruta => {
    if (ruta.endsWith('/ciclos')) return [];
    if (ruta.endsWith('?pagina=1')) return { cargas: [{ id: 'carga', estado: 'COMPLETADA', creadaEl: '2026-11-26T00:00:00Z', propia: false }], pagina: 1, hayMas: false };
    if (ruta.endsWith('/carga')) return { id: 'carga', estado: 'COMPLETADA', totalFilas: 3, creadas: 1,
      yaExistian: 1, rechazadas: 1, errores: [{ fila: 4, motivo: 'Dato inválido' }], avisos: [] };
  });
  montar('/acceso');
  const usuario = await ingresar();
  await usuario.click(within(await screen.findByRole('navigation')).getByRole('link', { name: 'Cargas Excel' }));
  await usuario.click(await screen.findByRole('button', { name: /Completada/ }));
  expect(await screen.findByText('Fila 4 · Dato inválido')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Descargar credenciales/ })).not.toBeInTheDocument();
  expect(api.mock.calls.filter(([ruta]) => ruta.endsWith('/carga'))).toHaveLength(1);
});

it('permite consultar ciclos de sede y reserva su cierre al administrador general', async () => {
  apiAdministrativa('2', ruta => {
    if (ruta.endsWith('/ciclos')) return [{ id: '1', nombre: 'Ciclo sintético', iniciaEl: '2026-01-01', terminaEl: '2026-12-31', cerradoEn: null }];
    if (ruta.endsWith('/sedes')) return [{ id: '2', nombre: 'Sede de prueba' }];
  });
  montar('/acceso');
  const usuario = await ingresar();
  const nav = await screen.findByRole('navigation');
  await usuario.click(within(nav).getByRole('link', { name: 'Ciclos académicos' }));
  expect(await screen.findByText('Ciclo sintético')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Cerrar ciclo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar registro' })).not.toBeInTheDocument();
});

it('busca en el servidor y archiva únicamente la selección confirmada', async () => {
  const confirmacion = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  try {
    const alumno = { id: '20', nombre: 'Alumno sintético', dni: '12345678', correo: 'alumno@example.test',
      rol: 'POSTULANTE', activo: true, sedeId: '2', carrera: 'Ingeniería' };
    let archivado = false;
    const api = apiAdministrativa('2', ruta => {
      if (ruta.endsWith('/sedes')) return [{ id: '2', nombre: 'Sede de prueba' }];
      if (ruta.endsWith('/ciclos')) return [];
      if (ruta.endsWith('/archivar')) { archivado = true; return { archivados: 1 }; }
      const encontrados = ruta.includes('q=Alumno') && !archivado ? [alumno] : [];
      return { usuarios: encontrados, pagina: 1, limite: 20, total: encontrados.length };
    });
    montar('/acceso');
    const usuario = await ingresar();
    await usuario.click(within(await screen.findByRole('navigation')).getByRole('link', { name: 'Estudiantes' }));
    expect(await screen.findByText('No hay usuarios para estos filtros.')).toBeVisible();
    await usuario.type(screen.getByLabelText('Buscar por nombre, DNI o correo'), 'Alumno');
    expect(await screen.findByText(alumno.nombre)).toBeVisible();
    const consultas = api.mock.calls.filter(([ruta]) => ruta.includes('q='));
    expect(consultas).toEqual([['/api/usuarios?rol=POSTULANTE&pagina=1&q=Alumno', expect.anything()]]);
    await usuario.click(screen.getByRole('checkbox', { name: 'Seleccionar a Alumno sintético' }));
    await usuario.click(screen.getByRole('button', { name: /Archivar seleccionados/ }));
    expect(archivado).toBe(false);
    await usuario.click(screen.getByRole('button', { name: /Archivar seleccionados/ }));
    expect(await screen.findByText('Archivo completado.')).toBeVisible();
    expect(archivado).toBe(true);
  } finally { confirmacion.mockRestore(); }
});

it('rechaza un token vencido y mantiene el panel cerrado', async () => {
  const api = simularAcceso();
  const { usuario } = await (await api()).json();
  const token = 'cabecera.' + btoa(JSON.stringify({ exp: 1 })) + '.firma';
  api.mockResolvedValue({ status: 200, ok: true, json: async () => ({ token, usuario }) });
  montar('/acceso');
  await ingresar();
  expect(await screen.findByRole('alert')).toHaveTextContent('Vuelve a ingresar');
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

it('mantiene la sesión ante un 403 pero regresa al acceso ante un 401 privado', async () => {
  const api = apiAdministrativa('2', () => undefined);
  montar('/acceso');
  const usuario = await ingresar();
  const nav = await screen.findByRole('navigation');
  await usuario.click(within(nav).getByRole('link', { name: 'Estudiantes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('no tiene acceso');
  expect(nav).toBeVisible();
  api.mockResolvedValue({ status: 401, ok: false, json: async () => ({}) });
  await usuario.click(screen.getByRole('button', { name: 'Actualizar datos' }));
  expect(await screen.findByText('Tu sesión terminó. Vuelve a ingresar.')).toBeVisible();
});

it('evita enviar una confirmación de contraseña distinta a la nueva', async () => {
  const api = simularAcceso(true);
  montar('/acceso');
  const usuario = await ingresar();
  await usuario.type(await screen.findByLabelText('Contraseña provisional'), 'provisional de prueba');
  await usuario.type(screen.getByLabelText('Nueva contraseña', { exact: true }), 'nueva de prueba');
  await usuario.type(screen.getByLabelText('Confirmar nueva contraseña'), 'otra de prueba');
  await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('deben coincidir');
  expect(api).toHaveBeenCalledTimes(1);
});

it('exige alcance de transferencia y conserva la aprobación para el autor', async () => {
  const resumen = { id: 'doc', cursoId: 'curso', estado: 'PREGUNTAS_PROPUESTAS', mime: 'application/pdf' };
  const api = apiAdministrativa(null, ruta => {
    if (ruta.includes('/cursos?')) return { datos: [{ id: 'curso', nombre: 'Curso sintético' }], pagina: 1, hayMas: false };
    if (ruta.includes('/separatas?')) return { datos: [resumen], pagina: 1, hayMas: false };
    if (ruta.endsWith('/temas')) return [];
    if (ruta.endsWith('/doc/autorizacion')) return { estado: 'AUTORIZADA' };
    if (ruta.endsWith('/doc')) return {
      ...resumen, motivo: 'Pendiente de autorización anterior', autorizacion: null,
      propuestas: [{ id: 'p1', estado: 'PROPUESTA', enunciado: 'Pregunta sintética',
        alternativas: { A: '1', B: '2', C: '3', D: '4', E: '5' }, correcta: 'A' }],
    };
  });
  montar('/acceso');
  const usuario = await ingresar();
  await usuario.click(within(await screen.findByRole('navigation')).getByRole('link', { name: 'Separatas' }));
  await usuario.click(await screen.findByRole('button', { name: 'Revisar separata' }));
  expect(await screen.findByText('Pregunta sintética')).toBeVisible();
  expect(screen.queryByText('Pendiente de autorización anterior')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Aprobar$/ })).not.toBeInTheDocument();
  await usuario.click(screen.getByRole('checkbox', { name: /Verifiqué los permisos/ }));
  await usuario.click(screen.getByRole('button', { name: 'Autorizar transferencia' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('selecciona el alcance');
  expect(api.mock.calls.some(([ruta]) => ruta.endsWith('/autorizacion'))).toBe(false);
  await usuario.click(screen.getByRole('checkbox', { name: 'Texto extraído' }));
  await usuario.click(screen.getByRole('button', { name: 'Autorizar transferencia' }));
  expect(await screen.findByText('Autorización registrada.')).toBeVisible();
  const operacion = api.mock.calls.find(([ruta]) => ruta.endsWith('/autorizacion'))?.[1];
  expect(operacion).toMatchObject({ method: 'PUT', body: JSON.stringify({ estado: 'AUTORIZADA', alcance: ['texto'], contenidoApto: true }) });
});
