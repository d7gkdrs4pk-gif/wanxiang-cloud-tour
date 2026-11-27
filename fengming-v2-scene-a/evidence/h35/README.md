# H.35 实测证据

14.60秒原速正常UI录像sample-walk-sword.mp4；完整含启动源sample-full.webm。sample-playtest.json保存真实touch事件、逐帧位置/镜头/剑段/实际GPU统计、请求和时间。comparison-h34/与comparison/是同位390×844完整版本对比；no-fx/为真实单次挥剑六阶段canvas读回，没有摆拍。

云Linux WebKit26.5/WPE软件渲染，实测21.490FPS、MP4编码25FPS。iPhone/微信真机未测。15启动/恢复检查记录compatibility.json，nav/旧资源保持记录baseline-preserved.json。

私有参考视频/帧未放公共仓库；场景几何和继承自有纹理来源见对应035目录。路外缘仍规整，白天试版供用户亲玩判断。
