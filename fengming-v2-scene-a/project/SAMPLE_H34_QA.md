# H.34 山门与林砚可玩交付记录

新版：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h34.html

H.31留档：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h31-compare.html

本轮前H.33：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h33.html

[正常UI原速录像](../evidence/h34/sample-walk-sword.mp4) · [H33整屏对比](../evidence/h34/comparison-h33/normal-h33-h34-contact.png) · [H31整屏对比](../evidence/h34/comparison/normal-h31-h34-contact.png) · [无FX连续帧](../evidence/h34/no-fx/no-fx-actual-frames.png)

## 完成的实际资产与源码

林砚更换为Blender制作的连续肩袖/分摆汉服网格，头、耳与双手取自官方明确CC0的VRoid HairSample_Male局部并重塑/重绘；现代衣发未导入。新束发、裤靴、交领、独立长剑及小凤铃自制。约40px量级判定以原镜头为准，近距图仅用于查UV/AO和透明眼线卡片缺陷，发现后已修掉。最终9351三角/22骨/2材质、1张1K图集；真实同位身体投影高39.7242→39.5531px，仅-.1711px，宽28.6171→27.9993px，未通过缩小人物制造差异。实际蒙皮世界高度1.466622→1.466732；1.485是沿用骨架参考高度。

可编辑母版assets/hero-034/linyan-h34.blend与GLB含同骨架Idle/Walk/Slash。运行时沿用本工程离线网格烘焙流程，把母版相同位置/UV/法线/权重/绑定矩阵放入实际SkinnedMesh，动态骨动画和独立手骨剑保持；没有用人物图片替代。运行atlas104184字节WebP为quality94有损RGB、alpha无损；GLB/PNG解码精确相同，运行WebP的RGB误差已量化在texture-codec.json，不冒称全部RGBA相等。17项独立检查覆盖真实网格、22骨、165姿势/150连续走转骨剑矩阵、固定握点及实际.44接触，原动作/伤害接口保留。

门楼由三座压住交战区的巨檐重制为后置单门楼，加入南向可见厚门楣/凤鸣匾、柱脚、干净石台和真实踏面/立面。可编辑GLB/Blend见assets/gate-034/source/；游戏实际使用同源几何/图集/step数据。17402面/4draw，原破损lower保留源数据供restore但不渲染。原gateGLB、导航代码与cache未改；新可见阶面4048点高度误差<1.55e-7m，17227点合法性/高度完全一致。2020条身体/剑/敌射线0挡；正常实玩0.000000最大roofCut，人物与剑的可见性来自新构图。松枝和西檐留出背景间隔，未动松根位置/.72碰撞或正常相机。

环境补两组路线外真实厚度近景岩体，未增加地图或通行范围，岩材/GPU纹理与地面共享。试做的第三组侧岩像石台，已删除；试做3D松支架因箭杆/干冠失配否决，实验留QA，不进入runtime。现有分层迎客松继续按前后真实深度挡肩/露身；没有把整座背景压成图。两座原位石灯重做为石座、开口暖窗与薄石顶，每座196三角/2draw，收弱地面橙斑。草丛14→11组、3528→1800三角，去掉过大的三角叶片。沿原禁入区域内侧增加低石边，显示原碰撞边界；右阶原通行口保留，不改导航或玩法。高地北段候选栏因短暂挡收势剑尖已删除，保留原岩坡作提示，最终2020射线全部无遮挡。

## 原镜头与实际操作

390×844、DPR1、FOV39、follow(6,27,15)、原出生XZ(-3.2,-4.2)/朝向-.6及人物比例均保留。H33/H34出生位置与相机逐轴0差；H31相对当前高度提供器Y差-.01272已在comparison数据说明，没有伪称矩阵完全相同。

