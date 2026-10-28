"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Search, SlidersHorizontal, Tag, UserRound, UsersRound } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import { csvCell } from "@/lib/csv";
import type { Lead, LeadStage } from "@/types";
import { Badge, Button, Input, Modal, PageHeader, Select, cn, statusTone } from "@/components/ui";

const stages: LeadStage[] = ["Novo", "Qualificando", "Qualificado", "Proposta", "Negociação", "Convertido", "Perdido"];
const stageLabel = (stage: LeadStage) => stage;

function downloadCsv(leads: Lead[]) {
  const headings = ["Nome", "Telefone", "E-mail", "Interesse", "Origem", "Etapa", "Responsável", "Consentimento", "Última interação"];
  const rows = leads.map((lead) => [lead.name, lead.phone, lead.email, lead.interest, lead.source, stageLabel(lead.stage), lead.owner, lead.consent ? "Sim" : "Não", lead.lastInteractionAt].map(csvCell).join(";"));
  const blob = new Blob(["\uFEFF", headings.map(csvCell).join(";"), "\n", rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zyrva-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LeadsView() {
  const leads = useAppStore((state) => state.leads);
  const companies = useAppStore((state) => state.companies);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const updateLeadStage = useAppStore((state) => state.updateLeadStage);
  const notify = useAppStore((state) => state.notify);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"Todas" | LeadStage>("Todas");
  const [source, setSource] = useState("Todas");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const filtered = useMemo(() => leads.filter((lead) => {
    const companyMatch = selectedCompanyId === "all" || lead.companyId === selectedCompanyId;
    const text = `${lead.name} ${lead.phone} ${lead.email || ""} ${lead.interest}`.toLowerCase();
    return companyMatch && text.includes(query.toLowerCase()) && (stage === "Todas" || lead.stage === stage) && (source === "Todas" || lead.source === source);
  }), [leads, query, selectedCompanyId, source, stage]);
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
  const scoped = leads.filter((lead) => selectedCompanyId === "all" || lead.companyId === selectedCompanyId);

  const changeStage = (leadId: string, next: LeadStage) => {
    updateLeadStage(leadId, next);
    notify({ title: "Etapa atualizada", description: next === "Convertido" ? "Conversão confirmada por ação humana." : `Lead movido para ${stageLabel(next)}.`, tone: "success" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM essencial" title="Leads" description="Organize oportunidades capturadas pelos agentes e confirme manualmente cada avanço comercial." actions={<Button icon={Download} onClick={() => { downloadCsv(filtered); notify({ title: "CSV exportado", description: `${filtered.length} registros incluídos.`, tone: "success" }); }}>Exportar CSV</Button>} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumo dos leads">
        {[{ label: "Total", value: scoped.length, tone: "text-foreground" }, { label: "Qualificados", value: scoped.filter((lead) => lead.stage === "Qualificado").length, tone: "text-violet-soft" }, { label: "Em proposta", value: scoped.filter((lead) => lead.stage === "Proposta").length, tone: "text-warning" }, { label: "Convertidos", value: scoped.filter((lead) => lead.stage === "Convertido").length, tone: "text-success" }].map((item) => <div key={item.label} className="border-b border-border py-3"><p className={cn("text-2xl font-semibold", item.tone)}>{item.value}</p><p className="mt-1 text-xs text-muted">{item.label}</p></div>)}
      </section>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1"><span className="sr-only">Buscar leads</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone, e-mail ou interesse" className="pl-9" /></label>
        <div className="grid grid-cols-2 gap-3 lg:flex"><Select value={stage} onChange={(event) => setStage(event.target.value as typeof stage)} className="lg:w-44"><option value="Todas">Todas as etapas</option>{stages.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}</Select><Select value={source} onChange={(event) => setSource(event.target.value)} className="lg:w-40"><option>Todas</option><option>WhatsApp</option><option>Playground</option><option>Indicação</option></Select></div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="border-b border-border bg-background/45 text-[10px] font-semibold uppercase text-muted"><tr><th className="w-[23%] px-4 py-3">Contato</th><th className="w-[24%] px-4 py-3">Interesse</th><th className="w-[13%] px-4 py-3">Origem</th><th className="w-[17%] px-4 py-3">Etapa</th><th className="w-[15%] px-4 py-3">Responsável</th><th className="w-[8%] px-4 py-3"><span className="sr-only">Detalhes</span></th></tr></thead>
          <tbody className="divide-y divide-border">{filtered.map((lead) => <tr key={lead.id} className="hover:bg-surface-hover"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-raised text-[10px] font-semibold text-muted-strong">{lead.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{lead.name}</p><p className="truncate text-[11px] text-muted">{lead.phone}</p></div></div></td><td className="px-4 py-3"><p className="truncate text-xs text-muted-strong">{lead.interest}</p><div className="mt-1 flex gap-1">{lead.tags.slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></td><td className="px-4 py-3 text-xs text-muted">{lead.source}</td><td className="px-4 py-3"><Select aria-label={`Etapa de ${lead.name}`} value={lead.stage} onChange={(event) => changeStage(lead.id, event.target.value as LeadStage)} className="h-8 text-xs">{stages.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}</Select></td><td className="px-4 py-3"><p className="truncate text-xs text-muted-strong">{lead.owner}</p><p className="mt-1 text-[10px] text-muted">{lead.lastInteractionAt}</p></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelectedLeadId(lead.id)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted hover:text-foreground">Abrir</button></td></tr>)}</tbody>
        </table>
        {!filtered.length ? <div className="py-16 text-center"><UsersRound className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-medium">Nenhum lead encontrado</p></div> : null}
      </div>

      <div className="grid gap-3 md:hidden">{filtered.map((lead) => <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="rounded-lg border border-border bg-surface p-4 text-left"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-raised text-xs font-semibold">{lead.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div className="min-w-0 flex-1"><p className="font-medium">{lead.name}</p><p className="text-xs text-muted">{lead.phone}</p></div><Badge tone={statusTone(lead.stage)}>{stageLabel(lead.stage)}</Badge></div><p className="mt-3 text-sm text-muted-strong">{lead.interest}</p><div className="mt-3 flex items-center justify-between text-[11px] text-muted"><span>{lead.source}</span><span>{lead.lastInteractionAt}</span></div></button>)}</div>

      <Modal open={Boolean(selectedLead)} onClose={() => setSelectedLeadId(null)} title={selectedLead?.name || "Detalhes do lead"} description={selectedLead ? `${selectedLead.phone} · ${companies.find((company) => company.id === selectedLead.companyId)?.name}` : undefined} size="lg" footer={<><Button onClick={() => setSelectedLeadId(null)}>Fechar</Button>{selectedLead && selectedLead.stage !== "Convertido" ? <Button variant="success" icon={CheckCircle2} onClick={() => changeStage(selectedLead.id, "Convertido")}>Confirmar conversão</Button> : null}</>}>
        {selectedLead ? <div className="grid gap-6 sm:grid-cols-2"><section><h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><UserRound className="size-3.5" /> Contato</h3><dl className="mt-3 divide-y divide-border text-sm"><div className="flex justify-between gap-3 py-2"><dt className="text-muted">Nome</dt><dd>{selectedLead.name}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-muted">Telefone</dt><dd>{selectedLead.phone}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-muted">E-mail</dt><dd className="truncate">{selectedLead.email || "Não informado"}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-muted">Consentimento</dt><dd className={selectedLead.consent ? "text-success" : "text-warning"}>{selectedLead.consent ? "Registrado" : "Pendente"}</dd></div></dl></section><section><h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><SlidersHorizontal className="size-3.5" /> Oportunidade</h3><dl className="mt-3 divide-y divide-border text-sm"><div className="py-2"><dt className="text-muted">Interesse</dt><dd className="mt-1">{selectedLead.interest}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-muted">Orçamento</dt><dd>{selectedLead.budget || "Não informado"}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-muted">Data preferida</dt><dd>{selectedLead.preferredDate || "Não informada"}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-muted">Origem</dt><dd>{selectedLead.source}</dd></div></dl></section><section className="sm:col-span-2"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted"><Tag className="size-3.5" /> Notas e etiquetas</h3><p className="mt-3 rounded-md border border-border bg-background/50 p-3 text-sm leading-6 text-muted-strong">{selectedLead.notes}</p><div className="mt-3 flex flex-wrap gap-2">{selectedLead.tags.map((tag) => <Badge key={tag} tone="violet">{tag}</Badge>)}</div></section></div> : null}
      </Modal>
    </div>
  );
}
