// Each species receives an original, deterministic SVG character portrait.
// The geometry is deliberately different for shark, ray, eel, squid/octopus, crab and fish.
const nHash=s=>[...s].reduce((n,c)=>((n*33+c.charCodeAt(0))>>>0),5381);
const e=n=>Math.round(n*100)/100;
export function drawFishPortrait(fish,size=140){
 if(!fish)return '';
 const seed=nHash(fish.name),g='reef-'+seed.toString(16),w=240,h=145;
 const dark=fish.dark||'#527a7c',base=fish.color||'#a0c6cc';
 const tier=fish.tier||'common',high=['legend','mythic'].includes(tier);
 const name=fish.name,shape=fish.shape||'carp';
 const kind=/문어|오징어|크라켄/.test(name)?'octopus':/게|가재/.test(name)?'crab':/상어/.test(name)?'shark':/가오리/.test(name)?'ray':/황새치|청새치/.test(name)?'billfish':/장어/.test(name)?'eel':shape;
 const mul=Math.max(.68,Math.min(1.45,(fish.size||1)/1.5));
 const rx=kind==='minnow'?48:kind==='trout'?62:kind==='bass'?69:kind==='gold'?60:kind==='carp'?64:68;
 const ry=kind==='minnow'?18:kind==='trout'?23:kind==='bass'?28:kind==='gold'?38:kind==='carp'?34:27;
 const id=String(seed),parts=[];
 const append=code=>parts.push(code);
 append('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+name+' 그림" width="'+Math.max(50,Number(size)||140)+'" height="'+Math.round((Number(size)||140)*h/w)+'" data-fish="'+id+'" data-fish-shape="'+kind+'">');
 // Solid color species silhouettes deliberately avoid Safari paint servers.
 
 
 append('<g transform="translate(120 72) scale('+e(mul)+') translate(-120 -72)">');
 if(high){
  for(let i=0;i<8;i++){const a=(i*1.91+seed%37)*Math.PI/12,x=120+Math.cos(a)*76,y=72+Math.sin(a)*54;
   append('<circle cx="'+e(x)+'" cy="'+e(y)+'" r="'+(i%3+1)+'" fill="'+(tier==='mythic'?'#c7a3f8':'#ffe2a0')+'" opacity=".75"/>')}
 }
 // Safari/Kakao's embedded browsers sometimes fail to resolve SVG paint-server
 // URL fragments inside game modals. That made every fish body disappear and
 // left only a grey tail. Use opaque color fills first, with painted highlights
 // independent of <defs> so the whole fish survives mobile rendering.
 const fill=base,fin=dark;
 if(kind==='octopus'){
  for(let i=0;i<8;i++){const x=62+i*15,curve=(i-3.5)*9;
   append('<path d="M '+x+' 87 Q '+e(x+curve)+' '+e(117+(i%3)*8)+' '+e(x+curve*1.5)+' '+(112+i%3*7)+'" fill="none" stroke="'+(i%2?dark:base)+'" stroke-width="11" stroke-linecap="round"/>');
   append('<circle cx="'+e(x+curve*1.5)+'" cy="'+(112+i%3*7)+'" r="3" fill="#fff9ed" opacity=".7"/>')}
  append('<ellipse cx="120" cy="62" rx="47" ry="43" fill="'+fill+'" stroke="'+dark+'" stroke-width="2"/>');
  append('<ellipse cx="108" cy="46" rx="27" ry="15" fill="#fff8e8" opacity=".25"/>');
  append('<path d="M80 58 Q85 18 116 21 Q148 20 159 54" fill="none" stroke="#ffffff" stroke-width="5" opacity=".38"/>');
 }else if(kind==='ray'){
  append('<path d="M56 76 Q83 31 125 31 Q164 30 195 76 Q165 116 124 112 Q85 117 56 76 Z" fill="'+fill+'" stroke="'+dark+'" stroke-width="3"/>');
  append('<path d="M73 75 Q118 36 170 72 Q131 60 118 98 Q95 97 73 75 Z" fill="#fff8f0" opacity=".21"/>');
  append('<path d="M119 99 Q131 113 128 143" fill="none" stroke="'+dark+'" stroke-width="9" stroke-linecap="round"/>');
  append('<ellipse cx="121" cy="78" rx="19" ry="7" fill="#fff" opacity=".18"/>');
 }else if(kind==='crab'){
  for(const v of [-1,1]){
   append('<path d="M '+(120+v*48)+' 68 Q '+(120+v*72)+' 49 '+(120+v*94)+' 63" fill="none" stroke="'+dark+'" stroke-width="7" stroke-linecap="round"/>');
   append('<path d="M '+(120+v*81)+' 64 L '+(120+v*97)+' 43 L '+(120+v*104)+' 65" fill="'+fin+'" stroke="'+dark+'" stroke-width="2"/>');
   for(let i=0;i<3;i++)append('<path d="M'+(120+v*38)+' '+(73+i*11)+' Q '+(120+v*76)+' '+(63+i*10)+' '+(120+v*88)+' '+(78+i*13)+'" fill="none" stroke="'+dark+'" stroke-width="5"/>');
  }
  append('<ellipse cx="120" cy="77" rx="49" ry="35" fill="'+fill+'" stroke="'+dark+'" stroke-width="2.5"/>');
 }else if(kind==='eel'){
  append('<path d="M29 85 C 53 30 99 114 138 67 S 194 38 220 64" fill="none" stroke="'+dark+'" stroke-width="28" stroke-linecap="round"/>');
  append('<path d="M29 84 C 53 31 99 114 138 66 S 194 38 220 64" fill="none" stroke="'+base+'" stroke-width="22" stroke-linecap="round"/>');
  append('<path d="M34 79 C 56 36 100 107 137 62 S 192 35 217 60" fill="none" stroke="#fff9e6" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>');
  append('<ellipse cx="192" cy="56" rx="18" ry="11" fill="'+fill+'"/>');
 }else{
  const tail=kind==='shark'?'<path d="M64 73 L15 30 L28 72 L13 118 L67 84 Z"':'<path d="M68 70 Q30 32 19 27 Q33 71 19 116 Q45 106 68 89 Z"';
  append('<g fill="'+fin+'" stroke="'+dark+'" stroke-width="2">'+tail+'</g>');
  append('<path d="M100 '+(73-ry+5)+' Q 120 '+(10+seed%16)+' 154 '+(75-ry+4)+' L 143 77 Z" fill="'+fin+'" stroke="'+dark+'" stroke-width="2"/>');
  append('<path d="M111 '+(73+ry-4)+' Q 133 '+(132-seed%12)+' 162 '+(73+ry-4)+' L 145 83 Z" fill="'+fin+'" stroke="'+dark+'" stroke-width="2"/>');
  if(kind==='shark'){
   append('<path d="M65 76 Q123 22 207 70 Q226 76 207 87 Q127 129 65 76Z" fill="'+fill+'" stroke="'+dark+'" stroke-width="2.5"/>');
   append('<path d="M120 43 L144 7 L148 54Z" fill="'+dark+'" stroke="'+dark+'" stroke-width="2"/>');
   for(let i=0;i<4;i++)append('<path d="M'+(166-i*7)+' 78 l-4 12" stroke="'+dark+'" stroke-width="2"/>');
  }else{
   append('<ellipse cx="132" cy="75" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" stroke="'+dark+'" stroke-width="2.5"/>');
  }
  // Readable fish profile on small phones: solid body, visible face and
  // translucent depth layers rather than a fragile URL-gradient silhouette.
  if(kind==='shark'){
   append('<path d="M84 72 Q129 35 185 64 Q159 52 122 57 Q93 61 84 72 Z" fill="#fff8eb" opacity=".35"/>');
   append('<path d="M90 86 Q151 112 196 87 Q145 101 90 86 Z" fill="'+dark+'" opacity=".22"/>');
  }else{
   append('<path d="M85 62 Q111 '+(62-ry/2)+' 161 '+(68-ry/2)+' Q182 65 191 71 Q137 53 85 62 Z" fill="#fffdf0" opacity=".32"/>');
   append('<path d="M91 '+(77+ry/3)+' Q135 '+(82+ry/2)+' 187 77 Q152 '+(88+ry/2)+' 100 '+(79+ry/2)+' Z" fill="'+dark+'" opacity=".19"/>');
   append('<path d="M174 60 Q163 76 175 94" fill="none" stroke="'+dark+'" stroke-width="2" opacity=".46"/>');
   append('<path d="M173 63 Q165 72 171 82" fill="none" stroke="#fff8e9" stroke-width="1.5" opacity=".5"/>');
  }
  if(kind==='billfish')append('<path d="M185 68 L235 49 L190 76 Z" fill="'+dark+'"/>');
  if(kind==='gold'||kind==='goldcarp'||kind==='carp')append('<path d="M108 55 Q126 20 154 43 L148 51 Q121 37 108 55" fill="'+fin+'" opacity=".7"/>');
 }
 // Species-specific scales, stripe patterns, spotted skin and highlights.
 const pattern=seed%5,markColor=seed%3===0?'#f6f2da':dark;
 if(['octopus','crab','ray','eel'].includes(kind)){
  const dots=kind==='eel'?7:9;
  for(let i=0;i<dots;i++){const x=92+(i*19)%66,y=58+((i*11+seed)%30);append('<circle cx="'+x+'" cy="'+y+'" r="'+(i%3+2)+'" fill="'+markColor+'" opacity=".32"/>')}
 }else if(pattern===0){
  for(let i=0;i<7;i++)append('<path d="M'+(90+i*14)+' 54 q9 18 -1 38" stroke="'+markColor+'" stroke-width="3.2" opacity=".36" fill="none"/>');
 }else if(pattern===1||pattern===4){
  for(let i=0;i<11;i++){const x=91+(i%6)*17,y=62+Math.floor(i/6)*19;append('<circle cx="'+x+'" cy="'+y+'" r="'+(2+seed%3)+'" fill="'+markColor+'" opacity=".34"/>')}
 }else if(pattern===2){
  for(let i=0;i<8;i++){const x=88+(i%5)*17,y=59+Math.floor(i/5)*18;append('<path d="M'+x+' '+y+' q 7 -7 14 0 q-7 7 -14 0" fill="none" stroke="'+markColor+'" stroke-width="1.5" opacity=".31"/>')}
 }else{
  append('<path d="M83 84 Q142 114 182 78" fill="none" stroke="#fff8dc" stroke-width="7" opacity=".48"/>');
  append('<path d="M105 50 Q155 42 181 65" fill="none" stroke="'+dark+'" stroke-width="4" opacity=".28"/>');
 }
 const eyeX=kind==='octopus'?105:kind==='crab'?109:kind==='ray'?109:kind==='eel'?197:kind==='billfish'?176:kind==='shark'?187:176;
 const eyeY=kind==='octopus'?72:kind==='crab'?68:kind==='ray'?67:kind==='eel'?54:65;
 for(const offset of kind==='crab'?[0,23]:[0]){
  append('<ellipse cx="'+(eyeX+offset)+'" cy="'+eyeY+'" rx="7.5" ry="8.5" fill="#fffaf2" stroke="'+dark+'" stroke-width="1.5"/>');
  append('<circle cx="'+(eyeX+offset+2)+'" cy="'+eyeY+'" r="4.4" fill="#1b3943"/><circle cx="'+(eyeX+offset+.7)+'" cy="'+(eyeY-2.4)+'" r="1.7" fill="white"/>');
 }
 if(!['octopus','ray','crab','eel'].includes(kind)){
  append('<path d="M187 91 Q197 96 202 89" fill="none" stroke="'+dark+'" stroke-width="2"/>');
  append('<path d="M84 57 Q126 40 169 57" fill="none" stroke="#fff7e9" stroke-width="5" opacity=".35"/>');
 }
 if(high){
  append('<path d="M34 29 l5 11 l11 5 l-11 5 l-5 11 l-5-11 l-11-5 l11-5Z" fill="'+(tier==='mythic'?'#c4e7ff':'#ffedaa')+'" opacity=".9"/>');
  append('<circle cx="212" cy="25" r="8" fill="'+(tier==='mythic'?'#d2c1ff':'#ffe6aa')+'" opacity=".4"/>');
 }
 append('</g></svg>');
 return parts.join('');
}
