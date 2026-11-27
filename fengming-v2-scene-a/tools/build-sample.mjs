import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(resolve(root,'sample/dist'),{recursive:true});
execFileSync('python3',[resolve(root,'tools/pack-runtime-assets.py')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'tools/build-environment-033-normals.mjs')],{stdio:'inherit'});
const result=await build({
 entryPoints:[resolve(root,'sample/main.js')],bundle:true,write:false,
 format:'iife',platform:'browser',target:['safari15'],minify:true,
 legalComments:'eof',define:{'import.meta.url':'window.__FENGMING_MODULE_URL__'},
 plugins:[{name:'local-three-r170',setup(b){
  b.onResolve({filter:/^three$/},()=>({path:resolve(root,'vendor/three/three.module.js')}));
  b.onResolve({filter:/^three\/addons\//},a=>({path:resolve(root,'vendor/three/addons',a.path.slice(13))}));
 }}]
});
const source=result.outputFiles[0].text;
const sha=createHash('sha256').update(source).digest('hex');
await writeFile(resolve(root,'sample/dist/game-h33.js'),source);
const htmlPath=resolve(root,'sample-gate.html');
let html=await readFile(htmlPath,'utf8');
html=html.replace(/data-game="[^"]*"/g,`data-game="dist/game-h33.js?v=${sha.slice(0,12)}"`);
html=html.replace(/<script id="fm-inline-launch"[\s\S]*?<\/script>/g,'');
const launch=(await readFile(resolve(root,'sample/launch.js'),'utf8')).replace(/<\/script/gi,'<\\/script');
html=html.replace(/(<script defer data-fm-bootstrap[^>]*>[\s\S]*?<\/script>)/,`<script id="fm-inline-launch" data-fm-boot-path data-base="./sample/" data-game="dist/game-h33.js?v=${sha.slice(0,12)}">${launch}</script>\n$1`);
await writeFile(htmlPath,html);
await writeFile(resolve(root,'gate-h33.html'),html);
await writeFile(resolve(root,'sample/dist/build.json'),JSON.stringify({version:'H.33',sha256:sha,bytes:Buffer.byteLength(source),format:'classic IIFE',target:'Safari 15+',three:'0.170.0',runtimeImports:0},null,2)+'\n');
console.log(`H33 single classic script: ${Buffer.byteLength(source)} bytes, SHA256 ${sha}`);
