import { useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useResetUserPassword } from '@/hooks/use-app-users';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userNome: string;
}

export function ResetPasswordDialog({ open, onOpenChange, userId, userNome }: Props) {
  const reset = useResetUserPassword();
  const [senha, setSenha] = useState('');

  const onConfirm = async () => {
    if (senha.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    try {
      await reset.mutateAsync({ target_user_id: userId, nova_senha: senha });
      toast.success('Senha redefinida. Comunique ao usuário.');
      setSenha('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSenha(''); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar senha — {userNome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nova_senha">Nova senha (mínimo 8 caracteres)</Label>
          <Input id="nova_senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={reset.isPending}>{reset.isPending ? 'Resetando...' : 'Resetar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
