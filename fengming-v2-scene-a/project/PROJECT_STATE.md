# 凤鸣山门｜项目状态 V1.18
当前正式母版：main:fengming-v2-scene-a/index.html
版本：V2.0 H.17.2，blob 1c6b3f318fed80f4f65c622189835e655e88628e。
试玩：https://wanxiang-cloud-tour.pages.dev/fengming-v2-scene-a/?v=h172
状态：PINE-002已生成并保存GLB（15,274,144字节，48,711三角面，60 credits约4.20元；task 246b5d7a-feda-43ab-90f1-463b203932c9）。H.18新增独立预览pine-002-preview.html，桌面四视角及移动视口Chromium加载通过、0控制台错误，批准参考图与GLB视觉对比不通过：主干偏直立、树冠稀疏且叶团有空心环，松针色偏黄绿，禁止集成。无新建模扣费，正式游戏母版仍为H.17.2；原始私人Drive文件未公开。
下一任务：执行H.19.2写实古松资产路线核验：优先寻找许可明确、可编辑且品质达标的3D松树源模型或可用Blender精修的工程，重点用批准参考图对齐粗壮侧倾S主干、真实枝冠/针叶、抓岩根系与四视角。先产出独立验收样件，经G1/G2视觉通过再做iPhone真机性能/8株及通行回归；未经验证不再次调用付费Tripo，不改正式游戏母版。
H.19.1成果及问题：PINE-003独立程序化原型已完成（pine-003-geometry.js，pine-003-preview.html），v0.2使用13,110针束实例、19冠片和8组主枝；Cloudflare在线页面/脚本HTTP200，桌面四视角及手机模拟视口技术测试通过（run 45781099300，零控制台错误）。与批准原图对比：G1剪影不通过，G2写实美术不通过；根因是枝冠排布过于规则、树皮/根/松针细节不足，禁止集成。详见project/PINE-003_VISUAL_QA.md，assets/pine-003/qa.json与pine-003-compare-v01.jpg。无新Tripo费用，预算估算剩余85.30元，非实时余额；正式游戏母版SHA冻结不变。
本轮正式方案：main:fengming-v2-scene-a/project/PINE-003_REPAIR_PLAN.md（V1.0，H.19）。结论：PINE-002属几何/剪影失真，非简单光照问题；单图Tripo image-to-model文档没有可直接用于限制造型的prompt/negative_prompt字段；PINE-003优先独立程序化骨架和针叶云片，额外credits为0，尚未生成PINE-003模型；正式游戏不变。
预览源文件：main:fengming-v2-scene-a/pine-002-preview.html；独立浏览器验收记录：assets/pine-002/preview-smoke.json（run 45778232122）。手机视口软件渲染帧率3 FPS不代表真实iPhone；Cloudflare线上预览页与GLB已通过GET HTTP 200和glTF文件头核验（2026-11-26，北京时间）；真实iPhone操作与帧率仍待用户实机验收。
120×120、九区域为设计目标；桥梁专项通行通过；其他边界、地图交互及怪物寻路仍需独立验收。当前角色和敌人仍是占位几何体。
授权边界：本次Tripo直接读取GitHub仓库中的现有参考图，不需要再次访问Google Drive；GitHub Actions仅已验证Tripo密钥可用，GitHub中是否另存Google Drive授权凭据尚未核验，后续新的云盘素材不得仅凭文件ID读取。
正式母版唯一；旧版本仅归档。每轮增量修改，状态变化后更新本文件。
