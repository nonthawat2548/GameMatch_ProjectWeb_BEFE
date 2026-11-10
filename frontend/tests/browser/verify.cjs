const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');

const root = path.resolve(__dirname, '../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.cache/playwright');
const { chromium } = require(path.join(root, '.tools/frontend-qa/node_modules/playwright'));
const build = path.join(root, 'frontend/build');
const output = path.join(root, 'docs/evidence/frontend-browser');
fs.mkdirSync(output, { recursive: true });
const report = {
  clientDate: '2026-11-10 Asia/Bangkok',
  scope:
    'Production React build in isolated headless Chromium; HTTP API and image fixtures only. No real Go, DB, RAWG, deployment or user browser session.',
  tool: 'Playwright 1.65.0, headless shell, temporary browser contexts',
  cases: [],
  screenshots: [],
  pageErrors: [],
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function pass(name, details = {}) {
  report.cases.push({ name, status: 'passed', ...details });
  console.log('PASS ' + name);
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  let file = path.resolve(build, '.' + pathname);
  if (file !== build && !file.startsWith(build + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname)) {
      res.writeHead(404).end();
      return;
    }
    file = path.join(build, 'index.html');
  }
  const type =
    {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.json': 'application/json',
    }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
});

function model() {
  return {
    games: Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      title: [
        'Demo: Forest Journey',
        'Demo: City Builder',
        'Demo: Arena',
        'Demo: Island Life',
        'Demo: Night Quest',
        'Demo: Puzzle Room',
      ][i],
      description:
        'Fictional QA fixture for checking page layout and interactions. This is not a real game record.',
      imageUrl: 'http://qa-fixtures.invalid/cover/' + (i + 1) + '.svg',
      genres: [['rpg'], ['strategy'], ['action'], ['simulation'], ['adventure'], ['puzzle']][i],
      tags: ['singleplayer', 'story-rich'],
      platforms: ['PC'],
      isPublished: true,
      matchScore: 0,
    })),
    members: {
      member: {
        id: 1,
        email: 'demo.member@example.test',
        displayName: 'Demo Member',
        role: 'member',
      },
      admin: { id: 2, email: 'demo.admin@example.test', displayName: 'Demo Admin', role: 'admin' },
    },
    tokens: new Map([
      ['qa-member', 'member'],
      ['qa-admin', 'admin'],
    ]),
    password: 'Password123!',
    favorite: new Set(),
    prefs: { genre: 'rpg', mode: 'solo', style: 'story' },
    listMode: 'normal',
    delay: 0,
    syncError: false,
    sequence: 10,
    requests: [],
  };
}

