import { SearchInput } from '@/components/search-input';
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
import { usePedido, useSavePedido } from '@/hooks/use-pedidos';
import { usePessoas } from '@/hooks/use-pessoas';
import { normalize } from '@/lib/normalize';
import { type PedidoInput, PedidoInputSchema } from '@/schemas/pedido';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId?: string | null;
}

export function PedidoForm({ open, onOpenChange, pedidoId }: Props) {
  const { data: existing } = usePedido(pedidoId);
  const { data: pessoas = [] } = usePessoas();
  const savePedido = useSavePedido();

  const [destSearch, setDestSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PedidoInput>({
    resolver: zodResolver(PedidoInputSchema),
    defaultValues: { pessoa_id: '', item: '', quantidade: 1, observacao: '' },
  });

  const pessoa_id = watch('pessoa_id');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({
        pessoa_id: existing.pessoa_id ?? '',
        item: existing.item,
        quantidade: existing.quantidade,
        observacao: existing.observacao ?? '',
      });
    } else {
      reset({ pessoa_id: '', item: '', quantidade: 1, observacao: '' });
    }
    setDestSearch('');
  }, [existing, open, reset]);

  const candidates = (() => {
    const norm = normalize(destSearch);
    if (norm === '') return [];
    return pessoas.filter((p) => normalize(p.nome).includes(norm)).slice(0, 8);
  })();

  const selectedName = pessoa_id ? (pessoas.find((p) => p.id === pessoa_id)?.nome ?? null) : null;

  const onSubmit = async (input: PedidoInput) => {
    try {
      await savePedido.mutateAsync({
        id: pedidoId ?? undefined,
        pessoa_id: input.pessoa_id,
        familia_id: null,
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
            <Label>Pessoa *</Label>
            {selectedName ? (
              <div className="mt-2 flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-sm">
                <span>{selectedName}</span>
                <button
                  type="button"
                  className="text-xs text-[var(--color-text-muted)] hover:underline"
                  onClick={() => setValue('pessoa_id', '')}
                >
                  trocar
                </button>
              </div>
            ) : (
              <>
                <SearchInput
                  value={destSearch}
                  onChange={setDestSearch}
                  placeholder="Buscar pessoa..."
                  className="mt-2"
                />
                {candidates.length > 0 && (
                  <ul className="relative z-50 mt-1 max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
                    {candidates.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-nav)]"
                          onClick={() => {
                            setValue('pessoa_id', c.id);
                            setDestSearch('');
                          }}
                        >
                          {c.nome}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {errors.pessoa_id && (
              <p className="text-sm text-[var(--color-red)]">{errors.pessoa_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="item">Item *</Label>
            <Input
              id="item"
              {...register('item')}
              autoComplete="off"
              placeholder="Geladeira, fogão..."
            />
            {errors.item && (
              <p className="text-sm text-[var(--color-red)]">{errors.item.message}</p>
            )}
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
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
