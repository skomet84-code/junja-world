// v42 main-island portal. Fixed coordinates intentionally never enter account/cloud saves.
// The separate v41 district remains an optional test economy, not legacy live currency.
export const BUSINESS_PORTAL_V42=Object.freeze({
 id:'business_district',x:2765,y:1265,
 modelX:2765,modelY:1100,
 halfWidth:145,halfDepth:113,
 name:'주민 사업장 거리',icon:'🏘️',
 description:'직업별 3D 사업장과 주민 상점을 직접 방문하는 입구',
 entranceRadius:155
});
export function portalCollision(x,y){
 return Number.isFinite(x)&&Number.isFinite(y)&&
  Math.abs(x-BUSINESS_PORTAL_V42.modelX)<BUSINESS_PORTAL_V42.halfWidth&&
  Math.abs(y-BUSINESS_PORTAL_V42.modelY)<BUSINESS_PORTAL_V42.halfDepth;
}
export function canUseBusinessPortal(actor){
 return Number.isFinite(actor?.x)&&Number.isFinite(actor?.y)&&
  Math.hypot(actor.x-BUSINESS_PORTAL_V42.x,actor.y-BUSINESS_PORTAL_V42.y)<=BUSINESS_PORTAL_V42.entranceRadius;
}
export function portalReturnPosition(actor){
 // Snapshot is in memory ONLY. Never overwrite persisted player state to enter/leave district.
 if(!Number.isFinite(actor?.x)||!Number.isFinite(actor?.y))throw Error('유효하지 않은 마을 위치');
 return Object.freeze({x:actor.x,y:actor.y});
}
