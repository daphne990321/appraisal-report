const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1300,height:900}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.route('https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js', r=>r.fulfill({body:fs.readFileSync('node_modules/docx/dist/index.iife.js','utf8'), contentType:'application/javascript'}));
  await pg.addInitScript(()=>{ window.__saved=null; window.claude={use:n=>Promise.resolve(n==='downloads'?{save:o=>{ window.__saved={name:o.filename, size:o.data.size||o.data.length}; return Promise.resolve({status:'saved'}); }}:null)}; });
  await pg.goto('file:///home/claude/apx/dist/generator.html'); await pg.waitForTimeout(300);
  for (const id of ['115-0412','115-0420','115-0431']){ await pg.evaluate(id=>{A.caseId=id;A.tab='report';render();},id); await pg.click('[data-act="docx"]'); await pg.waitForFunction(()=>window.__saved,null,{timeout:15000}); console.log(await pg.evaluate(()=>window.__saved)); await pg.evaluate(()=>window.__saved=null); }
  await pg.click('[data-act="exportCase"]'); await pg.waitForFunction(()=>window.__saved); console.log(await pg.evaluate(()=>window.__saved));
  // setKind test
  await pg.evaluate(()=>{A.caseId='115-0412'; A.tab='data'; A.dataSub='subject'; render();}); await pg.click('[data-act="setKind"][data-v="commercial"]');
  console.log(await pg.evaluate(()=>[cur().kind, JSON.stringify(cur().methods), calc(cur()).fin.unit]));
  console.log('errors',errs); await b.close(); })();
