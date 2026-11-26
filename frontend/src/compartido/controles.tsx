import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

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

export function Estado({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'carga'; children: ReactNode }) {
  return <p className={`estado estado-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</p>;
}
