import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ItemInputSchema, type ItemInput, CATEGORIAS } from '@/schemas/item';
import { useSaveItem, useItem } from '@/hooks/use-itens';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId?: string | null;
}

const CATEGORIA_LABEL: Record<typeof CATEGORIAS[number], string> = {
  'alimento-doacao': 'Alimento (doação)',
  'alimento-interno': 'Alimento (interno)',
  'limpeza': 'Limpeza',
};

export function ItemForm({ open, onOpenChange, itemId }: Props) {
  const { data: existing } = useItem(itemId);
  const saveItem = useSaveItem();

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({
    resolver: zodResolver(ItemInputSchema),
    defaultValues: { nome: '', categoria: 'alimento-doacao', quantidade: 0 },
  });

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({ nome: existing.nome, categoria: existing.categoria, quantidade: existing.quantidade });
    } else {
      reset({ nome: '', categoria: 'alimento-doacao', quantidade: 0 });
    }
  }, [existing, open, reset]);

  const onSubmit = async (input: ItemInput) => {
    try {
      await saveItem.mutateAsync({
        id: itemId ?? undefined,
        nome: input.nome,
        categoria: input.categoria,
        quantidade: input.quantidade,
      });
      toast.success(itemId ? 'Item atualizado' : 'Item criado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{itemId ? 'Editar item' : 'Novo item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} autoComplete="off" />
            {errors.nome && <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>}
          </div>

          <div>
            <Label>Categoria *</Label>
            <Controller
              control={control}
              name="categoria"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade inicial</Label>
            <Input id="quantidade" type="number" min="0" {...register('quantidade')} />
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
