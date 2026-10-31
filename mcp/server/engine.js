/* 在 Node 中載入估價核心（與網頁共用同一份程式碼） */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
function load(coreDir){
  coreDir = coreDir || path.join(__dirname, '..', 'core');
  const rd = f => fs.readFileSync(path.join(coreDir, f), 'utf8');
  const raw = fs.existsSync(path.join(coreDir, 'data_j.txt')) ? rd('data_j.txt').replace(/\n$/, '') : '';
  const src = rd('calc.js') + '\n' + rd('data.js').replace('__RAW_J__', raw) + '\n' + rd('app1.js') + '\n' + rd('report.js') +
    '\n;this.__x={CALC:CALC,REPORT:REPORT,blankCase:blankCase,sampleCase:sampleCase,sampleLand:sampleLand,sampleHotel:sampleHotel,defaultModel:defaultModel,calc:calc,validate:validate,selText:selText,marketStats:marketStats,filteredSales:filteredSales,indsOf:indsOf,expOf:expOf,kindOf:kindOf,KINDS:KINDS,FACTOR_SETS:FACTOR_SETS,PURPOSES:PURPOSES,BTYPES:BTYPES,COUNTIES:COUNTIES,importLvr:importLvr,newComp:newComp,fresh:fresh,isLandKind:isLandKind,BUILTIN:BUILTIN,setA:function(a){A=a;},getA:function(){return A;}};';
  const store = {};
  const ctx = { console, Math, Date, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt, RegExp, Error,
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } }, setTimeout: () => 0, clearTimeout: () => {} };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'core.js' });
  return ctx.__x;
}
module.exports = { load };
