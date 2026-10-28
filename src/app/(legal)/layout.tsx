import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-14 max-w-4xl items-center justify-between gap-4 px-5">
          <Link href="/login" className="font-semibold text-white">
            ZYRVA <span className="text-cyan">AGENTS</span>
          </Link>
          <Link href="/login" className="text-sm text-muted hover:text-white">
            Voltar ao acesso
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">{children}</main>
      <footer className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 border-t border-border px-5 py-6 text-xs text-muted">
        <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
        <Link href="/termos" className="hover:text-white">Termos de uso</Link>
        <Link href="/solicitacao-de-dados" className="hover:text-white">Solicitar dados</Link>
        <Link href="/exclusao-de-dados" className="hover:text-white">Excluir dados</Link>
      </footer>
    </div>
  );
}
