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

`engine.html` 由 `build-host.py` 从原作快照派生。中文版本增加DPR/error桥接、字体声明和 `locale/zh-CN.js` 文本绘制/测宽适配，文档语言/标题/描述改为中文。42条静态译文与动态波次、属性、升级和出售提示全部走同一字典；数字仍用原像素字库，中文用自托管的OFL Noto CJK SC字形子集。上游26文件不变，原作游戏脚本（移除插入的适配块后）和Three脚本逐字节相同。字体来源与许可证见fonts/。WebKit首帧仍使用不推进战局的原作bench(0)提交。

保留原作版权与MIT许可，Three.js r170另保留其MIT声明。本文为来源和文件一致性记录，不宣称iPhone、微信真机或所有触控功能已经实测；实际操作与性能以对应测试证据另行说明。


2026-11-28 中文版入口：`?v=zh1`，覆盖波次、自动/手动指挥、声音、四种塔楼及其说明、属性/升级/出售、首领和结算提示。实际中文界面与触屏结果见 [evidence/zh/](evidence/zh/)。
