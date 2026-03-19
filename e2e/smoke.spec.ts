import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";

test.describe("Smoke Test — Core V1", () => {
  
  test("deve redirecionar rota legada /missao para o hub canônico", async ({ page }: { page: Page }) => {
    // Acessar rota legada
    await page.goto("/missao");
    
    // Deve redirecionar para /voluntario/hoje (ou /auth se não logado, mas o redirecionamento em si deve acontecer)
    // O teste foca em garantir que a rota /missao não quebra e segue o fluxo de redirect
    await expect(page).not.toHaveURL(/\/missao$/);
  });

  test("deve exibir a home pública corretamente", async ({ page }: { page: Page }) => {
    await page.goto("/");
    await expect(page.getByTestId("page-index")).toBeVisible();
  });

  test("deve exibir a página de auth corretamente", async ({ page }: { page: Page }) => {
    await page.goto("/auth");
    await expect(page.getByTestId("page-auth")).toBeVisible();
  });

  test("deve lidar com o parâmetro de convite sem entrar em loop", async ({ page }: { page: Page }) => {
    // Simular entrada via convite
    await page.goto("/auth?ref=TESTE&mode=signup");
    
    // Verificamos se a página de auth carrega e não fica em loop infinito
    await expect(page.getByTestId("page-auth")).toBeVisible();
    
    // O badge de "Verificando convite" ou o estado de signup deve estar presente
    // (Dependendo da velocidade do mock/rede, mas no mínimo a página deve carregar)
  });

  test("links de navegação devem ser consistentes", async ({ page }: { page: Page }) => {
    // Este teste assume que se acessarmos a home e clicarmos em 'Começar', vamos para auth
    await page.goto("/");
    await page.click('button:has-text("Começar")');
    await expect(page).toHaveURL(/\/auth/);
  });

});
