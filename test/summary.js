/* 摘要式報告書（階段 C2）：欄位、勾選題、揭露、比較法試算表與 Word 輸出 */
const E=require('../lib/engine').load(), D=require('docx'), fs=require('fs'), path=require('path'), assert=require('assert');
const db=E.fresh(), M=db.models[0];
const ctxOf=(c,k)=>({kind:E.kindOf(c.kind), cn:E.CALC.cnAmount, inds:E.indsOf(M,c), exp:E.expOf(M,c), selText:E.selText(M), capName:''});
const run=c=>{ const k=E.calc(c,M,db), v=E.validate(c,k,db); return {k, v, bl:E.REPORT.buildSummary(c,k,v,ctxOf(c,k))}; };
const fmt=x=>Number(x).toLocaleString('zh-TW',{maximumFractionDigits:0});
const has=(h,s,msg)=>assert(h.indexOf(s)>=0, '缺少：'+(msg||s));
const not=(h,s,msg)=>assert(h.indexOf(s)<0, '不應出現：'+(msg||s));
(async()=>{
  /* 建物：115-0412 設為抵押權設定 */
  const c=JSON.parse(JSON.stringify(db.cases.find(x=>x.id==='115-0412')));
  c.basic.purpose='抵押權設定';
  c.chk={entered:'未能入內', photoByClient:true, useNow:'自用', nuis:['近高架道路'], noLien:true, area:{main:60, attach:10, common1:20, common2:10, park:0, other:0}};
  assert.strictEqual(E.reportFormat(c),'summary');
  const r=run(c), html=E.REPORT.toHTML(r.bl);
  has(html,'辦理金融機構不動產抵押貸款業務之不動產估價報告書');
  has(html,fmt(r.k.fin.yuan),'決定總價');
  has(html,'■自用'); has(html,'□出租'); has(html,'■未能入內'); has(html,'■近高架道路');
  has(html,'本次因故未能進入'); has(html,'內部照片係由委託人提供');
  has(html,'公設比 '+(Math.round(30/100*10000)/100).toFixed(2)+'%','公設比 30.00%');
  has(html,'無他項權利設定');
  r.k.comp.rows.forEach((row,i)=>{ if (c.comps[i].include!==false) has(html,E.REPORT.unitTxt(row.trial,r.k.S),'試算價格 '+i); });
  has(html,'推定比較價格'); has(html,'收益法試算表'); not(html,'成本法試算表','未採用成本法');
  not(html,'注意事項');
  /* 成本法與有他項權利 */
  const c2=JSON.parse(JSON.stringify(c)); c2.methods.cost=true; c2.chk.noLien=false; c2.chk.liens=[{order:'1',kind:'最高限額抵押權',amount:15600000,holder:'○○銀行'}];
  const h2=E.REPORT.toHTML(run(c2).bl); has(h2,'成本法試算表'); has(h2,'最高限額抵押權'); not(h2,'無他項權利設定');
  /* Word */
  const buf=await D.Packer.toBuffer(E.REPORT.toDocx(r.bl,D,{office:c.appraiser.office,caseNo:c.id})); assert(buf.length>2000);
  const out=process.argv[2]; if (out){ fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,buf); }
  /* 土地：預設敘述式；強制摘要式時不輸出建物題目 */
  const L=JSON.parse(JSON.stringify(db.cases.find(x=>x.id==='115-0420')));
  assert.strictEqual(E.reportFormat(L),'narrative');
  L.report=L.report||{}; L.report.format='summary'; L.chk={useNow:'閒置', ext:'有', bldgVacancy:5, roadW:'30 公尺以上'};
  const rl=run(L), hl=E.REPORT.toHTML(rl.bl);
  has(hl,'■閒置'); has(hl,'30 公尺以上'); not(hl,'增建情形','建物題目'); not(hl,'社區名稱','建物題目'); not(hl,'公設比');
  await D.Packer.toBuffer(E.REPORT.toDocx(rl.bl,D,{office:L.appraiser.office,caseNo:L.id}));
  console.log('摘要式報告測試通過');
})().catch(e=>{ console.error(e); process.exit(1); });
