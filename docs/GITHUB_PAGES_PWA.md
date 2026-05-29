# GitHub Pages / PWA 發布流程

## 目標

把《海洋戰紀：異變追跡》發布成 HTTPS 網頁版，讓 Android 和 iPhone 都可以直接用網址遊玩。

## 發布方式

1. 在 GitHub 建立 repo。
2. 把本專案 push 到 repo 的 `main` 或 `master` 分支。
3. 到 GitHub repo 的 Settings -> Pages。
4. Source 選 GitHub Actions。
5. 等 Actions 跑完 `Deploy PWA to GitHub Pages`。
6. 打開 Pages 顯示的網址測試。

## 手機測試

Android:
- 用 Chrome 打開 GitHub Pages 網址。
- 可從瀏覽器選單安裝到主畫面。

iPhone:
- 用 Safari 打開 GitHub Pages 網址。
- 點分享按鈕，選「加入主畫面」。

## 載入策略

- 初次安裝只快取 app shell、manifest、icons。
- 關卡圖片、角色圖、卡牌、Boss 圖會在進入相關畫面時才下載。
- 劇情影片不預載、不進 service worker 快取，點入影片頁後才由瀏覽器串流下載。
- 下載過的非影片圖片可由 runtime cache 保留，下一次進入同關卡會比較快。

