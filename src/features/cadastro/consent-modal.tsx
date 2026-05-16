import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useActiveConsentTerm } from '@/hooks/use-consent-term';
import { useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccept: (termId: string) => void;
}

export function ConsentModal({ open, onOpenChange, onAccept }: Props) {
  const { data: term, isLoading } = useActiveConsentTerm();
  const [checked, setChecked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setChecked(false); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Captura de consentimento — LGPD</DialogTitle>
          <DialogDescription>
            Leia o termo abaixo para o titular dos dados. Marque a confirmação após a leitura e consentimento verbal.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-sm text-[var(--color-text-muted)]">Carregando termo...</div>
        ) : !term ? (
          <div className="py-4 text-sm text-[var(--color-red)]">Nenhum termo ativo encontrado.</div>
        ) : (
          <>
            <div className="max-h-72 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm leading-relaxed">
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">Versão: {term.versao}</p>
              <p>{term.texto}</p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                id="consent-check"
                className="mt-1"
              />
              <span>Li o termo acima ao titular dos dados e ele(a) consentiu verbalmente com o tratamento.</span>
            </label>
          </>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!checked || !term}
            onClick={() => {
              if (term) {
                onAccept(term.id);
                setChecked(false);
              }
            }}
          >
            Confirmar consentimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
