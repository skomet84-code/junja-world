// v38 P2P marketplace: PURE server-only rules, separated from legacy gold and cosmetics.
// Stock is escrowed BEFORE a listing becomes visible; buyer pays once, seller receives net of fee.
import {LAB_CROPS,LAB_RECIPES} from './secure-economy-v36.js';
export const MARKET_CATALOG=Object.freeze({...LAB_CROPS,...LAB_RECIPES});
export const MARKET_LISTING_FEE=12,MARKET_MAX_LISTINGS=12,MARKET_MAX_QUANTITY=20;
export const MARKET_TAX_PERCENT=5,MARKET_MAX_GOLD=1_000_000_000_000;
const fault=(error,status=409)=>{const err=new Error(error);err.status=status;throw err};
const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000?n:0;
export const marketQuote=(item,unitPrice,quantity)=>{
 const product=Object.hasOwn(MARKET_CATALOG,item)?MARKET_CATALOG[item]:null;
 if(!product)fault('거래 가능한 농산물이나 가공품을 선택해 주세요',400);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>MARKET_MAX_QUANTITY)fault('한 번에 1~20개만 등록할 수 있어요',400);
 // Bounded to NPC price to stop 1G gifting and artificial money-trading prices.
 const floor=Math.max(1,Math.ceil(product.sell*.5)),ceiling=product.sell*3;
 if(!Number.isSafeInteger(unitPrice)||unitPrice<floor||unitPrice>ceiling)
  fault('가격은 '+floor.toLocaleString()+'~'+ceiling.toLocaleString()+'G 사이여야 해요',400);
 const gross=unitPrice*quantity,tax=Math.max(1,Math.ceil(gross*MARKET_TAX_PERCENT/100));
 return {item,label:product.label,unitPrice,quantity,gross,tax,net:gross-tax,fee:MARKET_LISTING_FEE};
};
function checkAccount(s){
 if(!s||!Number.isSafeInteger(s.coins)||s.coins<0||s.coins>MARKET_MAX_GOLD||!s.stock||typeof s.stock!=='object'||Array.isArray(s.stock))
  fault('서버 경제 계정 데이터가 올바르지 않습니다',500);
}
export function reserveListing(state,item,unitPrice,quantity){
 checkAccount(state);
 const q=marketQuote(item,unitPrice,quantity),s=structuredClone(state);
 if(count(s.stock[q.item])<q.quantity)fault('판매할 재고가 부족해요');
 if(s.coins<q.fee)fault('등록 수수료가 부족해요');
 s.stock[q.item]-=q.quantity;s.coins-=q.fee;
 return {state:s,quote:q,delta:-q.fee};
}
export function cancelListing(state,listing){
 checkAccount(state);
 const q=marketQuote(listing.item,Number(listing.unit_price),Number(listing.quantity)),s=structuredClone(state);
 if(count(s.stock[q.item])+q.quantity>1_000_000)fault('창고 용량이 부족해 등록을 취소할 수 없어요');
 s.stock[q.item]=count(s.stock[q.item])+q.quantity;
 return {state:s,quote:q,delta:0};
}
export function settleListing(buyer,seller,listing){
 checkAccount(buyer);checkAccount(seller);
 const quote=marketQuote(listing.item,Number(listing.unit_price),Number(listing.quantity));
 const b=structuredClone(buyer),s=structuredClone(seller);
 if(b.coins<quote.gross)fault('구매할 골드가 부족해요');
 if(s.coins+quote.net>MARKET_MAX_GOLD)fault('판매자 골드 한도에 도달했어요');
 if(count(b.stock[quote.item])+quote.quantity>1_000_000)fault('구매자의 창고 용량이 부족해요');
 b.coins-=quote.gross;b.stock[quote.item]=count(b.stock[quote.item])+quote.quantity;
 s.coins+=quote.net;
 return {buyer:b,seller:s,quote,buyerDelta:-quote.gross,sellerDelta:quote.net};
}
