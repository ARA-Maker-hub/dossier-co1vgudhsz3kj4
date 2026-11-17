/* Six vies, zéro alibi : jours 2 à 24 en version numérique (énigmes interactives).
   Chargé avant le script principal ; il lui fournit des données (AVN.days, AVN.gates)
   et des widgets (AVN.html / AVN.init). Le script principal expose window.AV. */
(function(){
'use strict';
function $id(i){return document.getElementById(i)}
function A(){return window.AV}
function clone(o){return JSON.parse(JSON.stringify(o))}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function jget(n,def){try{var v=A().store.g('ws'+n);return v?JSON.parse(v):clone(def)}catch(e){return clone(def)}}
function jset(n,o){try{A().store.s('ws'+n,JSON.stringify(o))}catch(e){}}
function solved(n){return A().store.g('ok'+n)==='1'}
function dayOf(n){return A().odFind(n)}
function shake(el){if(!el)return;el.classList.add('shake');setTimeout(function(){el.classList.remove('shake')},400)}
function pad2(x){return x<10?'0'+x:''+x}
function hhmm(m){m=((m%1440)+1440)%1440;return Math.floor(m/60)+' h '+pad2(m%60)}

function win(n,ans){
  var a=A(),d=dayOf(n);if(!d||solved(n))return;
  a.store.s('ok'+n,'1');a.store.s('a'+n,ans||'ok');
  var fb=$id('odfb'+n);if(fb)fb.innerHTML=a.okMsg(d);
  if(d.gr)a.say('',300+n).then(function(){if(a.afterWin)a.afterWin(d)});else a.ding();
  a.burst($id('wg'+n),['🔍','✨','⭐']);
}
function miss(n,el){
  var a=A(),d=dayOf(n),t=(+a.store.g('tr'+n)||0)+1;a.store.s('tr'+n,String(t));
  var fb=$id('odfb'+n);if(fb)fb.innerHTML='Ce n’est pas ça.'+(t>=3&&d&&d.hint?'<br><i>Indice : '+d.hint+'</i>':'');
  if(d&&d.gr)a.say('',17);else a.oops();
  shake(el||$id('wg'+n));
}
function img(src,alt,cls){return '<img class="'+(cls||'')+'" src="'+src+'" alt="'+esc(alt||'')+'" onerror="this.style.display=\'none\'">'}
var VIS={baptiste:['Baptiste','Le neveu'],melusine:['Mélusine','La masseuse'],ginette:['Ginette','La voisine'],firmin:['Firmin','Le jardinier'],tabellion:['Maître Tabellion','Le notaire'],pouls:['Docteur Pouls','Le médecin']};
function vimg(id){return 'img/v_'+id+'.jpg'}

/* ------------------------------------------------------------------ types */
var T={};

/* J2 : plan du manoir */
T.rooms={
 html:function(d,s){
  var done=solved(d.n),lab=d.p.labels,h='<div class="rooms">';
  d.p.grid.forEach(function(num){
    var on=s.sel.indexOf(num)>=0||(done&&lab[num]&&num!==9);
    h+='<button class="rm'+(on?' on':'')+(num===9?' sal':'')+'" data-a="t" data-v="'+num+'"'+((done||num===9)?' disabled':'')+'><b>'+num+'</b><i>'+(num===9?'salon':(done&&lab[num]?String(lab[num]).replace('bibliothèque','biblio.'):''))+'</i></button>';
  });
  return h+'</div><p class="wcap">'+(done?'Plan retenu.':'Touchez trois pièces ('+s.sel.length+'/3).')+'</p>';
 },
 act:function(d,s,a,b){
  if(solved(d.n)||a!=='t')return;var v=+b.getAttribute('data-v'),i=s.sel.indexOf(v);
  if(i>=0)s.sel.splice(i,1);else if(s.sel.length<3)s.sel.push(v);
  if(s.sel.length===3){
    var ok=d.p.ok.every(function(x){return s.sel.indexOf(x)>=0});
    if(ok){upd(d.n,s);win(d.n,d.p.ans);draw(d.n);return}
    s.sel=[];upd(d.n,s);miss(d.n);return;
  }
  upd(d.n,s);
 },init:{sel:[]}
};

/* J3, J8, J24 : toucher le bon élément */
T.pick={
 html:function(d,s){
  var done=solved(d.n),h='<div class="pick'+(d.p.cols?' c'+d.p.cols:'')+'">';
  d.p.items.forEach(function(it){
    var good=done&&d.p.ok.indexOf(it.id)>=0;
    h+='<button class="pk'+(good?' good':'')+(it.img?' hasimg':'')+'" data-a="p" data-v="'+it.id+'"'+(done?' disabled':'')+'>'+(it.img?img(it.img,it.label):'')+'<b>'+esc(it.label)+'</b>'+(it.sub?'<i>'+esc(it.sub)+'</i>':'')+'</button>';
  });
  return h+'</div>';
 },
 act:function(d,s,a,b){
  if(solved(d.n)||a!=='p')return;var v=b.getAttribute('data-v');
  if(d.p.ok.indexOf(v)>=0){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);
 },init:{}
};

/* J4, J23 : remettre dans l'ordre */
T.seq={
 html:function(d,s){
  var done=solved(d.n),q=done?d.p.target:s.q,h='';
  if(d.p.log){h+='<div class="alog">'+d.p.log.map(function(l,i){return '<div class="al'+(q[i]?' on':'')+'"><span class="alt">'+l[0]+'</span><span class="ale">'+l[1]+'</span><span class="alw">'+(q[i]?'<button data-a="del" data-v="'+i+'" class="chip">'+esc(d.p.byId[q[i]])+' ✕</button>':'<em>?</em>')+'</span></div>'}).join('')+'</div>'}
  else{h+='<ol class="slots">'+d.p.target.map(function(t,i){return '<li class="'+(q[i]?'on':'')+'">'+(q[i]?'<button data-a="del" data-v="'+i+'" class="chip">'+img(vimg(q[i]),'','mini')+esc(d.p.byId[q[i]])+' ✕</button>':'<em>…</em>')+'</li>'}).join('')+'</ol>'}
  if(!done){
    h+='<div class="tray">';
    d.p.items.forEach(function(it){if(q.indexOf(it)<0)h+='<button class="pk hasimg small" data-a="add" data-v="'+it+'">'+img(vimg(it),d.p.byId[it])+'<b>'+esc(d.p.byId[it])+'</b></button>'});
    h+='</div>'+(q.length?'<button class="btn ghost small" data-a="clr">Tout effacer</button>':'');
  }
  return h;
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;var v=b.getAttribute('data-v');
  if(a==='clr')s.q=[];
  else if(a==='del')s.q.splice(+v);
  else if(a==='add'&&s.q.indexOf(v)<0)s.q.push(v);
  if(s.q.length===d.p.target.length){
    var ok=s.q.every(function(x,i){return x===d.p.target[i]});
    if(ok){upd(d.n,s);win(d.n,d.p.ans);draw(d.n);return}
    s.q=[];upd(d.n,s);miss(d.n);return;
  }
  upd(d.n,s);
 },init:{q:[]}
};

/* J5 : roue de César */
T.caesar={
 dec:function(t,s){return t.replace(/[A-Z]/g,function(c){return String.fromCharCode((c.charCodeAt(0)-65-s+26)%26+65)})},
 html:function(d,s){
  var done=solved(d.n),sh=done?d.p.shift:s.s,al='ABCDEFGHIJKLMNOPQRSTUVWXYZ',inner=al.slice(26-sh)+al.slice(0,26-sh);
  var h='<div class="cae"><div class="cip">'+esc(d.p.cipher)+'</div><div class="cdec">'+esc(T.caesar.dec(d.p.cipher,sh))+'</div>';
  h+='<div class="wheel"><div class="wr">'+al.split('').join(' ')+'</div><div class="wr in">'+inner.split('').join(' ')+'</div></div>';
  h+='<div class="wctl"><button class="btn ghost small" data-a="m"'+(done?' disabled':'')+'>◀</button><span>Décalage : '+sh+'</span><button class="btn ghost small" data-a="p"'+(done?' disabled':'')+'>▶</button></div>';
  if(!done)h+='<button class="btn" data-a="go">Ce texte est lisible : valider</button>';
  return h+'</div>';
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;
  if(a==='m')s.s=(s.s+25)%26;else if(a==='p')s.s=(s.s+1)%26;
  else if(a==='go'){if(s.s===d.p.shift){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);return}
  upd(d.n,s);
 },init:{s:0}
};

/* J6 : grille de lettres (cases A1..D7) */
T.grid={
 html:function(d,s){
  var done=solved(d.n),t=done?d.p.cells:s.t,cols='ABCD',h='<div class="lgrid"><div class="gh"></div>';
  cols.split('').forEach(function(c){h+='<div class="gh">'+c+'</div>'});
  d.p.rows.forEach(function(row,r){
    h+='<div class="gh">'+(r+1)+'</div>';
    row.split('').forEach(function(ch,c){var id=cols[c]+(r+1),i=t.indexOf(id);h+='<button class="gc'+(i>=0?' on':'')+'" data-a="c" data-v="'+id+'"'+(done?' disabled':'')+'>'+ch+(i>=0?'<sup>'+(i+1)+'</sup>':'')+'</button>'});
  });
  var word=t.map(function(id){return d.p.rows[+id.slice(1)-1][cols.indexOf(id[0])]}).join('');
  h+='</div><div class="gword">'+(word||'…')+'</div>'+((!done&&t.length)?'<button class="btn ghost small" data-a="clr">Effacer</button>':'');
  return h;
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;
  if(a==='clr')s.t=[];
  else if(a==='c'){var id=b.getAttribute('data-v');if(s.t.indexOf(id)<0)s.t.push(id)}
  if(s.t.length===d.p.cells.length){
    var cols='ABCD',w=s.t.map(function(id){return d.p.rows[+id.slice(1)-1][cols.indexOf(id[0])]}).join('');
    if(w===d.p.word){upd(d.n,s);win(d.n,d.p.ans);draw(d.n);return}
    s.t=[];upd(d.n,s);miss(d.n);return;
  }
  upd(d.n,s);
 },init:{t:[]}
};

/* J7, J22 : vrai ou faux */
T.tf={
 html:function(d,s){
  var done=solved(d.n),h='<div class="tf">';
  d.p.stmts.forEach(function(st,i){
    var v=done?d.p.truth[i]:s.v[i];
    h+='<div class="tfr"><div class="tft"><b>'+st[0]+'</b> '+esc(st[1])+'</div><div class="tfb"><button class="tg'+(v===true?' on':'')+'" data-a="v" data-i="'+i+'" data-v="1"'+(done?' disabled':'')+'>Vrai</button><button class="tg'+(v===false?' on f':'')+'" data-a="v" data-i="'+i+'" data-v="0"'+(done?' disabled':'')+'>Faux</button></div></div>';
  });
  if(d.p.door){
    h+='<p class="odq">'+esc(d.p.door.q)+'</p><div class="doors">';
    d.p.door.opts.forEach(function(o){var on=(done?d.p.door.ok:s.door)===o[0];h+='<button class="tg wide'+(on?' on':'')+'" data-a="door" data-v="'+o[0]+'"'+(done?' disabled':'')+'>'+esc(o[1])+'</button>'});
    h+='</div>';
  }
  if(!done)h+='<button class="btn" data-a="go">Valider</button>';
  return h+'</div>';
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;
  if(a==='v'){var i=+b.getAttribute('data-i');s.v[i]=b.getAttribute('data-v')==='1'}
  else if(a==='door')s.door=b.getAttribute('data-v');
  else if(a==='go'){
    var ok=d.p.stmts.every(function(st,i){return s.v[i]===d.p.truth[i]})&&(!d.p.door||s.door===d.p.door.ok);
    if(ok){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);return;
  }
  upd(d.n,s);
 },init:{v:[null,null,null],door:null}
};

/* J9, J21 : cadran */
T.clock={
 face:function(m){
  var ha=((m%720)/720)*360,ma=(m%60)*6,h='<svg class="clk" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" class="cf"/>';
  for(var i=0;i<12;i++){var a=i*30*Math.PI/180;h+='<line x1="'+(60+46*Math.sin(a))+'" y1="'+(60-46*Math.cos(a))+'" x2="'+(60+52*Math.sin(a))+'" y2="'+(60-52*Math.cos(a))+'" class="ct"/>'}
  h+='<line x1="60" y1="60" x2="'+(60+30*Math.sin(ha*Math.PI/180))+'" y2="'+(60-30*Math.cos(ha*Math.PI/180))+'" class="ch"/>';
  h+='<line x1="60" y1="60" x2="'+(60+44*Math.sin(ma*Math.PI/180))+'" y2="'+(60-44*Math.cos(ma*Math.PI/180))+'" class="cm"/><circle cx="60" cy="60" r="3" class="cc"/></svg>';
  return h;
 },
 html:function(d,s){
  var done=solved(d.n),m=done?d.p.target:s.m,h='<div class="clockw">'+T.clock.face(m)+'<div class="dig">'+hhmm(m)+'</div>';
  if(d.p.thermo){
    var back=((d.p.find-m)%1440+1440)%1440,tmp=Math.max(0,37-back/60);
    h+='<div class="therm">Température prévue à '+hhmm(d.p.find)+' : <b>'+tmp.toFixed(1).replace('.',',')+' °C</b><br><small>Relevée : '+d.p.measured+' °C</small></div>';
  }
  if(!done)h+='<div class="adj"><button class="btn ghost small" data-a="adj" data-v="-60">− 1 h</button><button class="btn ghost small" data-a="adj" data-v="-5">− 5 min</button><button class="btn ghost small" data-a="adj" data-v="5">+ 5 min</button><button class="btn ghost small" data-a="adj" data-v="60">+ 1 h</button></div><button class="btn" data-a="go">Valider cette heure</button>';
  return h+'</div>';
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;
  if(a==='adj')s.m=((s.m+(+b.getAttribute('data-v')))%1440+1440)%1440;
  else if(a==='go'){if(s.m===d.p.target){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);return}
  upd(d.n,s);
 },initFor:function(d){return {m:d.p.start}}
};

/* J11 : la bougie */
T.candle={
 svg:function(cm){
  var hpx=Math.max(0,Math.min(12,cm))*14;
  return '<svg class="cdl" viewBox="0 0 100 200"><rect x="30" y="'+(190-hpx)+'" width="40" height="'+hpx+'" rx="3" class="cw"/>'+(cm>0?'<ellipse cx="50" cy="'+(178-hpx)+'" rx="7" ry="13" class="fl"/>':'<path d="M50 '+(188-hpx)+' q-4 -14 2 -26" class="sm"/>')+'<rect x="22" y="190" width="56" height="6" rx="3" class="cb"/></svg>';
 },
 rest:function(m){return 12-(31*60-m)/60},
 html:function(d,s){
  var done=solved(d.n),m=done?d.p.target:s.m,cm=T.candle.rest(m);
  return '<div class="candw">'+T.candle.svg(cm)+'<div class="cinfo"><div class="dig">Allumée à '+hhmm(m)+'</div><div class="cmsg" id="cmsg'+d.n+'">'+(cm>0?'À 7 h 00, il en reste <b>'+(Math.round(cm*10)/10).toString().replace('.',',')+' cm</b>.':'À 7 h 00, il ne reste rien.')+'</div>'+(done?'':'<input type="range" id="csl'+d.n+'" min="'+(18*60)+'" max="'+(24*60)+'" step="15" value="'+m+'"><div class="wcap">Faites glisser l’heure d’allumage.</div><button class="btn" data-a="go">Valider cette heure</button>')+'</div></div>';
 },
 after:function(d,s,root){
  var sl=$id('csl'+d.n);if(!sl)return;
  sl.oninput=function(){
    var m=+sl.value,cm=T.candle.rest(m);s.m=m;jset(d.n,s);
    root.querySelector('.cdl').outerHTML=T.candle.svg(cm);
    root.querySelector('.dig').textContent='Allumée à '+hhmm(m);
    $id('cmsg'+d.n).innerHTML=cm>0?'À 7 h 00, il en reste <b>'+(Math.round(cm*10)/10).toString().replace('.',',')+' cm</b>.':'À 7 h 00, il ne reste rien.';
  };
 },
 act:function(d,s,a,b){
  if(solved(d.n)||a!=='go')return;var sl=$id('csl'+d.n);if(sl)s.m=+sl.value;
  if(s.m===d.p.target){jset(d.n,s);win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);
 },init:{m:18*60}
};

/* J10 : encre sympathique (on réchauffe la carte du doigt) */
T.heat={
 html:function(d,s){
  if(solved(d.n))return '<div class="heatw done"><div class="hmsg">'+esc(d.p.reveal)+'</div></div>';
  return '<div class="heatw"><canvas class="hb" width="320" height="200"></canvas><canvas class="ht" width="320" height="200"></canvas></div><p class="wcap">Passez le doigt sur la carte, comme un sèche-cheveux.</p>';
 },
 after:function(d,s,root){
  if(solved(d.n))return;
  var hb=root.querySelector('.hb'),ht=root.querySelector('.ht');if(!hb||!ht)return;
  var b=hb.getContext('2d'),t=ht.getContext('2d'),W=320,H=200;
  b.fillStyle='#f3e6c8';b.fillRect(0,0,W,H);
  b.fillStyle='#4B1F7A';b.textAlign='center';b.font='34px RB, cursive';
  var lines=d.p.reveal.split('|');lines.forEach(function(l,i){b.fillText(l,W/2,80+i*40)});
  var g=t.createLinearGradient(0,0,0,H);g.addColorStop(0,'#bcd7e8');g.addColorStop(1,'#e9d9b8');
  t.fillStyle=g;t.fillRect(0,0,W,H);
  t.fillStyle='#7da58a';t.beginPath();t.moveTo(0,150);t.quadraticCurveTo(80,110,160,140);t.quadraticCurveTo(240,170,320,120);t.lineTo(320,200);t.lineTo(0,200);t.fill();
  t.fillStyle='#2b2b33';t.beginPath();t.ellipse(60,138,16,12,0,0,6.3);t.fill();t.beginPath();t.moveTo(48,130);t.lineTo(50,116);t.lineTo(58,127);t.fill();t.beginPath();t.moveTo(72,130);t.lineTo(74,116);t.lineTo(66,127);t.fill();
  t.fillStyle='#fff';t.font='bold 15px Oswald, sans-serif';t.textAlign='center';t.fillText('BONS BAISERS DE SAINT-MATOU',130,44);
  t.strokeStyle='#b3261e';t.lineWidth=2;t.strokeRect(258,12,50,60);t.fillStyle='#b3261e55';t.fillRect(260,14,46,56);
  var down=false,cnt=0,fin=false;
  function pos(e){var r=ht.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]}
  function erase(e){
    var p=pos(e),g2=t.createRadialGradient(p[0],p[1],2,p[0],p[1],30);
    g2.addColorStop(0,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');
    t.globalCompositeOperation='destination-out';t.fillStyle=g2;t.beginPath();t.arc(p[0],p[1],30,0,6.3);t.fill();t.globalCompositeOperation='source-over';
    if(++cnt%6===0)check();
  }
  function check(){
    if(fin)return;var im=t.getImageData(30,50,260,100).data,tot=0,clr=0;
    for(var y=0;y<100;y+=5)for(var x=0;x<260;x+=5){tot++;if(im[(y*260+x)*4+3]<60)clr++}
    if(clr/tot>.6){fin=true;ht.style.transition='opacity .8s';ht.style.opacity='0';setTimeout(function(){win(d.n,d.p.ans)},500)}
  }
  ht.style.touchAction='none';
  ht.onpointerdown=function(e){down=true;try{ht.setPointerCapture(e.pointerId)}catch(x){}erase(e)};
  ht.onpointermove=function(e){if(down)erase(e)};
  ht.onpointerup=ht.onpointercancel=function(){down=false};
 },
 act:function(){}
};

/* J12 : le testament, trois détails à repérer */
T.spot={
 html:function(d,s){
  var done=solved(d.n),f=done?['date','names','sig']:s.f;
  function sp(k,t,cls){var on=f.indexOf(k)>=0;return '<span class="sp'+(on?' found':'')+(cls?' '+cls:'')+'" data-a="s" data-v="'+k+'">'+t+'</span>'}
  var h='<div class="doc"><p class="dh">Testament</p><p>Fait à '+sp('d1','Saint-Matou')+', le '+sp('date','31 novembre')+'.</p><p>Je lègue mes biens à celui ou celle qui prendra soin de mes '+sp('d2','six chats')+' : '+sp('names','Chaussette, Pincette, Nala, HK, Yin, Ciboulette et Biscotte')+'.</p><p class="sig">Signé : '+sp('sig','Odette de P.-D.','blue')+'</p></div>';
  return h+'<p class="wcap">'+(done?'Les trois détails sont repérés.':'Détails repérés : '+f.length+'/3.')+'</p>';
 },
 act:function(d,s,a,b){
  if(solved(d.n)||a!=='s')return;var k=b.getAttribute('data-v');
  if(k==='d1'||k==='d2'){miss(d.n,b);return}
  if(s.f.indexOf(k)<0)s.f.push(k);
  A().blip(500,700,.12,.06);
  if(s.f.length===3){upd(d.n,s);win(d.n,d.p.ans);draw(d.n);return}
  upd(d.n,s);
 },init:{f:[]}
};

/* J13 : morse (+ saisie de la réponse par le champ habituel) */
var MORSE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..'};
var playing=0;
T.morse={
 html:function(d,s){
  var w=d.p.word.split(''),h='<div class="morse"><button class="btn" data-a="play">🔊 Écouter ce que Firmin a tapé</button><div class="msym" id="msym'+d.n+'">'+w.map(function(c,i){return '<span class="ml" data-i="'+i+'">'+MORSE[c].replace(/\./g,'•').replace(/-/g,'▬')+'</span>'}).join('')+'</div>';
  h+='<details><summary>Table de morse</summary><div class="mtab">'+Object.keys(MORSE).map(function(k){return '<span><b>'+k+'</b> '+MORSE[k].replace(/\./g,'•').replace(/-/g,'▬')+'</span>'}).join('')+'</div></details></div>';
  return h;
 },
 act:function(d,s,a,b){
  if(a!=='play')return;var ac=A().ac();if(!ac)return;
  var my=++playing,t=ac.currentTime+.1,dot=.14,w=d.p.word.split(''),spans=document.querySelectorAll('#msym'+d.n+' .ml');
  w.forEach(function(c,i){
    var code=MORSE[c],t0=t;
    setTimeout(function(){if(my===playing){spans.forEach(function(x){x.classList.remove('on')});if(spans[i])spans[i].classList.add('on')}},(t0-ac.currentTime)*1000);
    code.split('').forEach(function(sym){
      var len=sym==='.'?dot:dot*3,o=ac.createOscillator(),g=ac.createGain();
      o.type='square';o.frequency.value=330;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+.01);g.gain.setValueAtTime(.08,t+len-.02);g.gain.linearRampToValueAtTime(0,t+len);
      o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+len+.02);t+=len+dot;
    });
    t+=dot*3;
  });
  setTimeout(function(){spans.forEach(function(x){x.classList.remove('on')})},(t-ac.currentTime)*1000+200);
 }
};

