import { ExtractorDocxAdapter } from './extractor-docx.adapter';

// DOCX sintético con word/document.xml y el manifiesto de tipos.
const docx = Buffer.from('UEsDBBQAAAAIAPSoeF24rd+kiQAAALIAAAARAAAAd29yZC9kb2N1bWVudC54bWxEzsEJwzAMBdBVTAaIQg89mDQTdAnXdhNDJBlJxcn2xemhl/cRfD6am08cP5jJ3IE7qW+PYTOrHkDjljHoyDXTgfubBYPpyLJCY0lVOGbVQivucJumO2AoNCxz8y9OZ8/akY4tzxxjYXJayLKVGFzKLkgxvK5xht7qymW9/C3B/8vlCwAA//8DAFBLAwQUAAAACAD0qHhdrG4SWqQAAADcAAAAEwAAAFtDb250ZW50X1R5cGVzXS54bWxcjzEOwjAMRa9SZUXUiIEBtV3YgYELWKnbRsR2lBgot0cFqQPz13tPv7m9E5Vq5iildZNZOgIUPxFjqTWRzBwHzYxWas0jJPR3HAn2u90BvIqR2NYWh+uay5NyDj1VV8x2RqbWwUtzD736B5NYPXN01emHLeXWYUoxeLSgAk/p/5pbHYbgaeUXW8rqqZQgI8d6XRiDbBY9dA18T3UfAAAA//8DAFBLAQIUABQAAAAIAPSoeF24rd+kiQAAALIAAAARAAAAAAAAAAAAAAAAAAAAAAB3b3JkL2RvY3VtZW50LnhtbFBLAQIUABQAAAAIAPSoeF2sbhJapAAAANwAAAATAAAAAAAAAAAAAAAAALgAAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAACAAIAgAAAAI0BAAAAAA==', 'base64');

test('CA-BP03 extrae texto real de un DOCX sin usar ServicioIA', async () => {
  await expect(new ExtractorDocxAdapter().extraer(docx)).resolves.toBe('Leccion sintetica de aritmetica.');
});
