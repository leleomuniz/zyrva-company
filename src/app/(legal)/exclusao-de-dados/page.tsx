import { LegalPage, LegalSection } from "../legal-page";

export const metadata = { title: "Exclusão de Dados" };

export default function DeletionPage() {
  return (
    <LegalPage title="Exclusão de dados" updatedAt="06/08/2026">
      <LegalSection title="Pedido de exclusão">
        <p>
          Solicite a exclusão à empresa responsável pelo atendimento e informe o canal e
          identificador usados. A organização deve registrar o pedido, validar a
          identidade e comunicar a conclusão ou uma justificativa legal de retenção.
        </p>
      </LegalSection>
      <LegalSection title="O que pode permanecer">
        <p>
          Informações estritamente necessárias para obrigação legal, defesa de direitos,
          prevenção de fraude ou auditoria podem permanecer bloqueadas pelo período
          aplicável. Quando possível, os dados serão anonimizados.
        </p>
      </LegalSection>
      <LegalSection title="Ambiente demonstrativo">
        <p>
          Os dados incluídos no modo de demonstração são fictícios. Dados criados no
          navegador podem ser removidos em Configurações ou limpando o armazenamento
          local do site.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
