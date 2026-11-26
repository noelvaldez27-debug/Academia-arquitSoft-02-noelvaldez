const firmas = [
  /eyJ[\w-]+\.[\w-]+\.[\w-]+/i,
  /\b(?:Bearer|Basic)\s+[\w./=+-]{6,}/i,
  /\b(?:AIza[\w-]{35}|gh[pousr]_[\w]{30,}|github_pat_[\w]{40,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b\w+:\/\/[^\s/@]+:[^\s/@]+@/,
  /(?:^|["\s,{])(?:authorization|proxy-authorization|cookie|set-cookie|password|contrasena|token|api[_-]?key|(?:\w+_)?secret)\s*"?\s*[:=]\s*"?\s*(?!\[REDACTADO\](?:["\s},]|$))[^"\s},]/i,
];

export function contieneCredenciales(texto) {
  const normalizado = texto.replace(/\\"/g, '"');
  return firmas.some(firma => firma.test(normalizado));
}

export function exportarResumen({ metrics, root_group, state, options }) {
  const resumen = JSON.stringify({ metrics, root_group, state, options }, null, 2);
  if (contieneCredenciales(resumen)) {
    throw new Error('El resumen contiene un posible dato de autenticación.');
  }
  return { '/evidencia/resumen.json': resumen };
}
