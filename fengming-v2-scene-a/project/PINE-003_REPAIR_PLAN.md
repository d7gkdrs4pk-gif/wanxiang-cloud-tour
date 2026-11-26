# PINE-003｜古松修复与低成本建模实施方案 V1.0

> 项目：《凤鸣山门》；编制日期：2026-11-26；阶段：H.19 方案冻结、未开始实现。  
> 目标：在不增加 Tripo 付费消耗、不更改正式游戏母版的前提下，先做出与批准参考图高度一致、可以在 iPhone 上验收的独立古松 3D 原型。  
> 唯一正式游戏母版：`main:fengming-v2-scene-a/index.html`，blob `1c6b3f318fed80f4f65c622189835e655e88628e`，H.17.2。任何后续资产工作不得覆盖或重写该母版。

## 1. 本轮依据与固定基线

| 来源 | 具体位置 / 已核验事实 |
| --- | --- |
| 正式视觉目标 | `../assets/pine-002/reference.png`，1536×1024，Git blob `9e204263823ca9f40d46737dca5c1ee0a28a73a8` |
| 参考图便捷查看 | `../assets/pine-002/approved-reference-qa.jpg` |
| 不合格 GLB | `../assets/pine-002/pine.glb`；15,274,144 bytes，48,711 三角面；1 网格 / 1 材质 / 3 张贴图 |
| 失败证据 | `../assets/pine-002/pine-002-contact-sheet.jpg`，正面、右面、背面、双面片四视角 |
| 用户实机反馈 | iPhone 实际截图指出与目标差距过大，明确不认可造型 |
| 既有任务 | `246b5d7a-feda-43ab-90f1-463b203932c9`，Tripo H3.1，已耗 60 credits，**不得重提此任务** |
| 技术测试 | PINE-002 本地 Chromium 桌面及模拟手机加载通过；模拟环境 3 FPS 为软件渲染，不能代表真机 |

## 2. 失败根因与分级

| 级别 | 检查项 | 参考图要求 | PINE-002 实际问题 | 处理 |
| --- | --- | --- | --- | --- |
| P0 | 主体轮廓 | 粗壮侧倾、明显 S 形回旋、整体横向舒展 | 变成偏直立的小盆景，气势不足 | 重建骨架 |
| P0 | 枝冠结构 | 枝条由主干向两侧大幅伸出，云片分布不对称、上下错落 | 短支枝密集靠中，树冠层次关系错误 | 重新布置主枝 |
| P0 | 松针几何 | 细长放射状针叶组成实心疏密自然的云片；侧面有厚度 | 大量空心“甜甜圈”、圆筒状绿垫、几何无真实松针方向 | 全部更换叶簇几何 |
| P1 | 材质颜色 | 深翠绿、灰褐老树皮、自然过渡，局部受光金绿 | 亮黄绿、软绵玩具质感 | 独立材质与粗糙度 |
| P1 | 根系地基 | 盘根抓石、岩石不喧宾夺主 | 根部有参考价值，但过于盆景/底座化 | 保留设计语言、控制体量 |
| P1 | 性能 | 高品质前提下可用于移动端、可复制多株 | 单个 GLB 15.3 MB、48.7k 面；iPhone GPU 未测 | 创建 LOD 与共享实例 |

**判断与边界**：失真属于形体重建失败，不是只靠双面材质、亮度或绿色调能修复。当前 PINE-002 只有 1 mesh、1 material，不能像多个独立零件那样直接 `remove(foliage)`；保留树干/树根需要先分割网格并检查可编辑性，不得默认现成可分离。

## 3. 方案对比与选择

| 路径 | 额外建模 API 消耗 | 可控性 | 主要风险 | 决策 |
| --- | --- | --- | --- | --- |
| A：独立 Three.js 参数化骨架 + 可控枝冠与松针几何 | **0 credits** | 高：主干曲线、倾斜量、每组冠片、针叶方向、色彩均可调整 | 开发工作量，需防“手工几何感” | **首选，先执行** |
| B：Tripo 单图→多视图→多视图模型 | 产生额外付费，具体以提交前官方计价/余额为准 | 中：视角一致性比单图有机会提高 | 自动生成的背面与侧面本身可能瞎编，不保证消除环状叶团 | A 失败后再讨论 |
| C：对旧 GLB 做语义分割，再保留根系/主干、替换树冠 | 可能收费；`/v3/mesh/segment` 支持 v2 语义分割 | 中：若能拆分，则可复用部分网格 | 木质部分与叶团可能拓扑相连、纹理重整复杂；分割质量不保证 | 仅在 A 的结构开发遇到瓶颈时小规模技术评估 |
| D：同一张图再次直接 `image-to-model` | 再次付费 | 低：单张图对背面和针叶体积的歧义仍在 | 重复 PINE-002 失败 | **禁止作为默认路线** |

