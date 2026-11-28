# 凤鸣山门｜项目状态 V1.40

当前独立森林样关（2026-11-28）：用户认可参考视频2方向，授权“画面要精致，先来一版”。新增雾林试炼F.1，入口 https://wanxiang-cloud-tour.pages.dev/forest-sample/?v=f1 ，代码和运行资产在forest-sample/。这是独立可玩2.5D森林幸存者样关，不覆盖凤鸣H36/H31/H29或Cinderwatch中文入口。

原创分层地面/树石、四方向、20张状态角色帧、3类怪物+古木灵鹿首领；触屏走位、自动/主动剑招、范围技能、升级三选一、宝箱、结算重开。素材本次ImageGen生成，不含RO Survivors源码/素材或私人参考录像。按手机画幅直接绘制，DPR最高2；冠干分层与脚点Y排序、树根圆碰撞，剑.22秒判定；模拟固定细分与真实危险圆一致。来源/运行哈希/验证见forest-sample/README.md、runtime-manifest.json、QA.md及evidence/。公开源f8de685已复测：13资源SHA一致；原生触屏走位、自动/主动出剑、范围技能、五次选卡（含宝箱）、51击杀/5阶及首领胜利结算完整通过，另败北分支通过；云Chromium CPU Canvas2D 390×844 DPR1录屏活跃59.822FPS、0错误/0失败。冠层.3601→.99998实际触屏恢复、依赖503后重试均通过。原速22秒与首领16秒片段在evidence/；视频25FPS与实测FPS分开。不是iPhone或微信真机成绩。

以下V1.38及更早记录保留，旧“当前入口”以对应独立分支理解。

# 凤鸣山门｜项目状态 V1.38
中文界面更新（2026-11-28）：独立参考场景已本地化为“守烽堡”，当前中文版入口 https://wanxiang-cloud-tour.pages.dev/cinderwatch-reference/?v=zh1 。含中文字体、波次/指挥/声音/塔楼/属性/升级/出售/首领/结算提示；原作场景、原游戏逻辑和凤鸣运行资产不变。

当前任务调整（2026-11-27）：用户要求暂停继续微调凤鸣画面，单独做与参考视频相同的游戏场景。本轮独立入口为 /cinderwatch-reference/（Cinderwatch参考原作同版R1），不覆盖凤鸣的任何游戏入口、运行脚本或资产。凤鸣最新样关仍保留H36 gate-h36.html，H31 h31-compare.html及H29 index.html保留。

已查明用户所指视频场景为kevintngo的MIT开源Cinderwatch，采用其历史提交8313bb2、seed4、5131帧开场；模型/材质/光照/相机/塔防来自署名原作，新增包装、确定性开场、横屏适配和手机按钮触控修复。不是凤鸣山门原创资产升级，也未将塔防玩法接入凤鸣。来源/26文件SHA/许可/本地同机位及真实触控记录见cinderwatch-reference/{README.md,UPSTREAM.json,THIRD_PARTY_NOTICES.md,QA.md,evidence/}。公开入口：https://wanxiang-cloud-tour.pages.dev/cinderwatch-reference/?v=r1-a11fb9c 。

独立参考R1公网a11fb9c已重开：完整三维首帧、7项SHA、原生触屏售塔重建和实际重试均通过；15.35秒/48帧，云WebKit软件3.165FPS，非iPhone/微信真机，录像未变速。未宣称手机流畅度或凤鸣美术验收通过。

以下V1.37记录保留，代表暂停前凤鸣最新可玩状态。

# 凤鸣山门｜项目状态 V1.37
当前交付试玩：main:fengming-v2-scene-a/gate-h36.html（H.36，真实PBR古松干枝＋新三层冠/实体山门/UV日光烘焙可玩版）。
保留完整正式工程：main:fengming-v2-scene-a/index.html（V2.0 H.29），blob 82e9ce953fc1954c7408ebbc835dbab37098aa64。

H.36（2026-11-27）：用户判H35“基本没有变化”，H35美术不通过。本轮先重制真实源资产、原390×844/FOV39机位评估再接入。同一出生点/相机/比例；H35独立入口gate-h35.html、H31独立h31-compare.html保留；sample-gate同步H36。当前 https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h36.html 。

实际链路：sample/main-h36.js→environment-h36.js→scene-036/runtime/world-h36.glb + pine-036/pine-036-wood-mobile.glb + 自有远山atlas。三冠为新ImageGen alpha世界图层，不是H29树图或失败散针模型截图；真实三维S干/长枝/低根/CC0松树皮实时PBR；新木构门楼/短瓦/厚檐/四字匾/柱脚与实际地面、阶、岩坡使用Cycles UV光照。未覆盖角色/动作/原导航/桥梁/碰撞或扩大地图。日间无火把。失败白色顶点导出、黑斑烘焙与反向岩面均内部退回修正，LOD在UV烘焙之前完成。

