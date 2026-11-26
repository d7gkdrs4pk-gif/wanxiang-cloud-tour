# PINE-004｜古松 AI 多视角输入质量检验 V1.0

日期：2026-11-26（北京时间）｜阶段：H.20／G0 预建模图像审查  
**本轮目标：只验证自有付费 API 对已批准古松参考图的多角度重建能力。未生成新 GLB、未修改正式游戏。**

## 1. 输入、接口与实绩

- **批准原图**：`assets/pine-002/reference.png`，1536×1024 PNG，Git Blob SHA `9e204263823ca9f40d46737dca5c1ee0a28a73a8`。图片已经存在 GitHub，**不再次读取或公开私人 Google Drive**。
- **服务**：Tripo 中国 API（`https://openapi.tripo3d.com/v3`）。
- **本轮唯一付费端点**：`POST /generation/image-to-multiview`，入参为批准图片的 `file_token`，没有 `multiview-to-model` 或 `image-to-model` 请求。
- **Task ID**：`64578e00-ce8f-475b-ab01-d899a3b82dad`；GitHub Actions run `45782981013`，success。
- **本轮实际消耗**：`10.0 credits` ≈ **¥0.70**（平台当前 1 credit=¥0.07）；生成前官方 API 返回可用余额 1219 credits。成功扣费后理论剩余 1209 credits，**未做新的实时余额读取**。
- **生成图**：`assets/pine-004/front.png`、`left.png`、`back.png`、`right.png`，每张 1024×1024，格式有效，四张 SHA-256 不同。
- **对照图**：`assets/pine-004/comparison.jpg`；完整机器数据：`assets/pine-004/multiview.json`；防重锁：`assets/pine-004/intent.json` 和 `task.json`。
- **正式游戏母版**：`main:fengming-v2-scene-a/index.html`（Blob `1c6b3f318fed80f4f65c622189835e655e88628e`），未修改。

## 2. G0 多视图视觉核验

| 验收事项 | 结论 | 依据及未解决问题 |
| --- | --- | --- |
| G0-1 正面主体保留 | **初步通过** | 与批准原图相比，前景仍为粗壮 S 形侧倾主干、横向长枝、错层深绿松针、抓岩根系；不是 PINE-002 的圆环树冠。生成结果整体稍缩小、部分枝叶及地基位置有简化或偏移。 |
| G0-2 四面风格一致 | **初步通过** | 正/左/背/右均呈现同类老松、相近的树皮/松针风格和侧倾结构，没有明显换成另一类直立针叶树或花盆树。 |
| G0-3 同一树体拓扑一致 | **未证实，严格保留风险** | 原始数据只有一张正面图。侧/背面由 AI 推测，局部枝杈数量、位置、盘根和岩石布局可能改变；四张“看起来相似”不能证明它们来自一个真实的连贯 3D 网格。 |
| G0-4 输入合规性 | **通过** | Tripo H3.1 多视图接口的推荐 view-key 模式接受 `front/left/back/right` 对象输入或一个已成功的多视图任务 ID。四图分辨率均≥256px；官方语义分别为 front、left、back、right。 |
| G1 三维剪影质量 | **尚未开始** | 未调用多视图生成 3D，不能基于 2D 图声称 GLB 造型合格。 |
| G2 三维松针/树皮材质 | **尚未开始** | 没有 3D 三角面、纹理或渲染结果，不能判断“无甜甜圈”是否会在新 3D 中保留。 |

**本阶段总判定：G0 图片阶段有明显改善，作为下一次有限额度的几何验证输入「有条件可用」；未通过“最终 3D 美术验收”，不能进正式游戏。**

## 3. 下一步候选：只验证几何，不直接购买全套材质

1. 使用现有已完成多视图任务作为输入：`inputs: [{"task_id":"64578e00-ce8f-475b-ab01-d899a3b82dad"}]`。官方要求源任务类型为 `image_to_multiview` 且 success，本次满足。
2. **若执行下一轮新的付费任务**，优先采用 H3.1 `multiview-to-model`、`texture:false`、`pbr:false`、`geometry_quality:"standard"`，先单次约 **20 credits / ¥1.40** 检查主干和树冠的真实三维剪影。该金额是官方当前 H 系列基础定价，实际需以任务扣费为准。
3. 不传 `geometry_quality:"detailed"`（另加 20 credits）、不传 `texture_quality:"detailed"`，未通过 G1 前不增加纹理、网格部件拆分或重拓扑花费。
4. 建模任务须独立新任务 ID、幂等锁、余额检查和 `GLB` 结构验证；四角独立渲染必须与本轮四视图对比，尤其检查空心树冠、错误穿模和主干断裂。
5. 如果 G1 不过，**停止**，不继续购买贴图、3D 再生成或自动修复。只有 G1 通过才讨论 G2 材质以及 iPhone 1 株/8 株的实际性能。

> 官方依据：
> - 图生多视图：https://developers.tripo3d.com/zh/docs/generation-image-to-multiview
> - H3.1 多视图建模：https://developers.tripo3d.com/zh/docs/generation-multiview-to-model/standard
> - 计费：https://developers.tripo3d.com/zh/pricing

## 4. 决策边界

本轮只产出并核验四张 2D 多视图；是否执行下一轮 20 credits 的无贴图几何验证，为**独立下一任务**，本轮没有自动启动。PINE-001/002/003 均保持历史归档；旧工程与正式游戏唯一母版保持冻结。

**下一任务：PINE-004 G1 单次无贴图 GLB 剪影验证（仅在项目推进下一阶段时执行），验收后再决定 G2 纹理。**
