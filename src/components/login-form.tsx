"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("leonardo@zyrva.demo");
  const [password, setPassword] = useState("ZyrvaDemo!2026");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Não foi possível entrar. Verifique os dados.");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha inesperada ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-border-strong bg-surface p-5 shadow-2xl sm:p-7">
      <div className="mb-6">
        <div className="mb-5 flex size-10 items-center justify-center rounded-md border border-violet/40 bg-violet/15 text-violet-soft"><LockKeyhole className="size-5" /></div>
        <h1 className="text-2xl font-semibold text-foreground">Acesse sua operação</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Gerencie agentes, conversas e resultados em um único ambiente.</p>
      </div>

      <div className="grid gap-4">
        <Field label="E-mail" required>
          <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" required />
        </Field>
        <Field label="Senha" required>
          <div className="relative">
            <Input aria-label="Senha" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-11" required />
            <button type="button" className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
      </div>

      {error ? <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</div> : null}

      <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-5 w-full">Entrar na ZYRVA</Button>

      <div className="mt-5 rounded-md border border-border bg-background/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-strong"><Sparkles className="size-3.5 text-cyan" /> Acesso de demonstração</div>
        <p className="mt-1 text-xs leading-5 text-muted">Os dados fictícios já estão preenchidos. Este ambiente não envia mensagens reais.</p>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted"><ShieldCheck className="size-3.5 text-success" /> Sessão protegida e dados isolados por organização.</p>
    </form>
  );
}

export function LoginAside() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden border-r border-border bg-[#090c12] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="relative z-10 flex items-center gap-3">
        <span className="relative flex size-10 items-center justify-center rounded-md border border-violet/50 bg-violet/15 text-sm font-bold text-violet-soft">Z<span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-sm border-2 border-[#090c12] bg-cyan" /></span>
        <div><p className="font-semibold text-foreground">ZYRVA</p><p className="text-xs text-muted">Agents</p></div>
      </div>
      <div className="relative z-10 max-w-xl py-16">
        <p className="mb-4 text-xs font-semibold uppercase text-cyan">Central de operações com IA</p>
        <h2 className="max-w-lg text-4xl font-semibold leading-[1.08] text-foreground xl:text-6xl">Atendimento inteligente, sob controle humano.</h2>
        <p className="mt-6 max-w-lg text-base leading-7 text-muted">Crie agentes, acompanhe cada conversa e transforme intenção em oportunidade sem perder contexto.</p>
        <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
          {[{ icon: Bot, label: "Agentes revisáveis" }, { icon: Check, label: "Ações auditadas" }, { icon: ShieldCheck, label: "Dados isolados" }].map((item) => (
            <div key={item.label} className="border-l-2 border-border-strong py-1 pl-3"><item.icon className="mb-2 size-4 text-violet-soft" /><p className="text-xs font-medium text-muted-strong">{item.label}</p></div>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-sm bg-success" /> Ambiente de demonstração disponível</div>
      <div className="pointer-events-none absolute -bottom-24 -right-16 grid h-[440px] w-[440px] grid-cols-6 gap-3 opacity-30" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, index) => <span key={index} className="border border-border bg-surface" />)}
      </div>
    </section>
  );
}
