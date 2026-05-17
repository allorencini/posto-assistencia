import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/useAuth';
import { useRegisterConsent } from '@/hooks/use-pessoa-consent';
import { usePessoa, useSavePessoa } from '@/hooks/use-pessoas';
import { GRUPOS, type PessoaInput, PessoaInputSchema } from '@/schemas/pessoa';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConsentModal } from './consent-modal';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pessoaId?: string | null;
}

const GRUPO_LABEL: Record<(typeof GRUPOS)[number], string> = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adulto',
  gestante: 'Gestante',
};

export function PessoaForm({ open, onOpenChange, pessoaId }: Props) {
  const { data: existing } = usePessoa(pessoaId);
  const savePessoa = useSavePessoa();
  const registerConsent = useRegisterConsent();
  const papel = useAuth((s) => s.papel);
  const isAdmin = papel === 'admin';

  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingTermId, setPendingTermId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PessoaInput>({
    resolver: zodResolver(PessoaInputSchema),
    defaultValues: {
      nome: '',
      grupo: 'adulto',
      telefone: '',
      familia_id: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cep: '',
      visitada: false,
      apta_cesta: null,
      visita_obs: '',
      excluir_ranking: false,
      consent_declarado: false,
    },
  });

  const visitada = watch('visitada');
  const aptaCesta = watch('apta_cesta');

  useEffect(() => {
    if (!visitada) {
      setValue('apta_cesta', null);
      setValue('visita_obs', '');
    }
  }, [visitada, setValue]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({
        nome: existing.nome,
        grupo: existing.grupo,
        telefone: existing.telefone ?? '',
        familia_id: existing.familia_id ?? '',
        rua: existing.rua ?? '',
        numero: existing.numero ?? '',
        complemento: existing.complemento ?? '',
        bairro: existing.bairro ?? '',
        cep: existing.cep ?? '',
        visitada: existing.visitada,
        apta_cesta: existing.apta_cesta,
        visita_obs: existing.visita_obs ?? '',
        excluir_ranking: existing.excluir_ranking,
        consent_declarado: true,
      });
    } else {
      reset({
        nome: '',
        grupo: 'adulto',
        telefone: '',
        familia_id: '',
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cep: '',
        visitada: false,
        apta_cesta: null,
        visita_obs: '',
        excluir_ranking: false,
        consent_declarado: false,
      });
    }
  }, [existing, open, reset]);

  const onSubmit = async (input: PessoaInput) => {
    try {
      const saved = await savePessoa.mutateAsync({
        id: pessoaId ?? undefined,
        nome: input.nome,
        grupo: input.grupo,
        telefone: input.telefone || null,
        familia_id: input.familia_id || null,
        rua: input.rua || null,
        numero: input.numero || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cep: input.cep || null,
        visitada: input.visitada,
        apta_cesta: input.apta_cesta ?? null,
        visita_obs: input.visita_obs || null,
        excluir_ranking: input.excluir_ranking,
      });
      if (!pessoaId && pendingTermId) {
        await registerConsent.mutateAsync({
          pessoa_id: saved.id,
          consent_term_id: pendingTermId,
        });
      }
      toast.success(pessoaId ? 'Pessoa atualizada' : 'Pessoa cadastrada');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pessoaId ? 'Editar pessoa' : 'Nova pessoa'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register('nome')} autoComplete="off" />
              {errors.nome && (
                <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>
              )}
            </div>

            <div>
              <Label>Grupo *</Label>
              <Controller
                control={control}
                name="grupo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRUPOS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GRUPO_LABEL[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                autoComplete="off"
                placeholder="(11) 99999-9999"
              />
              {errors.telefone && (
                <p className="text-sm text-[var(--color-red)]">{errors.telefone.message}</p>
              )}
            </div>

            {isAdmin && (
              <>
                <div className="border-t border-[var(--color-border)] pt-4">
                  <h4 className="mb-2 text-sm font-semibold">Endereço (admin)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label htmlFor="rua">Rua</Label>
                      <Input id="rua" {...register('rua')} />
                    </div>
                    <div>
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" {...register('numero')} />
                    </div>
                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input id="complemento" {...register('complemento')} />
                    </div>
                    <div>
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input id="bairro" {...register('bairro')} />
                    </div>
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" {...register('cep')} placeholder="00000-000" />
                      {errors.cep && (
                        <p className="text-sm text-[var(--color-red)]">{errors.cep.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4">
                  <h4 className="mb-2 text-sm font-semibold">Visita social (admin)</h4>
                  <label htmlFor="visitada-check" className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="visitada"
                      render={({ field }) => (
                        <Checkbox
                          id="visitada-check"
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      )}
                    />
                    <span className="text-sm">Pessoa visitada</span>
                  </label>
                  {visitada && (
                    <div className="mt-2">
                      <Label>Apta a cesta?</Label>
                      <Controller
                        control={control}
                        name="apta_cesta"
                        render={({ field }) => (
                          <Select
                            value={
                              field.value === true ? 'sim' : field.value === false ? 'nao' : ''
                            }
                            onValueChange={(v) =>
                              field.onChange(v === 'sim' ? true : v === 'nao' ? false : null)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sim">Sim</SelectItem>
                              <SelectItem value="nao">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                  {visitada && aptaCesta === false && (
                    <div className="mt-2">
                      <Label htmlFor="visita_obs">Observação visita</Label>
                      <Input id="visita_obs" {...register('visita_obs')} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="border-t border-[var(--color-border)] pt-4">
              <label htmlFor="excluir-ranking-check" className="flex items-start gap-2 text-sm">
                <Controller
                  control={control}
                  name="excluir_ranking"
                  render={({ field }) => (
                    <Checkbox
                      id="excluir-ranking-check"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      className="mt-1"
                    />
                  )}
                />
                <span>
                  Excluir do ranking
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    Não aparece na lista de ranking. Presença e cestas continuam funcionando.
                  </span>
                </span>
              </label>
            </div>

            {!pessoaId && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <Controller
                  control={control}
                  name="consent_declarado"
                  render={({ field }) => (
                    <Button
                      type="button"
                      variant={field.value ? 'default' : 'secondary'}
                      onClick={() => setConsentOpen(true)}
                      className="w-full"
                    >
                      {field.value ? '✓ Consentimento capturado' : 'Capturar consentimento LGPD *'}
                    </Button>
                  )}
                />
                {errors.consent_declarado && (
                  <p className="mt-1 text-sm text-[var(--color-red)]">
                    {errors.consent_declarado.message}
                  </p>
                )}
              </div>
            )}

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

      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={(termId) => {
          setPendingTermId(termId);
          setValue('consent_declarado', true, { shouldValidate: true });
          setConsentOpen(false);
        }}
      />
    </>
  );
}
