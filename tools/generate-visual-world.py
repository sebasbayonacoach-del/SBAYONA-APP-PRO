#!/usr/bin/env python3
"""BAYONA original artwork: nine lightweight no-network illustrated scenes."""
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'media'/'visual-world'
out.mkdir(parents=True,exist_ok=True)
color={
'avatar':('#9C6BFF','#26184C'),'training':('#1EC5F1','#103A56'),
'nutrition':('#A6EC81','#234D37'),'recipes':('#FFAA6A','#59351B'),
'habits':('#4CDAC6','#174B4B'),'progress':('#B295FF','#351F5B'),
'community':('#FF7BAF','#582840'),'coach':('#FFCF82','#49391F'),
'explore':('#85CFFF','#1F476E')}
def circle(x,y,r,stroke,fill='none',width=4):
 return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
def path(d,stroke,fill='none',width=5):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"/>'
def art(key,c):
 shapes={
  'avatar':circle(722,194,147,c)+circle(722,194,111,c,width=1)+path('M568 395q28-119 107-132q-42-33-40-96q0-90 86-90q86 0 86 90q0 63-41 96q81 25 107 132','url(#rim)','#142339',6)+circle(722,171,72,c,'#392D5C')+path('M660 141Q718 97 783 137','#DFCCFF',width=8),
  'training':path('M494 106h438','#DAF8FF',width=13)+path('M520 65v88m390-88v88',c,width=28)+circle(715,165,46,'url(#rim)','#0B3850')+path('M601 392l-37-110l46-71l55-27h102l55 27l46 71l-37 110','url(#rim)','#10364A',8)+path('M607 214L546 107m337 107l58-107','url(#rim)',width=21),
  'nutrition':path('M551 260q32 130 166 129q134 0 162-129','#D6FBCF','#214D32',8)+circle(718,255,140,'#E0FAD8','#3F784B')+circle(674,250,49,c,'#FFAE71')+circle(774,267,54,c,'#DA7A56')+path('M655 165q-34-62 0-94m73 85q-33-61 0-94m73 85q-33-61 0-94','#D9FFD8',width=6),
  'recipes':circle(731,214,148,c,'#4D3021')+circle(731,214,126,'#F8E4C3','#27462D',8)+circle(689,206,48,'#F3A264','#FFB76C',2)+circle(783,237,53,'#E9B46F','#E47D66',2)+circle(766,165,47,'#92C871','#A7DB84',2),
  'habits':circle(716,203,162,c)+circle(716,203,113,c,width=1)+circle(716,158,49,'#DDFFF3','#134747')+path('M540 332Q614 247 677 283l39 17l40-17q57-35 137 49q-91 70-177 37q-91 33-176-37',c,'#1B544A',7)+path('M716 14v53M567 78l32 31m267-31l-32 31',c,width=6),
  'progress':path('M505 343H931M505 343V45','#BAC1E8',width=3)+path('M512 318l86-59 63 23 78-106 63 43 77-105 50-39v268H512',c,'#6E40AB',5)+path('M512 318l86-59 63 23 78-106 63 43 77-105 50-39',c,width=12)+circle(929,75,12,'#FFFFFF',c),
  'community':path('M713 85L572 221L713 344L860 220L713 85M572 221h288',c,width=6)+''.join(circle(x,y,r,c,'#462944',5)+circle(x,y-9,r//3,'#FFD1E8',c,2) for x,y,r in [(713,85,40),(572,221,44),(860,220,42),(713,344,53)]),
  'coach':path('M541 91l275-53v316l-275 43Z',c,'#1B3644',6)+path('M577 112l197-36v76l-197 37Z','#A5E6EC','#345D6B',4)+path('M591 156l60-34l47 17l49-52',c,width=7)+path('M579 231l200-37m-200 84l200-38m-200 84l200-39','#BCECF4',width=5)+path('M823 110l94 25v241l-94-32Z',c,'#123746',6),
  'explore':circle(737,136,108,c,'#1F567F')+circle(737,136,143,c,width=2)+path('M483 360l116-164l69 91l68-151l123 164l53-82l84 142Z',c,'#325F87',6)+path('M658 360l78-224l123 164l53-82l84 142Z','#74CBFF','#173F65',4)+path('M736 136l-39 78l42-22l33 25Z','#D9F5FF','#D5E8FF',3)
 }
 return shapes[key]
for kind,(accent,shadow) in color.items():
 stars=''.join(f'<circle cx="{500+(i*73)%460}" cy="{18+(i*59)%348}" r="{(i%3)+1}" fill="{accent}" opacity="{.15+(i%4)*.13:.2f}"/>' for i in range(36))
 grid=''.join(f'<path d="M{i*79} 0v400" stroke="{accent}" opacity=".06"/>' for i in range(14))
 doc=f'''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="400" viewBox="0 0 960 400">
<defs><linearGradient id="bg"><stop stop-color="#0C1521"/><stop offset=".55" stop-color="{shadow}"/><stop offset="1" stop-color="#0A111A"/></linearGradient><radialGradient id="halo"><stop stop-color="{accent}" stop-opacity=".4"/><stop offset="1" stop-color="{accent}" stop-opacity="0"/></radialGradient><linearGradient id="rim"><stop stop-color="{accent}"/><stop offset=".5" stop-color="#DDF9FF"/><stop offset="1" stop-color="{accent}"/></linearGradient></defs>
<rect width="960" height="400" fill="url(#bg)"/>{grid}{stars}<circle cx="724" cy="196" r="280" fill="url(#halo)"/>{art(kind,accent)}<path d="M0 367Q250 320 459 350T960 350" stroke="{accent}" stroke-opacity=".28" stroke-width="3" fill="none"/></svg>'''
 (out/f'{kind}.svg').write_text(doc,encoding='utf8')
print("BAYONA scenes:",len(color),"in",out)
