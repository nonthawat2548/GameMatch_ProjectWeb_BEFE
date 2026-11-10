// Explicit opt-in: creates disposable QA members/game in the configured GameMatch DB.
// No HTTP mocks. Owns and closes only its child API, static server and headless browser.
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.cache/playwright');
const { chromium } = require(path.join(root, '.tools/frontend-qa/node_modules/playwright'));
if (process.env.GM_LIVE_QA !== '1')
  throw new Error('Set GM_LIVE_QA=1 to opt into disposable real-DB QA.');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, 'backend/.env'), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
if (!env.DATABASE_URL || env.DATABASE_URL.includes('ewfvqtflucuvtiajmmgb'))
  throw new Error('A dedicated GameMatch database is required.');
const db = new URL(env.DATABASE_URL);
const psql = process.env.GM_PSQL || path.join(root, '.tools/postgresql/pgsql/bin/psql.exe');
const stamp = Date.now().toString();
const emails = ['qa-' + stamp + '-a@example.test', 'qa-' + stamp + '-b@example.test'];
const title = 'Demo: QA browser ' + stamp;
const password = crypto.randomBytes(16).toString('hex');
const nextPassword = crypto.randomBytes(16).toString('hex');
const remote = Boolean(process.env.GM_QA_WEB_URL);
const origin = remote ? new URL(process.env.GM_QA_WEB_URL).origin : 'http://127.0.0.1:4173';
const apiOrigin = remote ? new URL(process.env.GM_QA_API_URL).origin : 'http://localhost:8080';
if (
  remote &&
  (!origin.startsWith('https://') ||
    !apiOrigin.startsWith('https://') ||
    /moviehub/i.test(origin + apiOrigin))
)
  throw new Error('Remote QA requires the dedicated GameMatch HTTPS URLs.');
