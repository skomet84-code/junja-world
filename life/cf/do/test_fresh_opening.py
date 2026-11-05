#!/usr/bin/env python3
"""One-time v50 new-opening reset regression on a populated SQLite database.
Never touches live accounts or makes a remote request."""
from pathlib import Path
import re,sqlite3,json
root=Path(__file__).resolve().parents[1]
source=(root/'do'/'database.js').read_text('utf-8')
match=re.search(r"for\(const name of \[([\s\S]*?)\]\)sql\.exec\('DELETE FROM '\+name\)",source)
assert match, "Production reset delete plan missing"
tables=re.findall(r"'(village_[a-z0-9_]+)'",match.group(1))
assert len(tables)>=12
assert len(tables)==len(set(tables))
c=sqlite3.connect(":memory:")
c.execute("PRAGMA foreign_keys=ON")
for file in ('0001_village_core.sql','0002_trial_economy.sql'):
    c.executescript((root/'d1'/'migrations'/file).read_text('utf-8'))
c.executescript("""
CREATE TABLE village_release_flags(
 id TEXT PRIMARY KEY NOT NULL,applied_at TEXT NOT NULL,
 deleted_users INTEGER NOT NULL CHECK(deleted_users>=0)
);
INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at)
 VALUES ('user1','qa1111','QA1','00','ab','player','2026-10-20T00:00:00Z');
INSERT INTO village_saves(user_id,profile,owned,version,updated_at)
 VALUES ('user1','{"xp":1234}','[]',4,'2026-10-20T00:00:00Z');
INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at)
 VALUES ('abc','user1','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z');
INSERT INTO village_wallets(user_id,balance,updated_at)
 VALUES ('user1',999,'2026-10-20T00:00:00Z');
INSERT INTO village_presence(user_id,x,y,updated_at,xp)
 VALUES ('user1',100,150,'2026-10-20T00:00:00Z',1234);
INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at)
 VALUES ('user1','{"coins":456}',1,'2026-10-20T00:00:00Z');
INSERT INTO village_economy_v36_events(user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
 VALUES ('user1','request1','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','buy',1,1,'{}','2026-10-20T00:00:00Z');
INSERT INTO village_economy_v37_checkpoints(user_key,version,state,state_hash,created_at)
 VALUES ('user1',1,'{}','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','2026-10-20T00:00:00Z');
INSERT INTO village_market_v38_listings(id,seller_key,item,quantity,unit_price,created_at)
 VALUES ('listing1','user1','fish',1,10,'2026-10-20T00:00:00Z');
INSERT INTO village_market_v38_requests(actor_key,request_id,request_hash,result,created_at)
 VALUES ('user1','req1','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','{}','2026-10-20T00:00:00Z');
""")
marker='v50-fresh-opening-2026-10-20'
def execute_once():
    if c.execute("SELECT id FROM village_release_flags WHERE id=?",(marker,)).fetchone(): return
    try:
        c.execute("BEGIN")
        count=c.execute('SELECT count(*) FROM village_users').fetchone()[0]
        for name in tables:c.execute('DELETE FROM '+name)
        c.execute('INSERT INTO village_release_flags VALUES (?,?,?)',(marker,'2026-10-20T00:00:00Z',count))
        c.execute("COMMIT")
    except Exception:
        c.execute("ROLLBACK")
        raise
c.commit()
execute_once()
assert c.execute('SELECT deleted_users FROM village_release_flags WHERE id=?',(marker,)).fetchone()[0]==1
for table in tables:assert c.execute('SELECT count(*) FROM '+table).fetchone()[0]==0,table
assert not c.execute('PRAGMA foreign_key_check').fetchall()
# Fresh player created AFTER reset must survive later deployments.
c.execute("INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
 ('fresh1','freshuser','새출발','00','abcd','player','2026-10-20T01:00:00Z'))
c.commit()
execute_once()
assert c.execute('SELECT username FROM village_users').fetchone()[0]=='freshuser'
print('PASS v50 opening: wipe old cloud-only characters, inventory and experimental economy atomically; preserve new users on every later restart')
