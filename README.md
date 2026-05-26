# 生日倒计时网页

这是一个纯静态网页，可以直接绑定到你买的域名上。生日当天到达 `config.js` 里的时间后，页面会自动从倒计时切换成生日内容。

## 修改内容

打开 `config.js`，改这几项：

- `friendName`: 朋友名字
- `birthdayDate`: 生日当天的开始时间，例如 `2026-08-18T00:00:00+08:00`
- `countdownMessage`: 生日之前显示的话
- `birthdayMessage`: 生日当天开始显示的话
- `birthdayNote`: 生日当天额外显示的话

## 本地预览

```bash
python3 -m http.server 5173
```

然后打开 `http://localhost:5173`。

## 绑定域名

最简单的部署方式是 Vercel 或 Netlify：

1. 把这个文件夹上传到 GitHub。
2. 在 Vercel 或 Netlify 新建项目，选择这个仓库。
3. 部署完成后，在平台里添加你的域名。
4. 按平台提示去域名购买处添加 DNS 记录。

如果你准备用自己的服务器，也可以把整个文件夹上传到 Nginx/Apache 的网站目录。
