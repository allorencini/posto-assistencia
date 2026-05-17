import { env } from '@/lib/env';

export function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl p-6 prose prose-invert">
      <h1>Política de Privacidade</h1>
      <p>
        Esta aplicação trata dados pessoais de assistidos da assistência social (nome, telefone,
        endereço, observações de visita) conforme a Lei 13.709/2018 (LGPD).
      </p>
      <h2>Finalidade</h2>
      <p>
        Organização de assistência social, controle de presença em cultos, registro de entrega de
        cestas básicas e atendimento de pedidos de doação.
      </p>
      <h2>Base legal</h2>
      <p>
        Consentimento (Art. 7º, I LGPD) capturado verbalmente pelo voluntário e registrado no
        sistema com versão do termo, autor e data.
      </p>
      <h2>Retenção</h2>
      <p>
        Dados pessoais são anonimizados automaticamente após 5 anos sem atividade
        (presença/cesta/pedido).
      </p>
      <h2>Direitos do titular</h2>
      <ul>
        <li>Confirmar existência de tratamento</li>
        <li>Acessar dados</li>
        <li>Corrigir dados</li>
        <li>Anonimizar ou eliminar</li>
        <li>Portabilidade (exportação JSON)</li>
        <li>Revogar consentimento</li>
      </ul>
      <p>Para exercer estes direitos, contate o responsável pelos dados:</p>
      <p>
        <strong>{env.DPO_NOME}</strong>
        {env.DPO_EMAIL && (
          <>
            <br />
            <a href={`mailto:${env.DPO_EMAIL}`}>{env.DPO_EMAIL}</a>
          </>
        )}
      </p>
    </div>
  );
}