最终约14.90秒原速触屏完整穿枝→登阶→回身命中收势，HP3→2/四标记true/错误0/失败0。云Linux WebKit26.5/WPE软件390×844 DPR1，实测18.444FPS，中位50ms/P95 79ms，约65199tri/21draw；**不是iPhone或微信真机**。无FX六帧、实际遮挡/赤凤/重来、6启动恢复场景、4048点真阶均有数据。报告SAMPLE_H36_QA.md、独立SAMPLE_H36_VISUAL_REVIEW.md与evidence/h36/。

本轮正常整屏确有明显主树/门楼变化，通行战斗可读；整体材质/地形融合仍未达到参考完成度，未宣称用户美术全通过。公网source07f2730已重开验收：首次打开3.57秒，13实际关键资源SHA全部一致，触屏完整穿枝/登阶/普通命中/赤凤/重来再通过，0错误/0失败；另15项MP4/新旧图/连续帧公开内容一致。记录evidence/h36/public-smoke.json与public-artifacts.json；仍是云端软件模拟，非iPhone/微信真机。

以下V1.36及旧“当前”为历史，以顶部H36为准。

# 凤鸣山门｜项目状态 V1.36
当前交付试玩：main:fengming-v2-scene-a/gate-h35.html（H.35，白天无火把山门可玩试版）。
保留完整正式工程：main:fengming-v2-scene-a/index.html（V2.0 H.29），blob 82e9ce953fc1954c7408ebbc835dbab37098aa64。

H.35／白天无火把山门试版（2026-11-27）：用户反馈H34视觉变化仍不明显，结合其私有20秒微缩场景视频（不分发）增量制作。当前 https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h35.html ；H34独立保留gate-h34.html，H31独立保留h31-compare.html，sample-gate.html同步H35，H29完整入口不覆盖。

实际资产：150块真实薄倒角石路/10627tri、同批坡岩与贴根影；新厚板门台/台沿/柱石/阶帮和苔岩裙台，18416tri/4draw。原nav/高度/路线/镜头/人物比例保持，路面renderer底床退淡内凹以读厚边。035模型/生成器/独立CPU数据留档。白天主光、两石灯强度0/暖芯隐藏；无火把、无新地图/运镜。林砚复用034网格，新增承重踏步/肩胯与外侧收剑、固定握点及.44命中同步；旧034/033资产逐字节冻结保持对照。

14.60秒原速正常UI完整触控穿枝→登阶→回身命中收势，HP3→2/四标记true/错误0/失败0/cut峰值0.000000；15启动恢复场景通过。云Linux WebKit26.5/WPE软件390×844DPR1实测21.490FPS，中位45ms/p95 60ms，非iPhone/微信真机。报告SAMPLE_H35_QA.md、独立SAMPLE_H35_VISUAL_REVIEW.md和evidence/h35/。作为白天试版，路缘/T形区域融合仍规整，未宣称达到参考完成度或用户美术通过。

公网最终验收（源码3b95207）：冷启动3.83s，19关键资源SHA一致；新石路/门台/动作和灯0读回确认，触控移动/普通出剑/赤凤/重来通过，JS错误0/请求失败0。公开H34/H31对照和MP4/图片内容匹配。记录evidence/h35/public-smoke.json、public-artifacts.json；仍为云软件模拟，非iPhone/微信真机。

以下H34及更早条目为历史记录，旧“当前”以本页顶部H35为准。

H.34／角色网格与门楼可见资产重制（2026-11-27）：当前试玩 https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h34.html ；H31独立对照h31-compare.html；本轮前H33对照gate-h33.html；sample-gate.html同步H34。H29完整入口保留不覆盖。

实际换模：林砚Blender连续衣形+明确CC0脸手局部、22骨/9351tri/2材质/1K atlas，母版Blend+GLB3clip与运行离线网格相对应；真实身体投影H33→H34高差-.17px，未改相机/缩小角色。门楼重制为单门楼/可见南向门匾/干净台体/真逐级阶，17402tri/4draw；原破损lower保留但隐藏，新阶4048点误差<1.55e-7，17227导航样点不变。保留原松分层/位置/.72碰撞，新增路线外两组实体前景岩体，否决不成功侧岩与3D松支架。正常路线屋檐cut峰值0.000000。

14.68秒原速正常UI连续触屏完整穿枝→登阶→回身命中收势，四标记true、HP3→2、错误0/失败请求0。云Linux WebKit26.5/WPE软件390×844DPR1实测24.112FPS、中位40ms/p95 51ms；非iPhone/微信真机。13启动故障/恢复检查与无FX六帧通过。角色网格/构图真实改变，不宣称已获用户或参考美术完成度验收。报告SAMPLE_H34_QA.md、独立SAMPLE_H34_VISUAL_REVIEW.md与evidence/h34/。

