import { ServicioIAGemini } from './servicio-ia-gemini';

test('ADR-011 usa la parte multimodal con transporte simulado', async () => {
  const solicitar = jest.fn().mockResolvedValue(new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'Lección sintética' }] } }],
  })));
  const servicio = new ServicioIAGemini('clave-sintetica', 'modelo-simulado', solicitar);
  await expect(servicio.leerAdjunto({ mime: 'image/png', contenido: new Uint8Array([1, 2]) }))
    .resolves.toBe('Lección sintética');
  const [url, opciones] = solicitar.mock.calls[0];
  expect(url).toMatch(/modelo-simulado:generateContent$/);
  expect(JSON.parse(opciones.body).contents[0].parts[1]).toEqual({
    inlineData: { mimeType: 'image/png', data: 'AQI=' },
  });
});