const output = path.join(root, 'docs/evidence', remote ? 'cloud-browser' : 'live-browser');
fs.mkdirSync(output, { recursive: true });
const report = {
  scope: remote
    ? 'Deployed Vercel React -> Render Go -> Supabase PostgreSQL; real HTTPS, database and Demo fixtures. No HTTP mocks or live RAWG import.'
    : 'Production React -> local Go net/http -> dedicated Supabase PostgreSQL, real HTTP and database, Demo fixtures. No live RAWG import or cloud hosting claim.',
  frontend: origin,
  backend: apiOrigin,
  cases: [],
  requests: [],
  pageErrors: [],
  screenshots: [],
};
function sql(query) {
  return execFileSync(
    psql,
    [
      '-h',
      db.hostname,
      '-p',
      db.port || '5432',
      '-U',
      decodeURIComponent(db.username),
      '-d',
      db.pathname.slice(1),
      '-v',
      'ON_ERROR_STOP=1',
      '-t',
      '-A',
      '-c',
      query,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: decodeURIComponent(db.password),
        PGSSLMODE: 'require',
        PGCONNECT_TIMEOUT: '10',
      },
      windowsHide: true,
      encoding: 'utf8',
    },
  ).trim();
}
function pass(name) {
  report.cases.push({ name, status: 'passed' });
  console.log('PASS ' + name);
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () =>
      reject(new Error('QA port ' + port + ' is in use; no existing service was stopped.')),
    );
    probe.listen(port, () => probe.close(resolve));
  });
}
async function call(method, endpoint, token, body, want = 200) {
  const res = await fetch(apiOrigin + endpoint, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await res.json();
  assert.equal(res.status, want, method + ' ' + endpoint + ': ' + JSON.stringify(value));
  return value;
}
const build = path.join(root, 'frontend/build');
const staticServer = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, origin).pathname);
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
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
  };
  res.writeHead(200, {
    'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8',
  });
  fs.createReadStream(file).pipe(res);
});
async function capture(page, name) {
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(width.document <= width.viewport + 2, 'horizontal overflow on ' + name);
  const file = name + '.png';
  await page.screenshot({ path: path.join(output, file), fullPage: true });
  report.screenshots.push({ file, ...width });
}
async function run() {
  let api, browser;
  let dataMayExist = false;
  try {
    if (!remote) {
      await freePort(8080);
      await freePort(4173);
      await new Promise((resolve, reject) =>
        staticServer.once('error', reject).listen(4173, '127.0.0.1', resolve),
      );
      api = spawn(path.join(root, 'backend/server.exe'), [], {
        cwd: path.join(root, 'backend'),
        env: { ...process.env, ...env, PORT: '8080', ALLOWED_ORIGINS: origin },
        windowsHide: true,
      });
      let logs = '';
      api.stdout.on('data', (chunk) => {
        logs += chunk;
      });
      api.stderr.on('data', (chunk) => {
        logs += chunk;
      });
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (api.exitCode !== null) throw new Error('Owned QA API failed to start: ' + logs);
        try {
          const health = await fetch(apiOrigin + '/healthz');
          if (health.ok) {
            ready = true;
            break;
          }
        } catch {}
        await delay(500);
      }
      assert(ready, 'local API health check timed out');
    } else {
      assert.equal((await call('GET', '/healthz')).status, 'ok');
    }
    browser = await chromium.launch({ headless: true });
    report.browserVersion = browser.version();
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      reducedMotion: 'reduce',
    });
    context.on('page', (p) => {
      p.on('pageerror', (error) => report.pageErrors.push(error.message));
      p.on('response', (res) => {
        if (res.url().startsWith(apiOrigin + '/'))
          report.requests.push({
            method: res.request().method(),
            path: new URL(res.url()).pathname,
            status: res.status(),
          });
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin + '/discover');
    await page.getByRole('link', { name: 'Demo: Story Quest', exact: true }).waitFor();
    await capture(page, 'desktop-catalog-supabase');
    await page.getByRole('link', { name: 'แนะนำเกม', exact: true }).click();
    await page.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }).click();
    await page.getByText('ตรงกับความชอบ 100/100', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Demo: Story Quest', exact: true }).click();
    await page.getByRole('link', { name: 'เข้าสู่ระบบเพื่อบันทึกเกม' }).click();
    await page.getByRole('link', { name: 'สร้างบัญชีใหม่' }).click();
    await page.getByLabel('ชื่อที่แสดง').fill('Demo: QA member');
    await page.getByLabel('อีเมล').fill(emails[0]);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    dataMayExist = true;
    await page.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }).click();
    await page.getByRole('heading', { name: 'Demo: Story Quest', exact: true }).waitFor();
    const tokenA = await page.evaluate(() => localStorage.getItem('gamematch_token'));
    const memberA = await call('GET', '/api/me', tokenA);
    assert.equal(memberA.role, 'member');
    await page.getByRole('button', { name: 'เพิ่มในเกมโปรด' }).click();
    await page.getByText('เพิ่มในเกมโปรดแล้ว', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'เกมโปรด', exact: true }).click();
    await page.getByRole('link', { name: 'Demo: Story Quest', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('link', { name: 'Demo: Story Quest', exact: true }).waitFor();
    await capture(page, 'desktop-favorite-persisted');
    pass(
      'Guest quiz -> detail -> register/login return -> favorite persists after reload through Go/Supabase',
    );
    await call(
      'POST',
      '/api/auth/register',
      null,
      { email: emails[1], password, displayName: 'Demo: QA second member' },
      201,
    );
    const sessionB = await call('POST', '/api/auth/login', null, { email: emails[1], password });
    const favoritesA = await call('GET', '/api/me/favorites', tokenA);
    assert.equal((await call('GET', '/api/me/favorites', sessionB.token)).length, 0);
    await call('DELETE', '/api/me/favorites/' + favoritesA[0].id, sessionB.token);
    assert.equal((await call('GET', '/api/me/favorites', tokenA)).length, 1);
    await call('GET', '/api/me', null, null, 401);
    await call('GET', '/api/admin/games', sessionB.token, null, 403);
    pass('real API 401/403 and ownership isolation for two members');
    await page.goto(origin + '/match');
    await page.getByRole('combobox').first().selectOption('strategy');
    await page.getByRole('button', { name: 'บันทึกความชอบ', exact: true }).click();
    await page.getByText('บันทึกความชอบแล้ว', { exact: true }).waitFor();
    assert.equal((await call('GET', '/api/me/preferences', tokenA)).genre, 'strategy');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('select')?.value === 'strategy');
    pass('preference survives reload from Supabase');
    sql("UPDATE gm_members SET role='admin' WHERE email='" + emails[0] + "';");
    await page.goto(origin + '/admin');
    await page.getByLabel('ชื่อเกม').fill(title);
    await page.getByRole('button', { name: 'บันทึกเกม', exact: true }).click();
    const row = page.getByRole('row').filter({ hasText: title });
    await row.waitFor();
    await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await page.getByRole('checkbox', { name: 'เผยแพร่' }).uncheck();
    await page.getByRole('button', { name: 'บันทึกเกม', exact: true }).click();
    await row.getByText('ซ่อน', { exact: true }).waitFor();
    const adminGame = (await call('GET', '/api/admin/games', tokenA)).find(
      (game) => game.title === title,
    );
    await call('GET', '/api/games/' + adminGame.id, null, null, 404);
    await row.getByRole('button', { name: 'ลบ', exact: true }).click({ trial: true });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'ลบ', exact: true }).click();
    await row.waitFor({ state: 'detached' });
    if (!env.RAWG_API_KEY) {
      await page.getByRole('button', { name: 'Sync RAWG (40 เกม)' }).click();
      await page.getByRole('alert').filter({ hasText: 'ยังไม่ได้ตั้ง RAWG_API_KEY' }).waitFor();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, 'mobile-admin-real-api');
    pass('Admin CRUD/publication through Go/Supabase; public hidden detail is 404');
    await page.goto(origin + '/me/profile');
    await page.getByLabel('ชื่อที่แสดง').fill('Demo: QA updated');
    await page.getByRole('button', { name: 'บันทึกโปรไฟล์' }).click();
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Demo: QA updated', exact: true })
      .waitFor();
    await capture(page, 'mobile-profile-real-api');
    await page.getByLabel('รหัสผ่านปัจจุบัน').fill(password);
    await page.getByLabel('รหัสผ่านใหม่', { exact: true }).fill(nextPassword);
    await page.getByRole('button', { name: 'เปลี่ยนและเข้าสู่ระบบใหม่' }).click();
    await page.getByRole('heading', { name: 'เข้าสู่ระบบ', exact: true }).waitFor();
    await page.getByText('เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่').waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('gamematch_token')), null);
    await call('GET', '/api/me', tokenA, null, 401);
    await page.getByLabel('อีเมล').fill(emails[0]);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(nextPassword);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await page.getByRole('heading', { name: 'โปรไฟล์', exact: true }).waitFor();
    await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
    await page.getByRole('heading', { name: 'เข้าสู่ระบบ', exact: true }).waitFor();
    pass('Profile update -> password change -> old JWT rejected -> new-password login -> logout');
    assert.deepEqual(report.pageErrors, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack
      .replaceAll(password, '[QA password]')
      .replaceAll(nextPassword, '[QA password]');
    throw error;
  } finally {
    if (browser) await browser.close();
    if (dataMayExist) {
      try {
        sql(
          "DELETE FROM gm_games WHERE title='" +
            title +
            "'; DELETE FROM gm_members WHERE email IN ('" +
            emails.join("','") +
            "');",
        );
        report.cleanup = 'Disposable QA members and game removed; original catalog preserved.';
      } catch {
        report.cleanup = 'FAILED: disposable QA data requires cleanup';
        process.exitCode = 1;
      }
    }
    if (api) api.kill();
    staticServer.closeAllConnections?.();
    if (staticServer.listening) await new Promise((resolve) => staticServer.close(resolve));
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
}
run().catch((error) => {
  console.error(
    error.stack.replaceAll(password, '[QA password]').replaceAll(nextPassword, '[QA password]'),
  );
  process.exitCode = 1;
});
