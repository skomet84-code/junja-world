// Shared, deterministic validation for Cloudflare multiplayer rooms.
// Preserve game v49 semantics without touching account/profile persistence.
import {PHRASES} from '../life-systems-v20.js';
import {CATALOG_BY_ID} from '../fashion-catalog.js';
export const MAX_ROOM_PLAYERS=8;
export function sanitizeText(value,length=30){
 return String(value??'').replace(/[\x00-\x1f\x7f<>]/g,'').trim().slice(0,length);
}
export function normalizeRoom(value){
 return sanitizeText(value,12).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'SPRING';
}
export function normalizeClientId(value){
 return typeof value==='string'&&/^[a-zA-Z0-9-]{18,64}$/.test(value)?value:null;
}
export function bounded(value,low,high){
 const n=Number(value);return Number.isFinite(n)?Math.min(high,Math.max(low,n)):low;
}
const coats=new Set(['mint','blue','rose','amber','lavender','coral','navy','cream','forest','pink','linen']);
const hats=new Set(['none','straw','beret','crown','flower','navycap','beanie','cat','ribbon','captain']);
const slots=['hair','outfit','accessory','pet'];
export function sanitizeFashion(input){
 const raw=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 return Object.fromEntries(slots.map(type=>[type,
  typeof raw[type]==='string'&&CATALOG_BY_ID[raw[type]]?.type===type?raw[type]:null]));
}
export function sanitizeAvatar(data,existing={}){
 return {
  x:bounded(data?.x,85,3515),y:bounded(data?.y,120,2300),
  dir:bounded(data?.dir,0,3),
  coat:coats.has(data?.coat)?data.coat:(existing.coat||'mint'),
  hat:hats.has(data?.hat)?data.hat:(existing.hat||'none'),
  fashion:sanitizeFashion(data?.fashion)
 };
}
export function isAllowedPhrase(phrase){return typeof phrase==='string'&&PHRASES.includes(phrase)}
export function playerSummary(p){
 return {id:p.id,nick:p.nick,x:p.x,y:p.y,coat:p.coat,hat:p.hat,dir:p.dir,fashion:p.fashion};
}
