/* H36 classic-script launcher. Runs before any engine/asset initialization. */
(function () {
 'use strict';
 if(window.__FM_STARTUP)return;
 var entry=document.currentScript;
 var note=document.getElementById('loading-note');
 var retry=document.getElementById('load-retry');
 var copy=document.getElementById('load-copy');
 var progress=document.getElementById('load-progress');
 var state={version:'H.35',status:'starting',phase:'launcher',lastChange:Date.now(),started:Date.now(),errors:[],history:[]};
 var finished=false;
 function stage(text,amount,phase){
  if(finished)return;
  state.status='loading';state.phase=phase||text;state.lastChange=Date.now();state.history.push({phase:state.phase,at:state.lastChange,progress:amount||0});
  note.textContent=text;progress.value=amount||0;
 }
 function fail(reason,error){
  finished=false;var overlay=document.getElementById('loading');overlay.hidden=false;overlay.style.opacity='1';overlay.style.pointerEvents='auto';overlay.setAttribute('aria-hidden','false');
  state.status='failed';state.phase=reason;state.lastChange=Date.now();
  state.errors.push(String(error&&error.message||error||reason));state.history.push({phase:'failed',at:Date.now(),reason:reason});
  note.textContent=reason;retry.hidden=false;copy.hidden=false;
  document.getElementById('loading').classList.add('load-failed');
 }
 window.__FM_STARTUP={state:state,stage:stage,fail:fail,done:function(){
  if(finished)return;finished=true;state.status='ready';state.phase='playable';state.readyAt=Date.now();state.history.push({phase:'playable',at:state.readyAt,progress:1});
  progress.value=1;
  var overlay=document.getElementById('loading');overlay.style.opacity='0';
  // End hit-testing immediately; transition/timer throttling cannot block play.
  overlay.style.pointerEvents='none';overlay.setAttribute('aria-hidden','true');
  setTimeout(function(){if(state.status==='ready')overlay.hidden=true;},250);
 }};
 retry.onclick=function(){location.reload();};
 copy.onclick=function(){
  var url=document.getElementById('load-address').href;
  function copied(){copy.textContent='地址已复制';}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(copied,function(){copy.textContent='长按地址复制';document.getElementById('load-address').hidden=false;});}
  else {document.getElementById('load-address').hidden=false;copy.textContent='长按地址复制';}
 };
 window.addEventListener('error',function(e){
  if(e.target&&e.target.tagName==='SCRIPT'&&e.target.hasAttribute('data-fm-boot-path')&&window.__FM_STARTUP)return;
  if(e.target&&e.target.tagName==='SCRIPT')fail('游戏程序未载入，请重试',e.target.src);
  else fail('画面启动中断，请重试',e.error||e.message);
 },true);
 window.addEventListener('unhandledrejection',function(e){fail('场景未完整载入，请重试',e.reason);});
 setInterval(function(){
  if(!finished&&state.status!=='failed'&&Date.now()-state.lastChange>20000){
   note.textContent='载入较慢，可继续等待或重试';retry.hidden=false;copy.hidden=false;
  }
 },1000);
 try{
  stage('正在准备画面',.03,'webgl-check');
  if(!window.WebGL2RenderingContext){fail('当前窗口无法启动3D画面，请复制地址到浏览器打开','WebGL2 unavailable');return;}
  var base=entry.src?new URL('.',entry.src):new URL(entry.getAttribute('data-base')||'./sample/',document.baseURI);
  window.__FENGMING_MODULE_URL__=new URL('main.js',base).href;
  stage('正在载入游戏程序',.08,'script');
  var script=document.createElement('script');script.src=new URL(entry.getAttribute('data-game'),base).href;
  state.appSource=script.src;
  script.onerror=function(){fail('游戏程序未载入，请重试',script.src);};
  document.head.appendChild(script);
 }catch(error){fail('当前窗口未能启动画面，请重试',error);}
})();
