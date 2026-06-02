import { test, expect } from '@playwright/test';

test.describe('SaraIA - Smoke Tests', () => {
  test('carga la aplicación y muestra el título', async ({ page }) => {
    await page.goto('/');

    // El sidebar debe mostrar "SaraIA"
    await expect(page.getByText('SaraIA')).toBeVisible();

    // La página de inicio debe mostrar Dashboard
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('navegación entre páginas funciona', async ({ page }) => {
    await page.goto('/');

    // Navegar a Gastos
    await page.getByRole('link', { name: 'Gastos' }).click();
    await expect(page).toHaveURL(/\/gastos/);

    // Navegar a Escanear
    await page.getByRole('link', { name: 'Escanear' }).click();
    await expect(page).toHaveURL(/\/escanear/);

    // Navegar a Exportar
    await page.getByRole('link', { name: 'Exportar' }).click();
    await expect(page).toHaveURL(/\/exportar/);

    // Navegar a Inicio
    await page.getByRole('link', { name: 'Inicio' }).click();
    await expect(page).toHaveURL('/');
  });

  test('muestra estado vacío en Gastos', async ({ page }) => {
    await page.goto('/gastos');

    // Sin gastos debe mostrar mensaje de vacío
    await expect(page.getByText('No hay gastos aún')).toBeVisible();
  });

  test('el botón Importar YAPE está presente', async ({ page }) => {
    await page.goto('/');

    // Botón de importación en sidebar (desktop)
    const importBtn = page.getByRole('button', { name: /importar yape/i });
    await expect(importBtn).toBeVisible();
    await expect(importBtn).toBeEnabled();
  });

  test('página 404 redirige a Dashboard', async ({ page }) => {
    await page.goto('/ruta-inexistente');
    await expect(page).toHaveURL('/');
  });
});