async function routes(context, state, origin) {
  await context.route('http://qa-fixtures.invalid/**', (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop().split('.')[0]);
    const colors = ['#506953', '#50617b', '#84614d', '#5a7880', '#655a80', '#84764e'];
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${colors[(id - 1) % colors.length]}"/><path d="M0 360L230 100L420 360M290 360L460 160L640 360" fill="#ffffff14"/><text x="30" y="58" font-family="sans-serif" font-size="24" fill="white">DEMO / QA FIXTURE</text><text x="30" y="326" font-family="sans-serif" font-size="20" fill="#ffffffaa">Fictional game ${id}</text></svg>`,
    });
  });
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname;
    const method = request.method();
    const data = request.postData() ? JSON.parse(request.postData()) : {};
    state.requests.push({
      method,
      path: endpoint,
      body:
        endpoint.includes('password') || endpoint.includes('/auth/') ? '[auth form omitted]' : data,
    });
    const send = (status, json) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
        body: status === 204 ? '' : JSON.stringify(json),
      });
    if (method === 'OPTIONS') return send(204, null);
    if (endpoint === '/api/auth/register') {
      state.members.member = {
        ...state.members.member,
        email: data.email,
        displayName: data.displayName,
      };
      state.password = data.password;
      return send(201, { id: 1 });
    }
    if (endpoint === '/api/auth/login') {
      if (data.password !== state.password)
        return send(401, { error: 'QA: incorrect credentials' });
      const role = data.email === state.members.admin.email ? 'admin' : 'member';
      const token = 'qa-' + role + '-' + ++state.sequence;
      state.tokens.set(token, role);
      return send(200, { token, user: state.members[role] });
    }
    if (endpoint === '/api/games') {
      if (state.delay) await pause(state.delay);
      if (state.listMode === 'error') return send(503, { error: 'QA: API unavailable' });
      return send(200, state.listMode === 'empty' ? [] : state.games.filter((g) => g.isPublished));
    }
    if (/^\/api\/games\/\d+$/.test(endpoint)) {
      const game = state.games.find(
        (g) => g.id === Number(endpoint.split('/').pop()) && g.isPublished,
      );
      return game ? send(200, game) : send(404, { error: 'QA: game not found' });
    }
    if (endpoint === '/api/recommendations')
      return send(
        200,
        state.games
          .filter((g) => g.isPublished)
          .slice(0, 5)
          .map((g, i) => ({
            ...g,
            matchScore: 100 - i * 10,
            reasons: ['Demo: reason fixture for ' + data.genre],
          })),
      );
    const token = (request.headers().authorization || '').replace(/^Bearer /, '');
    const role = state.tokens.get(token);
    if (!role) return send(401, { error: 'QA: session expired' });
    if (endpoint.startsWith('/api/admin/') && role !== 'admin')
      return send(403, { error: 'QA: admin only' });
    if (endpoint === '/api/me') {
      if (method === 'PUT') state.members[role].displayName = data.displayName;
      return send(200, method === 'PUT' ? { ok: true } : state.members[role]);
    }
    if (endpoint === '/api/auth/logout' || endpoint === '/api/me/password') {
      if (endpoint.endsWith('/password')) {
        if (data.currentPassword !== state.password)
          return send(400, { error: 'QA: wrong current password' });
        state.password = data.newPassword;
      }
      for (const [key, owner] of state.tokens) if (owner === role) state.tokens.delete(key);
      return send(200, { ok: true });
    }
    if (endpoint === '/api/me/preferences') {
      if (method === 'PUT') state.prefs = data;
      return send(200, state.prefs);
    }
    if (endpoint === '/api/me/favorites')
      return send(
        200,
        state.games.filter((g) => state.favorite.has(g.id) && g.isPublished),
      );
    if (/^\/api\/me\/favorites\/\d+$/.test(endpoint)) {
      const id = Number(endpoint.split('/').pop());
      method === 'PUT' ? state.favorite.add(id) : state.favorite.delete(id);
      return send(200, { ok: true });
    }
    if (endpoint === '/api/admin/sync')
      return state.syncError
        ? send(502, { error: 'QA: RAWG unavailable' })
        : send(200, { imported: 6 });
    if (endpoint === '/api/admin/games') {
      if (method === 'POST') {
        const id = ++state.sequence;
        state.games.push({ ...data, id, matchScore: 0 });
        return send(200, { id });
      }
      return send(200, state.games);
    }
    if (/^\/api\/admin\/games\/\d+$/.test(endpoint)) {
      const id = Number(endpoint.split('/').pop());
      if (method === 'DELETE') state.games = state.games.filter((g) => g.id !== id);
      else state.games = state.games.map((g) => (g.id === id ? { ...g, ...data } : g));
      return send(200, { id, ok: true });
    }
    return send(404, { error: 'QA: unhandled endpoint ' + endpoint });
  });
}

async function contextFor(browser, viewport, origin, state, role) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: 'reduce',
    storageState: {
      cookies: [],
      origins: role
        ? [{ origin, localStorage: [{ name: 'gamematch_token', value: 'qa-' + role }] }]
        : [],
    },
  });
  await routes(context, state, origin);
  context.on('page', (page) =>
    page.on('pageerror', (error) => report.pageErrors.push(error.message)),
  );
  return context;
}

async function capture(page, name) {
  await page.evaluate(() =>
    Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 4000))]),
  );
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll('body *')]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width && box.right > innerWidth + 2 && !el.closest('.table-wrap');
      })
      .slice(0, 6)
      .map((el) => ({
        tag: el.tagName,
        class: String(el.className),
        width: el.getBoundingClientRect().width,
      })),
    font: getComputedStyle(document.body).fontFamily,
  }));
  assert(
    layout.width <= layout.viewport + 2,
    name + ' horizontal overflow: ' + JSON.stringify(layout),
  );
  const file = name + '.png';
  await page.screenshot({ path: path.join(output, file), fullPage: true });
  report.screenshots.push({ file, ...layout });
}

