import React, { useEffect, useState } from 'react';

/** Tiny hash router: deep links like #/needs/abc work under Vite and nginx without server config. */
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h === '' ? '/' : h.split('?')[0];
}

export function currentQuery(): URLSearchParams {
  const h = window.location.hash;
  const i = h.indexOf('?');
  return new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
}

export function navigate(path: string) {
  const target = path.startsWith('#') ? path : '#' + (path.startsWith('/') ? path : '/' + path);
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo({ top: 0 });
}

export function usePath(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

/** Match "/needs/:id" against "/needs/123" → { id: "123" } (or null). */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, className, children, title }: { to: string; className?: string; children: React.ReactNode; title?: string }) {
  return (
    <a href={'#' + to} className={className} title={title}>
      {children}
    </a>
  );
}
