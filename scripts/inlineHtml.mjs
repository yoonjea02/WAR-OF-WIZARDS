// dist-single 의 JS/CSS 를 index.html 하나로 합친다.  실행: npm run build:demo
import fs from 'node:fs'
import path from 'node:path'

const dir = 'dist-single'
const assets = path.join(dir, 'assets')
const jsFile = fs.readdirSync(assets).find(f => f.endsWith('.js'))
const cssFile = fs.readdirSync(assets).find(f => f.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('dist-single/assets 에 js/css 가 없습니다. 먼저 vite build 를 실행하세요.')

const js = fs.readFileSync(path.join(assets, jsFile), 'utf8').replaceAll('</script', '<\\/script')
const css = fs.readFileSync(path.join(assets, cssFile), 'utf8').replaceAll('</style', '<\\/style')

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>War of Wizards — UI 프로토타입</title>
<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);color-scheme:dark}html,body{background:#06060f}</style>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`
const out = path.join(dir, 'war-of-wizards-demo.html')
fs.writeFileSync(out, html)
console.log(`${out}  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)
