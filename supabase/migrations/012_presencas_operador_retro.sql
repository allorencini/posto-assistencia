-- 012: operador pode marcar presença retroativa (chamada de data passada).
-- Antes: presencas_insert/update exigiam chamada.data = CURRENT_DATE pra operador.
-- Isso quebrava (a) a feature de chamada retroativa e (b) o caso pré-existente de
-- presença marcada offline no sábado e sincronizada após a meia-noite — o push
-- violava RLS, o item falhava na sync_queue e era descartado (perda de dados).
-- Datas futuras continuam bloqueadas (<= CURRENT_DATE). Admin inalterado.

DROP POLICY IF EXISTS presencas_insert ON presencas;
CREATE POLICY presencas_insert ON presencas FOR INSERT TO authenticated
  WITH CHECK (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) <= CURRENT_DATE
    )
  );

DROP POLICY IF EXISTS presencas_update ON presencas;
CREATE POLICY presencas_update ON presencas FOR UPDATE TO authenticated
  USING (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) <= CURRENT_DATE
    )
  );
