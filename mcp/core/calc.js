/*CALC-START*/
var CALC = (function(){
  function n(x){ var v = Number(x); return isFinite(v) ? v : 0; }
  function r2(x){ return Math.round(x*100)/100; }
  function roundTo(x, dec){ var p = Math.pow(10, dec); return Math.round(x*p)/p; }
  function sum(arr, f){ return arr.reduce(function(a,x){ return a + n(f ? f(x) : x); }, 0); }
  function monthsBetween(ym, priceDate){
    if (!ym || !priceDate) return 0;
    var a = String(ym).split('-'), b = String(priceDate).split('-');
    if (a.length < 2 || b.length < 2) return 0;
    return (n(b[0])-n(a[0]))*12 + (n(b[1])-n(a[1]));
  }
  function yearsBetween(d1, d2, exact){
    if (!d1 || !d2) return 0;
    var a = new Date(String(d1).length===7 ? d1+'-01' : d1), b = new Date(String(d2).length===7 ? d2+'-01' : d2);
    if (isNaN(a) || isNaN(b)) return 0;
    var y = Math.max(0, (b - a) / (365.2425*24*3600*1000));
    return exact ? y : Math.floor(y);
  }
  /* ---- 比較法：百分率法／差額法 ---- */
  function cellVal(c, ind, mode, inputMode){
    var a = (c.adj && c.adj[ind.id]) || {};
    if (mode === 'diff') return inputMode === 'grade' ? n(a.lv)*n(ind.stepAmt) : n(a.amt);
    return inputMode === 'grade' ? n(a.lv)*n(ind.step) : n(a.pct);
  }
  function dateAdjOf(c, S, priceDate){
    if (S.dateMode === 'auto' && !c.dateManual) return r2(monthsBetween(c.date, priceDate) * n(S.monthlyRate));
    return n(c.dateAdj);
  }
  /* 差異百分率偏離率權重：w = (2 − 差異絕對值加總 ÷ 平均) ÷ 件數（與實務報告 47/21/32、13/29/58 相符） */
  function deviationWeights(sums){
    var m = sums.length ? sum(sums)/sums.length : 0;
    if (!(m > 0)) return sums.map(function(){ return Math.round(1000/sums.length)/10; });
    var raw = sums.map(function(x){ return Math.max(0, 2 - x/m); }), t = sum(raw) || 1;
    var w = raw.map(function(x){ return Math.round(x/t*100); }), d = 100 - sum(w);
    if (d && w.length){ var k = w.indexOf(Math.max.apply(null, w)); w[k] += d; }
    return w;
  }
  function compCalc(comps, inds, S, priceDate, mode, inputMode, expRows, subjFlags, opt){
    opt = opt || {};
    var rows = comps.map(function(c){
      var cond = n(c.cond), date = dateAdjOf(c, S, priceDate);
      var p0 = n(c.price), bargain = c.priceType === 'ask' ? n(c.bargain) : 0, pEff = p0*(1-bargain/100);
      var volRatio = (opt.volumeBasis && n(c.far) > 0 && n(opt.subjFar) > 0) ? n(opt.subjFar)/n(c.far) : 1;
      var volPrice = (opt.volumeBasis && n(c.far) > 0) ? pEff/(n(c.far)/100) : null;
      var base = pEff * (1+cond/100) * (1+date/100);
      var items = inds.map(function(ind){ var v = cellVal(c, ind, mode, inputMode); return {id:ind.id, group:ind.group, v:v, pct: mode==='diff' ? (base>0 ? v/base*100 : 0) : v}; });
      (expRows||[]).forEach(function(e){
        var d = ((subjFlags && subjFlags[e.id]) ? n(e.pct) : 0) - ((c.flags && c.flags[e.id]) ? n(e.pct) : 0);
        items.push({id:'x:'+e.id, group:e.group, v: mode==='diff' ? r2(base*d/100) : d, pct:d, exp:true});
      });
      var r = 0, i = 0, rv = 0, iv = 0, maxItem = 0;
      items.forEach(function(it){ if (it.group === 'region'){ r += it.pct; rv += it.v; } else { i += it.pct; iv += it.v; } maxItem = Math.max(maxItem, Math.abs(it.pct)); });
      var trial, factor;
      if (mode === 'diff'){ trial = r2((base + rv + iv)*volRatio); factor = pEff > 0 ? (base + rv + iv)/pEff : 1; }
      else { r = r2(r); i = r2(i); factor = (1+cond/100)*(1+date/100)*(1+r/100)*(1+i/100); trial = r2(pEff * factor * volRatio); }
      var absSum = Math.abs(cond) + Math.abs(date) + items.reduce(function(a,it){ return a + Math.abs(it.pct); }, 0);
      var total = S.totalMode === 'compound' ? Math.abs(factor-1)*100 : Math.abs(cond)+Math.abs(date)+Math.abs(r)+Math.abs(i);
      var viol15 = Math.abs(r) > n(S.lim15) || Math.abs(i) > n(S.lim15) || maxItem > n(S.lim15);
      var viol30 = total > n(S.lim30);
      var specialUnadjusted = !!c.special && cond === 0;
      var usable = c.include !== false && (!(viol15 || viol30) || !!c.exception) && !specialUnadjusted && n(c.price) > 0;
      return {items:items, r:r, i:i, rv:rv, iv:iv, cond:cond, date:date, maxItem:maxItem, total:total, viol15:viol15, viol30:viol30, trial:trial, usable:usable, specialUnadjusted:specialUnadjusted, weight:n(c.weight),
        pEff:pEff, bargain:bargain, volRatio:volRatio, volPrice:volPrice, factor:factor, absSum:absSum};
    });
    var used = rows.filter(function(x){ return x.usable; });
    if (S.weightMode === 'deviation' && used.length){
      var w = deviationWeights(used.map(function(x){ return x.absSum; }));
      used.forEach(function(x,k){ x.weight = w[k]; });
      rows.forEach(function(x){ if (!x.usable) x.weight = 0; });
    }
    if (S.weightMode === 'inverse' && used.length){
      var inv = used.map(function(x){ return 1/(1+x.total); }), s = sum(inv);
      used.forEach(function(x,k){ x.weight = Math.round(inv[k]/s*1000)/10; });
      rows.forEach(function(x){ if (!x.usable) x.weight = 0; });
    }
    var trials = used.map(function(x){ return x.trial; });
    var hi = trials.length ? Math.max.apply(null, trials) : 0, lo = trials.length ? Math.min.apply(null, trials) : 0;
    var gap = trials.length >= 2 ? (hi-lo)/((hi+lo)/2)*100 : 0;
    var wSum = sum(used, function(x){ return x.weight; });
    var unitRaw = wSum > 0 ? sum(used, function(x){ return x.trial*x.weight; }) / wSum : null;
    return {rows:rows, usedCount:used.length, gap:gap, wSum:wSum, unitRaw:unitRaw, unit: unitRaw === null ? null : roundTo(unitRaw, n(S.unitDec))};
  }
  /* ---- 計量模型分析法（OLS） ---- */
  function gammln(x){ var c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5]; var y=x, t=x+5.5; t-=(x+0.5)*Math.log(t); var s=1.000000000190015; for (var j=0;j<6;j++){ y+=1; s+=c[j]/y; } return -t+Math.log(2.5066282746310005*s/x); }
  function betacf(a,b,x){ var MAXIT=200, EPS=3e-12, FPMIN=1e-300, qab=a+b, qap=a+1, qam=a-1, c=1, d=1-qab*x/qap; if (Math.abs(d)<FPMIN) d=FPMIN; d=1/d; var h=d;
    for (var m=1;m<=MAXIT;m++){ var m2=2*m, aa=m*(b-m)*x/((qam+m2)*(a+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN) d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN) c=FPMIN; d=1/d; h*=d*c;
      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN) d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN) c=FPMIN; d=1/d; var del=d*c; h*=del; if (Math.abs(del-1)<EPS) break; } return h; }
  function betai(a,b,x){ if (x<=0) return 0; if (x>=1) return 1; var bt=Math.exp(gammln(a+b)-gammln(a)-gammln(b)+a*Math.log(x)+b*Math.log(1-x)); return x<(a+1)/(a+b+2) ? bt*betacf(a,b,x)/a : 1-bt*betacf(b,a,1-x)/b; }
  function invert(M){ var k=M.length, A=M.map(function(r,i){ return r.concat(M.map(function(_,j){ return i===j?1:0; })); });
    for (var c=0;c<k;c++){ var p=c; for (var r=c+1;r<k;r++) if (Math.abs(A[r][c])>Math.abs(A[p][c])) p=r; if (Math.abs(A[p][c])<1e-12) return null; var tmp=A[c]; A[c]=A[p]; A[p]=tmp;
      var pv=A[c][c]; for (var j=0;j<2*k;j++) A[c][j]/=pv; for (var r2_=0;r2_<k;r2_++){ if (r2_===c) continue; var f=A[r2_][c]; if (f) for (var j2=0;j2<2*k;j2++) A[r2_][j2]-=f*A[c][j2]; } }
    return A.map(function(r){ return r.slice(k); }); }
  function ols(X, y){
    var nObs = y.length, k = X[0].length; if (nObs <= k) return null;
    var XtX = [], Xty = [];
    for (var a=0;a<k;a++){ XtX.push([]); Xty.push(0); for (var b=0;b<k;b++){ var s=0; for (var r=0;r<nObs;r++) s+=X[r][a]*X[r][b]; XtX[a].push(s); } for (var r3=0;r3<nObs;r3++) Xty[a]+=X[r3][a]*y[r3]; }
    var inv = invert(XtX); if (!inv) return null;
    var beta = inv.map(function(row){ return row.reduce(function(s,v,j){ return s + v*Xty[j]; },0); });
    var mean = sum(y)/nObs, sse=0, sst=0;
    for (var r4=0;r4<nObs;r4++){ var fit=0; for (var j=0;j<k;j++) fit+=X[r4][j]*beta[j]; sse+=(y[r4]-fit)*(y[r4]-fit); sst+=(y[r4]-mean)*(y[r4]-mean); }
    var p = k-1, df2 = nObs-k, mse = sse/df2, r2v = sst>0 ? 1-sse/sst : 0, adj = 1-(1-r2v)*(nObs-1)/df2;
    var F = p>0 && mse>0 ? ((sst-sse)/p)/mse : 0;
    var pval = p>0 ? betai(df2/2, p/2, df2/(df2+p*F)) : 1;
    var se = inv.map(function(row,i){ return Math.sqrt(Math.max(0,row[i]*mse)); });
    return {beta:beta, se:se, n:nObs, k:p, r2:r2v, adjR2:adj, F:F, p:pval};
  }
  /* ---- 收益法 ---- */
  function loanConstant(rate, years){ var r=n(rate)/100, t=n(years); if (t<=0) return 0; if (r===0) return 1/t; return r/(1-Math.pow(1+r,-t)); }
  function capRate(inc){
    var m = inc.capMode;
    if (m === 'risk'){ var R=inc.risk; return n(R.base)+n(R.liquidity)+n(R.risk)+n(R.growth)+n(R.mgmt); }
    if (m === 'extract'){ var rows=inc.extract.filter(function(x){ return n(x.price)>0; }); return rows.length ? sum(rows, function(x){ return n(x.noi)/n(x.price)*100; })/rows.length : 0; }
    if (m === 'wacc'){ return sum(inc.wacc, function(x){ return n(x.w)/100*n(x.k); }); }
    if (m === 'dcr'){ var d=inc.dcr; return n(d.dcr)*loanConstant(d.rate, d.years)*n(d.ltv)/100*100; }
    if (m === 'egim'){ return n(inc.egim.egim)>0 ? n(inc.egim.nir)/n(inc.egim.egim) : 0; }
    return n(inc.cap);
  }
  function incomeCalc(inc, area, T, S, expMult){
    var hotel = inc.revMode === 'hotel', rent = n(inc.rent), other = sum(inc.incomes, function(x){ return x.amt; });
    var roomRev = hotel ? n(inc.rooms)*n(inc.adr)*365*n(inc.occ)/100 : 0;
    var gross = hotel ? roomRev*(1+n(inc.otherPct)/100) + other : rent*12 + other;
    var loss = hotel ? 0 : rent*n(inc.vacMonths), egi = gross - loss;
    var expRaw = sum(inc.exp, function(x){ return x.amt; }), mult = (expMult === undefined || expMult === null) ? 1 : n(expMult);
    var pctCost = function(e){ var base = hotel ? e/(1+n(inc.otherPct)/100) : e; return base*n(inc.opexPct)/100 + e*n(inc.mgmtPct)/100; };
    var expSum = expRaw * mult + pctCost(egi);
    var buildCost = inc.costSource === 'manual' ? n(inc.manualCost) : T;
    var life = n(inc.life), dep = life > 0 ? buildCost*(1 - n(inc.salvage)/100)/life : 0;
    var noi = egi - expSum - dep, cap = capRate(inc), price = null, flows = null, terminal = null;
    if (inc.method === 'dcf'){
      var D = inc.dcf, Y = n(D.disc)/100, N = Math.max(1, Math.round(n(D.years))), depIn = D.deductDep ? dep : 0;
      var sw = n(D.switchYear) > 0 ? n(D.switchYear) : N, g1 = n(D.rentGrowth)/100, g2 = (D.rentGrowth2 === undefined || D.rentGrowth2 === '' ? n(D.rentGrowth) : n(D.rentGrowth2))/100;
      flows = []; var pv = 0, e = egi;
      for (var k=1;k<=N+1;k++){
        if (k>1) e = e*(1 + (k <= sw ? g1 : (k <= N ? g2 : 0)));
        var x = expRaw*mult*Math.pow(1+n(D.expGrowth)/100,k-1) + pctCost(e), cf = e - x - depIn;
        if (k<=N){ var d = cf/Math.pow(1+Y,k); pv += d; flows.push({k:k, egi:e, exp:x, dep:depIn, cf:cf, pv:d}); }
        else { terminal = n(D.termCap)>0 ? cf/(n(D.termCap)/100)*(1-n(D.sellCost)/100) : 0; } }
      var tpv = terminal/Math.pow(1+Y,N);
      price = pv + tpv; terminal = {value:terminal, pv:tpv, pvFlows:pv};
    } else price = cap > 0 ? noi/(cap/100) : null;
    var unitRaw = price !== null && area > 0 ? price/area/10000 : null;
    return {hotel:hotel, roomRev:roomRev, rent:rent, other:other, gross:gross, loss:loss, egi:egi, expSum:expSum, expRaw:expRaw, expMult:mult, pctPart:pctCost(egi), buildCost:buildCost, dep:dep, noi:noi, cap:cap, price:price, flows:flows, terminal:terminal, unitRaw:unitRaw, unit: unitRaw === null ? null : roundTo(unitRaw, n(S.unitDec))};
  }
  /* ---- 成本法 ---- */
  function costCalc(k, area, landShare, completed, priceDate, S){
    var idx = (k.indexPct === undefined || k.indexPct === '' ? 100 : n(k.indexPct))/100;
    var construction = k.conMethod === 'items' ? sum(k.items, function(x){ return n(x.qty)*n(x.price); }) : n(k.unitCost)*idx*10000*area;
    var design = construction*n(k.design)/100, extras = sum(k.extras, function(x){ return x.amt; });
    var extrasDep = sum(k.extras, function(x){ return n(x.amt)*n(x.depPct)/100; });
    var X = construction + design + extras;
    var g = (1 + n(k.interest)/100)*(1 + n(k.profit)/100), f = (n(k.adSell) + n(k.mgmt) + n(k.tax))/100;
    var T = (1 - f*g) > 0 ? X*g/(1 - f*g) : 0;
    var fees = T*f, interest = (X + fees)*n(k.interest)/100, profit = (X + fees + interest)*n(k.profit)/100;
    var age = k.ageManual ? n(k.age) : yearsBetween(completed, priceDate);
    var N = n(k.life), s = n(k.salvage)/100, t = Math.min(age, N), dep = 0, depNote = '';
    if (N > 0){
      if (k.depMethod === 'declining'){ if (s > 0){ var d = 1 - Math.pow(s, 1/N); dep = T*(1-Math.pow(1-d, t)); } else { dep = T*(1-s)*t/N; depNote = '定率法須殘餘價格率大於 0，暫以等速計算'; } }
      else if (k.depMethod === 'sinking'){ var i = n(k.sinkRate)/100; dep = i > 0 ? T*(1-s)*(Math.pow(1+i,t)-1)/(Math.pow(1+i,N)-1) : T*(1-s)*t/N; }
      else dep = T*(1-s)*t/N;
    }
    var extraLand = n(k.extraLand);
    var building = T - dep - extrasDep, land = n(k.landUnit)*10000*landShare + extraLand, price = land + building;
    var unitRaw = area > 0 ? price/area/10000 : null;
    return {idx:idx, extrasDep:extrasDep, extraLand:extraLand, construction:construction, design:design, extras:extras, fees:fees, interest:interest, profit:profit, T:T, age:age, dep:dep, depNote:depNote, building:building, land:land, price:price, unitRaw:unitRaw, unit: unitRaw === null ? null : roundTo(unitRaw, n(S.unitDec))};
  }
  /* ---- 土地開發分析法 ---- */
  /* 資本利息綜合利率試算表：建築投資計一半工期、土地投資計全期，再依投資額加權 */
  function capitalInterest(L, landAmt, bldAmt){
    var own = n(L.ownRatio)/100, rate = own*n(L.ownRate)/100 + (1-own)*n(L.loanRate)/100;
    var bRate = rate*n(L.buildMonths)/12/2, lRate = rate*n(L.landMonths)/12;
    var t = landAmt + bldAmt, wl = t > 0 ? landAmt/t : 0.5;
    return {rate:rate, bRate:bRate, lRate:lRate, wLand:wl, wBld:1-wl, i: wl*lRate + (1-wl)*bRate};
  }
  function floorUtil(L, f){
    var u = (L.utils || {})[f];
    if (u !== undefined && u !== '') return n(u);
    if (f === 1) return n(L.util1F || 200);
    return 100 + (f - (n(L.baseFloor) || 4)) * (n(L.utilStep) || 1);
  }
  function ldaDetailed(L, site, S){
    var far = n(L.far)/100, bonus = n(L.bonus)/100, N = Math.max(1, Math.round(n(L.floorsAbove))), B = Math.max(0, Math.round(n(L.floorsBelow)));
    var farFloor = site*far*(1+bonus), above = farFloor*(n(L.freeFactor)||1), below = site*n(L.digRate)/100*B, total = above + below;
    var saleable = farFloor*(n(L.saleFactor)||1), r1 = n(L.firstFloorRatio) || 1, typ = saleable/((N-1) + r1);
    var floors = [], Ssum = 0;
    for (var f=N; f>=1; f--){ var ar = f === 1 ? typ*r1 : typ, u = floorUtil(L, f), unit = n(L.baseUnit)*u/100, amt = ar*unit*10000; Ssum += amt; floors.push({f:f, area:ar, util:u, unit:unit, amt:amt}); }
    var cars = n(L.cars) > 0 ? Math.round(n(L.cars)) : (n(L.pingPerCar) > 0 ? Math.floor(below/n(L.pingPerCar)) : 0), carAmt = cars*n(L.carPrice)*10000; Ssum += carAmt;
    var C = total*n(L.conUnit)*(n(L.conIndex)||100)/100*10000;
    var design = C*n(L.design)/100, saleFees = Ssum*(n(L.adSell)+n(L.mgmt)+n(L.tax))/100, M = design + saleFees, R = n(L.profit)/100;
    var V = Ssum*0.3, ci = null, i = 0;
    for (var it=0; it<12; it++){
      if (L.iMode === 'input') i = n(L.iInput)/100;
      else if (L.iMode === 'formula'){ var lr = n(L.landRatio)/100; i = n(L.annualRate)/100*(lr + (1-lr)*0.5)*n(L.years); }
      else { ci = capitalInterest(L, Math.max(V,0), C); i = ci.i; }
      var V2 = Ssum/(1+R)/(1+i) - (C + M); if (Math.abs(V2-V) < 1) { V = V2; break; } V = V2;
    }
    return {detailed:true, farFloor:farFloor, above:above, below:below, total:total, saleable:saleable, floors:floors, cars:cars, carAmt:carAmt,
      S:Ssum, C:C, design:design, saleFees:saleFees, M:M, i:i, ci:ci, R:R, V:V};
  }
  function landCalc(L, area, S){
    if (L.mode === 'detailed'){ var d = ldaDetailed(L, n(L.site) || area, S), u = area > 0 ? d.V/area/10000 : null; d.unitRaw = u; d.unit = u === null ? null : roundTo(u, n(S.unitDec)); return d; }
    var Ssum = sum(L.sales, function(x){ return n(x.ping)*n(x.unit)*10000; });
    var C = n(L.floorArea)*n(L.conUnit)*10000;
    var design = C*n(L.design)/100, saleFees = Ssum*(n(L.adSell)+n(L.mgmt)+n(L.tax))/100, M = design + saleFees;
    var landRatio = n(L.landRatio)/100;
    var i = L.iMode === 'input' ? n(L.iInput)/100 : n(L.annualRate)/100*(landRatio + (1-landRatio)*0.5)*n(L.years);
    var R = n(L.profit)/100;
    var V = Ssum/(1+R)/(1+i) - (C + M);
    var unitRaw = area > 0 ? V/area/10000 : null;
    return {S:Ssum, C:C, design:design, saleFees:saleFees, M:M, i:i, R:R, V:V, unitRaw:unitRaw, unit: unitRaw === null ? null : roundTo(unitRaw, n(S.unitDec))};
  }
  function finalCalc(list, area, S){
    var m = list.filter(function(x){ return x.unit !== null && isFinite(x.unit); });
    var units = m.map(function(x){ return x.unit; });
    var hi = units.length ? Math.max.apply(null, units) : 0, lo = units.length ? Math.min.apply(null, units) : 0;
    var diff = units.length >= 2 ? (hi-lo)/((hi+lo)/2)*100 : 0;
    var wSum = sum(m, function(x){ return x.w; });
    var unit = null;
    if (m.length === 1) unit = m[0].unit;
    else if (m.length > 1 && wSum > 0) unit = roundTo(sum(m, function(x){ return x.unit*n(x.w); })/wSum, n(S.unitDec));
    var totalWan = unit === null ? null : roundTo(unit*area, n(S.totalDec));
    return {methods:m, diff:diff, wSum:wSum, unit:unit, totalWan:totalWan, yuan: totalWan === null ? null : Math.round(totalWan*10000)};
  }
  /* 公告土地現值計算之土地增值稅（一般稅率，不考慮長期持有減徵與自用住宅優惠） */
  function landVAT(p){
    var a = n(p.areaM2)*(p.share === undefined || p.share === '' ? 1 : n(p.share)), cur = n(p.annVal)*a, prev = n(p.prevVal)*(n(p.cpi)||100)/100*a, inc = cur - prev;
    if (!(inc > 0) || !(prev > 0)) return {cur:cur, prev:prev, inc:Math.max(0,inc), tax:0};
    var ratio = inc/prev, tax = ratio < 1 ? inc*0.2 : ratio < 2 ? inc*0.3 - prev*0.1 : inc*0.4 - prev*0.3;
    return {cur:cur, prev:prev, inc:inc, ratio:ratio, tax:Math.round(tax)};
  }
  /* 多筆土地逐筆計價：基地單價 × (1＋調整率)、公告現值 × 比例、或手動單價 */
  function parcelsCalc(parcels, baseUnit, S){
    var rows = (parcels||[]).map(function(p){
      var ping = n(p.areaM2)*(p.share === undefined || p.share === '' ? 1 : n(p.share))/3.30579, unit;
      if (p.priceMode === 'announced') unit = n(p.annVal)*3.30579*n(p.annPct || 100)/100/10000;
      else if (p.priceMode === 'manual') unit = n(p.unit);
      else unit = baseUnit === null || baseUnit === undefined ? null : n(baseUnit)*(1+n(p.adjPct)/100);
      if (unit !== null) unit = p.priceMode === 'base' || !p.priceMode ? roundTo(unit, Math.max(n(S.unitDec), 2)) : unit;
      var vat = landVAT(p);
      return {p:p, ping:ping, unit:unit, total: unit === null ? null : unit*ping*10000, vat:vat};
    });
    var total = rows.some(function(r){ return r.total === null; }) ? null : sum(rows, function(r){ return r.total; });
    return {rows:rows, ping:sum(rows,function(r){ return r.ping; }), m2:sum(rows,function(r){ return n(r.p.areaM2)*(r.p.share===undefined||r.p.share===''?1:n(r.p.share)); }), total:total, tax:sum(rows,function(r){ return r.vat.tax; })};
  }
  function discountFactor(rate, years){ return 1/Math.pow(1+n(rate)/100, n(years)); }
  function cnAmount(v){
    v = Math.round(v); if (!(v > 0)) return '零元整';
    var D='零壹貳參肆伍陸柒捌玖', U=['','拾','佰','仟'], B=['','萬','億','兆'];
    var groups=[]; while(v>0){ groups.push(v%10000); v=Math.floor(v/10000); }
    var out='';
    for (var gi=groups.length-1; gi>=0; gi--){
      var g=groups[gi];
      if (g===0){ if (out && out.slice(-1)!=='零') out+='零'; continue; }
      if (out && g<1000 && out.slice(-1)!=='零') out+='零';
      var gs='', zero=false;
      for (var k=3;k>=0;k--){ var d=Math.floor(g/Math.pow(10,k))%10;
        if (d===0){ if (gs) zero=true; } else { if (zero){ gs+='零'; zero=false; } gs+=D[d]+U[k]; } }
      out+=gs+B[gi];
    }
    return out.replace(/零+$/,'')+'元整';
  }
  return {deviationWeights:deviationWeights, capitalInterest:capitalInterest, ldaDetailed:ldaDetailed, floorUtil:floorUtil, landVAT:landVAT, parcelsCalc:parcelsCalc, discountFactor:discountFactor, roundTo:roundTo, compCalc:compCalc, ols:ols, capRate:capRate, loanConstant:loanConstant, incomeCalc:incomeCalc, costCalc:costCalc, landCalc:landCalc, finalCalc:finalCalc, cnAmount:cnAmount, monthsBetween:monthsBetween, yearsBetween:yearsBetween};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CALC;
/*CALC-END*/
