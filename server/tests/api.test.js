/**
 * End-to-end API tests: auth, ownership, counting, history, stats, CSV.
 */
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearDb, startDb, stopDb } from './helpers.js';
import { todayInTz } from '../src/utils/date.js';

const app = createApp();

before(startDb);
after(stopDb);
beforeEach(clearDb);

/** Register a user and return a supertest agent that keeps the auth cookie. */
async function signup(overrides = {}) {
  const agent = request.agent(app);
  const body = { name: 'Ada', email: `ada${Math.random()}@example.com`, password: 'password123', ...overrides };
  const res = await agent.post('/api/auth/register').set('X-Requested-With', 'XMLHttpRequest').send(body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  // Small helpers that always send the CSRF header.
  const x = (method) => (url) => agent[method](url).set('X-Requested-With', 'XMLHttpRequest');
  return { agent, user: res.body.user, get: x('get'), post: x('post'), patch: x('patch'), del: x('delete') };
}

describe('auth', () => {
  test('register sets an httpOnly cookie and creates a default counter', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ name: 'Bo', email: 'bo@example.com', password: 'password123' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.timezone, 'Africa/Lagos');
    assert.equal(res.body.user.passwordHash, undefined);
    assert.match(res.headers['set-cookie'][0], /HttpOnly/i);

    const { get } = await signup();
    const list = await get('/api/counters');
    assert.equal(list.body.counters.length, 1);
  });

  test('login / me / logout round-trip', async () => {
    await signup({ email: 'cy@example.com' });
    const agent = request.agent(app);
    const bad = await agent
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ email: 'cy@example.com', password: 'wrong-password' });
    assert.equal(bad.status, 401);

    const ok = await agent
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ email: 'CY@example.com', password: 'password123' });
    assert.equal(ok.status, 200);
    assert.equal((await agent.get('/api/auth/me')).status, 200);

    await agent.post('/api/auth/logout').set('X-Requested-With', 'XMLHttpRequest');
    assert.equal((await agent.get('/api/auth/me')).status, 401);
  });

  test('duplicate email -> 409, invalid input -> 400', async () => {
    await signup({ email: 'dup@example.com' });
    const dup = await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ name: 'X', email: 'dup@example.com', password: 'password123' });
    assert.equal(dup.status, 409);

    const invalid = await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ name: '', email: 'nope', password: 'short' });
    assert.equal(invalid.status, 400);
  });

  test('state-changing requests without X-Requested-With are rejected (CSRF)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    assert.equal(res.status, 403);
  });

  test('protected routes require auth', async () => {
    assert.equal((await request(app).get('/api/counters')).status, 401);
  });
});

describe('counters', () => {
  test('increment, decrement floor, reset and today', async () => {
    const { get, post } = await signup();
    const { counters } = (await get('/api/counters')).body;
    const id = counters[0].id;

    await Promise.all(Array.from({ length: 25 }, () => post(`/api/counters/${id}/increment`).send({ amount: 1 })));
    let today = await get(`/api/counters/${id}/today`);
    assert.equal(today.body.count, 25);
    assert.equal(today.body.date, todayInTz('Africa/Lagos'));

    await post(`/api/counters/${id}/reset-today`);
    const dec = await post(`/api/counters/${id}/increment`).send({ amount: -1 });
    assert.equal(dec.body.count, 0);
    assert.equal(dec.body.applied, false);

    const bad = await post(`/api/counters/${id}/increment`).send({ amount: 5 });
    assert.equal(bad.status, 400);
  });

  test('users cannot see or touch each other’s counters', async () => {
    const alice = await signup();
    const bob = await signup();
    const aliceCounter = (await alice.get('/api/counters')).body.counters[0].id;

    assert.equal((await bob.get(`/api/counters/${aliceCounter}/today`)).status, 404);
    assert.equal((await bob.post(`/api/counters/${aliceCounter}/increment`).send({ amount: 1 })).status, 404);
    assert.equal((await bob.del(`/api/counters/${aliceCounter}`)).status, 404);
    assert.equal((await bob.get('/api/counters')).body.counters.length, 1);
  });

  test('create, rename, delete', async () => {
    const { get, post, patch, del } = await signup();
    const created = await post('/api/counters').send({ name: 'Push-ups' });
    assert.equal(created.status, 201);
    const id = created.body.counter.id;

    const renamed = await patch(`/api/counters/${id}`).send({ name: 'Squats' });
    assert.equal(renamed.body.counter.name, 'Squats');

    assert.equal((await del(`/api/counters/${id}`)).status, 200);
    assert.equal((await get(`/api/counters/${id}/today`)).status, 404);
    assert.equal((await get('/api/counters/not-an-id/today')).status, 400);
  });

  test('history fills gaps, stats and CSV export work', async () => {
    const { get, post } = await signup();
    const id = (await get('/api/counters')).body.counters[0].id;
    await post(`/api/counters/${id}/increment`).send({ amount: 1 });
    await post(`/api/counters/${id}/increment`).send({ amount: 1 });

    const hist = await get(`/api/counters/${id}/history`);
    assert.equal(hist.status, 200);
    assert.equal(hist.body.days.length, 30);
    assert.equal(hist.body.days.at(-1).count, 2);
    assert.equal(hist.body.total, 2);

    const range = await get(`/api/counters/${id}/history?from=2024-01-10&to=2024-01-01`);
    assert.equal(range.status, 400);

    const stats = await get(`/api/counters/${id}/stats`);
    assert.equal(stats.body.today, 2);
    assert.equal(stats.body.currentStreak, 1);

    const csv = await get(`/api/counters/${id}/export.csv`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text, /date,count,counter/);
    assert.match(csv.text, /,2,My counter/);
  });

  test('changing timezone changes which day "today" is', async () => {
    const { get, patch } = await signup({ timezone: 'Pacific/Kiritimati' }); // UTC+14
    const id = (await get('/api/counters')).body.counters[0].id;
    const kiri = (await get(`/api/counters/${id}/today`)).body.date;

    await patch('/api/auth/me').send({ timezone: 'Pacific/Pago_Pago' }); // UTC-11
    const pago = (await get(`/api/counters/${id}/today`)).body.date;
    // 25 hours apart -> always a different calendar day.
    assert.notEqual(kiri, pago);
  });
});
