import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';

const ROOT='/workspace/wanxiang-cloud-tour/forest-sample';
const OUT='/workspace/qa-forest/sim-checks.json';
const source=fs.readFileSync(ROOT+'/simulation.js','utf8');
const main=fs.readFileSync(ROOT+'/main.js','utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const {ForestRun}=await import(pathToFileURL(ROOT+'/simulation.js'));
const start=performance.now(),checks=[];
const expression=main.slice(main.indexOf('const props=')+12,main.indexOf(';\n\nfunction resize'));
const props=vm.runInNewContext(expression);
const extra=main.match(/\.concat\((\[\{x:1480[\s\S]*?\}\])\)/);
assert(extra,'Capture the actual additional obstacle from main.js');
const obstacles=JSON.parse(JSON.stringify(props.filter(p=>p.r).map(p=>({x:p.x,y:p.y,r:p.r})).concat(vm.runInNewContext(extra[1]))));
assert.equal(obstacles.length,20);
const report={scope:'CPU-only checks of unmodified production ForestRun; no browser/GPU; no direct writes to HP, coordinates, enemies or stats',source:{simulationSHA256:sha(source),mainSHA256:sha(main)},obstacleSource:'Extracted the actual const props mapping and extra circle from main.js restart()',obstacles,checks};
const fresh=seed=>{const g=new ForestRun(seed===undefined?{}:{seed});g.setObstacles(obstacles);return g;};
const choice=(g)=>{
 const p=g.player,ids=p.hp<p.maxHp*.55?['renew','vitality','guard','power','quick','flow']:['power','quick','guard','renew','flow','vitality'];
 return ids.map(id=>g.levelChoices.find(c=>c.id===id)).find(Boolean)||g.levelChoices[0];
};
const select=g=>{const c=choice(g);assert(c);assert(g.choose(c.id));return c.id;};
const capture=(name,fn)=>{const t=performance.now();try{const detail=fn();checks.push({name,passed:true,wallMs:+(performance.now()-t).toFixed(2),...detail});}catch(e){checks.push({name,passed:false,wallMs:+(performance.now()-t).toFixed(2),error:e.stack});}};
function checkFoot(g,tally){
 const p=g.player,r=p.r;
 const world=Math.min(p.x-r,p.y-r,1536-p.x-r,1536-p.y-r);
 assert(world>=8-1e-6,`foot circle crossed world guard at ${p.x},${p.y}`);
 tally.minWorldClearance=Math.min(tally.minWorldClearance,world);
 for(let i=0;i<obstacles.length;i++){
  const o=obstacles[i],clear=Math.hypot(p.x-o.x,p.y-o.y)-r-o.r;
  assert(clear>=-1e-6,`root ${i} penetration ${clear} at ${p.x},${p.y}`);
  tally.minRootClearance=Math.min(tally.minRootClearance,clear);
  if(clear<.75)tally.rootContacts.add(i);
 }
 tally.samples++;tally.maxEnemies=Math.max(tally.maxEnemies,g.enemies.length);
 assert(g.enemies.length<=42,'active enemy cap');
}
const tally=()=>({samples:0,minWorldClearance:Infinity,minRootClearance:Infinity,rootContacts:new Set(),maxEnemies:0});
const plainTally=t=>({...t,rootContacts:[...t.rootContacts]});
const rng=seed=>()=>{seed=(seed+0x6d2b79f5)>>>0;let x=seed;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};

capture('same seed, inputs and public actions reproduce complete state',()=>{
 const a=fresh(531),b=fresh(531),r=rng(777),points=[];let input={x:0,y:0};
 for(let i=0;i<7200;i++){
  if(i%24===0){const angle=r()*Math.PI*2;input={x:Math.cos(angle),y:Math.sin(angle)};}
  for(const g of [a,b]){
   if(g.phase==='upgrade')select(g);
   if(i%31===0)g.attack();if(i%113===0)g.pulse();
   g.step(1/60,input);
  }
  if(i%600===0){assert.deepEqual(a.snapshot(),b.snapshot());points.push({inputFrame:i,phase:a.phase,time:a.time,stateSHA256:sha(JSON.stringify(a.snapshot()))});}
 }
 assert.deepEqual(a.snapshot(),b.snapshot());
 return {inputFrames:7200,checkpoints:points,finalPhase:a.phase};
});

capture('real twenty obstacles: random and deliberately blocked foot movement',()=>{
 const t=tally(),r=rng(541),g=fresh(21);let input={x:0,y:0},restarts=0;
 for(let i=0;i<12000;i++){
  if(g.phase==='upgrade')select(g);
  if(g.phase==='lost'||g.phase==='won'){g.restart();restarts++;}
  if(i%17===0){const angle=r()*Math.PI*2,mag=.2+r()*.8;input={x:Math.cos(angle)*mag,y:Math.sin(angle)*mag};}
  if(i%90===0)g.pulse();g.step(1/60,input);checkFoot(g,t);
 }
 // Push toward every actual root center from the normal spawn using input only.
 for(let index=0;index<obstacles.length;index++){
  const h=fresh(1000+index),target=obstacles[index];
  for(let i=0;i<18*60&&h.phase!=='lost'&&h.phase!=='won';i++){
   if(h.phase==='upgrade')select(h);
   const dx=target.x-h.player.x,dy=target.y-h.player.y,d=Math.hypot(dx,dy)||1;
   h.step(1/60,{x:dx/d,y:dy/d});checkFoot(h,t);
  }
 }
 for(const sequence of [[[-1,0,8]],[[1,0,8]],[[0,1,8]],[[-1,0,6],[0,-1,10]]]){
  const h=fresh(501);
  for(const [x,y,seconds]of sequence)for(let i=0;i<seconds*60;i++){
   if(h.phase==='upgrade')select(h);h.step(1/60,{x,y});checkFoot(h,t);
  }
 }
 assert(t.rootContacts.size>=10,'at least half the actual roots physically contacted');
 assert(t.minWorldClearance<8.2,'actually reached a world guard');
 return {...plainTally(t),randomInputFrames:12000,restarts};
});

capture('natural melee windup: no damage before .22, damage after it',()=>{
 const g=fresh(36);
 while(g.time<25&&g.player.attackT<0)g.step(1/120,{x:0,y:0});
 assert(g.player.attackT>=0,'a naturally approaching enemy triggered melee');
 const attackStartTime=g.time-g.player.attackT,killsBefore=g.kills;
 const hpBefore=new Map(g.enemies.map(e=>[e.id,e.hp]));
 while(g.player.attackT<.219-1e-8)g.step(Math.min(.005,.219-g.player.attackT),{x:0,y:0});
 for(const e of g.enemies)if(hpBefore.has(e.id))assert.equal(e.hp,hpBefore.get(e.id));
 assert.equal(g.kills,killsBefore);assert(g.player.attackT<.22);
 const pre={time:g.time,attackT:g.player.attackT,kills:g.kills};
 g.step(.002,{x:0,y:0});
 const afterHP=new Map(g.enemies.map(e=>[e.id,e.hp]));
 const damaged=[...hpBefore].filter(([id,hp])=>(afterHP.get(id)??0)<hp).map(([id,hp])=>({id,before:hp,after:afterHP.get(id)??0}));
 assert(damaged.length>0,'physical enemy damaged after .22 crossing');
 return {attackStartTime,pre,post:{time:g.time,attackT:g.player.attackT,kills:g.kills},damaged,setup:'normal spawn, obstacles and approaching live enemy; no fixture/HP/position edits'};
});

capture('manual melee and pulse cannot bypass their cooldowns',()=>{
 const g=fresh(36);g.step(.15);g.step(.15);
 assert(g.attack());assert.equal(g.attack(),false);
 for(let i=0;i<36;i++)g.step(1/60);
 assert.equal(g.attack(),false,'recovery is over but interval still blocks');
 while(g.player.attackCooldown>1e-7)g.step(1/600);
 assert(g.attack(),'manual attack becomes available at interval');
 const h=fresh(36);assert(h.pulse());assert.equal(h.pulse(),false);
 while(h.time<7.99-1e-8){if(h.phase==='upgrade')select(h);h.step(Math.min(1/60,7.99-h.time));}
 const remaining=h.player.pulseCooldown;assert(remaining>0);assert.equal(h.pulse(),false);
 h.step(.02);assert(h.pulse());assert(h.player.pulseCooldown>7.99);
 return {meleeInterval:g.stats.interval,pulseInterval:h.stats.pulseInterval,pulseRemainingBeforeEight:remaining,immediateRepeatRejected:true};
});

function safeInput(g,desired,ctx){
 const m=Math.hypot(desired.x,desired.y);if(m<.001)return {x:0,y:0};
 const mag=Math.min(1,m),x=desired.x/m,y=desired.y/m,p=g.player;
 const legal=(px,py)=>px>=p.r+8&&py>=p.r+8&&px<=1536-p.r-8&&py<=1536-p.r-8&&!obstacles.some(o=>(px-o.x)**2+(py-o.y)**2<(p.r+o.r+.15)**2);
 const side=ctx.side||1;
 for(const angle of [0,.35*side,-.35*side,.7*side,-.7*side,1.1*side,-1.1*side,1.57*side,-1.57*side,2.2*side,-2.2*side,Math.PI]){
  const dx=x*Math.cos(angle)-y*Math.sin(angle),dy=x*Math.sin(angle)+y*Math.cos(angle);let okay=true;
  for(let i=1;i<=6;i++)if(!legal(p.x+dx*30*i/6,p.y+dy*30*i/6)){okay=false;break;}
  if(okay){if(angle)ctx.side=Math.sign(angle);return {x:dx*mag,y:dy*mag};}
 }
 return {x:0,y:0};
}
function desiredInput(g){
 const p=g.player,boss=g.enemies.find(e=>e.type==='stag'&&!e.dead);
 if(boss){
  const dx=boss.x-p.x,dy=boss.y-p.y,d=Math.hypot(dx,dy)||1;
  if(boss.mode==='windup')return d<202?{x:-dx/d,y:-dy/d}:{x:0,y:0};
  const speed=Math.max(-1,Math.min(1,(d-120)/25));return {x:dx/d*speed,y:dy/d*speed};
 }
 let drops=g.drops;
 const health=drops.filter(d=>d.type==='health').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
 const chest=drops.find(d=>d.type==='chest');
 let target=p.hp<p.maxHp*.75&&health[0]?health[0]:chest;
 if(!target)target=drops.filter(d=>d.type==='xp').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(!target)target=g.enemies.filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(!target)return {x:0,y:0};
 const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1;
 if('hp'in target){const speed=Math.max(-1,Math.min(1,(d-97)/27));return {x:dx/d*speed,y:dy/d*speed};}
 return {x:dx/d,y:dy/d};
}
function upgradeEffect(g,id,before){
 const p=g.player,s=g.stats;
 if(id==='power')assert(s.damage===before.stats.damage+1&&s.pulseDamage===before.stats.pulseDamage+1);
 if(id==='quick')assert(s.interval<before.stats.interval);
 if(id==='guard')assert(s.armor===before.stats.armor+1);
 if(id==='renew')assert(s.regen>before.stats.regen&&p.hp>=before.player.hp);
 if(id==='vitality')assert(p.maxHp===before.player.maxHp+18&&p.hp>=before.player.hp);
 if(id==='flow')assert(p.speed>before.player.speed&&s.magnet===before.stats.magnet+28);
}
function play(seed,{stopAtUpgrade=false,maxTime=160}={}){
 const g=fresh(seed),ctx={},t=tally(),log=[],decisions=[];let input={x:0,y:0},frames=0,lastLogged=-1,bossAt=null;
 const counters={manualAttacks:0,pulses:0,choices:0,chestMenus:0,bossWarnings:0,bossCirclesAvoided:0},chestIds=new Set();
 while(g.time<maxTime&&g.phase!=='won'&&g.phase!=='lost'&&frames<maxTime*80){
  if(g.phase==='upgrade'){
   if(stopAtUpgrade)return {g,log,decisions,counters};
   assert.equal(g.levelChoices.length,3);assert.equal(new Set(g.levelChoices.map(c=>c.id)).size,3);
   const selected=choice(g),before=g.snapshot(),kind=g.upgradeSource;
   assert(g.choose(selected.id));upgradeEffect(g,selected.id,before);
   counters.choices++;if(kind==='chest')counters.chestMenus++;
   decisions.push({time:+g.time.toFixed(3),source:kind,choice:selected.id,hpBefore:before.player.hp,hpAfter:g.player.hp});
   continue;
  }
  const boss=g.enemies.find(e=>e.type==='stag');
  const previousBoss=boss?{id:boss.id,mode:boss.mode,attackT:boss.attackT,x:boss.x,y:boss.y}:null;
  const previousHP=g.player.hp,previousDistance=boss?Math.hypot(g.player.x-boss.x,g.player.y-boss.y):null;
  if(frames%4===0)input=safeInput(g,desiredInput(g),ctx);
  const near=g.enemies.filter(e=>!e.dead).map(e=>({e,d:Math.hypot(e.x-g.player.x,e.y-g.player.y)})).sort((a,b)=>a.d-b.d);
  if(near[0]&&near[0].d<=g.stats.range+near[0].e.r+5&&g.attack())counters.manualAttacks++;
  const inPulse=near.filter(q=>q.d<=g.stats.pulseRadius+q.e.r);
  if(inPulse.length&&(inPulse.length>=2||boss||g.player.hp<g.player.maxHp*.6)&&g.pulse())counters.pulses++;
  g.step(1/60,input);frames++;checkFoot(g,t);
  if(g.bossSpawned&&bossAt===null)bossAt=g.time;
  const afterBoss=g.enemies.find(e=>e.type==='stag');
  if(afterBoss?.mode==='windup'&&previousBoss?.mode!=='windup')counters.bossWarnings++;
  if(previousBoss?.mode==='windup'&&afterBoss?.mode==='recover'&&previousDistance>171&&g.player.hp>=previousHP)counters.bossCirclesAvoided++;
  for(const d of g.drops)if(d.type==='chest')chestIds.add(d.id);
  const sec=Math.floor(g.time/5);
  if(sec!==lastLogged){lastLogged=sec;log.push({time:+g.time.toFixed(2),phase:g.phase,x:+g.player.x.toFixed(2),y:+g.player.y.toFixed(2),hp:+g.player.hp.toFixed(2),level:g.player.level,kills:g.kills,enemies:g.enemies.length,bossHP:afterBoss?.hp??null});}
 }
 return {g,seed,frames,log,decisions,counters,bossAt,chestIds:[...chestIds],foot:plainTally(t)};
}

capture('upgrade freezes all simulation state and applies an actual offered card',()=>{
 const {g}=play(36,{stopAtUpgrade:true,maxTime:45});assert.equal(g.phase,'upgrade');
 assert.equal(g.levelChoices.length,3);assert.equal(new Set(g.levelChoices.map(c=>c.id)).size,3);
 const frozen=g.snapshot();g.step(30,{x:1,y:1});assert.deepEqual(g.snapshot(),frozen);
 assert.equal(g.attack(),false);assert.equal(g.pulse(),false);assert.equal(g.choose('not-an-offered-card'),false);
 const selected=choice(g);assert(g.choose(selected.id));upgradeEffect(g,selected.id,frozen);
 return {atTime:frozen.time,choices:frozen.levelChoices,selected:selected.id,fullSnapshotFrozen:true,publicActionsBlocked:true,phaseAfter:g.phase};
});

capture('all six upgrade types apply their advertised stat changes',()=>{
 const covered=new Set(),examples=[];
 for(let seed=1;seed<=30&&covered.size<6;seed++){
  const {g}=play(seed,{stopAtUpgrade:true,maxTime:45});
  assert.equal(g.phase,'upgrade');
  const c=g.levelChoices.find(c=>!covered.has(c.id));if(!c)continue;
  const before=g.snapshot();assert(g.choose(c.id));upgradeEffect(g,c.id,before);
  covered.add(c.id);examples.push({seed,atTime:before.time,offered:before.levelChoices.map(c=>c.id),selected:c.id,before:{stats:before.stats,hp:before.player.hp,maxHp:before.player.maxHp,speed:before.player.speed},after:{stats:{...g.stats},hp:g.player.hp,maxHp:g.player.maxHp,speed:g.player.speed}});
 }
 assert.equal(covered.size,6,'every production card type encountered through earned upgrades');
 return {covered:[...covered],examples,setup:'all menus earned by input/XP; no direct level, XP, HP, stats or choices edits'};
});

capture('actual contact damage gives a real invulnerability window',()=>{
 const g=fresh(36),ctx={};let frames=0,input={x:0,y:0};
 while(g.player.hp===g.player.maxHp&&g.time<30){
  if(g.phase==='upgrade')select(g);
  const e=g.enemies.filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];
  if(e){const d=Math.hypot(e.x-g.player.x,e.y-g.player.y)||1;input=safeInput(g,{x:(e.x-g.player.x)/d,y:(e.y-g.player.y)/d},ctx);}
  else input={x:0,y:0};
  g.step(1/60,input);if(++frames>3000)break;
 }
 assert(g.player.hp<g.player.maxHp&&g.player.hp>0,'a real live enemy inflicted damage');
 const at={time:g.time,hp:g.player.hp,invuln:g.player.invuln};assert(at.invuln>.8);
 let genuineOverlaps=0;
 for(let i=0;i<12;i++){
  const e=g.enemies.filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];
  if(e){const d=Math.hypot(e.x-g.player.x,e.y-g.player.y)||1;g.step(1/60,{x:(e.x-g.player.x)/d,y:(e.y-g.player.y)/d});}
  else g.step(1/60);
  if(g.enemies.some(e=>e.type!=='stag'&&Math.hypot(e.x-g.player.x,e.y-g.player.y)<e.r+g.player.r+3))genuineOverlaps++;
  assert.equal(g.player.hp,at.hp,'contact during invulnerability must not repeatedly deduct HP');
 }
 assert(genuineOverlaps>0,'a second genuine overlap occurred during the protection window');
 return {initialHit:at,after:{time:g.time,hp:g.player.hp,invuln:g.player.invuln},genuineOverlaps,setup:'input-only approach to a naturally spawned enemy'};
});

