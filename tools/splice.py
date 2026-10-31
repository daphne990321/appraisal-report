# usage: splice.py target.js patch.js  -- replaces top-level functions/vars in target with those in patch; appends new ones before marker '/*APPEND*/' or at end
import re,sys
tgt=open(sys.argv[1],encoding='utf-8').read(); pat=open(sys.argv[2],encoding='utf-8').read()
def funcend(s,st):
    i=s.find('{',st); d=0; q=None
    while i<len(s):
        ch=s[i]
        if q:
            if ch=='\\': i+=2; continue
            if ch==q: q=None
        elif ch in '\'"`': q=ch
        elif ch=='{': d+=1
        elif ch=='}':
            d-=1
            if d==0: return i+1
        i+=1
    return None
def chunks(s):
    # split into top-level items starting with 'function NAME(' or 'var NAME' at line start
    idx=[(m.start(),m.group(2)) for m in re.finditer(r'(?m)^(function\s+([\w$]+)\s*\(|var\s+([\w$]+)\s*=)',s)]
    out=[]
    for i,(st,nm) in enumerate(idx):
        m=re.match(r'(?:function\s+([\w$]+)|var\s+([\w$]+))',s[st:]); nm=m.group(1) or m.group(2)
        en=idx[i+1][0] if i+1<len(idx) else len(s)
        # stop at section comment
        seg=s[st:en]; k=seg.find('\n/* =====')
        if k>=0: en=st+k+1
        if s[st:].startswith('function'):
            fe=funcend(s,st)
            if fe and fe<en:
                # include rest of line
                nl=s.find('\n',fe); en=(nl+1) if nl>=0 else len(s)
        out.append((nm,st,en))
    return out
pc=chunks(pat); tc={n:(a,b) for n,a,b in chunks(tgt)}
repl=[];app=[]
for n,a,b in pc:
    body=pat[a:b].rstrip('\n')+'\n'
    if n in tc: repl.append((tc[n][0],tc[n][1],body))
    else: app.append(body)
for a,b,body in sorted(repl,reverse=True): tgt=tgt[:a]+body+tgt[b:]
if app:
    mk='/*APPEND*/'
    if mk in tgt: tgt=tgt.replace(mk,''.join(app)+mk)
    else: tgt=tgt.rstrip('\n')+'\n'+''.join(app)
open(sys.argv[1],'w',encoding='utf-8').write(tgt)
print('replaced',[n for n,a,b in pc if n in tc],'appended',[n for n,a,b in pc if n not in tc])
