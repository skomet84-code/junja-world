// Production Cloudflare has a strict 100,000-iteration ceiling PER PBKDF2
// deriveBits() call, even when the local emulator accepts higher values.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const src=readFileSync(new URL('../d1/account-staging.js',import.meta.url),'utf8');
const start=src.indexOf('const KDF_ITERATIONS='),end=src.indexOf('const cookie=',start);
assert(start>=0&&end>start,'production password hasher source must exist');
let calls=0;
const boundedSubtle={
 importKey(...args){return webcrypto.subtle.importKey(...args)},
 deriveBits(params,...args){
  calls++;
  assert(Number.isInteger(params.iterations)&&params.iterations<=100000,
   'Cloudflare production rejects PBKDF2 iteration count above 100000');
  return webcrypto.subtle.deriveBits(params,...args);
 }
};
const ctx={Buffer,TextEncoder,Uint8Array,crypto:{subtle:boundedSubtle}};
vm.runInNewContext(src.slice(start,end)+'\nthis.hashPassword=passwordHash;',ctx);
const salt='00112233445566778899aabbccddeeff';
const expected=await ctx.hashPassword('correct horse battery staple',salt);
assert.match(expected,/^pbkdf2-sha256-chain6:100000:[a-f0-9]{64}$/);
assert.equal(calls,6);
const same=await ctx.hashPassword('correct horse battery staple',salt);
assert.equal(expected,same,'password KDF must be deterministic');
const different=await ctx.hashPassword('other password',salt);
assert.notEqual(expected,different);
assert.equal(calls,18);
console.log('PASS Cloudflare WebCrypto PBKDF2 <=100,000 iterations per call, six strong chained stages');
