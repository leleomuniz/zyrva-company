import Link from "next/link";

import { LegalPage, LegalSection } from "../legal-page";

export const metadata = { title: "Solicitação de Dados" };

export default function DataRequestPage() {
  return (
    <LegalPage title="Solicitação de dados" updatedAt="06/08/2026">
      <LegalSection title="Como solicitar">
        <p>
          Entre em contato com a empresa que realizou seu atendimento, informe o número
          de telefone ou e-mail utilizado e descreva se deseja acesso, correção,
          portabilidade ou informação sobre o tratamento.
        </p>
      </LegalSection>
      <LegalSection title="Validação de identidade">
        <p>
          Para evitar exposição indevida, a organização poderá solicitar confirmação de
          identidade proporcional ao pedido. Nunca envie senhas, tokens ou dados de
          pagamento completos.
        </p>
      </LegalSection>
      <p>
        Para pedir eliminação, consulte também a página de{" "}
        <Link href="/exclusao-de-dados" className="text-cyan hover:underline">
          exclusão de dados
        </Link>.
      </p>
    </LegalPage>
  );
}
