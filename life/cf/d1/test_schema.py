#!/usr/bin/env python3
"""Test isolated Cloudflare D1 SQLite schema without touching Neon or Cloudflare."""
import sqlite3
from pathlib import Path

root=Path(__file__).resolve().parent
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys = ON')
for name in ('0001_village_core.sql','0002_trial_economy.sql'):
    db.executescript((root/'migrations'/name).read_text('utf-8'))
def failed(sql,params=()):
    try:
        db.execute(sql,params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError('Expected data-integrity check to fail: '+sql[:100])
uid='eb35272b-853a-4ea4-a3a5-597aad2e589a'
u2='eb35272b-853a-4ea4-a3a5-597aad2e589b'
def register(u,nick,role='player'):
    db.execute('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at) VALUES (?,?,?,?,?,?,?)',
               (u,nick,nick,'ab'*16,'cd'*64,role,'2026-10-20T00:00:00.000Z'))
register(uid,'playerA','admin')
register(u2,'playerB')
failed("INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at) VALUES (?,?,?,?,?,?,?)",
       ('other','PLAYERa','different','ab'*16,'cd'*64,'player','2026-10-20T00:00:00Z'))
profile='{"xp":12800,"coins":9000,"collection":["goldfish"],"__adminRevision":3}'
db.execute('INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)',
           (uid,profile,'["fashion_hair_09"]',22,'2026-10-20T00:00:00Z'))
save=db.execute('SELECT profile,owned,version FROM village_saves WHERE user_id=?',(uid,)).fetchone()
assert save==(profile,'["fashion_hair_09"]',22),save
failed('INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)',
       (uid,'{}','[]',0,'2026-10-20T00:00:00Z'))
failed('INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)',
       (u2,'{invalid','[]',0,'2026-10-20T00:00:00Z'))
failed('INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)',
       ('missing','{}','[]',0,'2026-10-20T00:00:00Z'))
db.execute('INSERT INTO village_wallets(user_id,balance,updated_at) VALUES(?,?,?)',
           (uid,12345,'2026-10-20T00:00:00Z'))
failed('UPDATE village_wallets SET balance=-1 WHERE user_id=?',(uid,))
failed('INSERT INTO village_wallet_transfers(id,sender_id,recipient_id,amount,kind,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?)',
       ('tx1',uid,u2,-100,'peer','key1','2026-10-20T00:00:00Z'))
db.execute('INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,?,?)',
           (uid,'{"money":250}',1,'2026-10-20T00:00:00Z'))
db.execute('INSERT INTO village_economy_v36_events(user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at) VALUES(?,?,?,?,?,?,?,?)',
           (uid,'req-1','a'*64,'test',25,275,'{}','2026-10-20T00:00:00Z'))
failed('INSERT INTO village_economy_v36_events(user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at) VALUES(?,?,?,?,?,?,?,?)',
       (uid,'req-1','a'*64,'test',25,275,'{}','2026-10-20T00:00:00Z'))
assert len(db.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall())>=13
print('PASS: D1 schema, foreign keys, save revisions, XP and owned inventory, nonnegative balances, idempotency')
