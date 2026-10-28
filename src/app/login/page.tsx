import { LoginAside, LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(460px,1.05fr)_minmax(420px,0.95fr)]">
      <LoginAside />
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden"><span className="flex size-8 items-center justify-center rounded-md border border-violet/50 bg-violet/15 text-xs font-bold text-violet-soft">Z</span><span className="font-semibold">ZYRVA <span className="font-normal text-muted">Agents</span></span></div>
          <LoginForm />
          <div className="mt-5 flex justify-center gap-4 text-[11px] text-muted"><a href="/privacidade" className="hover:text-foreground">Privacidade</a><a href="/termos" className="hover:text-foreground">Termos de uso</a><span>v0.1 MVP</span></div>
        </div>
      </section>
    </main>
  );
}
