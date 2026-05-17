import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { useAtenderPedido, useDeletePedido, usePedidos } from '@/hooks/use-pedidos';
import { usePessoas } from '@/hooks/use-pessoas';
import type { Pedido } from '@/types/domain';
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PedidoForm } from './pedido-form';

export function PedidosPage() {
  const { data: pedidos = [] } = usePedidos();
  const { data: pessoas = [] } = usePessoas();
  const atender = useAtenderPedido();
  const deletePedido = useDeletePedido();

  const pessoaMap = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome])), [pessoas]);

  const pendentes = useMemo(() => pedidos.filter((p) => p.status === 'pendente'), [pedidos]);
  const atendidos = useMemo(() => pedidos.filter((p) => p.status === 'atendido'), [pedidos]);

  const byItem = useMemo(() => {
    const map = new Map<string, Pedido[]>();
    pendentes.forEach((p) => {
      const key = p.item.toUpperCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pendentes]);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [openAtendidos, setOpenAtendidos] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Pedido | null>(null);

  const destOf = (p: Pedido) => (p.pessoa_id ? (pessoaMap.get(p.pessoa_id) ?? '?') : '?');

  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <Button
        size="lg"
        onClick={() => {
          setEditId(null);
          setFormOpen(true);
        }}
        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white"
      >
        <Plus className="size-5" />
        <span>Adicionar pedido</span>
      </Button>

      {byItem.length === 0 ? (
        <EmptyState icon="🎁" title="Sem pedidos pendentes" />
      ) : (
        <ul className="space-y-2">
          {byItem.map(([item, list]) => {
            const isOpen = open.has(item);
            return (
              <li
                key={item}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  onClick={() => toggle(item)}
                >
                  <span className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                    <span className="font-medium">{item}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">({list.length})</span>
                  </span>
                </button>
                {isOpen && (
                  <ul className="border-t border-[var(--color-border)]">
                    {list
                      .sort((a, b) => a.solicitado_em.localeCompare(b.solicitado_em))
                      .map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{destOf(p)}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {p.quantidade}x · {p.solicitado_em}
                              {p.observacao && ` · ${p.observacao}`}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                atender.mutateAsync(p.id).then(() => toast.success('Atendido'))
                              }
                              aria-label="Marcar atendido"
                            >
                              <Check className="size-4 text-[var(--color-green)]" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditId(p.id);
                                setFormOpen(true);
                              }}
                              aria-label="Editar"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setToDelete(p)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="size-4 text-[var(--color-red)]" />
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {atendidos.length > 0 && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            onClick={() => setOpenAtendidos(!openAtendidos)}
          >
            <span className="flex items-center gap-2">
              {openAtendidos ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="font-medium">Atendidos</span>
              <span className="text-xs text-[var(--color-text-muted)]">({atendidos.length})</span>
            </span>
          </button>
          {openAtendidos && (
            <ul className="border-t border-[var(--color-border)]">
              {atendidos
                .sort((a, b) => (b.atendido_em ?? '').localeCompare(a.atendido_em ?? ''))
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        {p.item} → {destOf(p)}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Atendido {p.atendido_em}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setToDelete(p)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="size-4 text-[var(--color-red)]" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <PedidoForm open={formOpen} onOpenChange={setFormOpen} pedidoId={editId} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => {
          if (!v) setToDelete(null);
        }}
        title="Excluir pedido?"
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          await deletePedido.mutateAsync(toDelete.id);
          toast.success('Pedido removido');
          setToDelete(null);
        }}
      />
    </div>
  );
}
