# H30 一屏样关：参考来源与授权边界

只读研究日期：2026-11-27。本文记录来源和可独立实现的技术思路，不是第三方素材的导入清单。

## 本样关实际采用范围

本轮只借鉴 Verdant 的固定镜头、按世界尺寸接地、牌面深度遮挡与脚影随真实地形变化的技术思路，由本项目自行实现；未导入 Verdant 代码或素材，也未引入归藏的 AGPL 代码及其保留全部权利的演示素材。本样关的林砚红金男性角色与分层古松均为本项目自有新制，未使用第三方角色、树木层图、配音、音乐或文案。

自有资源与实现的仓库相对路径：

- [林砚角色模块](../sample/hero.js)、[角色资源目录](../assets/hero-001/)。
- [分层古松模块](../sample/pine-layers.js)、[古松自有图集](../assets/pine-007/pine-layer-atlas.png)。
- [样关环境模块](../sample/environment.js)、[真实原地形和侧阶缓存](../assets/sample-lod/navigation.json)。
- [可复现导航构建脚本](../../.github/scripts/build_sample_navigation.py)、[原GLB重建验证凭证](../assets/sample-lod/navigation-rebuild-proof.json)。

下文的 MIT、CC0 与 AGPL 结论用于说明参考项目各部分的授权边界，不表示本项目已搬用这些代码或资产。

## Verdant

