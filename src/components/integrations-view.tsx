"use client";

import { useState } from "react";
import { Bot, CalendarDays, Camera, Cloud, KeyRound, Link2, MessageCircle, MoreHorizontal, Plug, RefreshCw, Send, Webhook, Workflow } from "lucide-react";
import { demoIntegrations } from "@/data/demo";
import { useAppStore } from "@/hooks/use-app-store";
import type { Integration } from "@/types";
import { Badge, Button, Field, IconButton, Input, Modal, PageHeader, Select, Toggle, statusTone } from "@/components/ui";

const icons: Record<string, typeof Plug> = { "WhatsApp Cloud API": MessageCircle, OpenAI: Bot, "Webhook comercial": Webhook, "Google Calendar": CalendarDays, Instagram: Camera, "CRM externo": Workflow };

export function IntegrationsView() {
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const notify = useAppStore((state) => state.notify);
  const [integrations, setIntegrations] = useState<Integration[]>(demoIntegrations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phoneId, setPhoneId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const filtered = integrations.filter((integration) => !integration.companyId || selectedCompanyId === "all" || integration.companyId === selectedCompanyId);
  const selected = integrations.find((integration) => integration.id === selectedId);

  const toggle = (integration: Integration) => {
    if (integration.status === "Planejado") return;
    setIntegrations((current) => current.map((item) => item.id === integration.id ? { ...item, enabled: !item.enabled } : item));
    notify({ title: integration.enabled ? "Integração desativada" : "Integração ativada", description: integration.status === "Simulado" ? "O comportamento continua restrito ao modo de demonstração." : undefined, tone: integration.enabled ? "warning" : "success" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Canais e adaptadores" title="Integrações" description="Acompanhe o que está conectado, simulado ou planejado sem expor credenciais no navegador." actions={<Button icon={RefreshCw} onClick={() => notify({ title: "Estados verificados", description: "Nenhuma conexão real foi acionada.", tone: "success" })}>Verificar estados</Button>} />
      <div className="flex flex-wrap gap-2"><Badge tone="success" dot>Conectado: 0</Badge><Badge tone="violet" dot>Simulado: {filtered.filter((item) => item.status === "Simulado").length}</Badge><Badge tone="warning" dot>Atenção: {filtered.filter((item) => item.status === "Atenção").length}</Badge><Badge tone="neutral" dot>Planejado: {filtered.filter((item) => item.status === "Planejado").length}</Badge></div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Integrações disponíveis">{filtered.map((integration) => { const Icon = icons[integration.name] || Plug; return <article key={integration.id} className="rounded-lg border border-border bg-surface p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-strong"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{integration.name}</h2><p className="text-xs text-muted">{integration.category}</p></div><IconButton icon={MoreHorizontal} label={`Opções de ${integration.name}`} size="sm" onClick={() => setSelectedId(integration.id)} /></div><p className="mt-4 min-h-10 text-sm leading-5 text-muted">{integration.description}</p><div className="mt-4 flex items-center justify-between border-y border-border py-3"><Badge tone={statusTone(integration.status)} dot>{integration.status}</Badge><Toggle checked={integration.enabled} onChange={() => toggle(integration)} label={`${integration.enabled ? "Desativar" : "Ativar"} ${integration.name}`} disabled={integration.status === "Planejado"} /></div><div className="mt-4 flex gap-2">{integration.status === "Planejado" ? <Button size="sm" className="w-full" disabled>Em planejamento</Button> : <><Button size="sm" className="flex-1" onClick={() => setSelectedId(integration.id)}>{integration.name === "WhatsApp Cloud API" ? "Configurar" : "Ver detalhes"}</Button>{integration.status === "Simulado" ? <IconButton icon={Send} label={`Testar ${integration.name}`} onClick={() => notify({ title: "Teste simulado concluído", description: `${integration.name} respondeu no adaptador local.`, tone: "success" })} /> : null}</>}</div></article>; })}</section>

      <section className="flex flex-col gap-4 rounded-lg border border-cyan/25 bg-cyan/[0.04] p-4 sm:flex-row sm:items-center"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan"><Cloud className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">WhatsApp oficial primeiro</h2><p className="mt-1 text-xs leading-5 text-muted">A produção usa exclusivamente a Meta WhatsApp Cloud API. Não há QR Code, automação do WhatsApp Web ou envio em massa.</p></div><Badge tone="cyan">Cloud API</Badge></section>

      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.name || "Integração"} description={selected?.description} size="lg" footer={<><Button onClick={() => setSelectedId(null)}>Fechar</Button>{selected?.name === "WhatsApp Cloud API" ? <Button variant="primary" onClick={() => { setSelectedId(null); notify({ title: "Configuração salva em demonstração", description: "Nenhuma credencial foi persistida no navegador.", tone: "success" }); }}>Salvar configuração</Button> : null}</>}>
        {selected?.name === "WhatsApp Cloud API" ? <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone number ID"><Input value={phoneId} onChange={(event) => setPhoneId(event.target.value)} placeholder="ID público do número" /></Field><Field label="WhatsApp Business Account ID"><Input value={businessId} onChange={(event) => setBusinessId(event.target.value)} placeholder="ID da conta comercial" /></Field><Field label="Versão da Graph API"><Select defaultValue="atual"><option value="atual">Versão configurada no servidor</option></Select></Field><Field label="Estado do canal"><Select defaultValue="test"><option value="test">Modo de teste</option><option value="off">Desativado</option></Select></Field></div><div className="flex gap-3 rounded-md border border-warning/25 bg-warning/[0.05] p-3"><KeyRound className="mt-0.5 size-4 shrink-0 text-warning" /><div><p className="text-sm font-medium">Credenciais protegidas</p><p className="mt-1 text-xs leading-5 text-muted">Tokens de acesso, app secret e verify token são configurados somente no servidor por variáveis de ambiente ou gerenciador de segredos. Eles nunca são exibidos aqui.</p></div></div><div className="rounded-md border border-border bg-background/50 p-3"><p className="text-xs font-medium text-muted-strong">Endpoint de webhook</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded bg-surface-raised px-2 py-2 text-[11px] text-cyan">/api/webhooks/meta</code><IconButton icon={Link2} label="Copiar endpoint" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/api/webhooks/meta`); notify({ title: "Endpoint copiado", tone: "success" }); }} /></div></div></div> : selected ? <div className="space-y-4"><div className="flex items-center gap-3 rounded-md border border-border bg-background/50 p-3"><Badge tone={statusTone(selected.status)} dot>{selected.status}</Badge><p className="text-xs text-muted">{selected.enabled ? "Adaptador habilitado" : "Adaptador desabilitado"}</p></div><p className="text-sm leading-6 text-muted-strong">Esta integração opera somente no adaptador local de demonstração. Configure os segredos no servidor antes de habilitar uso externo.</p></div> : null}
      </Modal>
    </div>
  );
}
