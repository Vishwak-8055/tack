import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool';
import { server, signup } from './helpers';

const credentials = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'analytical engine',
};

describe('auth', () => {
  it('registers, starts a session and returns the current user', async () => {
    const agent = request.agent(server);
    const res = await agent.post('/api/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);
    expect(res.headers['set-cookie']?.[0]).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(res.body.id);
  });

  it('normalises the email and rejects duplicates', async () => {
    await request(server).post('/api/auth/register').send(credentials).expect(201);
    const again = await request(server)
      .post('/api/auth/register')
      .send({ ...credentials, email: '  ADA@Example.com ' });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('email_taken');
  });

  it('reports validation problems per field', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'name', 'password']);
  });

  it('logs in with the right password only', async () => {
    await request(server).post('/api/auth/register').send(credentials).expect(201);

    const good = await request(server).post('/api/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });
    expect(good.status).toBe(200);

    const bad = await request(server).post('/api/auth/login').send({
      email: credentials.email,
      password: 'wrong password',
    });
    expect(bad.status).toBe(401);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    await request(server).post('/api/auth/register').send(credentials).expect(201);

    const wrongPassword = await request(server)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'nope nope nope' });
    const unknownEmail = await request(server)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'nope nope nope' });

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('ends the session on logout', async () => {
    const { agent } = await signup();
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('stores only a hash of the session token', async () => {
    const { cookie } = await signup();
    const token = cookie.split('=')[1]!;
    const { rows } = await pool.query('SELECT token_hash FROM sessions');

    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('signs other devices out when the password changes', async () => {
    const first = request.agent(server);
    await first.post('/api/auth/register').send(credentials).expect(201);
    const second = request.agent(server);
    await second
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    await first
      .post('/api/auth/password')
      .send({ currentPassword: credentials.password, newPassword: 'a brand new passphrase' })
      .expect(204);

    await first.get('/api/auth/me').expect(200);
    await second.get('/api/auth/me').expect(401);
  });

  it('refuses a password change with the wrong current password', async () => {
    const { agent } = await signup();
    const res = await agent
      .post('/api/auth/password')
      .send({ currentPassword: 'definitely wrong', newPassword: 'another good passphrase' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.currentPassword).toBeDefined();
  });

  it('rejects writes that come from another origin', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .set('Origin', 'https://evil.example')
      .send(credentials);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('bad_origin');
  });

  it('answers unknown API routes with JSON, not HTML', async () => {
    const res = await request(server).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('exposes a health check', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