- 仓库：https://github.com/mihornak/verdant ，核验main提交`009b052c2e289ee4ca816bd0f1010a3f4d530b0e`。
- [README](https://github.com/mihornak/verdant/blob/main/README.md)：除3D骨骼角色外，环境由Blender按游戏镜头预渲染为2D图。地面仍为真实heightfield，植被牌面按世界尺寸、接地点放置，碰撞/地面高度不由美术像素猜测。源码three.js r185，当前项目r170，不能假设shader钩子原样兼容。
- [LICENSE](https://github.com/mihornak/verdant/blob/main/LICENSE)：MIT，Copyright (c)2026 Miroslav Hornak，复制代码/实质部分须保留版权和许可。
- [NOTICE](https://github.com/mihornak/verdant/blob/main/NOTICE)：生成环境美术及工具按MIT；KayKit角色另为CC0。运行依赖各用其自身许可。当前任务无需搬用其欧式森林/角色。

### 已实际阅读的层图实现

1. [docs/ASSETS.md](https://github.com/mihornak/verdant/blob/main/docs/ASSETS.md#L7)规定烘焙用正交42°俯角、透明RGBA、光源固定在世界中；树8视图、其他物4视图。每个atlas附JSON，记录`worldWidth/worldHeight/pivot`，接地锚点必须由包围盒/正交尺度计算，不凭肉眼估。`tools/spritekit.py`包含透明多通道烘焙、按全部角度联合包围盒固定尺寸、图集合并；[相应工具](https://github.com/mihornak/verdant/blob/main/tools/spritekit.py#L515)。这些是管线参数，不应把42°照搬到本项目。
2. [src/world/vegetation.js](https://github.com/mihornak/verdant/blob/main/src/world/vegetation.js#L127)：世界接地点`aPos`与ground-contact pivot对齐，quad按镜头right/up展开。实例按树冠/中层/地表细节分层放置，并依据地形高度与坡度筛选位置。
3. **README与当前实现有一处差异**：README描述随camera yaw换图；实际[134–149行](https://github.com/mihornak/verdant/blob/main/src/world/vegetation.js#L134)明确每实例锁定tile，避免8视图每45°同时跳图造成森林闪烁。当前一屏固定镜头可直接采用“锁视图、锁光向、锁世界接地点”的思路。
4. [400–465行](https://github.com/mihornak/verdant/blob/main/src/world/vegetation.js#L400)：`ShaderMaterial transparent:false, depthWrite:true, depthTest:true`，纹理alpha低于阈值直接discard。挡到人物时提高alpha cutoff产生局部稀疏而不是整片半透明，以减少透明排序和overdraw。注意不会凭图层画序自动得到正确空间关系，仍须为各card保留合理世界位置/深度。
5. 贴图已带Blender光照，运行时再次完整PBR会双重变暗；当前shader使用烘焙颜色、色调下限与场景雾；原assets说明只在整幅最终做一次tonemap，不能烘焙和运行都做ACES。

### 阴影实现

- [植被91–107行](https://github.com/mihornak/verdant/blob/main/src/world/vegetation.js#L91)：常规pass牌面朝镜头；shadow pass必须在世界中竖直并只绕Y朝灯光。若shadow pass把牌面完全朝灯光，在低角度光下会倒成近平地面片，树影缩成一团。
- [468–496行](https://github.com/mihornak/verdant/blob/main/src/world/vegetation.js#L468)：环境card投alpha-test剪影影，不接收自身影；`customDepthMaterial`复用同一atlas UV和顶点变换。否则牌面在shadow pass转向光源，会把自身黑剪影打回自身。
- [角色接触影207–225行](https://github.com/mihornak/verdant/blob/main/src/character/character.js#L207)：软blob平面，透明、depthWrite关闭、toneMapped关闭。[358–369行](https://github.com/mihornak/verdant/blob/main/src/character/character.js#L358)每帧取真实`terrain.heightAt`和`normalAt`贴地，按离地高度缩放/减淡。此做法比把影子随角色模型一起抬高更适合台阶。

## 歸藏 Game Skill / 雾锁山门

- 用户给的[在线地址](https://op7418.github.io/guizang-game-skill/)已实际HTTP200，HTML引用`game.cdb73b9b.js`。
- [main README](https://github.com/op7418/guizang-game-skill/blob/main/README.md)，核验提交`6001e56e1eaa60be49e5aa4ef81d08b746a1b4e2`；在线文件实际在`gh-pages`分支。
- **授权边界明确**：main分支Skill文档与脚本[AGPL-3.0](https://github.com/op7418/guizang-game-skill/blob/main/LICENSE)。README另写：演示游戏美术、模型、配音、配乐、文案©2026歸藏，保留全部权利，未经许可不得转载、改名再发布或商用。[gh-pages HTML头部](https://github.com/op7418/guizang-game-skill/blob/gh-pages/index.html#L1)重复该声明。公开可读不等于允许复制演示内容；当前不导入其素材，也不拷贝AGPL代码进入现有工程。
- [公开打包脚本](https://github.com/op7418/guizang-game-skill/tree/main/scripts)支持单HTML/静态网站/受限离线容器；README的约8MiB、不可联网、不可WASM指小红书小工具，不是微信小游戏4MiB说明。

### 实际源码/文档所示技术要点

- [combat-feel.md镜头](https://github.com/op7418/guizang-game-skill/blob/main/references/combat-feel.md#L35)：镜头取地形高度下限；遮挡物到“镜头—人物”连线的横向距离不足时淡出；连排障碍可用胶囊碰撞，避免相邻圆碰撞形成凹角挂人。
- [pitfalls.md](https://github.com/op7418/guizang-game-skill/blob/main/references/pitfalls.md#L20)：关闭可走区域前检查玩家没有被留在孤岛；解不开碰撞时退回上一合法帧；手动逐帧测试需依据游戏时间而非墙钟定时器。
- [公开演示JS](https://github.com/op7418/guizang-game-skill/blob/gh-pages/game.cdb73b9b.js)为795,368字节bundle（同时含Three.js，不是清晰独立游戏源码）。只读确认：`gm`镜头更新里做跟随平滑、焦点最大偏离3.6、相机y至少`Xn(camera.x,camera.z)+1.8`；`jt.userData.occluders`循环把物体投影到camera-player水平线段，横向距离小于半径且位于人物前时将alpha目标设0.16，随dt平滑，并同步调整depthWrite/castShadow；调试端暴露`T.step/T.info/T.press/T.spawn`便于确定性自测。该项目是完整3D动作演示，不是Verdant式层图管线。

## 对H30可采纳的独立实现

1. 保留现有3D场景和高度/碰撞/桥梁作为逻辑世界；固定样关镜头，以本项目自己的GLB/美术烘焙视觉层，避免把一张场景截图误当作可走地面。
2. 山门地基/可走台阶与屋檐层分开；古松树干/上冠分开。所有层的pivot明确绑定真实世界接地点，角色在层之间移动要由深度/遮挡关系决定，不只写死“永远在前”。
3. 出生→古松→横枝下→台阶上的路径取同一个真实height查询；脚影同样取脚下高度/法线，人物上阶时身体、脚影、遮挡同时变化，才能证明2.5D有空间层次。
4. 一屏手机样关优先较少牌面、固定atlas tile、alphaTest/depthWrite；软接触影+烘焙环境影可先达到稳定光向，再按预算决定是否开动态阴影。不要搬用Verdant桌面28万草实例/3M三角预算。
5. 验收应有确定性位置/角度/镜头冻结与逐帧钩子，并实录真实输入。图像或层图加载成功只能证明加载，不能代替脚下高度和实际通路测试。
