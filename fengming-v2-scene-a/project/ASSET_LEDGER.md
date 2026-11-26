# 资产及费用台账
Tripo中国API；密钥仅GitHub Actions Secret TRIPO_API_KEY，不记录值。已充值100元（用户历史确认）。
gate-001/gate.glb：13,941,544 bytes，75,702三角面，50 credits，估算3.50元。
terrain-001/terrain.glb：14,040,288 bytes，75,454三角面，50 credits，估算3.50元。
路径均在fengming-v2-scene-a/assets/。模型v3.1-20260211，PBR/texture，face_limit 80000。
累计估算7元，剩余约93元，非实时余额。通行验收前不新增付费生成。

PINE-001 pine-001/pine.glb：13,081,296 bytes，50 credits，约3.50元；task cab95052-05f5-4784-bfee-8827ec7f78c8。累计约10.50元，剩余约89.50元（非实时）。

PINE-002 pine-002/pine.glb：15,274,144 bytes；48,711三角面、1网格、1材质、3贴图；Tripo H3.1参考图生成，60 credits（约4.20元）；task 246b5d7a-feda-43ab-90f1-463b203932c9；GLB技术校验通过，G1/G2视觉验收不通过（环形冠片及树形失真），移动端真机性能未验收，禁止集成。
累计实际记录210 credits，按¥0.07/credit计算约14.70元；历史充值100元对应估算剩余约85.30元（非实时）。本次提交前经API实测可用1279 credits，扣除本次60 credits后的理论余额1219 credits，需以新一次余额查询为准。首次上传超时发生在付费任务创建前，无重复建模扣费记录。

PINE-004 多视图预处理（仅四张2D图，无GLB）：task 64578e00-ce8f-475b-ab01-d899a3b82dad；Tripo中国API image_to_multiview；实际10.0 credits（¥0.70）。输出 assets/pine-004/front.png、left.png、back.png、right.png；G0视觉初步可用，但四视图拓扑同一性未证实，尚未启动G1付费建模；详见project/PINE004_MULTIVIEW_QA_V1.md。
截至PINE-004，项目累计已记录220 credits（按¥0.07/credit折算约¥15.40）。原历史100元充值口径剩余预算约¥84.60（估算）；Tripo在本次任务创建前实测可用1219 credits，任务成功实际消耗10 credits，理论可用余额1209 credits（约¥84.63），需以新的实时余额查询为准。未追加任何3D模型费用。

PINE-004 G1 无贴图三维：task aafb7992-63e1-4441-a6bb-91ed46264b9d，输入来自四视图task 64578e00-ce8f-475b-ab01-d899a3b82dad；model v3.1-20260211、texture=false、pbr=false、geometry_quality=standard、face_limit=50000。实际消耗20.0 credits（约¥1.40）；GLB 1,656,304 bytes、48,737三角面、1网格、0贴图。技术校验与浏览器加载通过，G1视觉失败：主干绳索状团块、树冠分层团块，禁止贴图与游戏集成。验收详见project/PINE004_G1_GEOMETRY_QA_V1.md，原模型和证据保留。
项目累计240 credits，按¥0.07/credit约¥16.80；以历史100元充值预算估算剩余¥83.20，非实时现金。G1请求前经Tripo API实测1209 credits，扣除本次20 credits理论剩余1189 credits，未经新的余额查询确认。PINE-004两阶段合计30 credits（约¥2.10）：G0多视图10、G1几何20；无G2付费贴图。
