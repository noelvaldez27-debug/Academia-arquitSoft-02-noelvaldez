import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

export function Boton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`boton ${className}`} {...props} />;
}

export function Campo({ etiqueta, id, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string; id: string;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold">{etiqueta}</label>
      <input id={id} className="campo" {...props} />
    </div>
  );
}

export function CampoPassword({ etiqueta, id, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string; id: string;
}) {
  const [visible, cambiarVisible] = useState(false);
  const accion = visible ? 'Ocultar' : 'Mostrar';
  return <div className="relative">
    <Campo etiqueta={etiqueta} id={id} {...props} type={visible ? 'text' : 'password'} className="campo pr-12" />
    <button type="button" aria-label={`${accion} contraseña: ${etiqueta}`} aria-pressed={visible}
      title={`${accion} contraseña`} onClick={() => cambiarVisible(!visible)}
      className="absolute bottom-0 right-1 inline-flex h-10 w-10 items-center justify-center rounded text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {visible && <path strokeLinecap="round" d="m4 4 16 16" />}
      </svg>
    </button>
  </div>;
}

export function Estado({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'carga'; children: ReactNode }) {
  return <p className={`estado estado-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</p>;
}