/* J14 : les pas des visiteurs */
T.shoes={
 sound:function(kind){
  var ac=A().ac();if(!ac)return;var t=ac.currentTime+.02;
  function noise(dur,freq,vol,type,at){
    var b=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate),dd=b.getChannelData(0);for(var i=0;i<dd.length;i++)dd[i]=(Math.random()*2-1)*(1-i/dd.length);
    var s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=b;f.type=type;f.frequency.value=freq;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(ac.destination);s.start(at);
  }
  if(kind==='soft'){for(var i=0;i<3;i++)noise(.1,900,.05,'bandpass',t+i*.38)}
  else if(kind==='flouf'){for(var j=0;j<3;j++)noise(.28,180,.5,'lowpass',t+j*.5)}
  else{for(var k=0;k<3;k++){var o=ac.createOscillator(),g=ac.createGain(),at=t+k*.5;o.type='sine';o.frequency.setValueAtTime(900,at);o.frequency.exponentialRampToValueAtTime(1800,at+.12);g.gain.setValueAtTime(.08,at);g.gain.exponentialRampToValueAtTime(.001,at+.16);o.connect(g);g.connect(ac.destination);o.start(at);o.stop(at+.18);noise(.05,2500,.06,'highpass',at)}}
 },
 html:function(d,s){
  var done=solved(d.n),h='<div class="shoes">';
  d.p.rows.forEach(function(r,i){
    var on=done?d.p.ok.indexOf(r.id)>=0:s.sq.indexOf(r.id)>=0;
    h+='<div class="sh"><span class="shn">'+img(vimg(r.id),r.n,'mini')+'<b>'+esc(r.n)+'</b><i>'+esc(r.shoe)+'</i></span><button class="btn ghost small" data-a="play" data-v="'+i+'">🔊</button><button class="tg'+(on?' on f':'')+'" data-a="sq" data-v="'+r.id+'"'+(done?' disabled':'')+'>Couine</button></div>';
  });
  if(!done)h+='<button class="btn" data-a="go">Valider</button>';
  return h+'</div>';
 },
 act:function(d,s,a,b){
  if(a==='play'){T.shoes.sound(d.p.rows[+b.getAttribute('data-v')].kind);return}
  if(solved(d.n))return;
  if(a==='sq'){var v=b.getAttribute('data-v'),i=s.sq.indexOf(v);if(i>=0)s.sq.splice(i,1);else s.sq.push(v);upd(d.n,s);return}
  if(a==='go'){
    var ok=s.sq.length===d.p.ok.length&&d.p.ok.every(function(x){return s.sq.indexOf(x)>=0});
    if(ok){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);
  }
 },init:{sq:[]}
};

