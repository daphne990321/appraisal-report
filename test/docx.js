const E=require('../lib/engine').load(), D=require('docx'), fs=require('fs');
const A=E.fresh(); E.setA(A); const out=process.argv[2]||'/tmp/claude-0/-home-claude/20ea517e-a864-5895-809c-fd3316cbf2c6/scratchpad/';
(async()=>{ for (const c of A.cases){ const M=A.models[0], k=E.calc(c,M), v=E.validate(c,k);
  const bl=E.REPORT.build(c,k,v,{kind:E.kindOf(c.kind), cn:E.CALC.cnAmount, inds:E.indsOf(M,c), exp:E.expOf(M,c), selText:E.selText(M)});
  const doc=E.REPORT.toDocx(bl,D,{office:c.appraiser.office,caseNo:c.id}); const buf=await D.Packer.toBuffer(doc); fs.writeFileSync(out+'r_'+c.id+'.docx',buf); console.log(c.id,buf.length); } })();
