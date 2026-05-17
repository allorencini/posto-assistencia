-- Add missing UPDATE policy pra chamadas (admin only — operador não edita chamada passada)
-- Sem essa policy, upsert do sync engine que cai em UPDATE branch (row existente)
-- viola RLS USING expression e falha. Push fica preso, sync_queue acumula órfãos.
CREATE POLICY chamadas_admin_update ON chamadas FOR UPDATE TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');
