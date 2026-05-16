import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/search-input';
import { toast } from 'sonner';
import { PedidoInputSchema, type PedidoInput } from '@/schemas/pedido';
import { useSavePedido, usePedido } from '@/hooks/use-pedidos';
import { usePessoas } from '@/hooks/use-pessoas';
import { useFamilias } from '@/hooks/use-familias';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId?: string | null;
}

export function PedidoForm({ open, onOpenChange, pedidoId }: Props) {
  const { data: existing } = usePedido(pedidoId);
  const { data: pessoas = [] } = usePessoas();
  const { data: familias = [] } = useFamilias();
  const savePedido = useSavePedido();

  const [destTipo, setDestTipo] = useState<'pessoa' | 'familia'>('pessoa');
  const [destSearch, setDestSearch] = useState('');

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PedidoInput>({
    resolver: zodResolver(PedidoInputSchema),
    defaultValues: { pessoa_id: null, familia_id: null, item: '', quantidade: 1, observacao: '' },
  });

  const pessoa_id = watch('pessoa_id');
  const familia_id = watch('familia_id');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({
        pessoa_id: existing.pessoa_id,
        familia_id: existing.familia_id,
        item: existing.item,
        quantidade: existing.quantidade,
        observacao: existing.observacao ?? '',
      });
      setDestTipo(existing.familia_id ? 'familia' : 'pessoa');
    } else {
      reset({ pessoa_id: null, familia_id: null, item: '', quantidade: 1, observacao: '' });
      setDestTipo('pessoa');
    }
    setDestSearch('');
  }, [existing, open, reset]);

  const candidates = (() => {
    const norm = destSearch.trim().toLowerCase();
    if (norm === '') return [];
    if (destTipo === 'pessoa') {
      return pessoas.filter((p) => p.nome.toLowerCase().includes(norm)).slice(0, 8);
    }
    return familias.filter((f) => f.nome.toLowerCase().includes(norm)).slice(0, 8);
  })();

  const selectedName = (() => {
    if (destTipo === 'pessoa' && pessoa_id) return pessoas.find((p) => p.id === pessoa_id)?.nome;
    if (destTipo === 'familia' && familia_id) return familias.find((f) => f.id === familia_id)?.nome;
    return null;
  })();

  const onSubmit = async (input: PedidoInput) => {
    try {
      await savePedido.mutateAsync({
        id: pedidoId ?? undefined,
        pessoa_id: destTipo === 'pessoa' ? input.pessoa_id : null,
        familia_id: destTipo === 'familia' ? input.familia_id : null,
        item: input.item,
        quantidade: input.quantidade,
        observacao: input.observacao || null,
      });
      toast.success(pedidoId ? 'Pedido atualizado' : 'Pedido criado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pedidoId ? 'Editar pedido' : 'Novo pedido'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Destinatário</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={destTipo === 'pessoa' ? 'default' : 'secondary'}
                onClick={() => { setDestTipo('pessoa'); setValue('familia_id', null); }}
              >Pessoa</Button>
              <Button
                type="button"
                size="sm"
                variant={destTipo === 'familia' ? 'default' : 'secondary'}
                onClick={() => { setDestTipo('familia'); setValue('pessoa_id', null); }}
              >Família</Button>
            </div>

            {selectedName ? (
              <div className="mt-2 flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-sm">
                <span>{selectedName}</span>
                <button
                  type="button"
                  className="text-xs text-[var(--color-text-muted)] hover:underline"
                  onClick={() => {
                    if (destTipo === 'pessoa') setValue('pessoa_id', null);
                    else setValue('familia_id', null);
                  }}
                >trocar</button>
              </div>
            ) : (
              <>
                <SearchInput
                  value={destSearch}
                  onChange={setDestSearch}
                  placeholder={destTipo === 'pessoa' ? 'Buscar pessoa...' : 'Buscar família...'}
                  className="mt-2"
                />
                {candidates.length > 0 && (
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                    {candidates.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-nav)]"
                          onClick={() => {
                            if (destTipo === 'pessoa') setValue('pessoa_id', c.id);
                            else setValue('familia_id', c.id);
                            setDestSearch('');
                          }}
                        >{c.nome}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {errors.pessoa_id && <p className="text-sm text-[var(--color-red)]">{errors.pessoa_id.message}</p>}
          </div>

          <div>
            <Label htmlFor="item">Item *</Label>
            <Input id="item" {...register('item')} autoComplete="off" placeholder="Geladeira, fogão..." />
            {errors.item && <p className="text-sm text-[var(--color-red)]">{errors.item.message}</p>}
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input id="quantidade" type="number" min="1" {...register('quantidade')} />
          </div>

          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Input id="observacao" {...register('observacao')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
