const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const originalPassword = 'Original123!';
const replacementPassword = 'Replacement456!';

test('Password reset integration (temporary accounts table, no real emails)', async (t) => {
  const connection = await pool.getConnection();
  let server;
  const poolModule = require.cache[require.resolve('../src/config/db')];
  try {
    // TEMPORARY TABLE ซ่อน accounts จริงเฉพาะ connection นี้ ทดสอบ SQL จริงโดยไม่แก้บัญชีสมาชิก
    const [definition] = await connection.query('SHOW CREATE TABLE accounts');
    await connection.query(definition[0]['Create Table'].replace(/^CREATE TABLE /, 'CREATE TEMPORARY TABLE '));
    const [columns] = await connection.query('SHOW COLUMNS FROM accounts');
    assert.ok(columns.some((column) => column.Field === 'token_version'), 'Run migrate:password-reset before tests');
    poolModule.exports = { query: (...args) => connection.query(...args) };
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'shop@example.test';
    process.env.SMTP_PASS = 'test-only';

    const sent = [], changed = [];
    let failDelivery = false;
    const mailer = require('../src/services/mailer');
    const realAssertConfigured = mailer.assertConfigured;
    const realSendPasswordReset = mailer.sendPasswordReset;
    const realSendPasswordChanged = mailer.sendPasswordChanged;
    // Mock เฉพาะการส่งอีเมล ไม่ส่งข้อความถึงสมาชิกหรือใช้ Gmail credentials ในการทดสอบ
    mailer.sendPasswordReset = async (email, token) => {
      sent.push({ email, token });
      if (failDelivery) throw Object.assign(new Error('Simulated SMTP failure'), { code: 'ETESTSMTP' });
    };
    mailer.sendPasswordChanged = async (email) => { changed.push(email); };

    const app = express();
    app.set('trust proxy', 'loopback'); // เฉพาะ test เพื่อแยก IP จำลองของแต่ละกรณี rate limit
    app.use(express.json());
    app.use('/api/auth', require('../src/routes/auth'));
    const { authenticate, requireRole } = require('../src/middleware/auth');
    app.get('/admin-check', authenticate, requireRole('Admin'), (req, res) => res.json({ ok: true }));
    app.use((error, req, res, next) => { res.status(500).json({ message: 'Test server error' }); });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    let ip = 1;
    function client() {
      const address = `192.0.2.${ip++}`;
      return async (path, body, token) => {
        const response = await fetch(base + path, {
          method: body === undefined ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': address, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
      };
    }
    async function fixture(name, role = 'Customer') {
      const email = `${name}@example.test`;
      const password = await bcrypt.hash(originalPassword, 4);
      const [result] = await connection.query('INSERT INTO accounts (username, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, role]);
      return { id: result.insertId, username: name, email, password };
    }
    async function account(user) {
      const [rows] = await connection.query('SELECT * FROM accounts WHERE user_id = ?', [user.id]);
      return rows[0];
    }
    async function waitFor(predicate) {
      const deadline = Date.now() + 5000;
      while (!await predicate()) {
        assert.ok(Date.now() < deadline, 'Background job did not finish');
        await delay(10);
      }
    }
    async function requestToken(api, user) {
      const count = sent.filter((mail) => mail.email === user.email).length;
      const result = await api('/api/auth/forgot-password', { email: user.email });
      assert.equal(result.status, 202);
      await waitFor(() => sent.filter((mail) => mail.email === user.email).length > count);
      return sent.filter((mail) => mail.email === user.email).at(-1).token;
    }
    const resetBody = (token, password = replacementPassword) => ({ token, password, password_confirm: password });

    await t.test('Email templates use the configured sender, TLS and a fixed frontend URL', async () => {
      const nodemailer = require('nodemailer');
      const originalTransport = nodemailer.createTransport;
      const messages = [];
      let options;
      nodemailer.createTransport = (config) => {
        options = config;
        return { sendMail: async (message) => { messages.push(message); } };
      };
      try {
        const token = randomBytes(32).toString('hex');
        await realSendPasswordReset('recipient@example.test', token);
        await realSendPasswordChanged('recipient@example.test');
        assert.equal(options.secure, true);
        assert.equal(options.port, 465);
        assert.equal(messages[0].from.address, 'shop@example.test');
        assert.equal(messages[0].to, 'recipient@example.test');
        assert.ok(messages[0].text.includes(`http://localhost:5173/reset-password?token=${token}`));
        assert.equal(messages[1].text.includes(token), false);
        assert.equal(messages[1].text.includes(replacementPassword), false);
      } finally { nodemailer.createTransport = originalTransport; }
    });

    await t.test('Existing and unknown emails receive the same response; tokens are hashed and expire in 15 minutes', async () => {
      const api = client(), user = await fixture('request');
      const known = await api('/api/auth/forgot-password', { email: user.email.toUpperCase() });
      const unknown = await api('/api/auth/forgot-password', { email: 'unknown@example.test' });
      assert.equal(known.status, 202); assert.deepEqual(known.body, unknown.body);
      assert.equal(known.cache, 'no-store');
      assert.equal('token' in known.body, false);
      await waitFor(() => sent.some((mail) => mail.email === user.email));
      const token = sent.find((mail) => mail.email === user.email).token;
      const row = await account(user);
      assert.equal(row.reset_token_hash, hashToken(token));
      assert.notEqual(row.reset_token_hash, token);
      const [ttl] = await connection.query('SELECT TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, reset_token_expires) AS seconds FROM accounts WHERE user_id = ?', [user.id]);
      assert.ok(ttl[0].seconds > 850 && ttl[0].seconds <= 900);
      assert.equal(row.password, user.password); assert.equal(row.token_version, 0);
      assert.equal((await api('/api/auth/forgot-password', { email: 'invalid' })).status, 400);
    });

    await t.test('New links invalidate old links; reset changes password once and revokes old JWTs', async () => {
      const api = client(), user = await fixture('complete');
      const login = await api('/api/auth/login', { username: user.username, password: originalPassword });
      assert.equal(login.status, 200);
      const legacyToken = jwt.sign({ user_id: user.id, role: 'Customer' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
      assert.equal((await api('/api/auth/me', undefined, legacyToken)).status, 200);
      const oldToken = await requestToken(api, user), token = await requestToken(api, user);
      assert.notEqual(token, oldToken);
      assert.equal((await api('/api/auth/reset-password/validate', { token: oldToken })).status, 400);
      assert.equal((await api('/api/auth/reset-password/validate', { token })).status, 200);
      assert.equal((await api('/api/auth/reset-password', resetBody(token, 'weak'))).status, 400);
      assert.equal((await api('/api/auth/reset-password', { ...resetBody(token), password_confirm: 'Different789!' })).status, 400);
      assert.equal((await api('/api/auth/reset-password', resetBody(token))).status, 200);
      const row = await account(user);
      assert.ok(await bcrypt.compare(replacementPassword, row.password));
      assert.equal(row.token_version, 1);
      assert.equal(row.reset_token_hash, null); assert.equal(row.reset_token_expires, null);
      assert.equal(row.email, user.email); assert.equal(row.username, user.username); assert.equal(row.role, 'Customer');
      assert.equal((await api('/api/auth/reset-password', resetBody(token))).status, 400);
      assert.equal((await api('/api/auth/me', undefined, login.body.token)).status, 401);
      assert.equal((await api('/api/auth/me', undefined, legacyToken)).status, 401);
      assert.equal((await api('/api/auth/login', { username: user.username, password: originalPassword })).status, 401);
      const newLogin = await api('/api/auth/login', { username: user.username, password: replacementPassword });
      assert.equal(newLogin.status, 200);
      assert.equal((await api('/api/auth/me', undefined, newLogin.body.token)).status, 200);
      await waitFor(() => changed.includes(user.email));
    });

    await t.test('Malformed, nonexistent and expired tokens cannot change passwords', async () => {
      const api = client(), user = await fixture('expired');
      const token = await requestToken(api, user);
      await connection.query('UPDATE accounts SET reset_token_expires = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 SECOND) WHERE user_id = ?', [user.id]);
      for (const invalid of ['bad', randomBytes(32).toString('hex'), token]) {
        assert.equal((await api('/api/auth/reset-password/validate', { token: invalid })).status, 400);
        assert.equal((await api('/api/auth/reset-password', resetBody(invalid))).status, 400);
      }
      const row = await account(user);
      assert.equal(row.password, user.password); assert.equal(row.token_version, 0);
    });

    await t.test('Concurrent submissions consume the token exactly once', async () => {
      const api = client(), user = await fixture('concurrent');
      const token = await requestToken(api, user);
      const results = await Promise.all([api('/api/auth/reset-password', resetBody(token)), api('/api/auth/reset-password', resetBody(token, 'OtherPassword789!'))]);
      assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
      assert.equal((await account(user)).token_version, 1);
    });

    await t.test('SMTP failure clears the undelivered token without changing the password', async () => {
      const api = client(), user = await fixture('mailfailure');
      failDelivery = true;
      try {
        await requestToken(api, user);
        await waitFor(async () => (await account(user)).reset_token_hash === null);
        assert.equal((await account(user)).password, user.password);
      } finally { failDelivery = false; }
    });

    await t.test('Email throttling also applies to unknown accounts, and missing configuration returns 503', async () => {
      const api = client();
      for (let i = 0; i < 3; i++) assert.equal((await api('/api/auth/forgot-password', { email: 'rate@example.test' })).status, 202);
      assert.equal((await api('/api/auth/forgot-password', { email: 'rate@example.test' })).status, 429);
      const ipApi = client();
      for (let i = 0; i < 10; i++) assert.equal((await ipApi('/api/auth/forgot-password', { email: `ip${i}@example.test` })).status, 202);
      assert.equal((await ipApi('/api/auth/forgot-password', { email: 'iplast@example.test' })).status, 429);
      mailer.assertConfigured = () => { throw new Error('Missing config'); };
      try { assert.equal((await client()('/api/auth/forgot-password', { email: 'config@example.test' })).status, 503); }
      finally { mailer.assertConfigured = realAssertConfigured; }
    });

    await t.test('Deleted accounts and changed roles cannot retain access with old JWTs', async () => {
      const api = client(), user = await fixture('adminfixture', 'Admin');
      const login = await api('/api/auth/login', { username: user.username, password: originalPassword });
      assert.equal((await api('/admin-check', undefined, login.body.token)).status, 200);
      await connection.query('UPDATE accounts SET role = ? WHERE user_id = ?', ['Customer', user.id]);
      assert.equal((await api('/admin-check', undefined, login.body.token)).status, 403);
      await connection.query('DELETE FROM accounts WHERE user_id = ?', [user.id]);
      assert.equal((await api('/api/auth/me', undefined, login.body.token)).status, 401);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    // ปิด connection เพื่อทิ้ง TEMPORARY TABLE และงาน query ที่ค้าง ไม่ปล่อยตารางทดสอบกลับเข้า pool
    poolModule.exports = pool;
    connection.destroy();
    await pool.end();
  }
});
