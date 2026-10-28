import { LegalPage, LegalSection } from "../legal-page";

export const metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="06/08/2026">
      <LegalSection title="Uso permitido">
        <p>
          A ZYRVA Agents deve ser usada para atendimento empresarial legítimo, com
          consentimento e respeito às políticas dos canais. É proibido fazer spam,
          raspar listas, automatizar contas pessoais ou burlar limites da Meta.
        </p>
      </LegalSection>
      <LegalSection title="Supervisão humana">
        <p>
          Respostas geradas por IA podem conter erros. Preços, prazos, decisões
          sensíveis e ações irreversíveis exigem fontes confiáveis e, quando indicado,
          confirmação humana. O sistema não substitui aconselhamento profissional.
        </p>
      </LegalSection>
      <LegalSection title="Responsabilidades da organização">
        <p>
          A organização deve manter informações corretas, proteger suas credenciais,
          revisar agentes antes da publicação e atender pedidos de titulares. Violações
          podem levar à suspensão das integrações.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
