# H36 主景古松

当前游戏的实际链路：`sample/environment-h36.js` 加载 `pine-036-wood-mobile.glb` 的真实PBR干枝与低根，加载scene-036/runtime/world-h36.glb中的三个独立世界松冠卡。没有整树贴到背景，也没有使用H29树截图。

- 可编辑木质母版：pine-036-wood.blend；完整标准PBR源：pine-036-wood.glb。
- 手机LOD：pine-036-wood-mobile.glb；生成器tools/build-pine-mobile-036.py，wood-mobile.json记录源SHA、实际三角和位置不变。真实松树皮来自Poly Haven CC0，作者/原图/SHA在bark-texture-source.json。
- 新松冠alpha图：art/crown-atlas.png，为按批准参考新绘制的ImageGen三冠图；provenance.json记录来源。3张卡固定在世界里，前后与遮挡由真实深度决定，不随相机旋转、不整树淡出。
- **失败探索留档**：pine-036.blend / pine-036.glb及早期model/projection/route-*-cpu.json是随机实体散针方案，未获美术通过、未用于当前松冠。当前完整针叶截图不能代替游戏验收。build-pine.py / extract-wood.py保留木质母版构造来源。

本轮保留原(-7,-7)根位、.72碰撞及通行路线；真实运行、实际角色遮挡和帧率，以evidence/h36最终数据与录像为准。
