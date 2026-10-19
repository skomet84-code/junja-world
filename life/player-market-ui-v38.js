// Optional v38 marketplace screen. All money/escrow/order changes are SERVER-side only.
const node=(tag,value)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=String(value);return el};
const text=(parent,value,tag='p')=>{const el=node(tag,value);parent.append(el);return el};
const gold=x=>Number(x).toLocaleString('ko-KR')+'G';
const css=(element,style)=>{element.style.cssText=style;return element};
const actionStyle='margin:4px 4px 6px 0;border:0;border-radius:10px;background:#4b8b71;color:#fff;padding:10px 12px;font-weight:750';

export function openPlayerMarket(host,{back}={}){
 host.replaceChildren();
 text(host,'🏪 주민 거래소 · 시험 경제','h2');
 text(host,'시험용 농작물과 골드만 거래할 수 있어요. 기존 레벨·재산·꾸미기 아이템은 이동하지 않습니다.');
 const status=css(node('p','서버 연결 확인 중…'),'padding:12px;background:#f3f2df;border-radius:12px;font-weight:700');
 host.append(status);
 if(back){const b=css(node('button','← 개인 농장으로 돌아가기'),actionStyle);b.onclick=back;host.append(b)}
 const content=node('div');host.append(content);
 let data=null,pending=null,busy=false;
 function btn(label,fn,disabled=false){
  const b=css(node('button',label),actionStyle);b.type='button';b.disabled=busy||disabled;b.onclick=fn;return b;
 }
 async function load(){
  try{
   const r=await fetch('/api/market-v38',{credentials:'same-origin',cache:'no-store'});
   const j=await r.json();
   if(!r.ok)throw Error(j.error||'거래소를 열 수 없습니다');
   if(!host.isConnected)return;
   data=j;status.textContent='✅ 서버 거래소 연결 · 등록 상품 '+j.listings.length+'건';render();
  }catch(e){status.textContent='⚠️ '+e.message;content.replaceChildren()}
 }
 async function send(kind,payload){
  if(busy)return;
  const signature=JSON.stringify({kind,payload});
  if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const r=await fetch('/api/market-v38',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({kind,payload,requestId:pending.requestId})});
   const j=await r.json();
   if(!r.ok)throw Object.assign(new Error(j.error||'거래가 거부됐습니다'),{status:r.status});
   pending=null;
   status.textContent='✅ '+(kind==='list'?'상점에 등록했어요':kind==='buy'?'구매 완료!':'등록을 취소하고 재고를 돌려받았어요')+
     (j.replayed?' · 중복 요청 확인':'');
   const refreshed=await fetch('/api/market-v38',{credentials:'same-origin',cache:'no-store'});
   if(refreshed.ok){data=await refreshed.json();}
  }catch(e){
   // A network timeout may have committed. Retry only using the same ID.
   if(e.status&&e.status<500&&![408,429].includes(e.status))pending=null;
   status.textContent='⚠️ '+e.message+(e.status?'':' · 같은 거래 요청으로 다시 시도할 수 있어요');
  }finally{busy=false;if(host.isConnected)render()}
 }
 function render(){
  content.replaceChildren();
  if(!data)return;
  const {economy:s,listings,ownListings}=data;
  text(content,'💰 시험 지갑 '+gold(s.coins)+' · 상점 수수료: 등록 12G / 거래 5%','h3');
  text(content,'📤 내가 판매할 물건','h3');
  const owned=Object.entries(s.stock||{}).filter(([id,n])=>n>0&&(data.products?.[id]||s.catalog[id]||s.recipes[id]));
  if(!owned.length)text(content,'판매할 시험용 재고가 없어요. 서버 농장에서 먼저 수확하거나 가공해 주세요.');
  else{
   const section=css(node('section'),'padding:10px;border-radius:13px;background:#eff4e7');
   const item=node('select');css(item,'padding:10px;width:100%;max-width:100%;margin:5px 0');
   for(const [id,n] of owned){const o=node('option',(data.products?.[id]||s.catalog[id]||s.recipes[id]).label+' · '+n+'개 보유');o.value=id;item.append(o)}
   const qty=node('input');qty.type='number';qty.min='1';qty.max='20';qty.value='1';
   const price=node('input');price.type='number';price.min='1';price.value='34';
   for(const el of [qty,price])css(el,'padding:9px;width:75px;margin:5px;border:1px solid #cbd3bd;border-radius:8px');
   const update=()=>{
    const info=data.products?.[item.value]||s.catalog[item.value]||s.recipes[item.value];price.value=String(info.sell);
    price.min=String(Math.ceil(info.sell*.5));price.max=String(info.sell*3);
    qty.max=String(Math.min(20,s.stock[item.value]||0));
   };
   item.onchange=update;section.append(item);text(section,'수량','span');
   section.append(qty);text(section,'개 · 개당 판매가','span');section.append(price);text(section,'G','span');
   section.append(btn('🏪 상점에 판매 등록',()=>{
    const quantity=Number(qty.value),unitPrice=Number(price.value);
    if(!Number.isSafeInteger(quantity)||!Number.isSafeInteger(unitPrice))return;
    send('list',{item:item.value,quantity,unitPrice});
   }));
   content.append(section);update();
  }
  text(content,'🧺 주민 판매 목록','h3');
  if(!listings.length)text(content,'현재 등록된 상품이 없어요.');
  for(const listing of listings){
   const box=css(node('section'),'background:#f2f4ec;padding:12px;border-radius:12px;margin:7px 0');
   const name=(data.products?.[listing.item]||s.catalog[listing.item]||s.recipes[listing.item])?.label||listing.item;
   text(box,name+' ×'+listing.quantity+' · '+gold(Number(listing.unit_price)*listing.quantity),'strong');
   text(box,'판매자 '+listing.seller_name+' · 개당 '+gold(listing.unit_price));
   if(listing.seller_key===data.me)box.append(btn('내 상품 · 등록 취소',()=>send('cancel',{listingId:listing.id})));
   else box.append(btn('구매하기',()=>send('buy',{listingId:listing.id}),s.coins<Number(listing.unit_price)*listing.quantity));
   content.append(box);
  }
  text(content,'📜 내 상점 거래 현황','h3');
  for(const listing of ownListings.slice(0,10)){
   const name=(data.products?.[listing.item]||s.catalog[listing.item]||s.recipes[listing.item])?.label||listing.item;
   text(content,name+' ×'+listing.quantity+' · '+(listing.status==='sold'?'판매 완료':listing.status==='cancelled'?'취소됨':'판매 중'),'p');
  }
  content.append(btn('↻ 거래소 새로고침',load));
 }
 load();return {refresh:load};
}
