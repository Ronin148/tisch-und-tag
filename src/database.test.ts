import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

describe('private cookbook database rules (local PostgreSQL)', () => {
  let db: PGlite;
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users (id uuid primary key); insert into auth.users values ('${owner}'), ('${other}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
    await db.exec(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}'; insert into public.tisch_kochbuch(user_id,data) values ('${owner}', '{"version":1,"recipes":[]}'); reset role;`);
  }, 20000);
  afterAll(async () => { await db?.close(); });
  it('allows the owner to read their own cookbook', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
    expect((await db.query('select * from public.tisch_kochbuch')).rows).toHaveLength(1);
  });
  it('hides private data from another authenticated account', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${other}';`);
    expect((await db.query('select * from public.tisch_kochbuch')).rows).toHaveLength(0);
    expect((await db.query(`update public.tisch_kochbuch set revision=10 where user_id='${owner}' returning user_id`)).rows).toHaveLength(0);
  });
  it('prevents creating a row on someone else’s behalf', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${other}';`);
    await expect(db.query(`insert into public.tisch_kochbuch(user_id,data) values ('${owner}', '{"version":1}')`)).rejects.toThrow(/row-level security/i);
  });
  it('prevents reassignment of cookbook ownership', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
    await expect(db.query(`update public.tisch_kochbuch set user_id='${other}' where user_id='${owner}'`)).rejects.toThrow(/row-level security/i);
  });
  it('rejects unauthenticated access', async () => {
    await db.exec('set role anon;');
    await expect(db.query('select * from public.tisch_kochbuch')).rejects.toThrow(/permission denied/i);
  });
  it('prevents a stale revision from overwriting another device’s changes', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
    expect((await db.query('update public.tisch_kochbuch set revision=2 where revision=1 returning revision')).rows).toHaveLength(1);
    expect((await db.query('update public.tisch_kochbuch set revision=2 where revision=1 returning revision')).rows).toHaveLength(0);
  });
});
