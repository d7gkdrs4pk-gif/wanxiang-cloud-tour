# Cinderwatch · 独立参考复现

本目录试玩入口：[index.html](index.html)。原作者：[kevintngo](https://github.com/kevintngo)；[原作仓库](https://github.com/kevintngo/cinderwatch)；[当前原作在线入口](https://kevintngo.github.io/cinderwatch/)。本复现固定使用历史版本，作者当前在线版可能已有后续变化。

场景、程序生成模型/纹理/音效与塔防玩法来自原作 **Cinderwatch**，按 MIT 许可复用；本项目新增入口包装和参考开场对齐。此处为独立场景入口，凤鸣山门工程不参与其运行，不能将原作资产或玩法署名为本项目原创。

## 固定版本与一致性

- 原作提交：[`8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5`](https://github.com/kevintngo/cinderwatch/commit/8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5)。
- `upstream/` 保留该提交除 `media/` 外的全部 **26** 个文件，逐文件实际字节均与 `git show 8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5:路径` 相同；模型、纹理和音效在源码中生成，无需随包导入演示视频。
- 原作 `upstream/index.html` SHA256：`ee14f3c172685a4bcf4e90ca83b99080b06c99548c0e198b009cfa0827e4e532`。
- 完整文件名、长度、Git blob与SHA256在 [UPSTREAM.json](UPSTREAM.json)，许可及版权见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 参考开场与真实交互

入口使用 `seed=4`，按 `1/60` 秒固定步长推进至第 **5131** 帧，再继续原作实时塔防模拟。这里的步长用于确定性还原，不是设备实测帧率。用户参考视频后段存在剪辑，连续试玩不保证在同一墙钟秒数逐一出现剪辑后的镜头。

这是可操作的原作三维场景：AI指挥官先自动布防；点击/触摸建造位可接管并建塔，点击已有塔可升级或出售；原作波次、敌人、灯光和场景重建继续运行。可从 [原作开局](upstream/index.html#seed=4) 查看未经开场预跑的版本。

手机以横屏 **16:9** 为目标，固定1920×1080虚拟视口和DPR1，整体等比适配屏幕；竖屏保留完整构图并留黑边。不会裁切参考场景，原作相机仍按原规则跟随战斗。

## 本地改动边界

`engine.html` 由原作 `upstream/index.html` 派生，仅在 `<head>` 后插入261字节脚本，固定DPR1并向入口转发启动错误；实测字节比较确认原作其余字节未删改。`index.html`、`replica.css`、`replica.js` 负责载入/恢复、画幅适配、开场预跑与宿主输入适配。未修改原作场景、材质、shader或塔防游戏代码。

保留原作版权与MIT许可，Three.js r170另保留其MIT声明。本文为来源和文件一致性记录，不宣称iPhone、微信真机或所有触控功能已经实测；实际操作与性能以对应测试证据另行说明。
