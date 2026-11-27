# H.32 测试证据

sample-walk-sword.mp4是原速11.80秒连续触控走位，sample-full.webm包含启动与完整源录制；sample-playtest.json保存逐帧时间、路线、命中和启动bundle来源。

实测18.5169FPS，MP4编码25FPS。环境是云Linux WebKit26.5/WPE软件渲染390×844，**不是iPhone/微信真机**。WPE报告的Apple GPU/Mac Safari是兼容字符串，不是真实硬件。compatibility.json的11项包含受控故障注入，不证明用户出错设备的唯一根因。

详细解释见project/SAMPLE_H32_QA.md。
