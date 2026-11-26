import { useRef, useState, type FormEvent } from 'react';
import { Boton, Campo, Estado } from '../../compartido/controles';
import { Selector } from '../usuarios/gestion';
import { letras, textoFallo, type Contenido, type Tema } from './lecturas';

export function EditorPregunta({ inicial, temas, habilitada, guardar, cancelar }: {
  inicial?: Contenido; temas: Tema[]; habilitada?: boolean;
  guardar: (datos: Contenido & { habilitada?: boolean }) => Promise<void>;
  cancelar?: () => void;
}) {
  const enviando = useRef(false);
  const [ocupado, ocupar] = useState(false);
  const [error, avisar] = useState('');
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando.current) return;
    const formulario = e.currentTarget;
    const campos = new FormData(formulario);
    const enunciado = String(campos.get('enunciado')).trim();
    const alternativas = Object.fromEntries(letras.map(letra => [letra, String(campos.get(letra)).trim()])) as Contenido['alternativas'];
    const correcta = campos.get('correcta') as Contenido['correcta'];
    if (!enunciado || !letras.every(l => alternativas[l]) || !letras.includes(correcta)) {
      avisar('Completa el enunciado, las cinco alternativas y la respuesta correcta.');
      return;
    }
    enviando.current = true;
    ocupar(true);
    avisar('');
    try {
      await guardar({ enunciado, alternativas, correcta, temaId: String(campos.get('temaId') ?? '') || null,
        ...(habilitada !== undefined && { habilitada: campos.has('habilitada') }) });
      if (!inicial) formulario.reset();
    } catch (fallo) { avisar(textoFallo(fallo)); }
    finally { enviando.current = false; ocupar(false); }
  }
  return <form onSubmit={enviar} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
    {error && <Estado tipo="error">{error}</Estado>}
    <label className="grid gap-2 text-sm font-semibold">Enunciado<textarea className="campo" name="enunciado" defaultValue={inicial?.enunciado} required /></label>
    <fieldset className="grid gap-3"><legend className="mb-2 text-sm font-semibold">Alternativas y respuesta correcta</legend>
      {letras.map(letra => <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={letra}>
        <Campo id={'opcion-' + letra} etiqueta={'Alternativa ' + letra} name={letra} defaultValue={inicial?.alternativas[letra]} required />
        <label className="flex min-h-11 items-center gap-2">
          <input type="radio" name="correcta" value={letra} defaultChecked={inicial?.correcta === letra} required /> Correcta {letra}
        </label>
      </div>)}
    </fieldset>
    <Selector nombre="temaId" etiqueta="Tema" inicial={inicial?.temaId ?? undefined} vacio="Sin tema"
      opciones={[
        ...(inicial?.temaId && !temas.some(t => t.id === inicial.temaId) ? [{ valor: inicial.temaId, texto: 'Tema actual' }] : []),
        ...temas.map(t => ({ valor: t.id, texto: t.nombre })),
      ]} />
    {habilitada !== undefined && <label className="flex gap-2"><input type="checkbox" name="habilitada" defaultChecked={habilitada} /> Habilitada</label>}
    <div className="flex flex-wrap gap-3"><Boton disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar pregunta'}</Boton>
      {cancelar && <Boton type="button" className="boton-secundario" onClick={cancelar}>Cancelar</Boton>}
    </div>
  </form>;
}