async function run() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    report.browserVersion = browser.version();
    for (const [label, viewport] of [
      ['desktop', { width: 1366, height: 900 }],
      ['mobile', { width: 390, height: 844 }],
      ['narrow', { width: 320, height: 720 }],
    ]) {
      const state = model();
      const context = await contextFor(browser, viewport, origin, state);
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      await page.goto(origin);
      await page.getByRole('link', { name: state.games[0].title, exact: true }).waitFor();
      assert.equal(await page.locator('.game-card').count(), 4);
      await capture(page, label + '-home');
      await page.goto(origin + '/discover');
      await page.getByRole('searchbox').waitFor();
      await page.getByRole('link', { name: state.games[0].title, exact: true }).waitFor();
      const requestsBefore = state.requests.filter((r) => r.path === '/api/games').length;
      await page.getByRole('searchbox').fill('forest');
      assert.equal(await page.locator('.game-card').count(), 1);
      await page.getByRole('searchbox').fill('');
      await page.getByRole('button', { name: 'RPG', exact: true }).click();
      assert.equal(await page.locator('.game-card').count(), 1);
      assert.equal(state.requests.filter((r) => r.path === '/api/games').length, requestsBefore);
      await page.getByRole('button', { name: 'ทุกแนว' }).click();
      await capture(page, label + '-catalog');
      await page.goto(origin + '/match');
      await page.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }).click();
      await page.getByRole('heading', { name: 'ผลลัพธ์สำหรับคุณ' }).waitFor();
      assert.equal(await page.locator('.game-card').count(), 5);
      await capture(page, label + '-quiz-results');
      await page.goto(origin + '/games/1');
      await page.getByRole('heading', { name: state.games[0].title }).waitFor();
      await capture(page, label + '-detail');
      await page.getByRole('link', { name: 'เข้าสู่ระบบเพื่อบันทึกเกม' }).click();
      await capture(page, label + '-login');
      await page.getByRole('link', { name: 'สร้างบัญชีใหม่' }).click();
      await capture(page, label + '-register');
      await page.goto(origin + '/about');
      await capture(page, label + '-about');
      await page.goto(origin + '/not-a-route');
      await page.getByRole('heading', { name: /404/ }).waitFor();
      await capture(page, label + '-not-found');
      await page.getByRole('link', { name: 'ดูเกมทั้งหมด', exact: true }).click();
      await page.getByRole('heading', { name: 'เกมทั้งหมด', exact: true }).waitFor();
      pass(label + ' public routes, local filtering, quiz, detail, forms and overflow', {
        viewport,
      });
      await context.close();
    }

    const memberState = model();
    const memberContext = await contextFor(
      browser,
      { width: 390, height: 844 },
      origin,
      memberState,
    );
    const memberPage = await memberContext.newPage();
    await memberPage.goto(origin + '/games/1');
    await memberPage.getByRole('link', { name: 'เข้าสู่ระบบเพื่อบันทึกเกม' }).click();
    await memberPage.getByLabel('อีเมล').fill(memberState.members.member.email);
    await memberPage.getByLabel('รหัสผ่าน', { exact: true }).fill(memberState.password);
    await memberPage.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await memberPage.getByRole('heading', { name: memberState.games[0].title }).waitFor();
    await memberPage.getByRole('button', { name: 'เพิ่มในเกมโปรด' }).click();
    await memberPage.getByText('เพิ่มในเกมโปรดแล้ว', { exact: true }).waitFor();
    await memberPage.getByRole('link', { name: 'เกมโปรด', exact: true }).click();
    await memberPage.getByRole('link', { name: memberState.games[0].title, exact: true }).waitFor();
    await memberPage.reload();
    await memberPage.getByRole('link', { name: memberState.games[0].title, exact: true }).waitFor();
    await capture(memberPage, 'mobile-favorites');
    pass('native login return, authenticated favorite save and reload (mock store)');
    await memberPage.goto(origin + '/match');
    await memberPage.getByRole('combobox').first().selectOption('strategy');
    await memberPage.getByRole('button', { name: 'บันทึกความชอบ', exact: true }).click();
    await memberPage.getByText('บันทึกความชอบแล้ว', { exact: true }).waitFor();
    await memberPage.reload();
    await memberPage.waitForFunction(() => document.querySelector('select')?.value === 'strategy');
    pass('preference save and restoration after browser reload (mock store)');
    await memberPage.goto(origin + '/me/profile');
    await memberPage.getByLabel('ชื่อที่แสดง').fill('Demo Member Updated');
    await memberPage.getByRole('button', { name: 'บันทึกโปรไฟล์' }).click();
    await memberPage
      .getByRole('navigation')
      .getByRole('link', { name: 'Demo Member Updated' })
      .waitFor();
    await capture(memberPage, 'mobile-profile');
    await memberPage.getByLabel('รหัสผ่านปัจจุบัน').fill(memberState.password);
    await memberPage.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('ChangedPassword123!');
    await memberPage.getByRole('button', { name: 'เปลี่ยนและเข้าสู่ระบบใหม่' }).click();
    await memberPage.getByRole('heading', { name: 'เข้าสู่ระบบ' }).waitFor();
    await memberPage
      .getByText('เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่')
      .waitFor();
    assert.equal(await memberPage.evaluate(() => localStorage.getItem('gamematch_token')), null);
    pass('profile refresh and password-change session cleanup (mock API)');
    await memberContext.close();

    const adminState = model();
    const adminContext = await contextFor(
      browser,
      { width: 390, height: 844 },
      origin,
      adminState,
      'admin',
    );
    const adminPage = await adminContext.newPage();
    adminPage.on('dialog', (dialog) => dialog.accept());
    await adminPage.goto(origin + '/admin');
    await adminPage.getByLabel('ชื่อเกม').waitFor();
    await adminPage.getByRole('row').filter({ hasText: adminState.games[0].title }).waitFor();
    await capture(adminPage, 'mobile-admin');
    await adminPage.getByLabel('ชื่อเกม').fill('Demo: QA created game');
    await adminPage.getByRole('button', { name: 'บันทึกเกม', exact: true }).click();
    await adminPage.getByText('บันทึกข้อมูลแล้ว', { exact: true }).waitFor();
    let row = adminPage.getByRole('row').filter({ hasText: 'Demo: QA created game' });
    await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await adminPage.getByRole('checkbox', { name: 'เผยแพร่' }).uncheck();
    await adminPage.getByRole('button', { name: 'บันทึกเกม', exact: true }).click();
    await row.getByText('ซ่อน', { exact: true }).waitFor();
    await row.getByRole('button', { name: 'ลบ', exact: true }).click();
    await adminPage.getByText('ลบเกมแล้ว', { exact: true }).waitFor();
    assert.equal(await row.count(), 0);
    adminState.syncError = true;
    await adminPage.getByRole('button', { name: 'Sync RAWG (40 เกม)' }).click();
    await adminPage.getByRole('alert').filter({ hasText: 'QA: RAWG unavailable' }).waitFor();
    assert.equal(await adminPage.getByRole('row').count(), 7);
    pass('admin CRUD, publication and sync-error UI (mock API)');
    for (const [label, viewport] of [
      ['desktop', { width: 1366, height: 900 }],
      ['narrow', { width: 320, height: 720 }],
    ]) {
      await adminPage.setViewportSize(viewport);
      await capture(adminPage, label + '-admin');
      await adminPage.goto(origin + '/me/profile');
      await adminPage.getByRole('heading', { name: 'โปรไฟล์', exact: true }).waitFor();
      await capture(adminPage, label + '-profile');
      await adminPage.goto(origin + '/admin');
      await adminPage.getByLabel('ชื่อเกม').waitFor();
    }
    await adminContext.close();

    const longNameState = model();
    longNameState.members.member.displayName = 'Demo:' + 'A'.repeat(95);
    const longNameContext = await contextFor(
      browser,
      { width: 320, height: 720 },
      origin,
      longNameState,
      'member',
    );
    const longNamePage = await longNameContext.newPage();
    await longNamePage.goto(origin + '/me/profile');
    await longNamePage.getByRole('heading', { name: 'โปรไฟล์', exact: true }).waitFor();
    await capture(longNamePage, 'narrow-long-name');
    pass('member/admin layouts and a valid 100-byte display name');
    await longNameContext.close();

    const sharedState = model();
    sharedState.favorite.add(1);
    const sharedContext = await contextFor(
      browser,
      { width: 1366, height: 900 },
      origin,
      sharedState,
      'member',
    );
    const first = await sharedContext.newPage();
    const second = await sharedContext.newPage();
    await first.goto(origin + '/me/favorites');
    await first.getByRole('link', { name: sharedState.games[0].title, exact: true }).waitFor();
    await second.goto(origin + '/me/profile');
    await second.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await first.getByRole('heading', { name: 'เข้าสู่ระบบ' }).waitFor();
    assert.equal(await first.locator('.game-card').count(), 0);
    pass('real cross-tab storage logout in an isolated headless browser context');
    await sharedContext.close();

    const errorState = model();
    errorState.listMode = 'error';
    const errorContext = await contextFor(browser, { width: 390, height: 844 }, origin, errorState);
    const errorPage = await errorContext.newPage();
    await errorPage.goto(origin);
    await errorPage.getByRole('alert').waitFor();
    await capture(errorPage, 'mobile-error');
    errorState.listMode = 'empty';
    await errorPage.getByRole('button', { name: 'ลองใหม่' }).click();
    await errorPage.getByText('ยังไม่มีเกมในคลัง กลับมาดูใหม่ได้ภายหลัง').waitFor();
    await capture(errorPage, 'mobile-empty');
    errorState.listMode = 'normal';
    errorState.delay = 1500;
    await errorPage.reload({ waitUntil: 'domcontentloaded' });
    await errorPage.getByRole('status').waitFor();
    await errorPage.getByRole('link', { name: errorState.games[0].title, exact: true }).waitFor();
    pass('loading, API error, retry and empty UI in native Chromium');
    await errorContext.close();
    assert.deepEqual(report.pageErrors, [], 'uncaught browser JavaScript errors');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack;
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}
run().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
