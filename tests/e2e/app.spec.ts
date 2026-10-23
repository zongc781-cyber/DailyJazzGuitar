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

// Controls that overlap are hard to hit and hide each other's labels; the transport once did at
// some window widths.
async function overlaps(page: Page, container: string) {
  return page.locator(container).evaluate((root) => {
    const boxes = [...root.querySelectorAll('a, button, input, output, label')].map((el) => ({ name: el.textContent?.trim() || el.getAttribute('aria-label') || el.tagName, r: el.getBoundingClientRect() }));
    const hits: string[] = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r;
        const b = boxes[j].r;
        if (a.width && b.width && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits.push(`${boxes[i].name} / ${boxes[j].name}`);
      }
    return hits;
  });
}

test('the playback controls and the top bar never overlap, at any window width', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac', 'the test sets its own window sizes');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const path of ['/', '/week']) {
    await page.goto(path);
    await expect(page.getByRole('group', { name: 'Playback' })).toBeVisible();
    for (const width of [720, 820, 900, 1024, 1100, 1180, 1280, 1440, 1728, 2048]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await overlaps(page, '[role=group][aria-label=Playback]'), `${path} at ${width}px`).toEqual([]);
      expect(await overlaps(page, 'nav[aria-label=Main]'), `top bar at ${width}px`).toEqual([]);
      for (const name of ['Today', 'This Week', 'Library', 'Progress']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }
  }
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
  test.skip(info.project.name !== 'mac', 'one window size is enough for this sweep');
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
