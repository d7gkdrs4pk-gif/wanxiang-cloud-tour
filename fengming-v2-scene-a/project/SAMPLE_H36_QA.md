# H36 实际验收

当前试玩：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/gate-h36.html
H31独立对照：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/h31-compare.html
录像与整屏对比：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/evidence/h36/

## 实际修改

从main 8e7007a指定H35样关增量制作。H29正式index、H31档源、H35入口/bundle及既有有效玩法/角色动作保留。新入口、环境adapter、GLB与图集真实接入；未用概念图冒充游戏。

主松：新真实S形干枝/低根，Poly Haven CC0松树皮PBR、约11974三角手机LOD；新ImageGen三冠alpha图按世界深度分层。后冠/前枝真实遮挡，非H29树截图，非整屏背景。新实体木构山门、短节搭接瓦/厚檐/四字匾/柱脚；石路/真实阶/坡岩按共同日光烘焙UV。地形外缘放缓为不规则跌坡，路缝由纯黑收至深灰。远山复用旧自有图层。日间、无火把/活跃灯。

核心角色与.78秒/.44命中动作是H34/H35沿用，不计为本轮新角色进展。无自由运镜/缩放/新地图/新玩法。

## 真正测到的结果

最终源码classic bundle SHA `9bbf1b746021561c8b5ab1fbcd52e10c229d4abb04d9c62142bb42f5311512b7`；世界模型 SHA `a8d80266b267023184f255f727ad0edc7eb00993e304efe21a97dbb78d721afc`。normal入口与sample-gate别名相同，加载的都是本轮资产，无旧资源回退。

云Linux x86_64、WebKit26.5/WPE、强制软件渲染，390×844 DPR1；UA/renderer里的Mac/Apple GPU仅兼容字符串，非Apple硬件。**未测物理iPhone、ChatGPT原生窗口或微信真机。**

原速连续14.90秒触屏：走近松→横枝下→绕门前→登真实阶→回身普通挥剑→命中→收势。四标记true，敌HP3→2，最终脚高0.711598。0 JS错误、0失败请求；无演员/相机瞬移或动作定格。

实测 18.444 FPS，帧间隔中位50ms/P95 79ms。视频25FPS只是编码，1倍速、无插帧。最终画面65199三角/21 draws。优化前111k三角/14.00FPS记录另存optimization-baseline.json；不将这个云端结果称为iPhone流畅通过。

手动alpha/几何探针：原穿枝点只有2/15上身探针遮挡，未知0；经过前后各点恢复0/15。原始帧用于复核mip/AA边缘。普通攻击/赤凤/重来：HP2→0→3通过。六张关闭剑光/隐藏DOM血条的连续真实动作帧，contact帧真实伤害进度.44，依次含蓄势/扫击/命中/随势/收势/待机。

资源503(world/wood/远山)、脚本503后重试、无WebGL2可操作错误、实际WEBGL_lose_context后重试共6项通过；不会停留在无提示的载入页。为受控测试，不据此断言用户过去手机故障的唯一根因。

新GLB直接重测4048密样/850缓存中心，原7886三角踏面实际保留，0缺面/超差、max误差1.918269e-7m。原导航数据不变，树根碰撞.72、桥梁与路线未改。

## 美术结论

原手机整屏已有可辨的主松/新门楼变化；人物穿枝/真实登阶和战区最低可读成立。整体协调仍有差距，尤其T形铺装齐边、砖缝网格感与树/岩/路材质精度；详见SAMPLE_H36_VISUAL_REVIEW.md。未把技术走通或新版本号称为参考完成度/用户美术通过。

资产/许可来源与可编辑母版见assets/scene-036/README.md及pine-036、gate-036、environment-036各目录。私有参考视频未公开。

## 公网重新打开验收

源代码07f2730部署后，实际从公开H36链接进入，首次打开3.57秒；13项真正加载的入口/脚本/GLB/导航等SHA一致，触屏完整再走一遍并普通命中，赤凤和重来通过，0JS错误/0失败请求。另15项MP4/整屏/连续帧公开内容与本地逐字节一致。录像真实容器14.88秒、H264 390×844/25FPS；与记录的18.444游戏FPS分开。可编辑完整场景13项外部/链接图像路径均可解析，source-portability.json。仍为云Linux WebKit/WPE软件，不声称物理iPhone/微信真机通过。
