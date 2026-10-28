"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertOctagon, Clock3, Pause, Play, Plus, Search, ShieldAlert, Workflow, Zap } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { Automation } from "@/types";
import { Badge, Button, Field, Input, Modal, PageHeader, Select, Textarea, Toggle } from "@/components/ui";

export function AutomationsView() {
  const automations = useAppStore((state) => state.automations);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const companies = useAppStore((state) => state.companies);
  const toggleAutomation = useAppStore((state) => state.toggleAutomation);
  const addAutomation = useAppStore((state) => state.addAutomation);
  const notify = useAppStore((state) => state.notify);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", trigger: "Lead atualizado", condition: "Etapa = Qualificado", action: "Enviar notificação interna" });
  const companyId = selectedCompanyId === "all" ? companies[0]?.id || "" : selectedCompanyId;
  const filtered = useMemo(() => automations.filter((automation) => (selectedCompanyId === "all" || automation.companyId === selectedCompanyId) && `${automation.name} ${automation.trigger} ${automation.action}`.toLowerCase().includes(query.toLowerCase())), [automations, query, selectedCompanyId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const automation: Automation = { id: `auto-${Date.now()}`, companyId, name: form.name, description: form.description, trigger: form.trigger, condition: form.condition, action: form.action, active: false, executions: 0 };
    addAutomation(automation);
    setModalOpen(false);
    setForm({ name: "", description: "", trigger: "Lead atualizado", condition: "Etapa = Qualificado", action: "Enviar notificação interna" });
    notify({ title: "Automação criada como inativa", description: "Revise as condições antes de ativar.", tone: "success" });
  };

  const emergencyStop = () => {
    filtered.filter((automation) => automation.active).forEach((automation) => toggleAutomation(automation.id));
    setEmergencyOpen(false);
    notify({ title: "Automações interrompidas", description: "Todas as automações do contexto atual foram desativadas.", tone: "warning" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fluxos controlados" title="Automações" description="Combine gatilhos, condições e ações com limites de execução e rastreabilidade." actions={<><Button variant="danger" icon={AlertOctagon} onClick={() => setEmergencyOpen(true)}>Parada de emergência</Button><Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>Nova automação</Button></>} />
      <div className="grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 border-b border-border py-3"><Play className="size-4 text-success" /><div><p className="text-xl font-semibold">{filtered.filter((item) => item.active).length}</p><p className="text-xs text-muted">Ativas</p></div></div><div className="flex items-center gap-3 border-b border-border py-3"><Zap className="size-4 text-cyan" /><div><p className="text-xl font-semibold">{filtered.reduce((sum, item) => sum + item.executions, 0)}</p><p className="text-xs text-muted">Execuções registradas</p></div></div><div className="flex items-center gap-3 border-b border-border py-3"><ShieldAlert className="size-4 text-success" /><div><p className="text-xl font-semibold">0</p><p className="text-xs text-muted">Loops bloqueados</p></div></div></div>
      <label className="relative block"><span className="sr-only">Buscar automações</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, gatilho ou ação" className="pl-9" /></label>
      <div className="grid gap-4 lg:grid-cols-2">{filtered.map((automation) => <article key={automation.id} className="rounded-lg border border-border bg-surface p-4"><div className="flex items-start gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-md border ${automation.active ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted"}`}><Workflow className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold">{automation.name}</h2><Badge tone={automation.active ? "success" : "neutral"} dot>{automation.active ? "Ativa" : "Inativa"}</Badge></div><p className="mt-1 text-xs leading-5 text-muted">{automation.description}</p></div></div><div className="mt-4 grid gap-2 rounded-md border border-border bg-background/40 p-3 text-xs sm:grid-cols-[1fr_auto_1fr_auto_1fr]"><div><p className="text-[9px] font-semibold uppercase text-violet-soft">Quando</p><p className="mt-1 text-muted-strong">{automation.trigger}</p></div><span className="hidden self-center text-muted sm:block">→</span><div><p className="text-[9px] font-semibold uppercase text-cyan">Se</p><p className="mt-1 text-muted-strong">{automation.condition}</p></div><span className="hidden self-center text-muted sm:block">→</span><div><p className="text-[9px] font-semibold uppercase text-success">Então</p><p className="mt-1 text-muted-strong">{automation.action}</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3 text-[11px] text-muted"><span>{automation.executions} execuções</span>{automation.lastRun ? <span className="flex items-center gap-1"><Clock3 className="size-3" />{automation.lastRun}</span> : null}</div><Toggle checked={automation.active} onChange={() => { toggleAutomation(automation.id); notify({ title: automation.active ? "Automação desativada" : "Automação ativada", tone: automation.active ? "warning" : "success" }); }} label={`${automation.active ? "Desativar" : "Ativar"} ${automation.name}`} /></div></article>)}</div>
      {!filtered.length ? <div className="rounded-lg border border-dashed border-border-strong py-16 text-center"><Workflow className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-medium">Nenhuma automação encontrada</p></div> : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Criar automação" description="Novas automações começam inativas para revisão." footer={<><Button onClick={() => setModalOpen(false)}>Cancelar</Button><Button form="automation-form" type="submit" variant="primary">Criar automação</Button></>}>
        <form id="automation-form" onSubmit={submit} className="space-y-4"><Field label="Nome" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Avisar equipe comercial" required /></Field><Field label="Descrição"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label="Gatilho"><Select value={form.trigger} onChange={(event) => setForm({ ...form, trigger: event.target.value })}><option>Lead atualizado</option><option>Mensagem recebida</option><option>Encaminhamento solicitado</option><option>Resposta com baixa confiança</option></Select></Field><Field label="Condição"><Input value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} /></Field><Field label="Ação"><Select value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })}><option>Enviar notificação interna</option><option>Pausar IA e atribuir fila</option><option>Enviar mensagem configurada</option><option>Encaminhar para humano</option></Select></Field><div className="rounded-md border border-border bg-background/50 p-3 text-xs leading-5 text-muted">Limite padrão: uma execução por evento, até três ações e bloqueio automático de repetição.</div></form>
      </Modal>
      <Modal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} title="Interromper todas as automações?" description="Esta ação é imediata e será registrada na auditoria." footer={<><Button onClick={() => setEmergencyOpen(false)}>Cancelar</Button><Button variant="danger" icon={Pause} onClick={emergencyStop}>Interromper agora</Button></>} size="sm"><div className="flex gap-3 rounded-md border border-danger/30 bg-danger/10 p-3"><AlertOctagon className="size-5 shrink-0 text-danger" /><p className="text-sm leading-6 text-muted-strong">As automações ativas no contexto atual deixarão de executar novos eventos. Conversas em andamento não serão apagadas.</p></div></Modal>
    </div>
  );
}