/* J17 : sudoku 4×4, code = cases grisées */
T.sudoku={
 html:function(d,s){
  var done=solved(d.n),g=done?[].concat.apply([],d.p.solution):s.g,bad={};
  for(var i=0;i<16;i++){if(!g[i])continue;var r=Math.floor(i/4),c=i%4;
    for(var j=0;j<16;j++){if(j===i||g[j]!==g[i])continue;var r2=Math.floor(j/4),c2=j%4;if(r2===r||c2===c||(Math.floor(r2/2)===Math.floor(r/2)&&Math.floor(c2/2)===Math.floor(c/2))){bad[i]=1}}}
  var h='<div class="sdk">';
  for(var k=0;k<16;k++){
    var given=d.p.givens[Math.floor(k/4)][k%4]>0,grey=d.p.grey.indexOf(k)>=0;
    h+='<button class="sc'+(given?' g':'')+(grey?' grey':'')+(bad[k]?' bad':'')+'" data-a="c" data-v="'+k+'"'+((given||done)?' disabled':'')+'>'+(g[k]||'')+'</button>';
  }
  h+='</div><p class="wcap">'+(done?'Le coffre s’ouvre : '+d.p.ans+'.':'Touchez une case pour changer le chiffre. Le code se lit dans les cases grisées.')+'</p>'+(done?'':'<div class="scoderow"><input class="scode" inputmode="numeric" maxlength="4" placeholder="Code à 4 chiffres"><button class="btn" data-a="code">Ouvrir le coffre</button></div>');
  return h;
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;if(a==='code'){var inp=document.querySelector('#wg'+d.n+' .scode'),v=inp?inp.value.replace(/\D/g,''):'';if(v===d.p.ans){upd(d.n,s);win(d.n,d.p.ans);draw(d.n)}else{miss(d.n,inp||b)}return}if(a!=='c')return;var k=+b.getAttribute('data-v');
  s.g[k]=(s.g[k]+1)%5;A().blip(500,650,.08,.05);
  var flat=[].concat.apply([],d.p.solution);
  if(s.g.every(function(x,i){return x===flat[i]})){A().blip(600,900,.15,.08)}
  upd(d.n,s);
 },
 initFor:function(d){return {g:[].concat.apply([],d.p.givens)}}
};