公网验收（源代码提交816d05e）：H34入口冷启动3.35s，15项关键资源与冻结构建SHA一致，原生触控走近松树/普通剑收势/赤凤/重来通过，错误0/失败请求0；同为云Linux WebKit，非iPhone/微信真机。公开录像、H31对照与对比图内容一致。证据evidence/h34/public-smoke.json、public-artifacts.json。

GitHub Runway API只读检测已建立并实际运行，四常见Secret映射为空，未发出生成/未收费，待具体Secret名称/位置；不能用聊天插件权限判项目API。资产本轮由上述实际Blender/CC0/自制流程完成。

以下H.33及更早条目为历史记录，旧“当前”描述以本页顶部H.34为准。



H.33／山门一屏可玩美术升级（2026-11-27）：从H.32最新有效启动/输入/地面修复增量制作，保留H.31独立对照与H.29正式完整入口。**当前样关** https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h33.html ；H.31对照 https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h31-compare.html 。sample-gate.html同步H.33，旧?v=h31不是历史快照。

实际升级：林砚新束发/肩袖/离身持剑手/分摆墨靴与实体剑格，1.485高/22骨/16026面；动作改固定手骨socket、本地腕轨道与连续起收，.44真实头肩接触姿态先显示；普通短银米剑轨，敌人.34秒受击/45ms命中顿帧。matte新三层古松与手绘石材，宽面坡光/统一接触影；厚檐与柱脚，真台阶/原导航/碰撞/地图范围保留。正常机位、人物比例不变，身体+实体剑的窄局部屋檐让出保证看清动作；敌血条移到接触点外，画外隐藏。

最终原速正常UI14.68秒完整触控走近→穿枝→登阶→回身命中→收势，HP3→2、四标记true，错误0/失败请求0；云Linux WebKit26.5/WPE软件渲染390×844DPR1，实测18.415FPS，中位54ms/p95 74ms。不是iPhone/微信真机，未声称硬件流畅或参考美术完成度通过。11项启动回归与无FX六帧通过；正常整屏与无血条动作内部可读性三项基本成立，细脸/衣料及窄侧阶仍有差距。证据evidence/h33/，报告project/SAMPLE_H33_QA.md与SAMPLE_H33_VISUAL_REVIEW.md，OpenGame方法/许可记录SAMPLE_H33_SOURCES.md。


H.32／载入与走位修复（2026-11-27）：用户反馈H.31视觉粗糙、动作卡顿，iPhone其他浏览器或ChatGPT内打开时一直停在“正入山境”；**H.31未获美术通过**。本轮在同一工程修订可玩样关，正式完整H.29 index.html原文件仍保留。当前样关使用全新文件名以避开旧预览缓存：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h32.html 。sample-gate.html同步为H.32；H.31源与旧载入链路独立保留在h31-compare.html、sample-h31/；H.29对照h29-compare.html继续可用。

实际修复：启动从importmap/runtime ES modules改为本地Three单一classic bundle；内联启动器与同源外部fallback、分阶段进度、20秒协助、错误/资源失败/图形上下文丢失恢复界面，载入结束立即释放触控。人物几何离线预生成，保留原网格/骨骼/动作；去掉运行时造型计算。屋檐遮挡查询改等价BVH，视觉更新每渲染帧仅一次，地图/松冠纹理无损WebP；点击寻路和不可通行反馈。实际地形细高度替代粗网格取整造成的假顿跳，原合法通行掩码、松旁细补丁/真石阶不变。新制连续瓦面、压檐与木构，保留21403个真实低层三角；重PBR候选因云端掉帧退回，默认轻量受光版。原XZ出生位/朝向、FOV39、跟随偏移(6,27,15)、人物1.485比例保持，出生Y因贴地修正低0.01272；未放大角色或拉近镜头。

最终11.80秒原速连续触屏录像已完整走近古松→穿枝→登真实侧阶→回身普通挥剑命中→收势；四项标记true，敌生命3→2、最终脚高.706984，JS错误0/失败请求0。录制环境是**云Linux WebKit26.5/WPE、390×844 DPR1、强制软件渲染**，实测18.5169FPS、帧间隔中位53ms/p95 73ms；视频编码25FPS，不当作游戏FPS。WPE兼容字符串会报告Mac Safari/Apple GPU，并非物理Apple设备。另测Chromium156/SwiftShader启动、移动、普通攻击通过。11种兼容/故障注入通过，包括无importmap旧版故障复现、下载失败重试、无JS提示、外部/内联启动分别受阻、上下文丢失等；**受控复现不是已证实用户手机的唯一根因**。未实测iPhone/ChatGPT原生窗口/微信真机，不能宣称手机流畅或Frog Ferry／Slackwater美术完成度通过。完整证据evidence/h32/，报告project/SAMPLE_H32_QA.md。

