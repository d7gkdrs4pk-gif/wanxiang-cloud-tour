# 林砚 H34：可编辑 Blender 人物母版

本轮替换了实际运行的身体网格，未以 H33 SDF 网格重新着色。人物是男性铃师林砚：束髻与后掠发尾、朱红交领分摆汉服、墨裤软靴、低调旧金凤铃和独立悬铃凤刃。

## 实际资源

- `linyan-h34.blend`：压缩 Blender 4.3.2 母版。低模身体、22 骨、独立剑和 Idle / Walk / Slash 动作；`SOURCE_可编辑四边面衣形` 保留细分前的连续肩袖/臂孔/衣摆拓扑，可继续编辑。
- `linyan-h34.glb`：可独立复核的真实蒙皮模型，1 skin / 22 joints、3 clips、2 materials、1张1024²图集。
- `linyan-h34-baked.js`：从本轮 Blender 实际网格离线导出的运行数据。按 position / normal / uv / skinIndex / skinWeight 全属性完全相同的元组精确焊接，未量化、减面、平均法线或改变权重。
- `linyan-atlas.webp`：游戏使用的统一布肤发/钢金图集；`linyan-atlas.png` 为 GLB/母版使用的源图。GLB与母版PNG的解码RGBA完全相同；runtime WebP为quality94有损RGB，平均绝对差约1.38/0.81/1.16（0–255），Alpha差0。未宣称三者RGBA都相等，见 `texture-codec.json`。
- `source/cc0-male-parts.blend`：已许可的原始头/手提取件，保留源 UV / 高版与低版；来源和原文件 SHA 见同目录记录。
- `source/body-mesh.json.gz`：Blender 导出的实际三角属性，供离线精确焊接和核验。

运行体是本轮 Blender 网格的等价 TypedArray 与图集，由 `sample/hero.js` 同步装配并通过 `hero.ready` 等待纹理。游戏不在启动时执行建模、SDF、重拓扑或法线计算；GLB/Blend 是可编辑和独立查看的母版交付，不冒称游戏每次直接下载 GLB。

## 美术制作与来源

躯干、肩、臂孔和长袖共享真正的四边面拓扑。前开襟扩大到30°，右前襟较短、左后摆较长，保留腰带收束、裤腿与双靴负形；袖口与肘有连续厚度，移除了第一轮不正确的袖UV/AO黑条。脸与实际握拳/半握手使用 VRoid 官方样件 HairSample_Male 的明确 CC0 拓扑，经本项目重定比例、下颌/鼻形、手型及肤色后接入；现代衣发没有导入。

原 VRoid 透明眼线/睫毛依赖其 unlit 叠片着色，不适合直接转成本项目单图集哑光材质；本轮已删除这些叠片，保留真实眼球/面部，并补窄实体眉线，避免出现黑眼罩。1K图集包含自制朱红/暖米/墨色/旧金色块、重新烘焙的肤色以及弱接触 AO；没有烘焙固定方向日光，场景 SUN(-8,16,12) 仍负责主受光。

许可与改造记录在 `provenance.json`、`source/cc0-parts-provenance.json`。CC0 原件嵌入 `Everyone / CommercialAllow / CC0`，并记录 VRoid 官方FAQ；本项目新增衣形、束发、图集、骨架和动作归项目。未付费生成新人物、未导入其他游戏的模型/图像/动作。

## 约束与验证

保留原身高参考1.485、原22骨及 Float64 bind inverse、触控/导航、独立剑的固定右手 socket、普通攻击 .78s / .44 命中。动作与 H33 已通过真实接触修正的本地骨轨道一致，没有引入新控制器或运行时世界方向覆盖。

最终身体8975三角、独立剑376三角，总9351三角；原26925三角角点仅精确焊接到6992个身体顶点。数字用于资源核对，不能代替美术验收。实际蒙皮高度H33/H34为1.466622/1.466732；同正常镜头下身体投影高39.7242/39.5531px、宽28.6171/27.9993px，差异低于1px，未靠缩小或放大人物改变观感。

CPU核验覆盖原始三角属性与 baked 索引展开、22骨/bind、165个姿态与150帧走路转身、连续起收/固定socket、低台阶头部和同地面腰身真实三角接触；全部通过。正常390×844同环境/相机/站位对照、独立近距形体诊断和最终触控实录由本轮 QA 另存。近距诊断用于发现母版缺陷，不作为正常玩法镜头的验收替代，也不宣称已经达到 Frog Ferry / Slackwater 或用户美术通过。

## 重建

在仓库根目录执行：

```sh
python .github/scripts/hero034-atlas.py
blender -b --python .github/scripts/hero034_build.py
python .github/scripts/hero034-finish-atlas.py
node .github/scripts/bake-linyan-h34.mjs
blender -b fengming-v2-scene-a/assets/hero-034/linyan-h34.blend --python .github/scripts/hero034_finalize.py
```

构建时的详细日志与几何验证可以写到 `/workspace/qa-h34/hero/`；运行资源和可编辑输入均已保存在工程中。发布目录不含 `.blend1` 自动备份。`asset-manifest.json` 记录最终运行源、母版、GLB、图集、原始属性和 baked 数据的 SHA256。