capture('public-API movement, XP collection and skills reach the actual boss ending',()=>{
 const runs=[];
 for(const seed of [0xF01736,36,1827]){
  const q=play(seed),s=q.g.snapshot();
  runs.push({seed,phase:s.phase,time:+s.time.toFixed(3),hp:+s.player.hp.toFixed(2),level:s.level,kills:s.kills,bossAt:q.bossAt,boss:s.boss,chestOpened:s.chestOpened,chestIds:q.chestIds,counters:q.counters,choices:q.decisions,foot:q.foot,trajectory:q.log});
  assert(q.chestIds.length<=1,'no second chest spawn');
  assert(q.counters.chestMenus<=1,'one treasure selection maximum');
 }
 report.publicGameplayRuns=runs;
 assert(runs.some(r=>r.phase==='won'),'at least one unmodified API-only strategy must win');
 assert(runs.filter(r=>r.phase==='won').every(r=>r.bossAt>=54&&r.bossAt<54.1));
 return {runs:runs.map(({trajectory,choices,...r})=>r),strategy:'15Hz intent decisions: seek XP/health/one chest; approach boss to120; on windup retreat beyond202; legal direction steering from actual obstacles; use melee/pulse/choose public APIs only',stateCheats:false};
});

capture('restart clears the run and retains the exact environment',()=>{
 const {g}=play(36,{maxTime:130});const previousPhase=g.phase;
 g.restart();const expected=fresh(36);
 assert.deepEqual(g.snapshot(),expected.snapshot());
 const s=g.snapshot();assert.equal(s.time,0);assert.equal(s.kills,0);assert.equal(s.phase,'play');assert.equal(s.player.hp,100);assert.equal(s.bossSpawned,false);assert.equal(s.chestSpawned,false);assert.deepEqual(s.enemies,[]);assert.deepEqual(s.drops,[]);assert.deepEqual(s.levelChoices,[]);
 return {previousPhase,fullStateMatchesFreshSameSeed:true,obstaclesRetained:s.obstacles.length};
});
report.productionSimulationUnchanged=sha(fs.readFileSync(ROOT+'/simulation.js'))===report.source.simulationSHA256;
report.wallMs=+(performance.now()-start).toFixed(2);
report.passed=checks.every(c=>c.passed)&&report.productionSimulationUnchanged;
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,wallMs:report.wallMs,productionSimulationUnchanged:report.productionSimulationUnchanged,checks:checks.map(({name,passed,error})=>({name,passed,error})),runs:report.publicGameplayRuns?.map(({seed,phase,time,hp,level,kills,chestOpened})=>({seed,phase,time,hp,level,kills,chestOpened})),output:OUT},null,2));
process.exitCode=report.passed?0:1;
