# 原创森林敌人图集

运行文件为 `atlas.webp`（1024×512、透明RGBA、无损，约416KB）和 `atlas.json`。`atlas.png` 是逐像素一致的PNG备份；`source.png` 是1774×887的原创生成高清源。

图集固定4列×2行，每格256×256。第一行从左至右：`seed-idle`、`moth-idle`、`shroom-idle`、`boss-idle`；第二行为相应的 `*-attack`。`*-walk` 在JSON的aliases中指向同物种动作格。生物朝屏幕左下，可水平镜像。

`frames`为数组，每项的`rect`／`x,y,w,h`是整张纹理中的源像素矩形；`anchor`和`bounds`是相对本格的像素值。默认锚点(128,232)。同物种两帧使用相同绘制缩放，避免每次按单帧包围盒重新归一化导致身体呼吸式缩放。alpha以外没有地板、投影或白底。

透明余量会影响整格绘制高度。为让玩家实际看到的生物分别约50、50、52、120 CSS px高，请采用JSON `species`中的 `recommendedCellDrawHeightCSS`（约68.45、71.91、81.67、146.29），或以 `nominalBodyHeightPixels`推算固定比例。不要把256像素整格直接缩成50 CSS px后再认为生物本体有50 px。

赭色苔甲小兽以厚甲、獠牙和暖眼辨识；紫蓝荆棘蛾以奶白月斑和尖翼辨识；灰青蘑菇术士以帽檐下的双眼、披风和伸出短杖辨识；古木鹿首领以树状鹿角、鹿身和胸前小金色弱点辨识。使用冷青苔绿森林色、左上暖光、45°斜俯视的日式厚涂体积。未使用Ragnarok Online素材或其他第三方游戏角色素材。

画面由OpenAI ImageGen按原创描述生成，再用同工具修正完整轮廓与透明背景。`build-atlas.py`只做技术裁切、同物种统一尺度装帧、极低alpha噪声清除和无损编码。`technical-qa.json`保存尺寸、SHA、透明护边、WebP/PNG逐像素一致检查。`preview-css.png`是在纯色底上的真实CSS尺寸诊断拼图，不是游戏运行截图。

复作技术图集：

```sh
python forest-sample/assets/enemies/build-atlas.py
```

这份组件交付没有运行游戏或测帧率；实际森林场景内的遮挡、敌人数量、战斗反馈由主任务接入后验证。