### API 事实校验

- Tripo 官方中国站 `POST /v3/generation/image-to-model`（H 系列）可控制 `model`、`face_limit`、`texture_alignment`、`orientation`、`model_seed` 等，但**该接口文档没有 `prompt` 或 `negative_prompt` 入参**，不能把“更严格的负面提示词”直接当作该 API 的有效约束。
- 官方支持 `POST /v3/generation/image-to-multiview`，再调用 `POST /v3/generation/multiview-to-model`；后者要求前视图及至少另一视图。两步都可能扣费，且不能保证忠于真实未出现的背面。
- Tripo P1 `P1-20260311` 和 P2 `P2-20260801` 可降低拓扑面数、适用于游戏，但“少面数”不能直接修复形体轮廓，不能代替构型验收。
- `/v3/mesh/segment` 有 v2.0 语义分割；不是无条件零成本的免费分割，不启动。
- 参考资料：  
  - https://developers.tripo3d.com/zh/docs/generation-image-to-model/standard  
  - https://developers.tripo3d.com/zh/docs/generation-image-to-multiview  
  - https://developers.tripo3d.com/zh/docs/generation-multiview-to-model/standard  
  - https://developers.tripo3d.com/zh/docs/models-and-versions  
  - https://developers.tripo3d.com/zh/docs/mesh-segment  
  - https://developers.tripo3d.com/zh/docs/billing

## 4. 首选路线 A：PINE-003 免费可控原型实施清单

### 4.1 独立模块（不进入正式游戏）

新建 `fengming-v2-scene-a/pine-003-preview.html` 与版本化脚本 `pine-003-geometry.js`（可按页面依赖方式布置）。引用现有 Three.js 版本，单独预览，沿用 PINE-002 的四视角、参考图对照、性能指标，**不得修改** `index.html`、桥梁、地图、游戏存档。

原型由四个可独立替换层组成：`trunk`（粗壮盘旋主干）、`branches`（横向伸展且前后交错的枝条）、`needleClusters`（独立针叶云片）、`rockAndRoots`（抓岩根部）。分层有自己的材质；不依赖 PINE-002 的单网格语义可编辑性。

### 4.2 造型硬性约束（属于拟定验收规格，非已经达成的性能）

1. **剪影优先**：以批准参考图正面为标准，树根大致居下；主干自根部大幅倾斜、弯转至少两次，呈厚重、偏侧生长的 S 曲线；树冠整体呈不规则横向展幅，而非垂直中央圣诞树型。
2. **主干与树皮**：使用粗细递减的分段曲面或逐段锥面，曲率连续，结合凹凸/法线纹理；禁止圆柱拼接、笔直主干、悬空枝杈。
3. **主枝关系**：主枝由 S 形树干分出，左右长短不对称，多个高低层面形成负空间；不得规则对称或环形排布。
4. **松针**：一组云片由多个自然错层针叶簇构成。簇内部必须填实，边缘碎裂呈针束结构；禁止空心环、甜甜圈、实心泡沫球、整块荧光绿海绵。需要正面与侧面均成立，不用单片广告牌冒充整个三维冠层。
5. **色彩**：树冠以深松绿、墨绿为主体，受光边缘有少量灰绿和金绿；老树皮呈灰褐、局部苔藓；PBR 粗糙度避免塑料反光。
6. **基部**：裸露根系抓岩，岩石尺度不抢主体，不能出现大块正圆盆栽台座。
7. **可参数化**：骨架、主枝端点、冠片大小/厚度、松针密度、冠片色差分别保存为可调参数。调整一处无需重做整棵树。
8. **回退**：PINE-002 原 GLB、原参考图及全部历史验收记录只读冻结，保留可追溯证据。

### 4.3 主要技术实现建议

- 主干/枝条：采用 Catmull-Rom 曲线 + 可变截面 BufferGeometry（或离线脚本生成曲面），在分叉交汇处平滑衔接；不做八爪鱼式细长均匀根。
- 针叶：优先用共享几何的针束簇、InstancedMesh 或分层的交叉叶片组合。每个冠片由许多细分针叶方向构成，减少 draw call；避免高度透明叠层导致手机排序问题。
- 材质：两类以上独立 PBR 材质；叶片可使用适度 `alphaTest` 或双面显示，但不得依赖把单面孔洞贴图强制双面来“填满”环状几何。
- LOD：近处真实可辨针束；中远处降低分段与针束；超远处使用更便宜的体积冠片。8 株实例时共用几何、纹理与材质；不同植株可以旋转、缩放和小幅变色。
- 首轮性能**目标**：单株近景模型尽量控制在约 12k–20k 三角面，压缩后资产优先达到 3–5 MB 级；这只是研发预算，不是已测性能或绝对上限，视觉质量不得因压缩而塌陷。
- 不创建新的收费任务；GitHub Actions 仅允许静态构建、自动截图及基本图形结构检查。

