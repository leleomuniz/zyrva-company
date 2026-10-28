"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Bot, Building2, Check, MapPin, MessageSquareText, Phone, Plus, Search } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import type { Company, CompanyStatus } from "@/types";
import { Badge, Button, Field, Input, LinkButton, Modal, PageHeader, Select, cn, statusTone } from "@/components/ui";

const accentClasses = { violet: "border-violet/40 bg-violet/10 text-violet-soft", cyan: "border-cyan/40 bg-cyan/10 text-cyan", amber: "border-warning/40 bg-warning/10 text-warning" };

export function CompaniesView() {
  const companies = useAppStore((state) => state.companies);
  const agents = useAppStore((state) => state.agents);
  const conversations = useAppStore((state) => state.conversations);
  const addCompany = useAppStore((state) => state.addCompany);
  const setSelectedCompany = useAppStore((state) => state.setSelectedCompany);
  const notify = useAppStore((state) => state.notify);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todas" | CompanyStatus>("Todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", segment: "", document: "", phone: "+55 ", email: "", city: "Fortaleza, CE" });

  const filtered = useMemo(() => companies.filter((company) => {
    const text = `${company.name} ${company.segment} ${company.city}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "Todas" || company.status === status);
  }), [companies, query, status]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = `company-${Date.now()}`;
    const company: Company = {
      id,
      name: form.name.trim(),
      initials: form.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      segment: form.segment.trim(),
      legalName: form.name.trim(),
      document: form.document || "Não informado",
      phone: form.phone,
      email: form.email,
      city: form.city,
      status: "Implantação",
      channelStatus: "Pendente",
      accent: "violet",
      createdAt: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    };
    addCompany(company);
    setModalOpen(false);
    setForm({ name: "", segment: "", document: "", phone: "+55 ", email: "", city: "Fortaleza, CE" });
    notify({ title: "Empresa cadastrada", description: `${company.name} agora está no contexto ativo.`, tone: "success" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Carteira de clientes" title="Empresas" description="Gerencie clientes com isolamento de dados, agentes e canais por empresa." actions={<Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>Nova empresa</Button>} />

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Empresas ativas", value: companies.filter((company) => company.status === "Ativa").length, icon: Check, color: "text-success" }, { label: "Em implantação", value: companies.filter((company) => company.status === "Implantação").length, icon: Building2, color: "text-warning" }, { label: "Canais conectados", value: companies.filter((company) => company.channelStatus === "Conectado").length, icon: MessageSquareText, color: "text-cyan" }].map((item) => (
          <div key={item.label} className="flex items-center gap-3 border-b border-border py-3"><item.icon className={cn("size-4", item.color)} /><div><p className="text-xl font-semibold">{item.value}</p><p className="text-xs text-muted">{item.label}</p></div></div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">Buscar empresas</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, segmento ou cidade" className="pl-9" /></label>
        <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="sm:w-48"><option>Todas</option><option>Ativa</option><option>Implantação</option><option>Pausada</option></Select>
      </div>

      {filtered.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Empresas cadastradas">
          {filtered.map((company) => {
            const agentCount = agents.filter((agent) => agent.companyId === company.id).length;
            const conversationCount = conversations.filter((conversation) => conversation.companyId === company.id).length;
            return (
              <article key={company.id} className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                <div className="flex items-start gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md border text-xs font-semibold", accentClasses[company.accent])}>{company.initials}</span>
                  <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{company.name}</h2><p className="truncate text-xs text-muted">{company.segment}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><Badge tone={statusTone(company.status)} dot>{company.status}</Badge><Badge tone={statusTone(company.channelStatus)}>{company.channelStatus === "Conectado" ? "WhatsApp conectado" : "Canal pendente"}</Badge></div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-xs"><div><dt className="text-muted">Agentes</dt><dd className="mt-1 flex items-center gap-1.5 font-medium"><Bot className="size-3 text-violet-soft" />{agentCount}</dd></div><div><dt className="text-muted">Conversas</dt><dd className="mt-1 flex items-center gap-1.5 font-medium"><MessageSquareText className="size-3 text-cyan" />{conversationCount}</dd></div></dl>
                <div className="mt-3 space-y-1.5 text-xs text-muted"><p className="flex items-center gap-2"><MapPin className="size-3.5" /> {company.city}</p><p className="flex items-center gap-2"><Phone className="size-3.5" /> {company.phone}</p></div>
                <div className="mt-4 flex gap-2"><LinkButton href="/agentes" className="flex-1" size="sm" onClick={() => setSelectedCompany(company.id)}>Abrir contexto</LinkButton><Link href="/agentes/novo" title={`Criar agente para ${company.name}`} aria-label={`Criar agente para ${company.name}`} onClick={() => setSelectedCompany(company.id)} className="flex size-9 items-center justify-center rounded-md border border-border bg-surface-raised text-muted hover:bg-surface-hover hover:text-foreground"><Plus className="size-4" /></Link></div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong py-16 text-center"><Building2 className="mx-auto size-6 text-muted" /><p className="mt-3 font-medium">Nenhuma empresa encontrada</p><p className="mt-1 text-sm text-muted">Ajuste os filtros ou cadastre uma nova empresa.</p></div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar empresa" description="A empresa tera um contexto isolado para agentes, conversas e dados." footer={<><Button onClick={() => setModalOpen(false)}>Cancelar</Button><Button form="company-form" type="submit" variant="primary">Cadastrar empresa</Button></>}>
        <form id="company-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da empresa" required className="sm:col-span-2"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Oficina Horizonte" required /></Field>
          <Field label="Segmento" required className="sm:col-span-2"><Input value={form.segment} onChange={(event) => setForm({ ...form, segment: event.target.value })} placeholder="Ex.: Serviços automotivos" required /></Field>
          <Field label="CNPJ"><Input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} placeholder="00.000.000/0000-00" /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="contato@empresa.com.br" /></Field>
          <Field label="Cidade"><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
        </form>
      </Modal>
    </div>
  );
}