/* J18 : anagramme à tuiles */
T.tiles={
 html:function(d,s){
  var done=solved(d.n),q=done?null:s.q,built=done?d.p.word:s.q.map(function(i){return d.p.letters[i]}).join('');
  var h='<div class="built">'+(built||'…')+'</div>';
  if(!done){
    h+='<div class="tray">'+d.p.letters.map(function(l,i){return s.q.indexOf(i)<0?'<button class="tile" data-a="t" data-v="'+i+'">'+l+'</button>':'<span class="tile ghost"></span>'}).join('')+'</div>';
    if(s.q.length)h+='<button class="btn ghost small" data-a="clr">Effacer</button>';
  }
  return h;
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;
  if(a==='clr')s.q=[];
  else if(a==='t'){s.q.push(+b.getAttribute('data-v'));A().blip(500,650,.08,.05)}
  if(s.q.length===d.p.letters.length){
    var w=s.q.map(function(i){return d.p.letters[i]}).join('');
    if(w===d.p.word){upd(d.n,s);win(d.n,d.p.ans);draw(d.n);return}
    s.q=[];upd(d.n,s);miss(d.n);return;
  }
  upd(d.n,s);
 },init:{q:[]}
};

/* J19 : cadenas à huit lettres */
T.padlock={
 html:function(d,s){
  var done=solved(d.n),w=done?d.p.word.split('').map(function(c){return c.charCodeAt(0)-65}):s.w,h='<div class="pad">';
  w.forEach(function(v,i){h+='<div class="wh"><button data-a="up" data-v="'+i+'"'+(done?' disabled':'')+'>▲</button><span>'+String.fromCharCode(65+v)+'</span><button data-a="dn" data-v="'+i+'"'+(done?' disabled':'')+'>▼</button></div>'});
  h+='</div>';if(!done)h+='<button class="btn" data-a="go">Ouvrir le cadenas</button>';
  return h;
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;var i=+b.getAttribute('data-v');
  if(a==='up'){s.w[i]=(s.w[i]+1)%26;A().blip(700,800,.05,.04)}
  else if(a==='dn'){s.w[i]=(s.w[i]+25)%26;A().blip(600,500,.05,.04)}
  else if(a==='go'){
    var w=s.w.map(function(v){return String.fromCharCode(65+v)}).join('');
    if(w===d.p.word){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);return;
  }
  upd(d.n,s);
 },init:{w:[0,0,0,0,0,0,0,0]}
};