## 5. PINE-003 进入正式游戏前的四道门

| Gate | 必须通过的要求 | 验证方式 | 失败处理 |
| --- | --- | --- | --- |
| G1 剪影 | 正面粗壮侧倾 S 主干；横向冠幅足够宽；与参考图主枝位置、层次大致一致；非盆景 | 参考图与正面无材质剪影并排；人工签收 | 只调整骨架和枝条 |
| G2 视觉 | 正面/侧面/背面无空心环；叶簇密实、边缘针叶可见；深翠色；根、树皮不塑料 | 四视角截图、单独线框与贴图检查；人工签收 | 只重构失败的模块 |
| G3 手机性能 | 实际 iPhone Safari 全景、旋转、缩放不卡顿；1 株及 8 株场景分别测试。目标以稳定 50–60 FPS 为优先，记录机型、分辨率、加载时间和统计区间 | 真机专门验证；不采用云端软件渲染 3 FPS 替代 | 分别调整 LOD、纹理、裁剪及实例共享 |
| G4 游戏回归 | 无树干/根系与道路、桥头穿模；九区域及已通过的桥梁往返通行不回归；不遮挡 UI / 人物 | 在隔离分支先做局部集成，验收后才进入正式母版 | 撤销独立集成，游戏母版不动 |

**止损规则**：一次失败只记录对应 Gate 问题，批量修订同类事项；不因叶色失败而重建骨架，不因整棵树失败而扩大到地图/角色。

## 6. 仅供“有必要再次用 Tripo”时的输入图像约束稿

> 下列文本用于图像编辑/生成阶段构造受控参考图（例如官方 `image-to-image` 端点），**不是** H 系列 `image-to-model` 端点的 `prompt` 参数。即使图片处理有提示词，后续 3D 重建仍需单独做剪影验收。

### 正向规格（英文，用于图像制作/修正）

```text
One monumental ancient Chinese mountain pine tree, a single fully visible standalone subject.
Preserve the approved reference's exact broad asymmetrical silhouette:
massive, heavy S-shaped trunk bending strongly sideways, exposed twisted roots gripping weathered rocks,
very long and visibly connected lateral branches, broad horizontal layered pine-cloud canopies
with dense individual radial pine-needle bundles, irregular filled foliage pads, natural depth
and gaps between branches but no holes in the foliage pads themselves.
Deep jade green, forest green and muted moss-green needles; coarse aged grey-brown bark,
accurate tree anatomy, non-symmetric growth, restrained natural lighting,
clean white or transparent background, no extra objects or text.
Retain characteristic branch direction and root positions from the approved reference.
```

### 禁止项（用于生成图像时的负面约束、人工验收）

```text
donut-shaped foliage, ring-shaped foliage, hollow leaf pads, inflatable tubes, foam pads,
bright fluorescent lime green, cartoon bonsai, straight centered trunk, regular symmetric branches,
thin stick trunk, disconnected limbs, floating canopy, flat 2D billboard needles,
rounded plastic rocks, flowerpot, extra trees, text, backdrop scene
```

**注意**：更严格的文字并非造型成功保证；不能把外观预处理与三维生成混为一谈。任何新图片仍须与原批准的 `reference.png` 保持相同主体特征，修改需保留版本记录；如多视角不一致，停止提交付费模型。

## 7. 费用和执行授权边界

- 本轮目标为**零新增 Tripo credits**、零新增服务器费用。不重新读取私人 Google Drive，复用 GitHub 中已存在的参考图。
- 当前项目历史账面累计 210 credits（按 ¥0.07/credit 约 ¥14.70），100 元充值口径下剩余**估算 ¥85.30**；不是 Tripo 实时账户余额，也不等同于可提现现金。
- PINE-002 成功任务已扣 60 credits。任何 PINE-003 付费路线必须先查询最新官方余额/任务价、计算最坏成本、留下单次任务 ID 和幂等锁，且本方案当前**没有授权执行任何新的付费建模请求**。
- 禁止用不存在的“已在 GitHub 保存 Google Drive 授权”作为前提；如后续改用新云盘参考图，先以可用的已授权连接验证访问，不得仅凭 Drive 文件 ID 读取私有内容。

## 8. 下一轮唯一可执行任务

**H.19.1：创建 PINE-003 零付费参数化骨架和枝冠的独立预览**。只读本方案与 `reference.png`、现有 PINE-002 预览控件的必要部分；创建新预览代码，不读取或改写正式 `index.html`。输出四视角截图，比较正面轮廓并登记 G1/G2 是否通过。未通过先修独立模型，暂不接入游戏。

**本文件为执行方案，不代表 PINE-003 3D 模型已经生成或通过验收。**
