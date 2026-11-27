/* Reference restoration wrapper; the author's upstream/index.html is byte-identical.
 * Source: kevintngo/cinderwatch @ 8313bb2 (MIT). No scene/material/shader edits.
 * A fixed virtual1920x1080/DPR1 view matches the supplied landscape recording;
 * the parent scales the whole interactive viewport to fit a phone without
 * cropping, resizing the character, changing the camera or changing art.
 */
(async()=>{
 'use strict';
 const $=id=>document.getElementById(id),game=$('game'),fit=$('fit'),cover=$('loading'),phase=$('phase'),bar=$('progress'),params=new URLSearchParams(location.hash.slice(1));
 const state={version:'Cinderwatch reference 8313bb2 / R1',status:'loading',sourceCommit:'8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5',sourceSHA256:'ee14f3c172685a4bcf4e90ca83b99080b06c99548c0e198b009cfa0827e4e532',sourceVerified:false,seed:4,startFrame:5131,currentFrame:0,step:1/60,virtualViewport:[1920,1080],DPR:1,errors:[],started:performance.now(),renderedFrames:0,simulationSteps:0,interactions:0,screen:null};
 let cw=null,last=0,acc=0,live=false,raf=0,failed=false,scale=1,ignoreElapsed=false;const frames=[];
 const pause=()=>{live=false;state.paused=true;};const resume=()=>{if(state.status!=='ready')return;live=true;last=performance.now();acc=0;state.paused=false;};
 function layout(){const w=innerWidth,h=innerHeight;scale=Math.min(w/1920,h/1080);fit.style.width=1920*scale+'px';fit.style.height=1080*scale+'px';game.style.transform='scale('+scale+')';state.screen={width:w,height:h,scale,letterboxed:true};}
 layout();addEventListener('resize',layout);if(window.visualViewport)visualViewport.addEventListener('resize',layout);
 function fail(message){if(failed)return;failed=true;live=false;if(raf)cancelAnimationFrame(raf);state.status='failed';state.errors.push(message);phase.textContent=message;cover.hidden=false;cover.style.pointerEvents='auto';cover.style.background='#080e17';$('recovery').hidden=false;}
 window.__referenceSourceError=message=>fail('原作画面未能启动：'+String(message).slice(0,200));
 window.__REFERENCE={state,pause,resume,frames:()=>frames.slice(),snapshot:()=>({state:{...state},game:cw?{t:cw.G.t,wave:cw.G.k,lives:cw.G.lives,gold:cw.G.gold,kills:cw.G.slain,phase:cw.G.phase,monsters:cw.G.mons.length,queued:cw.G.queue.length,towers:cw.G.towers.map(t=>({kind:t.kind,level:t.lvl,x:t.x,z:t.z})),camera:{...cw.CAM},viewport:[cw.R.dw,cw.R.dh],internal:[cw.R.iw,cw.R.ih],draws:cw.R.renderer.info.render.calls,triangles:cw.R.renderer.info.render.triangles}:null}),project:(x,y,z)=>{if(!cw)return null;const v=new cw.R.cam.position.constructor(x,y,z).project(cw.R.cam),rect=fit.getBoundingClientRect();return [rect.left+(v.x+1)*960*scale,rect.top+(1-v.y)*540*scale];}};
 const timeout=setTimeout(()=>{if(state.status!=='ready'&&!failed){phase.textContent='正在准备原作场景，较慢时可重试或从原作开局进入';$('recovery').hidden=false;}},20000);
 try{
  const response=await fetch('./upstream/index.html',{cache:'no-cache'});if(!response.ok)throw Error('源码下载失败 HTTP '+response.status);const source=await response.text();
  if(crypto.subtle){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));const sha=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(sha!==state.sourceSHA256)throw Error('源版本不匹配，请重新载入');state.sourceVerified=true;}
  bar.value=.10;phase.textContent='正在生成原作的模型、纹理和光照';
  // Generated engine.html preserves the upstream game code and adds only the
  // DPR1 host prelude. A real same-origin URL preserves original hash parsing.
  game.src='./engine.html#seed=4&manual=1&noscale=1';
  await new Promise((resolve,reject)=>{let attempts=0;const probe=()=>{if(failed)return reject(Error('原作初始化失败'));try{const w=game.contentWindow;if(w&&w.__cw){cw=w.__cw;return resolve();}}catch(e){}if(++attempts>1800)return reject(Error('等待原作初始化超时'));setTimeout(probe,20);};probe();});
  if(cw.R.dw!==1920||cw.R.dh!==1080)throw Error('原作虚拟画幅错误：'+cw.R.dw+'×'+cw.R.dh);
  state.generatedAt=performance.now();bar.value=.18;phase.textContent='正在还原视频开场战局';
  while(state.currentFrame<state.startFrame&&!failed){const end=Math.min(state.startFrame,state.currentFrame+90);for(;state.currentFrame<end;){state.currentFrame++;cw.tick(1/60,state.currentFrame===state.startFrame);state.simulationSteps++;}bar.value=.18+.81*state.currentFrame/state.startFrame;phase.textContent='正在还原视频开场战局 · '+Math.round(state.currentFrame/state.startFrame*100)+'%';await new Promise(r=>setTimeout(r,0));}
  if(failed)return;
  state.referenceStart={lives:cw.G.lives,gold:cw.G.gold,kills:cw.G.slain,wave:cw.G.k,monsters:cw.G.mons.length,queued:cw.G.queue.length,camera:{...cw.CAM}};
  if(cw.G.lives!==17||cw.G.gold!==23||cw.G.slain!==58||cw.G.k!==4)throw Error('开场战局未对齐，请重试');
  // WebKit may defer the WebGL surface while a fully opaque loader covers it.
  // Expose the layer, submit the same scene again and flush it before ready.
  // bench(0) only renders/reads the current scene; it takes no simulation step
  // and does not call UI.draw, so the reference seed/frame stay unchanged.
  phase.textContent='正在显示参考首帧';cover.style.background='transparent';
  await new Promise(r=>requestAnimationFrame(r));cw.bench(0);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  if(failed)return;
  state.status='ready';state.readyAt=performance.now();state.startupMs=state.readyAt-state.started;state.paused=params.get('still')==='1';state.firstRenderedFrame=state.currentFrame;bar.value=1;cover.hidden=true;cover.style.pointerEvents='none';clearTimeout(timeout);live=!state.paused;last=performance.now();
  // Original desktop UI resolves button hover during the preceding draw.
  // A touch has no preceding mouse hover: resolve its current position before
  // the original pointerdown handler, without advancing game time or coins.
  game.contentWindow.addEventListener('pointerdown',e=>{const u=cw.UI,dt=cw.R.frameDt;u.mx=e.clientX;u.my=e.clientY;u.inside=true;u.gp.active=false;cw.R.frameDt=0;try{u.draw();}catch(error){fail('触控中断：'+(error.message||String(error)));}finally{cw.R.frameDt=dt;}state.interactions++;if(!live)resume();},true);
  cw.R.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('图形连接中断，请重新载入')});
  document.addEventListener('visibilitychange',()=>{ignoreElapsed=true;last=performance.now();acc=0;});
  function frame(now){raf=requestAnimationFrame(frame);if(!live||failed||document.hidden)return;try{if(ignoreElapsed){last=now;ignoreElapsed=false;}const dt=Math.max(0,Math.min(.25,(now-last)/1000));last=now;acc+=dt;let n=Math.min(15,Math.floor(acc*60));if(n<1)return;acc-=n/60;for(let i=0;i<n;i++){cw.tick(1/60,i===n-1);state.currentFrame++;state.simulationSteps++;}state.renderedFrames++;frames.push({time:performance.timeOrigin+performance.now(),frame:state.currentFrame,wave:cw.G.k,draws:cw.R.renderer.info.render.calls,triangles:cw.R.renderer.info.render.triangles});if(frames.length>3000)frames.shift();}catch(error){fail('场景运行中断：'+(error.message||String(error)));}}
  raf=requestAnimationFrame(frame);
 }catch(error){clearTimeout(timeout);fail(error.message||String(error));}
})();
