import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPills } from '@/components/filter-pills';
import { PessoaList } from './pessoa-list';
import { PessoaForm } from './pessoa-form';
import { FamiliaList } from './familia-list';
import { FamiliaForm } from './familia-form';
import { ItemList } from './item-list';
import { ItemForm } from './item-form';

type Tab = 'pessoas' | 'familias' | 'itens';

export function CadastroPage() {
  const [tab, setTab] = useState<Tab>('pessoas');
  const [pessoaOpen, setPessoaOpen] = useState(false);
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [familiaOpen, setFamiliaOpen] = useState(false);
  const [familiaId, setFamiliaId] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);

  const onAdd = () => {
    if (tab === 'pessoas') { setPessoaId(null); setPessoaOpen(true); }
    else if (tab === 'familias') { setFamiliaId(null); setFamiliaOpen(true); }
    else { setItemId(null); setItemOpen(true); }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Cadastros</h1>
        <Button size="icon" onClick={onAdd} aria-label="Adicionar"><Plus className="size-5" /></Button>
      </div>

      <FilterPills
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: 'pessoas', label: 'Pessoas' },
          { value: 'familias', label: 'Famílias' },
          { value: 'itens', label: 'Itens' },
        ]}
      />

      {tab === 'pessoas' && <PessoaList onEdit={(id) => { setPessoaId(id); setPessoaOpen(true); }} />}
      {tab === 'familias' && <FamiliaList onEdit={(id) => { setFamiliaId(id); setFamiliaOpen(true); }} />}
      {tab === 'itens' && <ItemList onEdit={(id) => { setItemId(id); setItemOpen(true); }} />}

      <PessoaForm open={pessoaOpen} onOpenChange={setPessoaOpen} pessoaId={pessoaId} />
      <FamiliaForm open={familiaOpen} onOpenChange={setFamiliaOpen} familiaId={familiaId} />
      <ItemForm open={itemOpen} onOpenChange={setItemOpen} itemId={itemId} />
    </div>
  );
}
