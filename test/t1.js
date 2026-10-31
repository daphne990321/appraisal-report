const E = require('../lib/engine').load();
const A = E.fresh(); E.setA(A);
for (const c of A.cases){
  const M = A.models[0], k = E.calc(c, M), v = E.validate(c, k);
  console.log('==', c.id, c.kind, 'comp', k.comp.unit, 'inc', k.inc.unit, 'cost', k.cost.unit, 'land', k.land.unit, 'fin', k.fin.unit, k.fin.totalWan, k.fin.yuan);
  if (k.parcels) console.log('  parcels ping', k.parcels.ping.toFixed(2), 'total', k.parcels.total, 'tax', k.parcels.tax);
  console.log('  bl:', v.bl.map(x=>x.t).join(' | '));
  const blocks = E.REPORT.build(c, k, v, {kind:E.kindOf(c.kind), cn:E.CALC.cnAmount, inds:E.indsOf(M,c), exp:E.expOf(M,c), selText:E.selText(M), marketStats:null});
  console.log('  blocks', blocks.length, 'html', E.REPORT.toHTML(blocks).length);
}