浏览器原生触屏输入连续走近古松→穿前枝→离开→走门前石坪→登真阶→回身普通挥剑命中→收势，14.68秒原速、未插帧/加速，保留正常操作UI且debug隐藏。四标记true、敌HP3→2、最终脚高0.710542，运行错误0/失败请求0。逐帧时间/位置/剑段/镜头/cut与事件保存sample-playtest.json；完整含启动的源录像sample-full.webm也保留。

实际录制环境：云Linux x86_64、Playwright WebKit26.5/WPE、强制软件渲染，390×844DPR1，344帧/14.225s，**24.112FPS**；帧间隔中位40ms、p95 51ms。MP4编码25FPS与游戏FPS分开。WPE的Mac Safari/Apple GPU字符串不是物理Apple硬件；本轮**没有iPhone/ChatGPT客户端/微信真机或原生微信开发者工具实测**，不能据此宣称真机流畅通过。

无FX图通过实际touch走到石阶后一次按剑，在rAF读取真实渲染canvas，剥DOM血条用于动作判断，未传送/冻结/摆姿势。实际阶段：[{'label': 'windup', 'progress': 0.20384615384615384}, {'label': 'sweep', 'progress': 0.4256410256410256}, {'label': 'contact', 'progress': 0.44}, {'label': 'follow', 'progress': 0.6015384615384615}, {'label': 'recover', 'progress': 0.8041025641025639}, {'label': 'rest', 'progress': None}]。采样读回有开销，不作为性能样本。普通伤害仍2.6范围/单次1HP/.44同步，45ms命中顿帧保留。赤凤与重来在最终公网另测。

13项启动回归通过，包括旧importmap失效复现、当前classic冷启动/触控/单次click回退、真实context loss、bundle失败后原生重试、WebGL构造失败、松图失败、禁JS静态提示、20s慢载入、外部启动器受阻、CSP禁内联、地面缓存失败，以及新角色图集/新门匾图集失败。新资源不到齐不标记可玩；启动链保持本地Three单包，不依赖运行时importmap。

## 美术判断与边界

独立审查见[SAMPLE_H34_VISUAL_REVIEW.md](SAMPLE_H34_VISUAL_REVIEW.md)。明确可见变化是新连续人物、完整可见门台与敞开的阶上交战窗口；无FX可读起手/下切接触/退让/随势/收回。细小人物面部/衣料和宽坡远景的细腻度仍有限，不以骨数、面数或走通冒充Frog Ferry／Slackwater整体完成度背书。后续验收继续用整屏与原速可玩入口。

## GitHub Runway API事实与来源

已在本项目提交并实际运行只读workflow runway-api-check.yml（run45984088983）。该job四个映射名均未注入值，status=no_mapped_secret_available，attempts=[]，没有向Runway发出生成请求、没有生成费用。这不是‘Runway不支持3D’或‘用户未配置任何Secret’的证明；Secret可能使用其他名称/位置，已向用户请求仅名称与位置，未索要密钥。API官方模型/价格页现有mesh接口，OpenAPI当次未同步。聊天插件的免费工作区限制没有用于判断项目API。脱敏结果见evidence/h34/runway-api-check.json。本版核心资产由上述Blender/CC0/自制流程完成，不谎称Runway生成。

许可及来源：hero-034/provenance.json、CC0官方FAQ记录；gate-034/font-source.json与OFL-Noto-CJK.txt；environment-034/provenance.json。继承Three.js MIT，原参考游戏图/模型/代码未作为素材导入。源工具均在.github/scripts/与tools/，真实editable母版在对应source或资产目录。

本轮执行构建：npm run build（依赖由package-lock.json锁定），Three r170 classic IIFE，1,434,600字节，SHA256 56c33711dd11070fa9f384bb71b3153cf35f903cb0b15c066765a19f724730c4。源/运行资源hash见evidence/h34/build-manifest.json。H29 index blob82e9ce953fc1954c7408ebbc835dbab37098aa64保持；H31源与c0fdc9a逐字节一致。最终公网核验结果另保留qa-h34/public-smoke.json。
