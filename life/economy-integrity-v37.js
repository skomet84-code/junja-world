// v37 read-only integrity checks for durable trial-economy snapshots.
// SHA-256 detects unexpected corruption/unsafe overwrites. It is NOT a signature or a replacement for DB access control.
import {createHash} from 'node:crypto';

function canonical(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
export function stateFingerprint(state){
 if(!state||typeof state!=='object'||Array.isArray(state))throw Error('Invalid state for v37 fingerprint');
 return createHash('sha256').update('junja-economy-state-v37\n'+canonical(state)).digest('hex');
}
export function makeCheckpoint(userKey,version,state,previousHash=null,requestId=null){
 if(typeof userKey!=='string'||!userKey||!Number.isSafeInteger(version)||version<0)throw Error('Invalid checkpoint identity');
 if(previousHash!==null&&!/^[a-f0-9]{64}$/.test(previousHash))throw Error('Invalid checkpoint parent');
 const fingerprint=stateFingerprint(state);
 const stateHash=createHash('sha256').update(['junja-v37',userKey,version,previousHash||'GENESIS',fingerprint].join('\n')).digest('hex');
 return {user_key:userKey,version,state:structuredClone(state),previous_hash:previousHash,state_hash:stateHash,request_id:requestId};
}
export function validateCheckpointChain(userKey,account,rows,maxCheck=25){
 if(!account||!Number.isSafeInteger(Number(account.version)))return {ok:false,reason:'invalid_account'};
 if(!Array.isArray(rows)||!rows.length)return {ok:false,reason:'not_initialized'};
 const sequence=rows.slice(0,maxCheck);
 for(let i=0;i<sequence.length;i++){
  const actual=sequence[i],verified=makeCheckpoint(userKey,Number(actual.version),actual.state,actual.previous_hash||null,actual.request_id||null);
  if(verified.state_hash!==actual.state_hash)return {ok:false,reason:'snapshot_hash_mismatch',version:Number(actual.version)};
  if(i>0){
   const later=sequence[i-1];
   if(Number(later.version)!==Number(actual.version)+1||later.previous_hash!==actual.state_hash)
    return {ok:false,reason:'snapshot_chain_gap',version:Number(later.version)};
  }
 }
 const latest=sequence[0];
 if(Number(latest.version)!==Number(account.version))return {ok:false,reason:'snapshot_version_mismatch',version:Number(latest.version)};
 if(stateFingerprint(latest.state)!==stateFingerprint(account.state))return {ok:false,reason:'account_snapshot_mismatch',version:Number(latest.version)};
 return {ok:true,checked:sequence.length,version:Number(account.version),balance:Number(account.state.coins||0),firstVerifiedVersion:Number(sequence[sequence.length-1].version)};
}
