# H.34 实测证据

14.68秒正常UI原速实玩：sample-walk-sword.mp4；完整启动源：sample-full.webm。帧数据/事件/实际cut见sample-playtest.json。comparison/与comparison-h33/保留同机位全游戏对比；no-fx/是原生touch真实六阶段canvas读回诊断，不摆拍。

云Linux WebKit26.5/WPE软件390×844DPR1，实测24.112FPS、编码25FPS。iPhone/微信真机未测。AppleGPU/MacUA为WPE兼容字符串。

GitHubAPI只读检测四映射未注入，未请求Runway生成/无费用，详见runway-api-check.json；此状态不证明用户所有API配置不存在。

最终公网已测：冷启动3.35s、15关键资源SHA一致、触控近松/普通剑收势/赤凤/重来通过，见public-smoke.json；交付MP4/对照/无FX图下载一致见public-artifacts.json。源代码提交816d05ef17bcbff226e66e828abc19c47cf21ac1。
