import type { ReactNode } from "react";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <article className="legal-copy">
      <p className="mb-3 text-xs font-medium uppercase text-cyan">ZYRVA Agents</p>
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-muted">Atualizado em {updatedAt}</p>
      <div className="mt-8 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-[#fde68a]">
        Este texto é uma base operacional demonstrativa e precisa ser revisado por
        profissional jurídico antes do uso comercial.
      </div>
      <div className="mt-8 space-y-7 text-[15px] leading-7 text-muted-strong">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
