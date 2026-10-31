import os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d=os.path.join(root,'core')+'/'
os.makedirs(os.path.join(root,'dist'),exist_ok=True)
head=open(d+'head.html',encoding='utf-8').read()
raw=open(d+'data_j.txt',encoding='utf-8').read().rstrip('\n')
data=open(d+'data.js',encoding='utf-8').read().replace('__RAW_J__', raw)
parts=[open(d+'calc.js',encoding='utf-8').read(), data]+[open(d+f,encoding='utf-8').read() for f in ['model.js','app1.js','report.js','app2.js','app3.js','cloud.js']]
js='\n'.join(parts)
assert '</script' not in js
html='<!doctype html>\n<meta charset="utf-8">\n'+head.rstrip()+'\n\n<div id="app"></div>\n<div id="toast" class="toast" hidden role="status" aria-live="polite"></div>\n\n<script>\n'+js+'\n</script>\n'
open(os.path.join(root,'dist','generator.html'),'w',encoding='utf-8').write(html)
open(os.path.join(root,'dist','all.js'),'w',encoding='utf-8').write(js)
print(len(html))
