# 万象人生 · 云端漫游｜京都 P0.9.3

## 当前项目状态表

更新日期：2026-11-04（北京时间）。本节为当前接续依据，末尾 P0.5.1 迁移记录仅作历史参考。

| 项目 | 当前状态 |
| --- | --- |
| 唯一正式工作母版 | `d7gkdrs4pk-gif/wanxiang-cloud-tour` 的 `main/index.html` |
| 页面版本 | `P0.9.3-test` |
| index.html SHA-256 | `4108dd937b46d616e3f28fee358fcba0bba850da94b4a4a088b1e25b85e6955c` |
| index.html Git Blob SHA-1 | `79f766d991ef2746ea1d539f98ba22641d8045e0` |
| 访问入口 | https://d7gkdrs4pk-gif.github.io/wanxiang-cloud-tour/ |
| 增量基线 | P0.9.2，提交 `ae15beadcd17ddaf58a52fae1938cc98fb8dc3bd` |
| 体验结构 | 20 景、两条完整路线、4 处延伸探索共 8 个实拍视角、原创 BGM、旅行明信片 |
| 商品阶段 | 内测原型；未启用收费 |

GitHub Pages 构建发布记录见 [Actions](https://github.com/d7gkdrs4pk-gif/wanxiang-cloud-tour/actions)。判断线上版本时须同时核对对应提交的部署结论与实际页面的 `application-version`，不从旧交接文案推断。

## 本轮交接与修改记录

本轮主目标：清理照片体验界面中残留的具体拍摄日期。

- P0.9.2 已删除延伸探索照片标签及其放大全图中的具体日期。
- P0.9.3 补齐主路线默认简介 1 处、可选地点介绍 8 处的具体拍摄年月日及时间；后者同时供“了解这一站”和主图放大后的“了解这里”使用。
- 去掉日期后仅作必要的语句衔接；地点、方向、观察提示、历史影像属性和现况限定保留。
- 素材日期、作者、来源与原图 URL 留在素材数据及 `CREDITS.md` 中；“来自不同时期的真实摄影”等真实性说明保留。
- 本次 `index.html` 只改变版本标记、`SHORT`、`PLACE_INFO` 三个源码行；其他源码行与基线逐字节相同。

## 已完成的必要核验

- 基线文件 Git Blob 与 GitHub 记录一致。
- JavaScript 语法检查通过。
- 20 个 `SHORT` 和 20 个 `PLACE_INFO` 项不再含具体拍摄年份日期。
- `MEDIA`、`SCENES`、`PAUSE_STOPS`、`PHOTO_VIEW` 数据与基线一致；20 景与 4×2 延伸结构保持。
- 9 处修改文案逐条独立复核通过。
- 发布前已在公网 P0.9.2 实际检查四条大桥两种延伸照片均加载为不同的实拍图片、可切换并放大；该检查不等同于 8 个视角全量加载验收或 iPhone 真机验收。

## 缺口与下一任务

1. 下一轮唯一主目标：完成 P0.9.3 的 iPhone 实际体验与图片加载核验，重点是 4 处延伸探索的 8 个视角是否真正显示不同照片，以及完整体验的实际时长；只处理实际发现的问题。
2. 远程照片在不同网络下的可用性尚未全面验证。若进入备用照片，应明确识别，不把回退原图算作新视角加载成功。
3. 原始照片像素内有无日期水印未作逐张专项检查；本轮清理的是网页生成的拍摄日期文字。
4. 正式售卖前的逐张素材商用核验、收费与交付仍待独立完成。

冻结范围：20 景照片、两条路线、实拍视角配置、BGM、分享与明信片、素材来源记录。不得因本轮日期清理更换照片、引入 AI 景色、扩展城市或修改其他项目仓库。

<details>
<summary>历史资料：P0.5.1 独立迁移记录（不作为当前操作指引）</summary>

# 万象人生 · 云端漫游｜京都 P0.5.1

此仓库已独立保存京都实景互动试验版 P0.5.1，与 `roompath-game` 的《夜楼档案》完全分离。

## 网站

目标地址（**Pages 尚未启用，暂不能认定可以访问**）：`https://d7gkdrs4pk-gif.github.io/wanxiang-cloud-tour/`

项目首页为 `index.html`，分享二维码与好友邀请使用该地址。程序为无框架、无后台的单页静态 HTML，依赖 Wikimedia 公共照片的远程缩略图服务；手机联网才能加载景色。暂不收费。

## 推荐部署

仓库及四个文件已迁入 `main` 根目录。现在仅需在 [GitHub Pages 设置](https://github.com/d7gkdrs4pk-gif/wanxiang-cloud-tour/settings/pages) 中选择 `Deploy from a branch`，Branch 选择 `main`，Folder 选择 `/(root)` 并保存。随后核验 Pages Actions 部署是否成功及实际 HTTPS 页面。

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

</details>
