const esbuild = require('esbuild');

const banner = `// ==UserScript==
// @name         ASMR Tracker
// @namespace    kuro-asmr
// @version      0.1.0
// @description  追蹤與管理 ASMR 內容，支援自訂播放清單
// @match        https://japaneseasmr.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// ==/UserScript==`;

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/asmr-tracker.user.js',
  banner: { js: banner },
  charset: 'utf8',
};

if (watch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  }).catch(err => { console.error(err); process.exit(1); });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Build complete: dist/asmr-tracker.user.js');
  }).catch(err => { console.error(err); process.exit(1); });
}
