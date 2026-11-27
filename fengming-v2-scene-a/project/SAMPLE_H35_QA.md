# H.35 白天山门可玩试版

新版：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h35.html

H.34：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h34.html

H.31：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h31-compare.html

[原速正常UI实玩](../evidence/h35/sample-walk-sword.mp4) · [H34/H35同机位](../evidence/h35/comparison-h34/normal-h34-h35-contact.png) · [H31/H35同机位](../evidence/h35/comparison/normal-h31-h35-contact.png) · [关闭剑光连续帧](../evidence/h35/no-fx/no-fx-actual-frames.png)

## 本轮实际修改

用户反馈H34视觉变化仍不明显，随后提供私有《游戏参考视频》（约20秒横屏微缩塔防场景），并明确白天、无火把。本轮借鉴其体量、材质尺度、接触关系和微缩场景完整性；保留国风山门、古松、林砚及固定斜俯视。私有视频和抽帧只用于本地分析，未复制到公共仓库，未用原游戏的模型/纹理素材。

道路由绘画巨板改为150块实际3D薄倒角石，10627三角，和既有坡岩合批；砖缝/倒角、贴合地形的顶面和侧面由离线生成器导出，运行时只读取静态buffer。正文/GLB见assets/environment-035/。标准GLB的位置/法线/UV/颜色/有序索引与runtime typed arrays逐字节匹配；GLB保留原贴图，游戏对比度混合是自定义shader，通用查看器调色不作为实机验收。局部底床仅在GPU中下沉并向外缘退淡，原nav/高度缓存/路线不改。独立读取导出buffer对原nav.groundAt检验见environment-height-validation.json；可走顶面中位抬升1cm，最高约2.20cm、最低约-0.45cm（8点略超2cm），明确保留误差；非通行前景按原渲染坡连续高度单列。树根新影以raw高度兜底贴坡并合批，旧contact隐藏，避免叠影。

门台重做22块厚板、24段倒角台沿、4个柱石和8块阶侧厚石帮，补78三角连续苔岩裙台收接坡地；18,416三角/4draw，屋檐、柱位、原侧阶与构图不移动。同源GLB/Blend与几何/高度/可见性记录见assets/gate-035/。17227个原合法XY/高度样本不变，4048阶面点误差约1.55e-7m；实际新角色全动作视线结果另见visibility-cpu.json，不能沿用H34结论。

林砚复用H34真实网格/1K atlas/22骨/固定手骨握点和独立剑，新增后脚承重、前脚落稳、肩胯错相与身体外侧收剑；.78s攻击与.44伤害相位不变。035动作数据/相对链接可编辑Blend母版、离线腕轨工具与独立验证记录已保存；没有把网格来源变化冒充正常镜头的视觉提升。低阶收剑的剑尖遮栏问题在最终冻结前单独检验和修正。骨内IK保持真实靴底支撑，外层actor位置、碰撞和待机比例不改。

白天主光方向实值[-0.3713906763541037, 0.7427813527082074, 0.5570860145311556]、强度2.2；两座原石灯保留造型，活跃灯数0、灯强[0, 0]，暖芯隐藏，无火把。沿用青灰/墨绿，朱红与关键凤金用于人物及原技能。远景和原松分层保留，无自动运镜、新地图或新玩法。

## 原机位与实际操作

390×844、DPR1、FOV39、相机跟随偏移(6,27,15)、原出生XZ(-3.2,-4.2)、朝向-.6与1.485参考身高保持。H34/H35对比读取真实同位镜头；H31与当前因H32地面细高度修正有约-.01272的出生Y差，数据如实保留，没有声称所有历史相机矩阵完全相同。

原生浏览器touchscreen输入连续走近古松→穿前枝→离开→门前石坪→登真阶→回身普通命中→收势。正常UI录像14.60秒、1倍速、未插帧/加速、debug隐藏；敌HP3→2、四路线标记true，最终脚高0.710542，JS错误0/失败请求0，屋檐cut峰值0.000000。碰撞边界触控记录boundary-probe.json；实际资源请求与逐帧位置/镜头/剑段/时间/面数/CPU见sample-playtest.json。

录像实际环境：云Linux x86_64、Playwright WebKit26.5/WPE、强制软件渲染，390×844DPR1。305帧/14.146s，**21.490FPS**，帧间隔中位45ms、p95 60ms。MP4编码25FPS与游戏FPS分开；WPE报告的Mac Safari/Apple GPU是兼容字符串，不是物理Apple设备。iPhone、ChatGPT客户端和微信真机/微信开发者工具未实测，不能据此宣称手机硬件帧率通过。

关闭剑光连续帧来自真实touch走位后一次出剑的实际render canvas读回，剥去DOM血条/文字以判断动作，未传送/冻结/摆姿势，阶段[{'stage': 'windup', 'phase': 0.14102564102564102}, {'stage': 'sweep', 'phase': 0.36410256410256403}, {'stage': 'contact', 'phase': 0.44}, {'stage': 'follow', 'phase': 0.6169230769230769}, {'stage': 'recover', 'phase': 0.8361538461538458}, {'stage': 'rest', 'phase': None}]。读回有开销，不作性能样本。

15项启动/故障恢复通过：H31忽略importmap的受控旧故障、H35冷启动/触控/单次click回退、实际context loss恢复、bundle受阻后真实Retry、WebGL构造失败、松图失败、禁JS提示、20s慢载协助、独立外部启动受阻、CSP禁inline后的外部回退、地面缓存失败、角色图集失败、035门匾失败、035石图失败、底床mask失败。新资源不到齐不标可玩，不依赖运行时importmap。

## 视觉结论与来源

独立整屏评审见[SAMPLE_H35_VISUAL_REVIEW.md](SAMPLE_H35_VISUAL_REVIEW.md)。本版整屏变化明确，可作为白天试版；石路外缘/T形轮廓与坡地融合仍偏规整，场景精修未达到参考视频完成度。人物/剑/敌与道路仍清楚，最终美术判断交由用户在正常镜头亲玩；几何/检查数量不等于美术验收通过。

035石材/岩体由项目自有033手绘资源和034自制几何继承，新增真实几何/脚本原创；字体沿用Noto CJK OFL记录；林砚沿用034已记录的CC0脸手局部+自制衣发/22骨骨架。源及许可见各035 provenance/README与hero-034/provenance.json。未调用Runway/其他付费生成服务，本轮新增生成费用0。私有参考没有作为公开素材分发。

本轮执行npm run build；Three r170、Safari15目标classic IIFE，2,884,466字节，SHA256 098ee369a86f2358e0c49ae95e5785fc3f35536072947762d906cc7ec327672b。构建及运行文件SHA见evidence/h35/build-manifest.json；H29 index blob82e9ce953fc1954c7408ebbc835dbab37098aa64、H31档源c0fdc9a与所有冻结H34引用资产保持，证据baseline-preserved.json。最终公网验收已完成：[public-smoke.json](../evidence/h35/public-smoke.json)，源代码提交3b9520786094ac72280b957cb260f84bc7d8cc8f，冷启动3.83s，19项关键公开文件SHA与冻结构建一致；实际新石路10627tri、新门台H35与H35动画均已从正常入口读回；触控走近松树、一次普通挥剑收势、赤凤及重来通过，错误0/请求失败0。H34入口/旧bundle、H31入口、H35原速MP4/对照PNG/无FX帧公开下载亦逐字节匹配，见public-artifacts.json。同为云Linux WebKit软件触控模拟，非iPhone或微信真机。
