/* 在 Node 中載入估價核心（與網頁共用同一份程式碼）。core/ 各檔結尾有 module.exports，直接 require，不再串接檔案文字執行 */
'use strict';
const path = require('path');
const NEED = ['CALC','REPORT','blankCase','sampleCase','sampleLand','sampleHotel','defaultModel','calc','validate','findModel','modelOf','selText','marketStats','filteredSales','indsOf','expOf','kindOf','KINDS','FACTOR_SETS','PURPOSES','BTYPES','COUNTIES','importLvr','newComp','fresh','isLandKind','BUILTIN'];
function load(coreDir){
  coreDir = coreDir || path.join(__dirname, '..', 'core');
  const CALC = require(path.join(coreDir, 'calc.js')), D = require(path.join(coreDir, 'data.js')), M = require(path.join(coreDir, 'model.js')), REPORT = require(path.join(coreDir, 'report.js'));
  const x = Object.assign({}, D, M, { CALC, REPORT });
  NEED.forEach(n => { if (x[n] === undefined) throw new Error('核心缺少匯出：' + n); });
  return x;
}
module.exports = { load };
