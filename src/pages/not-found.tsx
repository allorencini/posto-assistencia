import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl">Página não encontrada</h1>
      <Link to="/chamada" className="text-[var(--color-primary)] underline">
        Voltar
      </Link>
    </div>
  );
}
