export type Perfil = 'general' | 'sede' | 'docente' | 'postulante';

export const nombresPerfil: Record<Perfil, string> = {
  general: 'Administrador general',
  sede: 'Administrador de sede',
  docente: 'Docente',
  postulante: 'Postulante',
};

interface Destino { ruta: string; titulo: string }

const destinos = {
  usuarios: { ruta: 'usuarios', titulo: 'Usuarios' },
  estudiantes: { ruta: 'estudiantes', titulo: 'Estudiantes' },
  banco: { ruta: 'banco', titulo: 'Banco de preguntas' },
  simulacros: { ruta: 'simulacros', titulo: 'Simulacros' },
  reportes: { ruta: 'reportes', titulo: 'Reportes' },
  analitica: { ruta: 'analitica', titulo: 'Analítica' },
  separatas: { ruta: 'separatas', titulo: 'Separatas' },
  desempeno: { ruta: 'desempeno', titulo: 'Desempeño del grupo' },
  nota: { ruta: 'nota', titulo: 'Mi nota' },
  ranking: { ruta: 'ranking', titulo: 'Mi posición' },
  historial: { ruta: 'historial', titulo: 'Mi historial' },
  recomendacion: { ruta: 'recomendacion', titulo: 'Recomendación' },
} satisfies Record<string, Destino>;

const { usuarios, estudiantes, banco, simulacros, reportes, analitica, separatas, desempeno,
  nota, ranking, historial, recomendacion } = destinos;

export const navegacion: Record<Perfil, readonly Destino[]> = {
  general: [usuarios, banco, simulacros, reportes, analitica],
  sede: [estudiantes, reportes, analitica],
  docente: [separatas, desempeno],
  postulante: [simulacros, nota, ranking, historial, recomendacion],
};
