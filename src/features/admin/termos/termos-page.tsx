import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConsentTerms, useCreateConsentTerm } from '@/hooks/use-consent-terms';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function TermosPage() {
  const { data: terms = [] } = useConsentTerms();
  const create = useCreateConsentTerm();
  const [open, setOpen] = useState(false);
  const [versao, setVersao] = useState('');
  const [texto, setTexto] = useState('');

  const onSubmit = async () => {
    if (versao.trim().length < 3) {
      toast.error('Versão obrigatória');
      return;
    }
    if (texto.trim().length < 100) {
      toast.error('Texto deve ter mínimo 100 caracteres');
      return;
    }
    try {
      await create.mutateAsync({ versao: versao.trim(), texto: texto.trim() });
      toast.success('Termo criado e marcado como ativo. Versão anterior desativada.');
      setVersao('');
      setTexto('');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Termos de consentimento</h2>
        <Button size="icon" onClick={() => setOpen(true)} aria-label="Novo termo">
          <Plus className="size-5" />
        </Button>
      </div>

      {terms.length === 0 ? (
        <EmptyState icon="📜" title="Nenhum termo cadastrado" />
      ) : (
        <ul className="space-y-2">
          {terms.map((t) => (
            <li
              key={t.id}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.versao}</div>
                {t.ativo && (
                  <span className="rounded bg-[var(--color-green)] px-2 py-0.5 text-xs text-black">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="mt-2 max-h-24 overflow-y-auto text-xs text-[var(--color-text-muted)]">
                {t.texto}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo termo de consentimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="versao">Versão (ex: 2026-06-01-v2)</Label>
              <Input id="versao" value={versao} onChange={(e) => setVersao(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="texto">Texto (mínimo 100 caracteres)</Label>
              <textarea
                id="texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 text-sm"
              />
              <p className="text-xs text-[var(--color-text-muted)]">{texto.length} caracteres</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Criar e ativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
