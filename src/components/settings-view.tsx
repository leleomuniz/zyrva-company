"use client";

import { useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  Database,
  Download,
  KeyRound,
  LockKeyhole,
  Mail,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import { Badge, Button, Field, Input, Modal, PageHeader, Select, Toggle, cn } from "@/components/ui";

const tabs = [
  { id: "geral", label: "Geral", icon: Building2 },
  { id: "equipe", label: "Equipe e acesso", icon: UsersRound },
  { id: "limites", label: "Uso e limites", icon: SlidersHorizontal },
  { id: "seguranca", label: "Segurança", icon: LockKeyhole },
  { id: "privacidade", label: "Privacidade e LGPD", icon: ShieldCheck },
] as const;
type TabId = (typeof tabs)[number]["id"];

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-xl"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div><div className="shrink-0">{children}</div></div>;
}

export function SettingsView() {
  const companies = useAppStore((state) => state.companies);
  const selectedCompanyId = useAppStore((state) => state.selectedCompanyId);
  const resetDemo = useAppStore((state) => state.resetDemo);
  const notify = useAppStore((state) => state.notify);
  const company = companies.find((item) => item.id === selectedCompanyId) || companies[0];
  const [tab, setTab] = useState<TabId>("geral");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "Atendente" });
  const [members, setMembers] = useState([
    { name: "Leonardo Alves", email: "leonardo@zyrva.demo", role: "Administrador ZYRVA", status: "Ativo" },
    { name: "Marina Costa", email: "marina@zyrva.demo", role: "Gestor da empresa", status: "Ativo" },
    { name: "Carlos Mendes", email: "carlos@zyrva.demo", role: "Atendente", status: "Convite pendente" },
  ]);
  const [preferences, setPreferences] = useState({ notifications: true, incidents: true, weekly: false, piiLogs: false, humanApproval: true, tokenLimit: 500000, messageLimit: 10000, retention: "180 dias" });

  const save = () => notify({ title: "Configurações salvas", description: "As preferências foram atualizadas localmente.", tone: "success" });
  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    const name = invite.email.split("@")[0].split(/[._-]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    setMembers((current) => [...current, { name, email: invite.email, role: invite.role, status: "Convite pendente" }]);
    setInviteOpen(false);
    setInvite({ email: "", role: "Atendente" });
    notify({ title: "Convite criado", description: "No modo de demonstração, nenhum e-mail externo foi enviado.", tone: "success" });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administração" title="Configurações" description="Defina preferências regionais, acessos, limites operacionais e controles de privacidade." actions={<Button variant="primary" icon={Save} onClick={save}>Salvar alterações</Button>} />
      <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Seções de configuração">{tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn("flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium", tab === item.id ? "border-cyan text-foreground" : "border-transparent text-muted hover:text-foreground")}><item.icon className="size-3.5" />{item.label}</button>)}</div>

      {tab === "geral" ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-border bg-surface p-4 sm:p-5"><h2 className="text-sm font-semibold">Empresa em contexto</h2><p className="mt-1 text-xs text-muted">Dados exibidos em comunicações e relatórios internos.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Nome da empresa"><Input defaultValue={company?.name} /></Field><Field label="Razão social"><Input defaultValue={company?.legalName} /></Field><Field label="CNPJ"><Input defaultValue={company?.document} /></Field><Field label="Telefone"><Input defaultValue={company?.phone} /></Field><Field label="E-mail"><Input type="email" defaultValue={company?.email} /></Field><Field label="Cidade"><Input defaultValue={company?.city} /></Field></div><div className="mt-6 border-t border-border pt-5"><h3 className="text-sm font-semibold">Configurações regionais</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Fuso horário"><Select defaultValue="America/Fortaleza"><option>America/Fortaleza</option><option>America/Sao_Paulo</option><option>America/Manaus</option></Select></Field><Field label="Idioma"><Select defaultValue="pt-BR"><option value="pt-BR">Português do Brasil</option></Select></Field><Field label="Moeda"><Select defaultValue="BRL"><option value="BRL">BRL · Real brasileiro</option></Select></Field><Field label="Formato de data"><Select defaultValue="ddmmyyyy"><option value="ddmmyyyy">DD/MM/AAAA</option></Select></Field></div></div></section>
        <aside className="space-y-4"><section className="rounded-lg border border-border bg-surface p-4"><h2 className="text-sm font-semibold">Notificações</h2><div className="mt-2"><SettingRow title="Encaminhamentos" description="Avisar quando um cliente pedir atendimento humano."><Toggle checked={preferences.notifications} onChange={(value) => setPreferences({ ...preferences, notifications: value })} label="Notificações de encaminhamento" /></SettingRow><SettingRow title="Incidentes" description="Avisar sobre falhas de integração."><Toggle checked={preferences.incidents} onChange={(value) => setPreferences({ ...preferences, incidents: value })} label="Notificações de incidentes" /></SettingRow><SettingRow title="Resumo semanal" description="Receber consolidação operacional."><Toggle checked={preferences.weekly} onChange={(value) => setPreferences({ ...preferences, weekly: value })} label="Resumo semanal" /></SettingRow></div></section><section className="rounded-lg border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase text-muted">Organização</p><p className="mt-2 text-sm font-medium">ZYRVA Operações</p><p className="mt-1 text-xs text-muted">Plano demonstrativo · 3 empresas</p></section></aside>
      </div> : null}

      {tab === "equipe" ? <section className="overflow-hidden rounded-lg border border-border bg-surface"><div className="flex items-center justify-between border-b border-border p-4"><div><h2 className="text-sm font-semibold">Membros da organização</h2><p className="mt-1 text-xs text-muted">Permissões aplicadas no servidor e isoladas por organização.</p></div><Button icon={Plus} onClick={() => setInviteOpen(true)}>Convidar pessoa</Button></div><div className="divide-y divide-border">{members.map((member) => <div key={member.email} className="grid gap-3 p-4 sm:grid-cols-[minmax(220px,1fr)_190px_140px] sm:items-center"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-cyan/10 text-cyan"><UserRound className="size-4" /></span><div><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-muted">{member.email}</p></div></div><Select defaultValue={member.role} aria-label={`Função de ${member.name}`} disabled={member.role === "Administrador ZYRVA"}><option>Administrador ZYRVA</option><option>Gestor da empresa</option><option>Atendente</option><option>Somente leitura</option></Select><Badge tone={member.status === "Ativo" ? "success" : "warning"} dot>{member.status}</Badge></div>)}</div></section> : null}

      {tab === "limites" ? <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-lg border border-border bg-surface p-5"><h2 className="text-sm font-semibold">Limites mensais</h2><p className="mt-1 text-xs text-muted">Proteções por organização para evitar custo e uso inesperados.</p><div className="mt-5 space-y-6"><Field label={`Limite de tokens: ${preferences.tokenLimit.toLocaleString("pt-BR")}`}><input type="range" min="100000" max="2000000" step="50000" value={preferences.tokenLimit} onChange={(event) => setPreferences({ ...preferences, tokenLimit: Number(event.target.value) })} className="w-full accent-violet" /></Field><Field label={`Limite de mensagens: ${preferences.messageLimit.toLocaleString("pt-BR")}`}><input type="range" min="1000" max="50000" step="1000" value={preferences.messageLimit} onChange={(event) => setPreferences({ ...preferences, messageLimit: Number(event.target.value) })} className="w-full accent-cyan" /></Field><SettingRow title="Interromper ao atingir limite" description="Pausa novas respostas automáticas e alerta administradores."><Toggle checked onChange={() => undefined} label="Interromper no limite" /></SettingRow></div></section><section className="rounded-lg border border-border bg-surface p-5"><h2 className="text-sm font-semibold">Limites por execução</h2><div className="mt-4 divide-y divide-border"><SettingRow title="Tempo máximo" description="Tempo total por resposta antes do fallback."><Select defaultValue="30" className="w-28"><option value="15">15 s</option><option value="30">30 s</option><option value="60">60 s</option></Select></SettingRow><SettingRow title="Chamadas de ferramenta" description="Máximo por turno de conversa."><Select defaultValue="3" className="w-28"><option>1</option><option>2</option><option>3</option><option>5</option></Select></SettingRow><SettingRow title="Proteção contra loops" description="Bloqueia repetição da mesma ação."><Badge tone="success" dot>Obrigatória</Badge></SettingRow><SettingRow title="Aprovação humana" description="Exige confirmação para ações sensíveis."><Toggle checked={preferences.humanApproval} onChange={(value) => setPreferences({ ...preferences, humanApproval: value })} label="Aprovação humana" /></SettingRow></div></section></div> : null}

      {tab === "seguranca" ? <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center gap-2"><KeyRound className="size-4 text-cyan" /><h2 className="text-sm font-semibold">Sessão e autenticação</h2></div><div className="mt-3 divide-y divide-border"><SettingRow title="Sessão atual" description="Windows · Fortaleza, Brasil · ativa agora"><Badge tone="success" dot>Atual</Badge></SettingRow><SettingRow title="Expiração" description="Tempo máximo sem atividade."><Select defaultValue="8" className="w-32"><option value="2">2 horas</option><option value="8">8 horas</option><option value="24">24 horas</option></Select></SettingRow><SettingRow title="Autenticação multifator" description="Camada adicional para administradores."><Badge tone="warning">Planejada</Badge></SettingRow></div></section><section className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /><h2 className="text-sm font-semibold">Controles ativos</h2></div><ul className="mt-4 space-y-3 text-xs text-muted-strong">{["Isolamento por organização", "Validação de entradas", "Assinatura de webhooks", "Redação de dados sensíveis nos logs", "Rate limiting por identidade", "Registro de ações administrativas"].map((item) => <li key={item} className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded bg-success/10 text-success"><Check className="size-3" /></span>{item}</li>)}</ul></section></div> : null}

      {tab === "privacidade" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center gap-2"><Database className="size-4 text-violet-soft" /><h2 className="text-sm font-semibold">Dados e retenção</h2></div><div className="mt-3"><SettingRow title="Período de retenção" description="Conversas e eventos além deste período entram na fila de anonimização."><Select value={preferences.retention} onChange={(event) => setPreferences({ ...preferences, retention: event.target.value })} className="w-36"><option>90 dias</option><option>180 dias</option><option>365 dias</option></Select></SettingRow><SettingRow title="Conteúdo pessoal nos logs" description="Registros técnicos usam apenas identificadores e conteúdo redigido."><Toggle checked={preferences.piiLogs} onChange={(value) => setPreferences({ ...preferences, piiLogs: value })} label="Conteúdo pessoal nos logs" disabled /></SettingRow><SettingRow title="Exportação de dados" description="Prepara um pacote com os dados da empresa em contexto."><Button icon={Download} onClick={() => notify({ title: "Solicitação registrada", description: "A exportação demonstrativa entrou na fila.", tone: "success" })}>Solicitar exportação</Button></SettingRow><SettingRow title="Solicitações de titulares" description="Canal para acesso, correção ou exclusão de dados."><Button icon={Mail} onClick={() => notify({ title: "Central de solicitações aberta", description: "Fluxo demonstrativo registrado.", tone: "success" })}>Nova solicitação</Button></SettingRow></div></section><aside className="space-y-4"><section className="rounded-lg border border-warning/25 bg-warning/[0.05] p-4"><h2 className="text-sm font-semibold text-warning">Revisão jurídica necessária</h2><p className="mt-2 text-xs leading-5 text-muted">Os controles apoiam boas práticas de LGPD, mas não representam certificação ou parecer jurídico. Políticas devem ser revisadas antes da operação comercial.</p></section><section className="rounded-lg border border-danger/25 bg-danger/[0.04] p-4"><h2 className="text-sm font-semibold">Restaurar demonstração</h2><p className="mt-1 text-xs leading-5 text-muted">Apaga alterações locais e repõe as três empresas fictícias.</p><Button variant="danger" icon={RefreshCw} className="mt-4 w-full" onClick={() => setResetOpen(true)}>Restaurar dados</Button></section><section className="rounded-lg border border-border bg-surface p-4"><h2 className="text-sm font-semibold">Excluir dados da empresa</h2><p className="mt-1 text-xs leading-5 text-muted">A exclusão real exige validação de identidade e processamento no servidor.</p><Button variant="ghost" icon={Trash2} className="mt-4 w-full text-danger" onClick={() => setDeleteOpen(true)}>Solicitar exclusão</Button></section></aside></div> : null}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Convidar pessoa" description="Defina o menor nível de acesso necessário." footer={<><Button onClick={() => setInviteOpen(false)}>Cancelar</Button><Button form="invite-form" type="submit" variant="primary">Criar convite</Button></>}><form id="invite-form" onSubmit={submitInvite} className="space-y-4"><Field label="E-mail" required><Input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} required /></Field><Field label="Função"><Select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}><option>Gestor da empresa</option><option>Atendente</option><option>Somente leitura</option></Select></Field></form></Modal>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restaurar dados de demonstração?" description="Todas as alterações persistidas neste navegador serão removidas." footer={<><Button onClick={() => setResetOpen(false)}>Cancelar</Button><Button variant="danger" icon={RefreshCw} onClick={() => { resetDemo(); setResetOpen(false); notify({ title: "Demonstração restaurada", tone: "success" }); }}>Restaurar</Button></>} size="sm"><p className="text-sm leading-6 text-muted-strong">Empresas, agentes, conversas, leads, conhecimento e automações voltarão ao estado inicial fictício.</p></Modal>
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Solicitar exclusão" description="Esta ação não será executada automaticamente no modo de demonstração." footer={<Button onClick={() => setDeleteOpen(false)}>Entendi</Button>} size="sm"><p className="text-sm leading-6 text-muted-strong">Em produção, a solicitação exige validação de identidade, análise de retenções obrigatórias e registro completo na auditoria.</p></Modal>
    </div>
  );
}
