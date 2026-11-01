# 万象人生 · 云端漫游｜京都 P0.5.1

此仓库预定用于单独部署京都实景互动试验版，与 `roompath-game` 的《夜楼档案》完全分离。

## 网站

目标地址（**未部署，不代表现已可访问**）：`https://d7gkdrs4pk-gif.github.io/wanxiang-cloud-tour/`

项目首页为 `index.html`，分享二维码与好友邀请使用该地址。程序为无框架、无后台的单页静态 HTML，依赖 Wikimedia 公共照片的远程缩略图服务；手机联网才能加载景色。暂不收费。

## 推荐部署

创建**独立 Public 仓库** `d7gkdrs4pk-gif/wanxiang-cloud-tour`，把本目录的文件放入 `main` 根目录；仓库 Settings → Pages → Build and deployment → Source 选择 `Deploy from a branch`，Branch 选择 `main`、Folder 选择 `/(root)`，保存。

不要复制原 `roompath-game` 的 GitHub Actions 部署工作流到本仓库。避免两个项目共用 Pages 版本与发布状态。

### 本版最小验收

- 首页打开，真实照片加载，手机无重叠；
- 任意路线可前进、返回、结束；
- 生成海报仅显示“京都旅行明信片”，不显示挑战与排名；
- 二维码及复制的分享网址以 `https://d7gkdrs4pk-gif.github.io/wanxiang-cloud-tour/` 开头；
- 朋友打开分享链接看到风景邀请，以及“我也想去看看”；
- GitHub Pages deployment 结论 success，HTTPS 实际返回页面。

### 注意事项

- 由于同一账号的 github.io 是相同 origin，原旧路径下当前浏览器的 `localStorage` 进度可能被新路径沿用；该功能不是跨设备云存档。
- 当前功能依赖第三方照片远程URL；部署成功不代表所有照片均可加载。
- 源文件最小更改仅为 `SHARE_URL` 的目标域名路径，未修改故事、交互、图片列表及奖励机制。
- 来源、署名、部分尚待复核的许可记录见 [`CREDITS.md`](CREDITS.md)。正式售卖前应完成版权和相关合规检查。