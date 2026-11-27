# H33 参考核验、现有差距与动作证据方案

核验日期：2026-11-27。本文记录用户指定的三份 OpenGame 来源及本项目的独立实现取舍；本次资料核验没有运行 GPU、修改 runtime/build、引入依赖或复制参考游戏素材。最终美术判定以 H33 手机整屏与真实输入录像为准。

## 来源与许可

核验仓库：[nexu-io/opengame](https://github.com/nexu-io/opengame)，当次 main 提交固定为 `d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4`。以下链接锁定同一提交，避免 main 后续变化影响复核。

| 用户指定来源 | 已读内容与用途 |
| --- | --- |
| [game-stylization.md](https://github.com/nexu-io/opengame/blob/d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4/skills/openmotion-game/references/game-stylization.md) | 用一个共同美术方向约束介质、剪影、颜色职能、光向与镜头；在正常游戏截图检查材质/光照一致性，模糊或融成一团的资产应替换。 |
| [game-3d-animation.md](https://github.com/nexu-io/opengame/blob/d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4/skills/openmotion-game/references/game-3d-animation.md) | 真实手骨挂武器、连续姿态/过渡、移动意图与动画连续、正常交战中连续抓帧；针对空间变换和骨骼速率做数据辅助检查。 |
| [Jingyang Ridge / 景阳冈 index.html](https://github.com/nexu-io/opengame/blob/d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4/templates/games/jingyang-ridge/index.html) | 实读独立 Canvas 2D 三路闪避/反击游戏。可借鉴预备—出手—恢复阶段、输入即反馈、命中/落空反馈与有限色板，不将其当成 3D 骨骼或微信工程。 |

**许可不是笼统的 MIT。** 仓库根 [LICENSE](https://github.com/nexu-io/opengame/blob/d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4/LICENSE) 为 **Apache-2.0**，GitHub API 同样标为 Apache-2.0。两份 handbook 文件开头链接的 [PROVENANCE.md](https://github.com/nexu-io/opengame/blob/d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4/skills/openmotion-game/PROVENANCE.md) 说明若干手册从 Higgsfield Websites handbook 移植并改编，保留 [LICENSE-HIGGSFIELD](https://github.com/nexu-io/opengame/blob/d8a88a3cb7a09e79c1a910694620fee5dc1ee3f4/skills/openmotion-game/LICENSE-HIGGSFIELD)：MIT，Copyright (c) 2026 Higgsfield AI。根目录未发现 NOTICE，指定景阳冈模板目录未发现单独 LICENSE；不能把 README 中社区作品归原作者的说明解释为所有外部游戏素材可复用。

本轮仅独立借鉴设计/验收方法，不整套导入 OpenGame 的控制器、MCP 工作流、模板代码、KayKit 模型、界面、文案或美术。因而不把 Apache 或 MIT 的名称当作本项目新资产的来源。若以后实际复制参考代码，应按其所在文件及上游来源保留相应许可、版权和变更说明，单独登记。本轮不需要此步骤。

下载的原文、LICENSE、provenance、仓库信息与 commit 数据保存在工作区 `qa-h33/reference-opengame/`，不进入游戏的运行资源。原文 SHA256：

| 文件 | SHA256 |
| --- | --- |
| game-stylization.md | `6f5b46e70639c69eb08a5936b5c8c77676ccbdd7fad65b3ef07dc0a46a0795d1` |
| game-3d-animation.md | `d08a456acc4744473078a540aefdfd289bcb08fa6e1a8f3dca664b6484aacedc` |
| jingyang-ridge/index.html | `bb0ef34dd66dab7fa802e155fdc11e17a3ffac08b40d213bd28e5183cdd3310c` |
| 根 LICENSE | `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` |
| LICENSE-HIGGSFIELD | `9da656d6226936542be59478dbf775057dfdeade2629d35e0832108c2b7aecc0` |

## 对现有实现的具体判断

以下是 H33 修改前后的核查方向，不能据此宣称最终画面已通过。美术方向统一记录于 [design/style.md](../design/style.md)。

| 参考方法 | 项目已有基础 | 需要在 H33 实画面核查的差距 |
| --- | --- | --- |
| 共同介质、剪影、调色职能 | 现有固定国风山门、手绘石地、分层松冠和 lit 3D 角色；环境已有低成本固定光向着色。 | 单独资产都“有细节”仍可能像不同画法拼接。石地、松冠、瓦檐的高光/饱和度应压到人物之下；角色在 390×844 的头发、领口、袖、腿和剑须能辨开。 |
| 光向与材质统一 | `sample/environment.js` 的 SUN 为 (-8,16,12)，main 的主光同向；固定 FOV39、offset(6,27,15)。 | baked/自绘/Basic 与 Standard 材质不能各自重复加亮；检查受光面、松针层次、脚影及石阶同时成立。参考手册的夜景 hemi≤.35 是特定场景提示，不应机械替换本项目日景光值。 |
| 武器真正挂手骨 | `sample/hero.js` 恢复现有 22 骨自制蒙皮角色，剑为 rightWrist 后代；位置连接并非单独漂浮模型。 | 基线挥击在每次 update 重置多个 Euler，然后用父骨世界旋转逆乘目标世界剑向覆盖 wrist quaternion，并将剑局部 rotation 清零。这是需要诊断的朝向/过渡链，不能仅凭“已挂手骨”判通过。 |
| 持续姿态与自然衔接 | 已有 moveBlend、turnLean、walk 连续相位和攻击关键帧。 | 基线攻击关键帧段段 ease、攻击/待机切换直接赋姿态、spine 在 p=.28 两侧硬变；需查正常帧下是否停顿、瞬跳、手腕折向或收势回弹。保留现有骨架与尺度优先，不为遵循手册替换整套控制器。 |
| 真动作先于 VFX | `fx=0` 原生关闭剑轨和命中粒子；已有攻击进度、blade base/tip、HP 与事件数据。 | 关 FX 后仍应看见预备、实体剑到敌人、随势、收回。普通短银米轨与赤凤较大较亮应分层，血条/命中文字不能代替手臂和剑接触。 |
| 真实输入中的连续证据 | H32 `tools/record-playtest.py` 使用 WebKit 390×844 原生触屏，原速录屏和渲染帧数据。 | 旧录制工具入口和 report version 写死 H32。H33 必须核对实际入口、snapshot.version、构建 SHA 与资源；旧查询参数不会恢复历史版本。 |

手册要求使用它自己的 `HumanoidRigController`、生成接口和预算，属于 OpenMotion 工作流契约；它们不是本现有工程必须新增的依赖。本轮选择保留自有角色、手骨挂点、原路线和 H32 classic bundle/启动兜底，用更小范围的姿态与美术修订解决实际问题。

景阳冈源码中的具体可借方法：`idle → tell → act → recover` 有明确时间；攻击函数先读窗口和距离，再区分命中/落空，给短文字、音效和受击反馈。画面用纸色、墨色及少量朱红建立职能。其角色是 Canvas 轮廓、武器为 2D 线段，不能提供本项目 3D 持剑/蒙皮/接地证据，也不应把它的三车道战斗或水墨色板整体移入山门。

## 无 FX 的 4–6 帧真实输入捕获

1. 固定最终 H33 的显式入口和 bundle SHA，在 390×844、原 FOV/跟随偏移及正常角色比例下由原生触屏走到真实阶顶；保留这段原速视频和位置/镜头记录。`fx=0` 关闭轨迹/粒子后，以一次 `page.touchscreen.tap()` 触发屏幕里的挥剑按钮。不能直接调用 requestAttack、设攻击时间、改站位/相机或暂停模拟来冒充连续实机。
2. 保留原速 WebKit 录像，读取 `__SAMPLE.frames()` 的已渲染帧时间、attack、blade base/tip、enemyHP 和 `events()`。攻击前一帧、预备约 p=.15–.30、接触前/后约 p=.40–.52、随势 p=.60–.75、回待机取 4–6 个不同的真实渲染帧。45ms 顿帧期间可能有多个同姿态画面，它们不能当作多种动作阶段。
3. 以录像实际 PTS、已渲染进度和事件对齐挑帧，记录原始视频 SHA、源帧/PTS、capture epoch 与阶段误差。不把 25FPS 视频编码率写成游戏帧率；如果软件渲染跳过某阶段，应如实注明并另录，不能插帧或生成中间姿势。
4. 如需额外无损图，采用只读、低开销的帧尾采样，最多收 6 帧；让截图对应已经 renderer.render 后的数据。避免每个 rAF 调用 Playwright 全页截图导致 GPU/CPU 负担改变动作节奏。普通原速录像仍是主证据。
5. 输出每阶段的整屏正常 UI 图及一张联系表；分析裁切只作补充。以真实 sword base/tip 到敌人可见身体轮廓的关系、敌人受击姿态和 HP3→2 一起判断；范围判断扣血本身不证明实体剑在画面里命中。

旧 `qa-h30/no-fx/check.py` 通过临时注入站位、暂停完成的模拟子步和刷新时钟获取静态姿态。这份旧方法已明确标注，不能复用于“H33 连续原速 4–6 帧”的证明。

## 血条遮蔽判读

现 `#enemy-hud` 投影在敌人脚点+1.6 的位置，包含名字、48px血条和文字阴影，整体 z-index7；`#impact` 命中文字同样为 DOM 覆盖。它们可能在普通手机画幅压住实体剑、前臂或接触位置。先保留所有正常 UI，记录二者的 DOMRect 与 sword base/tip 投影；只要关键运动落在覆盖区域，就不能凭这一张图断言“看清命中”。

可从同一已渲染帧读取 `canvas.toDataURL()`，与该帧正常 UI 截图成对，单独观察没有 DOM 血条/命中文字的角色和剑。这只移除界面覆盖，不改变场景、FX、相机或骨骼；必须标注“canvas 诊断图”，并保留整屏原图。如果生产 HUD 确实遮住关键动作，最终应以调整后的正常 UI 实画面再验；不能只交隐藏 HUD 的图算完成。

判读顺序：一眼是否像可辨识的持剑侠客；在原路线穿枝和登阶时身体/树/门是否有明确前后；关 FX 且排除血条干扰后，连续帧是否看清实体剑由手带动并打中敌人。debug 标志、骨骼数和 hit 事件只作辅助证据。

## 兼容与历史入口边界

- 保留 H32 的本地 classic IIFE、内联启动器+同源 fallback、可见错误/重试、首帧完成后立即释放触控层，以及 WebGL context-loss 处理。
- H31 对照使用实际留档 [h31-compare.html](../h31-compare.html)；H33 使用实际 `gate-h33.html`，最终 SHA 以构建 manifest 为准。不要拿当前 `sample-gate.html?v=h31` 当作旧版。
- 本文没有宣称 iPhone、ChatGPT 内置浏览器、微信开发者工具或微信真机测试完成。云端 WebKit/Chromium 的证据须单独标明。
