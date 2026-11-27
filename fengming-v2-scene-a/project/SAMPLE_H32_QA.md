# H.32 山门样关：载入、走位与画面修订

新版试玩：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h32.html

H.29对照：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h29-compare.html?v=h29

H.31留档：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h31-compare.html

## 结论与边界

用户在iPhone其他浏览器或ChatGPT内打开时停在“正入山境”。本轮修复了可复现的静默启动失败路径，已在云端WebKit与Chromium加载并操作；没有取得用户出错窗口的错误日志，因此不把importmap问题说成用户真机已确认的唯一原因。新版采用独立文件名，并保留H.29和H.31完整对照。

本轮改善了屋檐破碎面、地面取整顿跳、运行时建模与遮挡查询开销，未将“技术通过”当作Frog Ferry／Slackwater的美术完成度通过。H.31人物与松冠的美术造型主要保留，角色比例和正常镜头不变。iPhone、ChatGPT内置窗口、微信开发者工具及微信真机均未实际测试。

## 运行与输入

- 原importmap与运行时模块依赖改为本地Three r170单一classic IIFE，Safari15语法目标；不是WebGL1适配。启动器内联优先、同源外部fallback，页面禁止全部JavaScript时显示静态说明与地址。
- renderer、环境预计算、角色构建、资源加载、编译与首帧均进入错误处理；提供进度、20秒协助、重试/复制地址，以及图形上下文丢失后的重载入口。完成时立即停止载入层拦截触控。
- 保留触控/拖动移动和原碰撞，增加合法区域内寻路、金色落点和不可通行提示，按钮兼容原生click。不会因为点在树根背面直撞后静默停住。

完整11项记录：[compatibility.json](../evidence/h32/compatibility.json)。包含旧版忽略importmap的受控故障、正常WebKit启动/触控/单次键盘点击出剑、真实驱动context loss、bundle失败后原生重试、WebGL构造失败、树冠纹理失败、禁JavaScript、20秒慢载入、外部launcher受阻、CSP禁内联、地面缓存失败。故障注入不等于真实设备的故障发生率。

## 动作与性能

离线生成角色网格/骨架，19个几何属性与Float64绑定矩阵逐字节相等，76个待机/步行/转身/出剑姿态、蒙皮表面与剑尖误差0。原角色/攻击逻辑未替换。屋檐BVH与原Three射线2509组相等；可视更新移出模拟子步，每渲染帧只做一次。松冠投影缓存不改变结果。源材质避免无效三角函数分支，五正常视点像素SSIM 0.99999795–1。它们是各自CPU或像素验证，不等于手机帧率承诺。

三份画稿PNG无损WebP解码RGBA逐字节相同；GLB删去未使用纹理，几何数据不改。相关资源9,359,791→5,900,054字节；另增281,972字节精细地面数据。2K/4K旧UV地面烘焙因软化细节、占用增加已退回，不随游戏发布。资源证明见assets/sample-runtime/manifest.json。

粗.5网格高度在连续路面产生.24/.35的假跳。新地面提供器来自真实源LOD，保留真实石沿、树旁补丁和台阶优先级；68373点合法性/台阶/树旁均0变化。普通铺地每.02步进最大跳高.175→.0171，出生到树前.048→.00168；真实石沿仍保留。验证见assets/sample-ground/validation.json。

## 美术与同机位

山门上层瓦面/檐口重新建成连续曲线和规则短瓦叠搭，补木构、承托与自制“凤鸣”匾；保留真实低层21403三角，原场景脚印、台阶与导航不变。主样关在env.styleGate之后接入，默认Lambert轻量屋面/木构、少量Standard旧金。重PBR候选在同云环境降低帧率，未设为默认。

出生XZ(-3.2,-4.2)、朝向-.6、FOV39、跟随偏移(6,27,15)、390×844画幅与人物高1.485均不变；新高度贴地使Y降低约.01272，所以不宣称相机矩阵绝对相同。并排原比例画面和实际参数见evidence/h32/comparison/。没有拉近镜头或传送人物制造差别。

## 实际走位录屏

[11.80秒正常UI录屏](../evidence/h32/sample-walk-sword.mp4)，隐藏调试、原速、未插帧；完整含启动原始源为sample-full.webm。连续实际触控：走近古松、从横枝下穿过、退出、绕到侧面登真实石阶、回身挥剑命中并收势。四项标记均true，敌HP3→2，最终脚高.706984，运行错误0/失败请求0。

录制主机：云Linux x86_64；Playwright WebKit26.5/WPE，390×844 DPR1，强制软件渲染。212个渲染帧、采样跨度11.395秒、实测18.5169FPS，中位帧间隔53ms/p95 73ms。MP4以25FPS编码，不能作为实际游戏帧率。WPE对外显示Mac Safari/“Apple GPU”是兼容字符串，并非iPhone或Apple硬件。

同环境短静态六秒串行测量：H.31约19.54FPS；H.32保留旧屋顶约23.8FPS；新重PBR屋顶约15.76FPS（退回）；最终轻量屋顶另一次约20.45FPS。负载随运行变化，这些样本不作统计或手机流畅度结论。最终动态录屏18.52FPS仍低于手机流畅标准，真机结果待测。另测Chromium156/SwiftShader正常启动、触屏移动和单次挥剑，错误0。

## 重建与复测

在fengming-v2-scene-a目录执行npm ci && npm run build（需要Python/Pillow）；源与发布bundle的关系见sample/dist/build.json、evidence/h32/build-manifest.json。

本地服务器以游戏目录为根启动后，使用Python Playwright的WebKit运行tools/test-startup.py与tools/record-playtest.py；可设置FM_TEST_URL与FM_QA_OUT。录屏工具还需要ffmpeg；输出游戏渲染帧数据与容器帧率分开记录。依赖和软件渲染设置由运行环境提供，不能把这些记录标为真机测试。

全部新增美术/几何与动作来自项目自制；Three.js MIT沿用，esbuild MIT仅构建依赖；未取用参考游戏素材或代码。
