// Owner-authorized one-time promotion for the existing, already registered
// fresh-opening account. The deploy itself is the privileged authorization.
// An account created AFTER the first post-deploy request cannot inherit it.
// Neither password nor a publicly supplied token is accepted for promotion.
export const OWNER_GRANT_MARKER='v50-owner-skomet-20261020';
export function ensureOwnerPromotion(storage){
 const sql=storage.sql,marker=OWNER_GRANT_MARKER;
 return storage.transactionSync(()=>{
  sql.exec(`CREATE TABLE IF NOT EXISTS village_owner_grants(
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    outcome TEXT NOT NULL,
    applied_at TEXT NOT NULL
   )`);
  const existing=sql.exec('SELECT outcome FROM village_owner_grants WHERE id=?',marker).toArray()[0];
  if(existing)return existing.outcome;
  const target=sql.exec('SELECT id,username,nickname,role FROM village_users WHERE username=?','skomet').toArray()[0];
  const adminCount=Number(sql.exec("SELECT count(*) AS n FROM village_users WHERE role='admin'").one()?.n||0);
  let outcome;
  if(!target)outcome='target_missing';
  else if(target.role==='admin'&&target.nickname==='준자')outcome='already_admin';
  else if(target.role!=='player'||target.nickname!=='준자준비')outcome='identity_mismatch';
  else if(adminCount!==0)outcome='another_admin_exists';
  else{
   sql.exec(`UPDATE village_users SET role='admin',nickname='준자'
     WHERE id=? AND username=? AND nickname=? AND role='player'`,
     target.id,'skomet','준자준비');
   const affected=Number(sql.exec('SELECT changes() AS n').one()?.n||0);
   if(affected!==1)throw Error('Owner promotion precondition changed');
   outcome='granted';
  }
  sql.exec('INSERT INTO village_owner_grants(id,user_id,outcome,applied_at) VALUES(?,?,?,?)',
    marker,target?.id||null,outcome,new Date().toISOString());
  return outcome;
 });
}
