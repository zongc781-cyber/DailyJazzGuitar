import { expect, test, type Page } from '@playwright/test';

// These tests do not assume which lesson is due: the schedule depends on the local date.

async function openToday(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('score').locator('svg').first()).toBeVisible();
}

const chordChips = (page: Page) => page.getByTestId('chords').locator('span:not(.visually-hidden)');

test('today shows a lick with notation, tab, a fretboard and working playback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openToday(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('img', { name: /standard notation and tablature/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /fretboard/i })).toBeVisible();
  const play = page.getByTestId('play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  expect(errors).toEqual([]);
});

test('changing the key moves the chords, notation and tab together', async ({ page }) => {
  await openToday(page);
  const before = await chordChips(page).allInnerTexts();
  const select = page.getByTestId('key-select');
  const options = await select.locator('option:not([disabled])').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  const current = await select.inputValue();
  const target = options.find((o) => o !== current)!;
  const tab = await page.getByTestId('score').innerHTML();
  await select.selectOption(target);
  await expect.poll(() => chordChips(page).allInnerTexts()).not.toEqual(before);
  await expect.poll(async () => (await page.getByTestId('score').innerHTML()) !== tab).toBe(true);
  await expect(page.getByRole('img', { name: new RegExp(`in ${target.replace('b', '♭').replace('#', '♯')} (major|minor)`) })).toBeVisible();
});

test('the analysis stays hidden until asked for', async ({ page }) => {
  await openToday(page);
  const toggle = page.getByTestId('analysis-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Chord tones' })).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'Chord tones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resolution' })).toBeVisible();
  await expect(page.getByRole('img', { name: /with chord degrees/ })).toBeVisible();
});

test('a learned lick and a favourite appear in the library', async ({ page }) => {
  await openToday(page);
  const title = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
  await page.getByTestId('learned').click();
  await expect(page.getByTestId('learned-state')).toBeVisible();
  await page.getByTestId('favourite').click();
  await expect(page.getByTestId('favourite')).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/library?tab=learned');
  await expect(page.getByRole('tabpanel')).toContainText(title);
  await page.getByRole('tab', { name: 'Favourites' }).click();
  await expect(page.getByRole('tabpanel')).toContainText(title);
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('tabpanel')).toContainText(title);
});

test('this week shows the standard, its chart and a seven-day plan that remembers ticks', async ({ page }) => {
  await page.goto('/week');
  await expect(page.getByTestId('chord-chart')).toBeVisible();
  await expect(page.getByText('Day 7', { exact: true }).first()).toBeAttached();
  const box = page.getByRole('checkbox').first();
  await box.check({ force: true });
  await expect(box).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
  const toggle = page.getByTestId('analysis-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('preferences apply straight away and survive a reload', async ({ page }) => {
  await page.goto('/progress');
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('every lesson in the library opens', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'one viewport is enough for this sweep');
  const { entries } = (await (await request.get('/api/catalog')).json()) as { entries: { id: string; kind: string; title: string }[] };
  expect(entries.length).toBeGreaterThan(0);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const e of entries) {
    await page.goto(`/lessons/${e.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(e.title);
    if (e.kind === 'lick') await expect(page.getByTestId('score').locator('svg').first()).toBeVisible();
    else await expect(page.getByTestId('chord-chart')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
