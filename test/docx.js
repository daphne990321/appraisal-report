const E=require('../lib/engine').load(), D=require('docx'), fs=require('fs'), path=require('path');
const db=E.fresh(); const out=process.argv[2]||path.join(__dirname,'out')+'/'; fs.mkdirSync(out,{recursive:true});
(async()=>{ for (const c of db.cases){ const M=db.models[0], k=E.calc(c,M,db), v=E.validate(c,k,db);
  const bl=E.REPORT.build(c,k,v,{kind:E.kindOf(c.kind), cn:E.CALC.cnAmount, inds:E.indsOf(M,c), exp:E.expOf(M,c), selText:E.selText(M)});
  const doc=E.REPORT.toDocx(bl,D,{office:c.appraiser.office,caseNo:c.id}); const buf=await D.Packer.toBuffer(doc); fs.writeFileSync(out+'r_'+c.id+'.docx',buf); console.log(c.id,buf.length); } })();
