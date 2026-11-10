// Public production visual QA only: no user browser/profile or desktop control.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.cache/playwright');
const { chromium } = require(path.join(root, '.tools/frontend-qa/node_modules/playwright'));
const origin = 'https://gamematch-projectweb-befe.vercel.app';
const api = 'https://gamematch-api-hzv6.onrender.com';
const output = path.join(root, 'docs/evidence/steam-browser');
fs.mkdirSync(output, { recursive: true });
const report = { frontend: origin, backend: api, viewports: [], pageErrors: [] };
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const response = await fetch(api + '/api/games');
    assert.equal(response.status, 200);
    const games = await response.json();
    assert(
      games.length >= 100 &&
        games.every((game) => game.steamId && game.imageUrl && game.releaseDate),
    );
    assert.equal(games.filter((game) => game.popularityOrder).length, 100);
    assert.equal(games[0].title, 'Counter-Strike 2');
    report.games = games.map((game) => ({
      title: game.title,
      steamId: game.steamId,
      releaseDate: game.releaseDate,
      popularityOrder: game.popularityOrder,
      popularitySource: game.popularitySource,
    }));
    for (const [name, viewport] of [
      ['desktop', { width: 1366, height: 900 }],
      ['mobile', { width: 390, height: 844 }],
      ['narrow', { width: 320, height: 720 }],
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', (error) => report.pageErrors.push(error.message));
      await page.goto(origin + '/discover');
      await page.getByRole('link', { name: games[0].title, exact: true }).waitFor();
      let loaded = 0;
      for (let offset = 0; offset < games.length; offset += 24) {
        await page.getByRole('link', { name: games[offset].title, exact: true }).waitFor();
        const images = page.locator('.game-card img');
        const count = Math.min(24, games.length - offset);
        assert.equal(await images.count(), count);
        for (let i = 0; i < count; i++) {
          await images.nth(i).scrollIntoViewIfNeeded();
          await images.nth(i).evaluate(
            (img) =>
              new Promise((resolve, reject) => {
                if (img.complete)
                  return img.naturalWidth > 0 ? resolve() : reject(new Error('broken cover'));
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', () => reject(new Error('cover download failed')), {
                  once: true,
                });
              }),
          );
        }
        loaded += count;
        assert.equal(await page.locator('.game-card .placeholder').count(), 0);
        if (offset + count < games.length)
          await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
      }
      assert.equal(loaded, games.length);
      assert(await page.getByRole('button', { name: 'ถัดไป', exact: true }).isDisabled());
      await page.getByRole('searchbox').fill('Counter-Strike');
      assert.equal(await page.locator('.game-card').count(), 1);
      assert.equal(await page.locator('.pagination').count(), 0);
      await page.getByRole('searchbox').fill('');
      await page.getByRole('link', { name: games[0].title, exact: true }).waitFor();
      await page.getByRole('combobox').selectOption('name');
      const alphabetic = [...games].sort((a, b) => a.title.localeCompare(b.title));
      await page.getByRole('link', { name: alphabetic[0].title, exact: true }).waitFor();
      await page.getByRole('combobox').selectOption('popular');
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(width <= viewport.width + 2);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, name + '-catalog.png'), fullPage: true });
      await page.goto(origin);
      await page.getByRole('heading', { name: 'เกมยอดนิยมบน Steam' }).waitFor();
      await page.locator('.game-card img').first().waitFor();
      await page.screenshot({ path: path.join(output, name + '-home.png'), fullPage: true });
      await page.goto(origin + '/games/' + games[0].id);
      await page.getByRole('heading', { name: games[0].title, exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Steam', exact: true }).count(), 2);
      assert.equal(await page.locator('time').getAttribute('datetime'), games[0].releaseDate);
      await page.screenshot({ path: path.join(output, name + '-detail.png'), fullPage: true });
      report.viewports.push({ name, ...viewport, loadedCovers: games.length, pageWidth: width });
      await context.close();
      console.log(
        'PASS ' +
          name +
          ': ' +
          games.length +
          ' real Steam covers loaded, dates/source links and responsive layout',
      );
    }
    assert.deepEqual(report.pageErrors, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack;
    throw error;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
