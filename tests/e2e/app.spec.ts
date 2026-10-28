import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { AUTH_COOKIE_NAME, signDemoSession } from "@/lib/server/auth";

const demoCredentials = {
  email: "leonardo@zyrva.demo",
  password: "ZyrvaDemo!2026",
};

async function login(page: Page) {
  const token = await signDemoSession(demoCredentials.email);
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: token,
      url: "http://localhost:3000",
    },
  ]);
}

test("protege o painel e permite autenticação demonstrativa", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  await page.getByLabel("E-mail").fill(demoCredentials.email);
  await page.getByLabel("Senha", { exact: true }).fill(demoCredentials.password);
  await page.getByRole("button", { name: "Entrar na ZYRVA" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Dados de demonstração", { exact: false })).toBeVisible();
});

test("rejeita cookie de sessão forjado", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "zyrva_session",
      value: "token-forjado",
      url: "http://localhost:3000",
    },
  ]);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session$/);
});

test("recupera o painel quando o estado local esta corrompido", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("zyrva-demo-state-v1", JSON.stringify({
    state: { selectedCompanyId: "missing", companies: null, conversations: null },
    version: 1,
  })));
  await login(page);

  await page.goto("/dashboard");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText("Dados de demonstração", { exact: false })).toBeVisible();
});

test("carrega as áreas principais sem estouro horizontal", async ({ page }, testInfo) => {
  await login(page);

  const routes = [
    "/dashboard",
    "/empresas",
    "/agentes",
    "/agentes/novo",
    "/playground",
    "/conversas",
    "/leads",
    "/conhecimento",
    "/automacoes",
    "/metricas",
    "/integracoes",
    "/auditoria",
    "/configuracoes",
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
    await expect(page.getByRole("main")).toBeVisible();
    if (route === "/dashboard" || route === "/playground") {
      await page.waitForTimeout(900);
      await page.screenshot({
        path: `test-results/visual-${testInfo.project.name}-${route.slice(1)}.png`,
        fullPage: true,
      });
    }
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `A rota ${route} não deve estourar a largura da página`).toBe(false);
  }
});

test("login e painel não têm violações WCAG A/AA detectáveis", async ({ page }) => {
  await page.goto("/login");
  const loginResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(loginResults.violations).toEqual([]);

  await login(page);
  await page.goto("/dashboard");
  const dashboardResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dashboardResults.violations).toEqual([]);
});

test("cria empresa, conhecimento e publica um agente demonstrativo", async ({ page }) => {
  await login(page);

  await page.goto("/empresas");
  await page.getByRole("button", { name: "Nova empresa" }).click();
  await page.getByLabel("Nome da empresa").fill("Horizonte Serviços");
  await page.getByLabel("Segmento").fill("Serviços residenciais");
  await page.getByRole("button", { name: "Cadastrar empresa" }).click();
  await expect(page.getByRole("heading", { name: "Horizonte Serviços" })).toBeVisible();

  await page.goto("/conhecimento");
  await page.getByRole("button", { name: "Adicionar conhecimento" }).click();
  await page.getByLabel("Tipo de conhecimento").getByRole("button", { name: "Texto", exact: true }).click();
  await page.getByLabel("Título").fill("Guia Horizonte");
  await page.getByLabel("Conteúdo").fill("Atendimento de segunda a sexta, das 8h às 18h.");
  await page.getByRole("button", { name: "Adicionar fonte" }).click();
  await expect(page.getByRole("heading", { name: "Guia Horizonte" })).toBeVisible();

  await page.goto("/agentes/novo");
  await page.getByRole("button", { name: "Gerar rascunho com IA" }).click();
  await expect(page.getByText("Rascunho gerado", { exact: true })).toBeVisible();
  await page.getByLabel("Nome do agente").fill("Nina Horizonte");

  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Serviços e produtos").fill("Limpeza residencial");
  await page.getByLabel("Serviços e produtos").press("Enter");

  for (let step = 2; step < 11; step += 1) {
    const next = page.getByRole("button", { name: "Continuar", exact: true });
    await expect(next).toBeEnabled();
    await next.click();
  }

  await page.getByRole("checkbox", { name: /autorizo a publicação demonstrativa/i }).check();
  await page.getByRole("button", { name: "Publicar versão 1" }).click();
  await expect(page).toHaveURL(/\/agentes$/);
  await expect(page.getByRole("heading", { name: "Nina Horizonte" })).toBeVisible();
});

test("captura lead no playground e pausa a IA no atendimento humano", async ({ page }) => {
  await login(page);

  await page.goto("/playground");
  await page.getByLabel("Empresa em contexto").selectOption({ label: "RBR Garage" });
  await page.getByPlaceholder("Digite como se fosse um cliente...").fill(
    "Meu nome é Marina Lima e meu telefone é 85999990000. Tenho interesse em lavagem técnica e autorizo o contato.",
  );
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Lead capturado na demonstração", { exact: true })).toBeVisible();

  await page.goto("/leads");
  await expect(page.getByText("Marina Lima", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Marina Lima", { exact: true }).filter({ visible: true })).toBeVisible();

  await page.goto("/conversas");
  const contact = page.getByRole("button", { name: /Marcos Lima/ }).filter({ visible: true });
  await contact.click();
  await page.getByRole("button", { name: "Assumir", exact: true }).first().click();
  await expect(page.getByText("Modo humano:", { exact: false })).toBeVisible();
  await page.getByPlaceholder("Responder como Leonardo...").fill("Olá, vou continuar seu atendimento por aqui.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Olá, vou continuar seu atendimento por aqui.", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Devolver à IA" }).click();
  await expect(page.getByText(/está conduzindo o atendimento/)).toBeVisible();
});

test("webhook e páginas recebem cabeçalhos de segurança", async ({ request }) => {
  const pageResponse = await request.get("/login");
  expect(pageResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(pageResponse.headers()["x-frame-options"]).toBe("DENY");
  expect(pageResponse.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