H.31／美术方向重修（2026-11-27）：用户明确 H.30 “画面太粗糙”，主要对照为 Frog Ferry／Slackwater，**H.30美术不通过**，技术走通不等于完成度达标。本轮实际查看官方普通手机实机与Slackwater原30秒演示，再重修同一可玩样关。当前样版：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/sample-gate.html?v=h31 。H.30独立留档试玩：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h30-compare.html?v=h30 。H.29完整正式index.html原文件与h29-compare.html均保留。

H.31改动：原真实地形重贴自制手绘石板与三向坡岩，入口石带/门前石坪/松旁/右阶有疏密，两侧墨绿苔岩和接地植物收边；两层自制手绘远山替换三角山，近建筑不吃远雾，屋檐保留82%原UV明暗与深檐体积。男主连肩袖、手靴、厚褶袍、束发/交领及实体剑形重塑，保持1.485全高与22骨/动作API；不导入外部模型。原灯位换八角石灯，树根影按地形贴合加宽。古松位置/分层冠形、原导航缓存、.72根碰撞、真台阶、玩法范围/攻击逻辑不变；相机FOV39、偏移(6,27,15)、出生位和朝向不变。H.30源原样留在sample-h30/。

实走：最终资源原速连续14.80秒，完整走近→穿枝→登阶→回身挥剑命中→收势，敌生命3→2，最终脚高0.714651，四项路线标记true、JS错误0/失败请求0。云端Chromium156/SwiftShader、390×844触屏模拟平均7.870FPS（非iPhone或微信真机）；同出生位/机位差0。无FX新衣型攻击及正常同位图、连续录屏见evidence/h31/，严格问题对照见project/SAMPLE_H31_ART_REVIEW.md。第一轮重复石板/屋檐压平已内部退回并修订。**H.31是供用户复核的美术修订，不宣称已经达到参考演示完成度或用户验收通过。**

H.30／山门一屏 2.5D 可玩样关（2026-11-27）：按用户最新任务在同一工程增加独立 `sample-gate.html`，保留上列 H.29 正式完整入口原文件。样关地址：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/sample-gate.html?v=h30 。H.29 同出生站位对照：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h29-compare.html?v=h29 。两者 FOV39、追随偏移(6,27,15)、390×844正常画幅，不拉近；新林砚高1.485，原占位约1.47。

本轮样版替换占位角色为自制持剑男性骨骼角色，保留实时转身/待机/步行及完整右蓄势→斩击→左随势→收剑。新制分层迎客松，按已批准 pine-002/reference.png 制后冠/干根/前枝，原(-7,-7)根位及.72碰撞不变；实际局部遮挡人物10.90%，走出恢复。沿用3D地形与屋檐、真实四级侧阶，压低白砖对比并加方向脚影/远山薄雾；普通剑光沿实体剑段，.44动作进度同步伤害与影煞受击，觉醒保留更大更亮表现。复用原触控、相机、地形/碰撞/桥梁逻辑；细采样修正树旁粗网格假孔，侧阶采样来自原gate真实低面。原图与完整地图不覆盖。

样版来源/实现/验证：project/SAMPLE_H30_QA.md、project/SAMPLE_H30_SOURCES.md、evidence/h30/。云端Linux Chromium156/SwiftShader软件渲染、手机尺寸触屏模拟；非iPhone/微信真机。已完整连续触屏走完路线并普通击中，最终高度.715349、敌生命3→2、运行错误0/失败请求0；原速录像14.76秒，实测10.435FPS，完整数据见 evidence/h30/sample-playtest.json 与 sample-video.json；不以视频编码25FPS冒充游戏FPS。仓库仍是Three.js浏览器工程，未新增微信原生小游戏适配或宣称真机通过。本轮交付可玩样版供用户在iPhone复核美术方向，尚不等于用户验收通过。

以下 H.29 与更早记录保留，用于追溯正式完整工程和用户反馈。

H.29／同一山门迎客松美术修订（2026-11-27）：H.28用户美术验收未通过，本轮以用户指定的touch-walk-12s.mp4第6.000秒为基准，恢复原390×844画幅、FOV39、相机与人物站位；707个静态匹配点的重投影中位误差0.194px，未拉近相机。只修同一(-7,-7)树实例：rotationY=.1，实际抬高/回弯/缩短主枝；主冠横向聚实并留深缺口，较小顶冠/后冠错开，粗根沿岩石压低渐入地面；树脚点光单独降至6±.6、发光球.65、光晕.28，收弱橙亮斑。正常游戏入口默认隐藏左上诊断面板，保留凤火/脱困/小地图/生命UI；?debug=1可看诊断。地图、角色、战斗、原通行路径及其他七株松未改。