/* J20 : associer suspects et fautes */
T.match={
 html:function(d,s){
  var done=solved(d.n),h='<div class="mtc">';
  d.p.rows.forEach(function(r){
    var cur=done?d.p.sol[r.id]:s.m[r.id],lab=cur?d.p.opts.filter(function(o){return o[0]===cur})[0][1]:'Touchez pour choisir';
    h+='<div class="mr">'+img(vimg(r.id),r.n,'mini')+'<b>'+esc(r.n)+'</b><button class="tg wide'+(cur?' on':'')+'" data-a="n" data-v="'+r.id+'"'+(done?' disabled':'')+'>'+esc(lab)+'</button></div>';
  });
  if(!done)h+='<button class="btn" data-a="go">Valider</button>';
  return h+'</div>';
 },
 act:function(d,s,a,b){
  if(solved(d.n))return;
  if(a==='n'){var id=b.getAttribute('data-v'),ks=d.p.opts.map(function(o){return o[0]}),i=ks.indexOf(s.m[id]);s.m[id]=ks[(i+1)%ks.length]}
  else if(a==='go'){
    var ok=d.p.rows.every(function(r){return s.m[r.id]===d.p.sol[r.id]});
    if(ok){win(d.n,d.p.ans);draw(d.n)}else miss(d.n,b);return;
  }
  upd(d.n,s);
 },init:{m:{}}
};

/* J15, J16 : petit livre de comptes (la réponse se tape dans le champ habituel) */
T.ledger={
 html:function(d){
  var h='<table class="led">';d.p.lines.forEach(function(l){h+='<tr><td>'+esc(l[0])+'</td><td class="amt">'+esc(l[1])+'</td></tr>'});
  return h+'</table>';
 },
 act:function(){}
};

/* ------------------------------------------------------------------ moteur */
function typeOf(d){return T[d.wd]}
function root(n){return $id('wg'+n)}
function draw(n){
  var d=dayOf(n),r=root(n);if(!d||!r)return;var t=typeOf(d);if(!t)return;
  var s=jget(n,t.initFor?t.initFor(d):(t.init||{}));
  r.innerHTML=t.html(d,s);
  if(t.after)t.after(d,s,r);
}
function upd(n,s){jset(n,s);draw(n)}
function init(n){
  var d=dayOf(n),r=root(n);if(!d||!r)return;var t=typeOf(d);if(!t)return;
  draw(n);
  r.onclick=function(e){
    var b=e.target.closest?e.target.closest('[data-a]'):null;if(!b||!r.contains(b))return;
    var s=jget(n,t.initFor?t.initFor(d):(t.init||{}));
    t.act(d,s,b.getAttribute('data-a'),b,r);
  };
}

/* ------------------------------------------------------------------ données */
var VIDS=['baptiste','melusine','ginette','firmin','tabellion','pouls'];
function visItems(ids){return ids.map(function(i){return i})}
function byId(){var o={};VIDS.forEach(function(i){o[i]=VIS[i][0]});return o}
var CATIMG=[['hk','HK','Le guetteur'],['chaussette','Chaussette','Le collant'],['pincette','Pincette','La solitaire'],['nala','Nala','La doyenne'],['yin','Yin','La déserteuse'],['ciboulette','Ciboulette','La peureuse']];
var PV='Procès-verbal n° ';

