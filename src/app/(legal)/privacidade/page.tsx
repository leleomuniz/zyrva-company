import { LegalPage, LegalSection } from "../legal-page";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="06/08/2026">
      <LegalSection title="Dados tratados">
        <p>
          A plataforma pode tratar dados de conta, contato, conversas, leads,
          configurações de agentes, registros de uso e auditoria. Cada organização é
          responsável por definir uma base legal adequada e informar seus clientes.
        </p>
      </LegalSection>
      <LegalSection title="Finalidades">
        <p>
          Os dados são usados para autenticação, atendimento, operação dos agentes,
          suporte, segurança, prevenção de abuso e melhoria mensurável do serviço. Não
          usamos os dados para envio de spam ou venda de listas.
        </p>
      </LegalSection>
      <LegalSection title="Compartilhamento e retenção">
        <p>
          Dados podem ser processados por provedores configurados pela organização,
          como OpenAI, Meta, hospedagem e banco de dados. Prazos de retenção devem ser
          definidos antes da produção e aplicados também a logs, filas e backups.
        </p>
      </LegalSection>
      <LegalSection title="Seus direitos">
        <p>
          O titular pode solicitar confirmação, acesso, correção, portabilidade,
          anonimização ou exclusão, conforme a legislação aplicável. Use os canais de
          solicitação disponíveis nesta página.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
