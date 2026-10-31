const { chromium } = require('playwright');
const P=require('path'), path=P.join(__dirname,'..','dist','generator.html'), SH=P.join(__dirname,'out','shots')+'/'; require('fs').mkdirSync(SH,{recursive:true});
(async()=>{
  const b=await chromium.launch(); 
  for (const vp of [{w:1360,h:900,n:'d'},{w:390,h:844,n:'m'}]){
    const pg=await b.newPage({viewport:{width:vp.w,height:vp.h}});
    const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
    await pg.goto('file://'+path); await pg.waitForTimeout(300);
    const cases=await pg.evaluate(()=>A.cases.map(c=>c.id));
    for (const id of cases){
      await pg.evaluate(id=>{A.caseId=id; render();}, id);
      for (const t of ['report','data','final','survey','params','comp','income','cost','land']){
        await pg.evaluate(t=>{A.tab=t; render();}, t);
        if (t==='data') for (const s of ['subject','sales','rents','cost']) await pg.evaluate(s=>{A.dataSub=s; render();}, s);
        if (t==='params') for (const s of ['model','select','adjust','weights','income','lda','sources','cost','texts','check']) await pg.evaluate(s=>{A.paramSub=s; render();}, s);
      }
      await pg.evaluate(()=>{A.tab='report'; A.ui.sheet=null; render();});
      if (vp.n==='d') await pg.screenshot({path:SH+id+'_report.png', fullPage:false});
      const txt=await pg.evaluate(()=>document.querySelector('article.paper').innerText.length);
      console.log(vp.n, id, 'report chars', txt);
    }
    // new case flow
    await pg.evaluate(()=>{A.ui.sheet='newcase'; render();});
    await pg.click('[data-act="newKind"][data-v="land"]');
    const nk=await pg.evaluate(()=>[cur().id, cur().kind, A.tab]); console.log('new', nk);
    if (vp.n==='d'){ await pg.screenshot({path:SH+'newland_data.png', fullPage:true}); await pg.evaluate(()=>{A.caseId='115-0420'; A.tab='land'; render();}); await pg.screenshot({path:SH+'land_tab.png', fullPage:true});
      await pg.evaluate(()=>{A.tab='comp'; render();}); await pg.screenshot({path:SH+'land_comp.png', fullPage:true});
      await pg.evaluate(()=>{A.tab='final'; render();}); await pg.screenshot({path:SH+'land_final.png', fullPage:true});
      await pg.evaluate(()=>{A.caseId='115-0431'; A.tab='income'; render();}); await pg.screenshot({path:SH+'hotel_income.png', fullPage:true});
    } else { await pg.evaluate(()=>{A.caseId='115-0420'; A.tab='data'; A.dataSub='subject'; render();}); await pg.screenshot({path:SH+'m_land_data.png', fullPage:false}); 
      const ov=await pg.evaluate(()=>document.documentElement.scrollWidth); console.log('mobile scrollWidth', ov); }
    // setKind
    await pg.evaluate(()=>{A.caseId='115-0412'; A.tab='data'; A.dataSub='subject'; render();});
    console.log(vp.n,'errors', errs.slice(0,5));
    await pg.close();
  }
  await b.close();
})();
