# H.36 山门可玩样关资产

`h36-scene-spawn.blend` 是按原390×844、FOV39和出生机位组装的可编辑美术场景；不是运行时背景图。`calibration.json` 记录实际相机。源树干、门楼和岩体分别在 pine-036 / gate-036 / environment-036。角色和动作沿用已有H34/H35，不宣称本轮新制角色。

实际游戏入口 `gate-h36.html` → `sample/main-h36.js` 单一classic构建 → `sample/environment-h36.js`：

- `runtime/world-h36.glb`：实际三维地面、石路、门楼和真实石阶；独立三冠世界深度卡。静态日光、间接光与接触投影为Cycles离线UV烘焙，标准KHR_materials_unlit，避免重复受光。
- `../pine-036/pine-036-wood-mobile.glb`：真正可转视的三维树干/主枝/低根，标准PBR松树皮；原始可编辑母版和完整GLB仍保留。不会用失败烘焙树干作回退。
- 松冠使用新ImageGen alpha atlas，不是H29树截图，也不是失败散针模型的渲染；3张固定世界平面按深度自然遮挡。来源在pine-036/art/provenance.json。
- 远山复用项目自有H31 atlas，两个独立世界图层；没有把整座山门压成背景。

## 重建

在游戏目录运行（Blender4.3.2、Python/Pillow/NumPy、Node/esbuild）：

```sh
blender -b --factory-startup --python tools/build-pine-mobile-036.py
blender -b --factory-startup --python tools/build-scene-036.py -- --view spawn
blender -b --factory-startup --python tools/bake-scene-036.py -- --samples 32
node tools/build-sample-h36.mjs
```

运行时LOD在烘焙UV之前固定，原真实踏面单独保留；高度/导航/碰撞/桥梁不从美术模型重建。只有最后一个编译命令写H36入口与独立bundle，不覆盖H29/H31/H35。

源材质：自制结构与地面；Poly Haven CC0真实松树皮及两套层岩，作者/许可/原文件哈希保留在对应目录。生成冠图仅引用项目公开已批准松参考。私有参考视频没有复制到项目或试玩。

实际手机画幅截图、触屏录像、帧率与失败恢复检查见evidence/h36；Blender离线图不当作手机实机证据。未测试物理iPhone或微信真机。
