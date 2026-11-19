import { ServicioIASimulado } from './servicio-ia-simulado';

describe('ServicioIASimulado (Adaptador simulado de IA)', () => {
  it('debe generar una pregunta propuesta determinista basada en el curso y texto', async () => {
    const servicioIA = new ServicioIASimulado();
    const textoSeparata = 'Las leyes de Newton describen el movimiento de los cuerpos en física clásica.';
    const curso = 'Física';

    const preguntas = await servicioIA.proponer(textoSeparata, curso);

    expect(preguntas).toHaveLength(1);
    expect(preguntas[0].enunciado).toContain('Física');
    expect(preguntas[0].enunciado).toContain('Las leyes de Newton');
    expect(preguntas[0].alternativas).toHaveLength(4);

    const correctas = preguntas[0].alternativas.filter((a) => a.esCorrecta);
    expect(correctas).toHaveLength(1);
    expect(correctas[0].texto).toBe('Alternativa correcta de Física');
  });

  it('debe generar recomendaciones de refuerzo deterministas para cursos débiles', async () => {
    const servicioIA = new ServicioIASimulado();
    const recomendacion = await servicioIA.recomendar(['Álgebra', 'Geometría']);

    expect(recomendacion).toContain('Álgebra, Geometría');
    expect(recomendacion).toContain('Recomendación de refuerzo simulada');
  });

  it('debe indicar felicitaciones cuando no hay cursos débiles', async () => {
    const servicioIA = new ServicioIASimulado();
    const recomendacion = await servicioIA.recomendar([]);

    expect(recomendacion).toBe('Felicitaciones, mantienes un rendimiento sólido en todos los cursos.');
  });

  it('debe devolver respuestas personalizadas cuando se configuran en el constructor', async () => {
    const preguntasCustom = [
      {
        enunciado: '¿Pregunta fija personalizada?',
        alternativas: [{ texto: 'Opción 1', esCorrecta: true }],
      },
    ];
    const recomendacionCustom = 'Plan de estudio a medida.';

    const servicioIA = new ServicioIASimulado({
      respuestasProponer: preguntasCustom,
      respuestaRecomendar: recomendacionCustom,
    });

    const preguntas = await servicioIA.proponer('cualquier texto', 'Química');
    const recomendacion = await servicioIA.recomendar(['Química']);

    expect(preguntas).toEqual(preguntasCustom);
    expect(recomendacion).toBe(recomendacionCustom);
  });
});
