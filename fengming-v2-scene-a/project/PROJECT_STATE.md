# 凤鸣山门｜项目状态 V1.21
当前正式母版：main:fengming-v2-scene-a/index.html
版本：V2.0 H.17.2，blob 1c6b3f318fed80f4f65c622189835e655e88628e。
H.21 Blender自动化环境验收已启动（尚未宣告通过）：主分支已新增.github/scripts/blender_environment_smoke.py及.github/workflows/blender-environment-smoke.yml；零Tripo付费，测试只生成隔离的diagnostics/blender-smoke/.blend/.glb/四视角PNG和toolchain-qa.json。当前尚未回读到正式PASS报告，状态=待验证/结果未知；不得误称Blender工具链或PINE-005美术合格。正式游戏母版、PINE-004付费任务与费用台账均未改变。
PINE-004／H.20 G1（2026-11-26）：复用G0四视图，Tripo H3.1无贴图标准几何单次生成成功（task aafb7992-63e1-4441-a6bb-91ed46264b9d；GLB 1,656,304字节、48,737三角面、0贴图；实际20 credits约¥1.40）。GitHub Actions已完成桌面及模拟手机加载和正面、右面、背面、俯视及黑色剪影截图（run 45784817364，0浏览器错误）。**G1视觉失败：主干缠绳状团块、根石粘连、树冠块状合并；用户两条硬性条件不达标。** 立即停止付费贴图/重复生成/游戏集成，保存G1模型与图证。专项报告project/PINE004_G1_GEOMETRY_QA_V1.md，五视角图assets/pine-004/pine-004-g1-contact-sheet.jpg；累计240 credits（约¥16.80），历史100元估算剩余¥83.20（非实时）。正式游戏母版不变。
PINE-004／H.20（2026-11-26）：Tripo中国API image_to_multiview已对批准参考图生成front/left/back/right四张1024×1024图；唯一任务64578e00-ce8f-475b-ab01-d899a3b82dad，成功消耗10 credits（¥0.70），GitHub run 45782981013；G0审查：正面S形主干、松针云片与根系保留明显优于PINE-002；侧/背风格初步一致，但AI推断的三维分枝拓扑真实性无法确认，判定“可用于下一轮受控几何试验”，非3D美术通过。此轮没有生成新GLB、没有改游戏、未增加服务器。对照图assets/pine-004/comparison.jpg；iPhone对照页：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/pine-004-multiview.html（Cloudflare HTML及5张PNG均HTTP 200、内容验证通过，凭证project/PINE004_PREVIEW_DEPLOY.json）；报告project/PINE004_MULTIVIEW_QA_V1.md；项目累计220 credits（¥15.40），历史100元预算口径剩余约¥84.60，非实时。
试玩：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/?v=h172
状态：PINE-002已生成并保存GLB（15,274,144字节，48,711三角面，60 credits约4.20元；task 246b5d7a-feda-43ab-90f1-463b203932c9）。H.18新增独立预览pine-002-preview.html，桌面四视角及移动视口Chromium加载通过、0控制台错误，批准参考图与GLB视觉对比不通过：主干偏直立、树冠稀疏且叶团有空心环，松针色偏黄绿，禁止集成。无新建模扣费，正式游戏母版仍为H.17.2；原始私人Drive文件未公开。
下一任务：仅回读H.21 GitHub Actions Blender环境验收结果和diagnostics/blender-smoke/toolchain-qa.json；若通过则可进入PINE-005树干/主枝小样建模与G1质量验证（仍不得修改游戏母版），若失败只定位安装/导出/渲染环节并局部修复。不要重复触发无意义安装或付费API。
H.19.1成果及问题：PINE-003独立程序化原型已完成（pine-003-geometry.js，pine-003-preview.html），v0.2使用13,110针束实例、19冠片和8组主枝；Cloudflare在线页面/脚本HTTP200，桌面四视角及手机模拟视口技术测试通过（run 45781099300，零控制台错误）。与批准原图对比：G1剪影不通过，G2写实美术不通过；根因是枝冠排布过于规则、树皮/根/松针细节不足，禁止集成。详见project/PINE-003_VISUAL_QA.md，assets/pine-003/qa.json与pine-003-compare-v01.jpg。无新Tripo费用，预算估算剩余85.30元，非实时余额；正式游戏母版SHA冻结不变。
本轮正式方案：main:fengming-v2-scene-a/project/PINE-003_REPAIR_PLAN.md（V1.0，H.19）。结论：PINE-002属几何/剪影失真，非简单光照问题；单图Tripo image-to-model文档没有可直接用于限制造型的prompt/negative_prompt字段；PINE-003优先独立程序化骨架和针叶云片，额外credits为0，尚未生成PINE-003模型；正式游戏不变。
预览源文件：main:fengming-v2-scene-a/pine-002-preview.html；独立浏览器验收记录：assets/pine-002/preview-smoke.json（run 45778232122）。手机视口软件渲染帧率3 FPS不代表真实iPhone；Cloudflare线上预览页与GLB已通过GET HTTP 200和glTF文件头核验（2026-11-26，北京时间）；真实iPhone操作与帧率仍待用户实机验收。
120×120、九区域为设计目标；桥梁专项通行通过；其他边界、地图交互及怪物寻路仍需独立验收。当前角色和敌人仍是占位几何体。
授权边界：本次Tripo直接读取GitHub仓库中的现有参考图，不需要再次访问Google Drive；GitHub Actions仅已验证Tripo密钥可用，GitHub中是否另存Google Drive授权凭据尚未核验，后续新的云盘素材不得仅凭文件ID读取。
正式母版唯一；旧版本仅归档。每轮增量修改，状态变化后更新本文件。