当前实际加载与整树母版：assets/pine-006/h29-gate-pine.glb、h29-gate-pine.blend；生成脚本.github/scripts/pine006_h29_game.py。GLB2,364,996字节、54,580三角、3网格/3材质；SHA256 2cb7a1f3e14c5d20c7c22c30b89ae34fdea5edc9b6ff25473f5c3fb5fc4f73c6。H.28整树源与录像原样保留。未新增付费API费用。

正式试玩：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/?v=h29

同机位数据：旧上部枝冠与山门投影重叠2854px，H.29为0px，最近间距20.59px。证据evidence/h29/，完整报告project/PINE006_H29_GAME_QA.md，包含指定6秒原帧、相机/人物参数、静态匹配数据、正常UI走位录像和实际渲染帧率。录像设备为云端Linux Chromium156/SwiftShader、390×844触屏模拟；不冒充手机/微信真机测得帧率。状态：已修订并接入，6段真实触屏路径均通过、运行错误0；录像片段实测平均1.47FPS（完整走位1.35FPS），软件渲染，非手机硬件。浏览器实测记录随报告保存，待用户按本轮三项复核美术。

以下H.28及更早为历史记录，其中旧“当前母版”“技术/视觉通过”描述不代表本轮状态；H.28美术不通过的用户结论以上文为准。


H.28／山门主景古松整树集成（2026-11-27）：按本轮用户明确授权，结束“仅独立裸树样件、正式游戏仍冻结H.17.2”的历史交付方式。本轮以 main 当前游戏为起点，只替换真实山门 GLB 左侧的旧松实例：世界坐标(-7, terrainHeight(-7,-7), -7)，而非没有山门模型的地图命名区 id7。原入口 -> index.html -> placePines -> pine-001+20椭球的旧链路已核对。H.23/H.27不是旧游戏实际显示的资源，H.27缺冠，不能仅改引用；本轮复用H.27连续木质雕刻并新增完整针叶冠，独立保存PINE-006/H28整树资产。

当前游戏实际加载：assets/pine-006/h28-gate-pine.glb（2,524,936 bytes，3网格/3材质，55,375三角；标准glTF顶点色，无额外解码器）。可编辑整树母版：assets/pine-006/h28-gate-pine.blend；生成脚本.github/scripts/pine006_h28_game.py。主干倾斜转折、道路侧长横枝/另一侧较短平衡枝、13个错落针簇岛；没有椭球冠。根领按真实地面高度放置，沿用原场景光照，材质经过现场调暗；针叶实际挡到人物头部时短暂淡化。树干只有0.72单位半径阻挡，未改地图、桥、角色、战斗和原道路。其他7株旧松不替换；新模型失败保留旧松。

正式试玩入口（沿用原Cloudflare）：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/?v=h28

验收范围与限制：本轮在390×844 Chromium触屏模拟、原FOV39/原追随偏移(6,27,15)下保存同站位同朝向前后整幅截图，并通过真实pointer触屏输入操纵角色从出生点走近、经过树旁、离开；实际结果见project/PINE006_H28_GAME_QA.md及evidence/h28/。云端使用SwiftShader软件渲染，旧版与新版均低帧率，不能据此宣称手机硬件流畅度通过。仓库当前工程是Three.js浏览器版，未发现微信小游戏game.js/game.json/project.config.json或适配层；微信开发者工具预览与微信真机测试均未执行。未新增付费API费用。

以下H.17–H.27为历史记录；其中“正式游戏冻结”“不得加入游戏”的旧阶段约束已被本轮明确整树集成授权取代，不再代表当前正式游戏状态。历史资产与报告保留用于追溯。