var DAYS=[
 {n:2,title:'Le plan du manoir',kind:'DÉDUIRE',hier:'la bougie',wd:'rooms',
  text:[PV+'2. Le plan du manoir.','Le manoir compte vingt-quatre pièces, numérotées de 1 à 24. L’architecte ne croyait pas à l’ordre.\nMadame est morte dans le salon : pièce 9.','Voici votre énigme :\nLa bibliothèque est juste à gauche du salon.\nLe bureau, où dort le coffre, est juste en dessous.\nLa chambre de Madame est juste au-dessus.\nTouchez ces trois pièces sur le plan.'],
  hint:'Repérez le 9, puis regardez à gauche, en bas et en haut.',ok:'Bibliothèque 6, bureau 17, chambre 24.\nLe coffre est au bureau, pièce 17.',
  p:{grid:[12,3,20,7,15,1,18,11,24,22,5,14,2,6,9,19,23,10,21,8,17,4,13,16],ok:[6,17,24],labels:{6:'bibliothèque',17:'bureau',24:'chambre'},ans:'Bibliothèque 6, bureau 17, chambre 24'}},

 {n:3,title:'Six témoins à fourrure',kind:'DÉDUIRE',hier:'bibliothèque 6, bureau 17, chambre 24',wd:'pick',
  text:[PV+'3. Six témoins à fourrure.','Seuls les chats ont passé la nuit sur place. Ils ne parlent pas, ne signent rien et refusent de prêter serment sur une gamelle. Il faudra faire avec.','Leurs fiches sont dans votre carnet. Lisez-les. Les rideaux de la voisine, eux, sont toujours tirés.','Voici votre énigme :\nDeux chats vivent surtout dehors : l’un surveille la maison depuis le jardin, l’autre s’est installée chez la voisine.\nUn seul a pu regarder dans le salon cette nuit.\nTouchez-le.'],
  hint:'Les fiches des chats, dans le carnet, disent qui passe ses nuits au jardin.',ok:'HK a tout vu depuis le jardin.\nIl ne dira rien, mais il a vu.',
  p:{items:CATIMG.map(function(c){return {id:c[0],label:c[1],sub:c[2],img:'img/c_'+c[0]+'.png'}}),ok:['hk'],ans:'HK',cols:3}},

 {n:4,title:'Six visiteurs, zéro modestie',kind:'LOGIQUE',hier:'HK a tout vu depuis le jardin',wd:'seq',
  text:[PV+'4. Six visiteurs, zéro modestie.','Six personnes sont passées chez Madame, cette nuit-là ou au petit matin :\n- Mélusine, la masseuse.\n- Baptiste, le neveu.\n- Ginette, la voisine.\n- Firmin, le jardinier.\n- Maître Tabellion, le notaire.\n- Et le docteur Pouls.','Chacun jure avoir été seul. Chacun jure aussi ne pas se souvenir de l’heure.','Voici votre énigme :\nRemettez-les dans l’ordre d’arrivée.\n1) La masseuse est arrivée la première.\n2) Le neveu est passé avant la voisine.\n3) Le jardinier est venu après la voisine, mais avant le notaire.\n4) Le notaire est arrivé juste avant le docteur.'],
  hint:'Commencez par Mélusine, puis placez les autres un à un.',ok:'Mélusine, Baptiste, Ginette, Firmin, Tabellion, Pouls. Gardez cet ordre : il pourrait servir.',
  p:{items:VIDS.slice(),target:['melusine','baptiste','ginette','firmin','tabellion','pouls'],byId:byId(),ans:'Mélusine, Baptiste, Ginette, Firmin, Tabellion, Pouls'}},

 {n:5,title:'Le neveu',kind:'DÉCHIFFRER',hier:'Mélusine, Baptiste, Ginette, Firmin, Tabellion, Pouls',wd:'caesar',
  text:[PV+'5. Le neveu.','Baptiste de Pelmont-Duvet, trente-quatre ans, « trader indépendant ». Son indépendance est totale, son portefeuille aussi. Il jure qu’il n’a rien pris. Sa poche gauche tinte quand il marche. La droite est vide et froide : on y a cherché quelque chose, sans le trouver.','On a retrouvé ce mot froissé dans sa veste.','Voici votre énigme :\nChaque lettre a été remplacée par la suivante dans l’alphabet : A est devenu B.\nFaites tourner la roue pour revenir en arrière.'],
  hint:'Il faut reculer d’une lettre, pas plus.',ok:'Couverts d’argent. La poche gauche tintait pour une bonne raison.',
  p:{cipher:'DPVWFSUT E’BSHFOU',shift:1,ans:'COUVERTS D’ARGENT'}},

 {n:6,title:'Mélusine ne fait que des dos',kind:'DÉCHIFFRER',hier:'COUVERTS D’ARGENT (le neveu les a pris)',wd:'grid',
  text:[PV+'6. Mélusine ne fait que des dos.','Mélusine Laroche, masseuse à domicile, jure qu’elle ne fait que des dos. Interrogée sur ses deux heures et demie chez Madame, elle précise : « Des dos. Et un peu de réconfort moral. » Elle a rougi.\nLe procès-verbal note qu’elle a rougi.','Elle cite aussi Madame : « Ne touchez à rien, sauf si c’est intéressant. » Charmante devise.','Voici votre énigme :\nElle est repartie par un chemin qu’elle préfère taire. Touchez dans l’ordre les cases B3, D1, A5, C2, D6, A2 et B7.'],
  hint:'La lettre indique la colonne, le chiffre indique la ligne.',ok:'Véranda. Mélusine est repartie par la véranda.',
  p:{rows:['MTLE','DSAI','OVPU','CGFB','RHZK','JYQN','WAXT'],cells:['B3','D1','A5','C2','D6','A2','B7'],word:'VERANDA',ans:'VERANDA'}},

 {n:7,title:'La voisine aux jumelles',kind:'LOGIQUE',hier:'VERANDA (Mélusine est partie par là)',wd:'tf',
  text:[PV+'7. La voisine aux jumelles.','Ginette Frisquet habite derrière la haie de mimosa, une plante que le procès-verbal trouve abominable. Elle observe les oiseaux avec des jumelles.\nEn décembre, à minuit, sous la pluie.\nIl semble que le jardinier, torse nu, soit un oiseau rare.','Elle jure n’avoir jamais mis les pieds chez Madame. Yin vit chez elle depuis l’été. Par hasard. Avec des sardines.','Cette nuit-là, la porte d’entrée et les fenêtres étaient fermées à clé. Seule la véranda est restée ouverte.','Voici votre énigme :\nGinette fait trois déclarations. Une seule est vraie.\nLa chatière mesure dix-huit centimètres de large. Ginette, non.\nMarquez chaque déclaration vraie ou fausse,\npuis dites par où elle est entrée.'],
  hint:'Si Ginette n’a pas pu passer par la chatière, une de ses phrases tombe tout de suite.',ok:'Seule la C est vraie : Ginette n’a jamais utilisé la chatière, donc elle est entrée ailleurs. Par la véranda restée ouverte.',
  p:{stmts:[['A','« Je ne suis jamais entrée chez Madame. »'],['B','« Je suis entrée par la chatière. »'],['C','« Je n’ai jamais utilisé la chatière. »']],truth:[false,false,true],door:{q:'Par où est-elle entrée ?',opts:[['chat','Par la chatière'],['porte','Par la porte d’entrée'],['veranda','Par la véranda']],ok:'veranda'},ans:'Oui, par la véranda restée ouverte'}},

 {n:8,title:'Quelle coïncidence',kind:'DÉDUIRE',hier:'oui, par la véranda restée ouverte',wd:'pick',
  text:[PV+'8. Quelle coïncidence.','Stagiaire Rosato.\nJ’ai consulté vos archives. Vous avez six chats.\nMadame en avait six : une noire peureuse, une doyenne qui dort tout le temps, un orange collant, une déserteuse chez les voisins…\nMême distribution.','Je ne dis rien. Je note.','Carte postale de l’inspectrice, reçue ce matin :\n« Tout va bien. Ne cassez rien.\nSurtout pas ce qui est intéressant. »\nElle a du goût pour les devises.','Voici votre énigme :\nVoici la liste de vos chats d’après mes archives : HK, Chaussette, Pincette, Nala, Biscotte, Ciboulette.\nElle contient une erreur.\nTouchez-la. Et gardez-la en tête.'],
  hint:'Vous connaissez vos chats mieux que mes archives.',ok:'Biscotte. Le vrai nom est Yin. Biscotte, c’était le chat de Madame. Gardez-le en tête.',
  p:{items:['HK','Chaussette','Pincette','Nala','Biscotte','Ciboulette'].map(function(x){return {id:x.toLowerCase(),label:x}}),ok:['biscotte'],ans:'Biscotte (le vrai nom est Yin)',cols:2}},

 {n:9,title:'Le docteur Pouls',kind:'CALCULER',hier:'Biscotte : une erreur du procès-verbal',wd:'clock',
  text:[PV+'9. Le docteur Pouls.','Docteur Anselme Pouls, médecin de famille et médecin légiste du canton : le cumul des mandats, c’est pratique. Il soignait Madame le jeudi, à domicile, et sans témoin.\nIl précise que ce sont des soins. Il y tient.','Il est arrivé le matin, a constaté le décès, a signé vite et est reparti plus vite encore.','Voici votre énigme :\nSa montre retarde de vingt-cinq minutes. Elle indiquait six heures cinquante-cinq à son arrivée. Réglez l’heure qu’il était vraiment.'],
  hint:'Une montre qui retarde indique moins que l’heure réelle.',ok:'7 h 20. Le docteur est arrivé à 7 h 20, et pas une minute de plus.',
  p:{start:6*60+55,target:7*60+20,ans:'7 h 20'}},

 {n:10,title:'L’encre qui se cache',kind:'À FAIRE',hier:'7 h 20',wd:'heat',
  text:[PV+'10. L’encre qui se cache.','Dans le bureau de Madame, une carte postale d’apparence innocente. Elle en dit plus long qu’elle n’en a l’air.','Voici votre énigme :\nRéchauffez la carte avec le doigt, comme on le ferait avec un sèche-cheveux.\nPas de flamme : le carnet est inflammable.\nLa stagiaire aussi.'],
  hint:'Frottez toute la carte, surtout le centre.',ok:'Madame n’écrivait qu’en violet. Retenez cette couleur.',
  p:{reveal:'Madame n’écrivait|qu’en violet.',ans:'MADAME N’ÉCRIVAIT QU’EN VIOLET'}},

 {n:11,title:'Combien de temps a-t-elle brûlé ?',kind:'CALCULER',hier:'Madame n’écrivait qu’en violet',wd:'candle',
  text:[PV+'11. Combien de temps a-t-elle brûlé ?','La bougie du guéridon. Un témoin dit qu’elle a été allumée « tard ». Un autre, qu’elle l’était « depuis toujours ». Vous préférez les chiffres.','Voici votre énigme :\nLa bougie neuve mesure douze centimètres et brûle d’un centimètre par heure. À sept heures du matin, il en reste un. Réglez l’heure à laquelle elle a été allumée.'],
  hint:'Douze moins un, cela fait onze heures de combustion avant sept heures.',ok:'Allumée à 20 h. Mélusine était alors chez Madame.',
  p:{target:20*60,ans:'20 h'}},

 {n:12,title:'Le testament',kind:'REPÉRER',hier:'20 h',wd:'spot',
  text:[PV+'12. Le testament.','Maître Tabellion, notaire, a sorti du coffre le dernier testament de Madame. Elle laisse tout à « celui ou celle qui prendra soin de mes six chats ». Soudain, tout le monde adore les chats. Le neveu a fait un câlin à Chaussette. Chaussette s’en est remis.','Vous, Rosato, avez six chats. Je ne dis rien.','Voici votre énigme :\nTrois détails ne vont pas dans cet extrait.\nTouchez-les.'],
  hint:'Une date, un nombre de noms, une couleur d’encre. Pensez à la carte postale.',ok:'Une date impossible, sept noms pour six chats, une signature bleue. Madame n’écrivait qu’en violet : le testament est un faux.',
  p:{ans:'Le testament est un faux (date impossible, sept chats, encre bleue)'}},

 {n:13,title:'Firmin ne parle qu’aux roses',kind:'DÉCHIFFRER',hier:'le testament est un faux',wd:'morse',ans:true,
  text:[PV+'13. Firmin ne parle qu’aux roses.','Firmin, jardinier, ne parle qu’aux roses. Avec les humains, il tape sur un tuyau d’arrosage. HK l’a vu à trois heures du matin, une pelle à la main, sous la lune. Biscotte, ancien chat de Madame, repose depuis 2019 au pied du rosier. Firmin y tient.','Mélusine, elle, connaît Firmin « un peu ». Derrière la serre. Un peu.','Voici votre énigme :\nÉcoutez ce qu’il a tapé sur le tuyau, déchiffrez-le, et écrivez le mot.'],
  sol:['rosier'],hint:'Un point est court, un trait est long. La table de morse est juste en dessous.',ok:'Rosier. Firmin creusait au pied du rosier.',
  p:{word:'ROSIER'}},

 {n:14,title:'Pincette, la solitaire',kind:'DÉDUIRE',hier:'ROSIER (Firmin a creusé à 3 h)',wd:'shoes',
  text:[PV+'14. Pincette, la solitaire.','Pincette dort dans des coins où personne ne la voit. Elle vient manger, puis disparaît. Aucun alibi, aucun témoin : coupable idéale. Je l’aurais arrêtée. Elle m’a griffé.','Cette nuit, elle dormait sous le canapé du bureau, pièce 17, à côté du coffre. À l’aube, elle a entendu des pas qui couinent, puis un coffre qui s’ouvre.','Voici votre énigme :\nLe procès-verbal a fait écouter les pas de chaque visiteur.\nÉcoutez-les, puis touchez ceux qui couinent.'],
  hint:'Un pas qui couine, c’est aigu. Un pas qui fait flouf, c’est mou.',ok:'Le notaire ou le docteur : des souliers vernis qui couinent. Il faudra vérifier leurs clés.',
  p:{rows:[{id:'melusine',n:'Mélusine',shoe:'baskets',kind:'soft'},{id:'baptiste',n:'Baptiste',shoe:'mocassins',kind:'soft'},{id:'ginette',n:'Ginette',shoe:'charentaises',kind:'soft'},{id:'firmin',n:'Firmin',shoe:'bottes',kind:'flouf'},{id:'tabellion',n:'Maître Tabellion',shoe:'souliers vernis',kind:'squeak'},{id:'pouls',n:'Docteur Pouls',shoe:'souliers vernis',kind:'squeak'}],ok:['tabellion','pouls'],ans:'Le notaire ou le docteur'}},

 {n:15,title:'Le neveu a des dettes',kind:'CALCULER',hier:'le notaire ou le docteur (souliers qui couinent)',wd:'ledger',ans:true,
  text:[PV+'15. Le neveu a des dettes.','Baptiste doit de l’argent à tout le monde. Ses amis s’appellent Gino, Marcel et la Banque en Ligne Express. Le procès-verbal précise que Gino ne rit jamais.','Son neveu… pardon : le neveu de Madame est le suspect numéro un. Mobile : énorme.','Voici votre énigme :\nIl doit quatre mille deux cents francs à Gino, trois mille sept cent cinquante à Marcel, et douze mille cinquante à la banque.\nL’argenterie volée vaut huit mille cinq cents francs.\nCombien lui manque-t-il encore ?'],
  sol:['11500','11 500'],hint:'Additionnez les dettes, puis retirez ce que vaut l’argenterie.',ok:'11 500 francs. Même avec l’argenterie, il est dans le rouge.',
  p:{lines:[['Gino','4 200 francs'],['Marcel','3 750 francs'],['Banque en Ligne Express','12 050 francs'],['Argenterie volée','8 500 francs']]}},

 {n:16,title:'Mélusine fait ses comptes',kind:'CALCULER',hier:'11 500 francs',wd:'ledger',ans:true,
  text:[PV+'16. Mélusine fait ses comptes.','La masseuse est accusée de tout : meurtre, dissimulation, excès de zèle.\nElle présente sa note : « Tarif normal. » Une enveloppe a disparu du bureau.\nElle l’a reprise. « C’est mon dû. »','Elle avait allumé la bougie « pour l’ambiance ». Madame lui avait demandé de ne surtout pas l’éteindre ce soir-là. Elle ne sait pas pourquoi.','Voici votre énigme :\nLe tarif est de nonante francs l’heure, plus cinquante francs de « forfait discrétion ».\nLa séance a duré de vingt heures à vingt-deux heures trente.\nQuel est le montant exact de l’enveloppe ?'],
  sol:['275'],hint:'Deux heures et demie à 90 francs, puis le forfait.',ok:'275 francs. Du travail propre, comme on dit.',
  p:{lines:[['Tarif','90 francs l’heure'],['Forfait discrétion','50 francs'],['Séance','20 h – 22 h 30']]}},

 {n:17,title:'Le code du coffre',kind:'DÉDUIRE',hier:'275 francs',wd:'sudoku',
  text:[PV+'17. Le code du coffre.','Le coffre n’a pas été forcé. Il a été ouvert avec sa clé et son code.\nLe code est connu de trois personnes :\nMadame, son notaire et son neveu, qui l’a un jour lu par-dessus l’épaule. « Par curiosité. »','Le code figure sur une feuille déchirée.\nElle est incomplète.','Voici votre énigme :\nComplétez la grille : chaque ligne, chaque colonne et chaque carré de deux par deux contient 1, 2, 3 et 4.\nLe code, ce sont les quatre cases grisées.'],
  hint:'Commencez par la ligne ou la colonne qui a déjà trois chiffres.',ok:'Le code est 2341, et il n’y a pas d’effraction.\nQuelqu’un le connaissait.',
  p:{givens:[[1,0,0,4],[0,4,1,0],[2,0,0,3],[0,3,2,0]],solution:[[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]],grey:[1,4,10,15],ans:'2341'}},

 {n:18,title:'L’autopsie',kind:'DÉCHIFFRER',hier:'2341, et pas d’effraction',wd:'tiles',
  text:[PV+'18. L’autopsie.','Le docteur Pouls rend son rapport. Il écrit très vite. Pas de violence, pas de poison, pas d’angoisse. Il précise que Madame avait « le sourire d’une femme comblée » et qu’on ne s’en étonnera pas.','Il a écrit la cause du décès dans le dossier.\nLes lettres ont dansé.\nIl sent légèrement le clou de girofle.\nIl met cela sur le compte du savon de la morgue.','Voici votre énigme :\nNeuf lettres :\nU, L, R, E, N, E, L, A, T.\nRemettez-les en ordre.'],
  hint:'Cela commence par un N, et cela finit comme « belle ».',ok:'Naturelle. Plus de meurtre : il reste le faux testament.',
  p:{letters:['U','L','R','E','N','E','L','A','T'],word:'NATURELLE',ans:'NATURELLE'}},

 {n:19,title:'La boîte de Firmin',kind:'DÉDUIRE',hier:'NATURELLE : plus de meurtre, mais un faux testament',wd:'padlock',
  text:[PV+'19. La boîte de Firmin.','Firmin a fini par rendre la boîte en fer qu’il avait déterrée sous le rosier.\nElle ne contient qu’un mot, écrit à la main : PATIENCE.','Le cadenas à lettres portait une étiquette : le prénom du chat enterré sous ce rosier.','Voici votre énigme :\nLe cadenas a huit lettres.\nRéglez-le sur le bon prénom.'],
  hint:'Le chat de Madame enterré en 2019, dont vous avez déjà croisé le nom.',ok:'Biscotte. Le chat enterré sous le rosier ouvre la boîte.',
  p:{word:'BISCOTTE',ans:'BISCOTTE'}},

 {n:20,title:'Quatre petits coupables',kind:'LOGIQUE',hier:'BISCOTTE',wd:'match',
  text:[PV+'20. Quatre petits coupables.','Personne n’a tué Madame. Mais tout le monde a fait quelque chose.\nLe procès-verbal compte quatre fautes et quatre suspects. À vous de les assortir.','Les fautes :\nvoler l’argenterie, allumer la bougie, enlever un chat, creuser sous le rosier.\nLes suspects :\nBaptiste, Mélusine, Ginette et Firmin.','Voici votre énigme :\n1) Celui qui a creusé ne parle qu’aux roses.\n2) La voisine n’a ni volé l’argenterie ni allumé la bougie.\n3) Le neveu n’a pas allumé la bougie.'],
  hint:'Firmin est le seul à creuser. Ensuite, la voisine n’a plus qu’un choix.',ok:'Baptiste l’argenterie, Mélusine la bougie, Ginette le chat, Firmin le trou. Personne n’a tué Madame.',
  p:{rows:[{id:'baptiste',n:'Baptiste'},{id:'melusine',n:'Mélusine'},{id:'ginette',n:'Ginette'},{id:'firmin',n:'Firmin'}],opts:[['A','a volé l’argenterie'],['B','a allumé la bougie'],['C','a enlevé un chat'],['D','a creusé sous le rosier']],sol:{baptiste:'A',melusine:'B',ginette:'C',firmin:'D'},ans:'Baptiste l’argenterie, Mélusine la bougie, Ginette le chat, Firmin le trou'}},

 {n:21,title:'Il faisait combien, Madame ?',kind:'CALCULER',hier:'Baptiste l’argenterie, Mélusine la bougie, Ginette le chat, Firmin le trou',wd:'clock',
  text:[PV+'21. Il faisait combien, Madame ?','Le docteur a pris la température du corps à sept heures vingt : vingt-sept degrés.\nUn corps perd environ un degré par heure.\nIl fait trente-sept degrés à l’heure de la mort.','Mélusine jure qu’elle est partie à vingt-deux heures trente, que Madame dormait et qu’elle n’a rien vu.','Voici votre énigme :\nRéglez l’heure de la mort de Madame, d’après ces chiffres.'],
  hint:'De 37 à 27 degrés, cela fait dix degrés, donc dix heures avant 7 h 20.',ok:'21 h 20, donc pendant la séance de Mélusine.',
  p:{start:7*60+20,target:21*60+20,thermo:1,find:7*60+20,measured:'27',ans:'21 h 20, pendant la séance'}},

 {n:22,title:'Je vous arrête',kind:'REPÉRER',hier:'21 h 20, pendant la séance',wd:'tf',
  text:[PV+'22. Je vous arrête.','Stagiaire Rosato, vous êtes en état d’arrestation.\nChefs d’accusation :\nsix chats suspects, aucun alibi (vos chats ne parlent pas) et un mobile : hériter de six chats, ce qui est à la portée de tous.','Ces trois preuves m’ont semblé solides.','Voici votre énigme :\nLes trois preuves :\nA) La bougie a été allumée à trois heures du matin.\nB) La véranda est restée fermée toute la nuit.\nC) Le testament est authentique.\nVérifiez dans vos notes, puis marquez chaque preuve vraie ou fausse.'],
  hint:'Vous avez déjà démonté chacune de ces trois preuves.',ok:'Aucune des trois n’est vraie.\nLe procès-verbal ment, ou se trompe volontairement.',
  p:{stmts:[['A','La bougie a été allumée à 3 h du matin.'],['B','La véranda est restée fermée toute la nuit.'],['C','Le testament est authentique.']],truth:[false,false,false],ans:'Aucune preuve n’était vraie'}},

 {n:23,title:'Les trois clés',kind:'DÉDUIRE',hier:'aucune preuve n’était vraie',wd:'seq',
  text:[PV+'23. Les trois clés.','Le coffre a trois clés.\nLa première pend au cou de Madame.\nLa deuxième est chez le notaire.\nLa troisième a quitté la région en 2011, dans le peignoir de Raymond, troisième mari de Madame.\nRaymond n’a pas fait de commentaire.','Le journal de l’alarme, enclenchée au départ de Mélusine, a noté cinq mouvements :\nVingt-deux heures trente, véranda.\nVingt-trois heures quinze, porte.\nMinuit trente, véranda.\nSix heures, porte.\nSept heures vingt, porte.\nLe mimosa de la voisine, toujours aussi abominable, n’a rien signalé.','Voici votre énigme :\nReprenez l’ordre d’arrivée des visiteurs du jour quatre.\nFirmin n’entre jamais : il reste au jardin.\nAssociez les cinq autres aux cinq mouvements du journal, dans l’ordre.\nLe premier est le départ de Mélusine, les quatre autres sont des arrivées.'],
  hint:'Prenez l’ordre du jour 4, sans Firmin, et suivez le journal.',ok:'Maître Tabellion est entré à 6 h 00, et il possède une clé du coffre. Le notaire est de plus en plus intéressant.',
  p:{items:['melusine','baptiste','ginette','tabellion','pouls'],target:['melusine','baptiste','ginette','tabellion','pouls'],byId:byId(),log:[['22 h 30','véranda'],['23 h 15','porte'],['0 h 30','véranda'],['6 h 00','porte'],['7 h 20','porte']],ans:'Maître Tabellion'}},

 {n:24,title:'L’enquête n’est pas finie',kind:'REPÉRER',hier:'Maître Tabellion',wd:'pick',
  text:[PV+'24. L’enquête n’est pas finie.','Affaire classée.\nPresque. Regardez, en tout petit, au bas de cette page :\n« Procès-verbal établi le 29 novembre. »\nMadame est morte la nuit du 30.\nQui rédige un procès-verbal avant les faits ?','Il reste sept jours. Les prochains procès-verbaux apparaîtront ici, un par jour.\nJe ne vous dis pas à quelle heure.\nJe ne dis rien. Je note.','Voici votre énigme :\nPour le dossier, désignez le faussaire.'],
  hint:'Celui qui a sorti le testament du coffre.',ok:'Tabellion.\nMais les dates ne collent pas, et l’enquête continue.',
  p:{items:VIDS.map(function(i){return {id:i,label:VIS[i][0],sub:VIS[i][1],img:vimg(i)}}),ok:['tabellion'],ans:'TABELLION',cols:3}}
];

DAYS.forEach(function(d){d.od=1;d.gr=1;d.puzzle=null;d.p=d.p||{}});
var MAP={};DAYS.forEach(function(d){MAP[d.n]=d});

window.AVN={
 days:DAYS,
 gates:window.AVN_GATES||{},
 has:function(n){return !!MAP[n]},
 html:function(d){return '<div class="wg avw" id="wg'+d.n+'" data-n="'+d.n+'"></div>'},
 init:init
};
})();