H.27／PINE-005（2026-11-26）纠偏交付：此前误用静态二维画图工具输出古松概念图，**该图片不是3D、不是本轮游戏资产，亦未提交项目作为实际建模产物**。现已从既有H.26可编辑真实源工程assets/pine-005/h26/pine005-h26-hero.blend增量修改实际网格，生成独立H.27 Blender文件assets/pine-005/h27/pine005-h27-refined.blend（3,970,987字节）、真正GLB模型pine005-h27-refined.glb（1,197,216字节、16 glTF网格）。操作：实体树皮裂片306组减至172组并降低高度，主结构19,781顶点实际低幅塑形，保留4块岩石，2,060次枝顶点微弯；主体27,488面、零非流形边和近零面积面。GitHub Actions建模和实际Blender渲染run 45850480672最终success，原图/H.26旧版/H.27新模型并排截图h27-contact-sheet.jpg留证。iPhone尺寸模拟浏览器真GLB加载、旋转/白模/剪影/视角及参考图控件通过run 45850885484（17 Three.js可见mesh，零浏览器错误），Cloudflare网页和GLB均实测HTTP200，3D入口https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine005-h27-real3d-preview.html。**技术交付通过、G1-A写实美术仍不通过**：裂片尖角降低但树干变得过光滑，与批准写实古松参考差距仍较大；没有松针冠、没有真实PBR或iPhone多株性能。不要把网格导出成功当作最终质量通过。报告project/PINE005_H27_REAL3D_QA_V1.md；新增Tripo credits 0。H.27仅为独立实验候选，当前正式资产母版仍H.23（未升级），正式游戏H.17.2亦未修改。
H.26／PINE-005（2026-11-26）：为解决H.22–H.25外观几乎不变、塑料管树干/爪状根的失效路线，基于批准高清古松参考图创建独立NEW Hero几何样件，而非继续旧管状网格微调。源码.github/scripts/pine005_h26_hero.py；独立可编辑Blender产物assets/pine-005/h26/pine005-h26-hero.blend（2,866,849字节），真实GLB assets/pine-005/h26/pine005-h26-hero.glb（1,297,288字节、18 glTF网格）；主干基部半径1.42相对旧0.85显著加厚，S形回旋更有体量，6组不对称抓岩宽扁根、6组主要分枝+10细枝、6块岩石，2,448个真实不规则树皮裂片面，核心融合27,488面、0非流形边和0零面积面。完整生成run 45844535424 success（旧异常慢作业已停止，优化脚本空间索引和合理网格密度后生成）；原参考／H.25旧样／H.26新样真实多角度h26-contact-sheet.jpg可直接对照。桌面及手机尺寸模拟真实3D加载与旋转/白模/剪影/参考图通过run 45845003790，Cloudflare网页与GLB均HTTP200，入口https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine005-h26-hero-preview.html。**明确结论：相对H.25，外观已经肉眼明显不同，主干厚重、根石与实体裂片均实质改善；但树皮裂片偏块状且无松针树冠或照片级PBR材质，G1-A仍待用户实机美术确认，不等于整棵树已完成。** 本轮新增Tripo credits 0，项目累计仍240 credits约¥16.80；正式游戏H.17.2母版不变。H.26为独立Hero候选并未自动晋升为正式资产工作母版，当前唯一正式资产母版仍为assets/pine-005/h23/pine005-h23-refined.blend。报告project/PINE005_H26_HERO_QA_V1.md。
H.25／PINE-005（2026-11-26）执行了仅根基局部重建：输入始终为当前H.23正式Blender资产，切除z<1.03旧尖刺根、制作五组较宽扁不对称贴地盘根，并以H.23切口161轮廓点再做一次对接修正；上下树干/主要枝条未整体重建。独立实验输出assets/pine-005/h25/pine005-h25-roots.blend与pine005-h25-roots.glb（1,476,780字节、14网格）、八视角加根部近景及原图对照h25-contact-sheet.jpg。GitHub Actions执行run 45840174797及修正run 45840589199均success，主结构38,862面，0非流形边、0零面积面；手机模拟浏览器及Cloudflare预览run 45840902437成功（非真实iPhone），在线https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine-005-h25-preview.html。**G1-A写实美术依然FAIL**：主干与新根基仍有明显套筒接缝，盘根仍像圆管，未达到批准古松参考图；不自动进入树冠/贴图/游戏集成。本轮新增Tripo credits 0，历史累计仍240 credits（约¥16.80）。本轮连续两次局部自动重建仍未解决同类根部视觉质量，已依效率止损机制暂停这种算法的进一步循环。**唯一正式资产工作母版仍为H.23** assets/pine-005/h23/pine005-h23-refined.blend（Git blob 271d4c7e9106134f6294ae4ace642eeaa4b292a6）；H.24/H.25都属于隔离实验。验收project/PINE005_H25_ROOT_QA_V1.md。正式游戏index.html母版冻结V2.0 H.17.2。
H.24／PINE-005（2026-11-26）已执行现有H.23 Blender母版的受控局部形体变形：减轻等距纵槽（15,530顶点）、缩短/下压根部（6,946顶点）、对几条长横枝做小幅错落（7,453顶点）。新实验样件在assets/pine-005/h24/独立保存 Blender源文件pine005-h24-refined.blend（2,932,772字节）和GLB pine005-h24-refined.glb（1,217,384字节、14网格），并提交九视角含根基、分叉特写与H.23旧版对照图h24-contact-sheet.jpg。Blender任务 run 45838592515 success、独立GLB校验PASS；浏览器/手机尺寸模拟加载及四角视图检查通过run 45838976275，无控制台错误；Cloudflare单独页面与GLB均实测HTTP200：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine-005-h24-preview.html。**G1-A写实美术仍不通过**：虽稍减塑料槽线与笔直枝干感，但根系仍呈爪刺，根部特写存在疑似三角形面片/着色异常（成因未确认），不适合升级资产母版。根据最小必要修改与止损规则，唯一正式资产工作母版继续冻结在H.23源工程 assets/pine-005/h23/pine005-h23-refined.blend（blob 271d4c7e9106134f6294ae4ace642eeaa4b292a6）；H.24仅做隔离实验候选并保留证据。无树冠、无贴图、无游戏修改、本轮新Tripo费用0 credits，项目累计仍240 credits（估算约¥16.80）。详细验收project/PINE005_H24_VISUAL_QA_V1.md，紧急缺口已记入project/BACKLOG.md。
H.23／PINE-005（2026-11-26）本轮完成旧H.22 Blender工程上定点融合/树干浅雕刻，制作了独立的H.23最新可编辑工作母版 assets/pine-005/h23/pine005-h23-refined.blend（1,727,484字节）与GLB（1,217,316字节，14网格）。保留原27个可编辑网格在新工程内冻结，只将主干+7主要枝+6根融合为1个表面，13次级枝仍可独立编辑；主干16,098顶点进行低幅雕刻，分叉附近修平表面。Blender源生成run 45836394728 success；原图、H.22旧版及H.23正/侧/背/俯/剪影/特写八图证据 assets/pine-005/h23/h23-contact-sheet.jpg。iPhone尺寸模拟浏览器3D加载/旋转/参考图通过 run 45836828126（零浏览器错误），Cloudflare新版预览及GLB均经GET HTTP200：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine-005-h23-preview.html 。**G1-A美术仍不通过**：主干比旧版连续、分叉已经融合，但纵向沟纹等距、根系放射尖刺感、天然老松不规则结构不足；真实PBR贴图/针叶冠未做，不进入G1-B/G2/正式游戏。H.23本轮Tripo额外0 credits，累计仍240 credits约¥16.80，正式游戏母版继续H.17.2不变。验收详见project/PINE005_H23_VISUAL_QA_V1.md。本资产H.23为下一轮唯一当前工作母版，H.22旧版归档不再作为修改起点。
H.22／PINE-005（2026-11-26）已形成自有可编辑树干/主枝/根系正式阶段证据：基于批准参考图SHA 9e204263823ca9f40d46737dca5c1ee0a28a73a8，用Blender 4.0.2 生成单条连续渐缩S形主干（197截面×32环点）、7主要枝、13次级枝、6条独立可编辑根系；源工程assets/pine-005/pine005-trunk.blend（546,754字节）、GLB assets/pine-005/pine005-trunk.glb（647,768字节）、五视角trunk-contact-sheet.jpg。已做一次局部增厚和根部扁平化修订；GitHub Actions run 45832599279 完整生成与独立结构校验PASS；浏览器/手机尺寸模拟3D加载、视角按钮和参考图显示通过run 45832937184，零控制台错误，Cloudflare独立预览页面与GLB均实测HTTP200。在线：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine-005-trunk-preview.html 。**G1-A美术仍未通过**：主干连续性和不团块较旧版明显改善，但枝条接合仍有管状感、根系扁管/蛇足、老松木质形体和天然不规则感不足；绝不将其描述成高保真古松完成。未制作树冠、未启动贴图/付费Tripo/游戏集成，新增费用0 credits。详细报告project/PINE005_G1A_VISUAL_QA_V1.md；原游戏母版仍为H.17.2。
H.21 Blender自动化环境验证完成：2026-11-26，GitHub Actions run 45831024638最终success。最小修复步骤为EGL共享库libegl1和Blender Python NumPy（python3-numpy），此前失败仅系运行时依赖缺失。GitHub主分支已保存diagnostics/blender-smoke/toolchain-qa.json（PASS）、可编辑blend（88,307字节）、有效GLB（8,252字节、2网格）及正/右/背/俯420×420 PNG四视角；独立Python检查通过，Geometry Nodes API可用，Blender 4.0.2后台运行有效。此系测试S形树干及一段分枝的技术冒烟样件，不是PINE-005正式写实美术，不表示已达到树干不团块/树冠不大团的质量指标；新增Tripo消耗0 credits，未改游戏母版。日志与结果：https://github.com/d7gkdrs4pk-gif/wanxiang-cloud-tour/actions/runs/45831024638。
PINE-004／H.20 G1（2026-11-26）：复用G0四视图，Tripo H3.1无贴图标准几何单次生成成功（task aafb7992-63e1-4441-a6bb-91ed46264b9d；GLB 1,656,304字节、48,737三角面、0贴图；实际20 credits约¥1.40）。GitHub Actions已完成桌面及模拟手机加载和正面、右面、背面、俯视及黑色剪影截图（run 45784817364，0浏览器错误）。**G1视觉失败：主干缠绳状团块、根石粘连、树冠块状合并；用户两条硬性条件不达标。** 立即停止付费贴图/重复生成/游戏集成，保存G1模型与图证。专项报告project/PINE004_G1_GEOMETRY_QA_V1.md，五视角图assets/pine-004/pine-004-g1-contact-sheet.jpg；累计240 credits（约¥16.80），历史100元估算剩余¥83.20（非实时）。正式游戏母版不变。
PINE-004／H.20（2026-11-26）：Tripo中国API image_to_multiview已对批准参考图生成front/left/back/right四张1024×1024图；唯一任务64578e00-ce8f-475b-ab01-d899a3b82dad，成功消耗10 credits（¥0.70），GitHub run 45782981013；G0审查：正面S形主干、松针云片与根系保留明显优于PINE-002；侧/背风格初步一致，但AI推断的三维分枝拓扑真实性无法确认，判定“可用于下一轮受控几何试验”，非3D美术通过。此轮没有生成新GLB、没有改游戏、未增加服务器。对照图assets/pine-004/comparison.jpg；iPhone对照页：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine-004-multiview.html（Cloudflare HTML及5张PNG均HTTP 200、内容验证通过，凭证project/PINE004_PREVIEW_DEPLOY.json）；报告project/PINE004_MULTIVIEW_QA_V1.md；项目累计220 credits（¥15.40），历史100元预算口径剩余约¥84.60，非实时。
历史H.17.2试玩地址（该URL现在仍指向最新入口，不是不可变快照）：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/?v=h172
状态：PINE-002已生成并保存GLB（15,274,144字节，48,711三角面，60 credits约4.20元；task 246b5d7a-feda-43ab-90f1-463b203932c9）。H.18新增独立预览pine-002-preview.html，桌面四视角及移动视口Chromium加载通过、0控制台错误，批准参考图与GLB视觉对比不通过：主干偏直立、树冠稀疏且叶团有空心环，松针色偏黄绿，禁止集成。无新建模扣费，正式游戏母版仍为H.17.2；原始私人Drive文件未公开。
下一任务：只处理H.27真3D美术硬缺口（真实裂皮细节、盘根抓岩与枝条自然生长），不得再生成二维图片冒充资产；如要达到批准参考图的写真品质，应优先明确可取得的专业有机雕刻/PBR制作能力及可用成本，避免继续同类噪声微调。需保持真正可编辑Blender、GLB及手机WebGL预览三项交付。G1-A未通过前不得把H.27加入游戏或宣称整棵古松完成；树冠G1-B须另行接受非大团层次和真实松针验收。
H.19.1成果及问题：PINE-003独立程序化原型已完成（pine-003-geometry.js，pine-003-preview.html），v0.2使用13,110针束实例、19冠片和8组主枝；Cloudflare在线页面/脚本HTTP200，桌面四视角及手机模拟视口技术测试通过（run 45781099300，零控制台错误）。与批准原图对比：G1剪影不通过，G2写实美术不通过；根因是枝冠排布过于规则、树皮/根/松针细节不足，禁止集成。详见project/PINE-003_VISUAL_QA.md，assets/pine-003/qa.json与pine-003-compare-v01.jpg。无新Tripo费用，预算估算剩余85.30元，非实时余额；正式游戏母版SHA冻结不变。
本轮正式方案：main:fengming-v2-scene-a/project/PINE-003_REPAIR_PLAN.md（V1.0，H.19）。结论：PINE-002属几何/剪影失真，非简单光照问题；单图Tripo image-to-model文档没有可直接用于限制造型的prompt/negative_prompt字段；PINE-003优先独立程序化骨架和针叶云片，额外credits为0，尚未生成PINE-003模型；正式游戏不变。
预览源文件：main:fengming-v2-scene-a/pine-002-preview.html；独立浏览器验收记录：assets/pine-002/preview-smoke.json（run 45778232122）。手机视口软件渲染帧率3 FPS不代表真实iPhone；Cloudflare线上预览页与GLB已通过GET HTTP 200和glTF文件头核验（2026-11-26，北京时间）；真实iPhone操作与帧率仍待用户实机验收。
120×120、九区域为设计目标；桥梁专项通行通过；其他边界、地图交互及怪物寻路仍需独立验收。当前角色和敌人仍是占位几何体。
授权边界：本次Tripo直接读取GitHub仓库中的现有参考图，不需要再次访问Google Drive；GitHub Actions仅已验证Tripo密钥可用，GitHub中是否另存Google Drive授权凭据尚未核验，后续新的云盘素材不得仅凭文件ID读取。
正式母版唯一；旧版本仅归档。每轮增量修改，状态变化后更新本文件。
