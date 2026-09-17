#!/usr/bin/env python3
"""Generate the HTML and PDF academic CV from data/site-data.js.
Requires reportlab: python3 -m pip install reportlab
Run from any directory: python3 scripts/build_cv.py
"""
from pathlib import Path
import json, html
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parent.parent
raw=(ROOT/'data/site-data.js').read_text()
d=json.loads(raw[raw.index('{'):].strip().rstrip(';'))
e=html.escape
p=d['profile']
publications=d['publications']
def anchor(url,text):return f'<a href="{e(url,quote=True)}">{e(text)}</a>'
def hentry(x):return f'<article class="cv-entry"><h3>{e(x["title"])}</h3><p class="meta">{e(x["meta"])}</p><p>{e(x["description"])}</p></article>'
def haccepted(x):
    return f'<li><strong>{e(x["title"])}</strong><br>{e(x["venue"])} · Accepted {e(x["acceptedDate"])}</li>'
def hpub(x):
    doi=next((l['url'] for l in x.get('links',[]) if l['label']=='DOI'),None)
    return f'<li><strong>{e(x["title"])}</strong><br><span>{e(x["venue"])} · {e(x["year"])}</span>'+ (f'<br>{anchor(doi,doi)}' if doi else '')+'</li>'
head=f'<header class="cv-header"><span class="cv-eyebrow">ACADEMIC CURRICULUM VITAE</span><h1>{e(p["name"])}</h1><p class="cv-role">PhD Student in Computer Science · Wright State University</p><p class="cv-contact">{anchor("mailto:"+p["email"],p["email"])} · {e(p["location"])}</p><div class="cv-links">{anchor(p["website"],"Portfolio")} · {anchor(p["scholar"],"Google Scholar")} · {anchor(p["github"],"GitHub")} · {anchor(p["orcid"],"ORCID: "+p["orcidId"])}</div></header>'
page1=head+f'<section><h2>Research focus</h2><p>{e(d["researchDirection"])}</p><p>Doctoral advisor: {e(p["advisor"])}.</p></section><section><h2>Education</h2>'+''.join(f'<article class="cv-entry compact"><h3>{e(x["title"])}</h3><p class="meta">{e(x["meta"])}</p></article>' for x in d['education'])+'</section><section><h2>Research & professional experience</h2>'+''.join(hentry(x) for x in d['experience'])+'</section><section><h2>Methods & tools</h2>'+''.join(f'<p class="skill"><strong>{e(k)}:</strong> {e(v)}</p>' for k,v in d['skills'])+'</section>'
page2='<div class="cv-running">SK Rakib Ul Islam Rahat <span>Published research</span></div>'
for group in ('Journal Articles','Conference Papers'):page2+=f'<section><h2>{group}</h2><ol class="cv-publications">'+''.join(hpub(x) for x in publications[group])+'</ol></section>'
page3='<div class="cv-running">SK Rakib Ul Islam Rahat <span>Research & academic service</span></div><section><h2>Accepted for publication</h2><ol class="cv-publications">'+''.join(haccepted(x) for x in publications.get('Accepted Articles',[]))+'</ol></section><section><h2>Manuscripts</h2><ol class="cv-publications">'+''.join(f'<li><strong>{e(x["title"])}</strong><br>{e(x["venue"])} · {e(x["type"])} · {e(x["year"])}<br>{e(x["description"])}</li>' for x in publications['Manuscripts'])+'</ol></section><section><h2>Selected research projects</h2>'+''.join(f'<article class="cv-entry"><h3>{e(x["cvTitle"])}</h3><p>{e(x["summary"])}</p><p>{anchor(x["repo"],x["repo"].split("/")[-1])}</p></article>' for x in d['projects'])+'</section><section><h2>Peer review & service</h2><p><strong>'+e(d['service']['reviews']['count'])+'</strong></p><p class="meta">'+e(d['service']['reviews']['note'])+'</p><ul class="journal-list">'+''.join('<li>'+e(x)+'</li>' for x in d['service']['reviews']['items'])+'</ul></section><section><h2>Selected certifications</h2><ul class="journal-list">'+''.join('<li>'+(anchor(x['url'],x['label']) if x['url'] else e(x['label']))+'</li>' for x in d['service']['certifications'])+'</ul></section>'
output='<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Academic CV of SK Rakib Ul Islam Rahat, Computer Science PhD student at Wright State University."><title>Academic CV | SK Rakib Ul Islam Rahat</title><link rel="icon" href="assets/rahat-icon.png?v=9" sizes="192x192" type="image/png"><link rel="icon" href="assets/rahat-mark.svg?v=9" type="image/svg+xml"><link rel="apple-touch-icon" href="assets/rahat-touch.png?v=9"><link rel="stylesheet" href="css/resume.css?v=7"></head><body><nav class="cv-toolbar" aria-label="CV actions"><a href="index.html">← Portfolio</a><a class="download" href="assets/Rahat_Academic_CV.pdf" download>Download PDF ↓</a><button type="button" onclick="window.print()">Print CV</button></nav><main>'+''.join(f'<div class="cv-page">{body}<footer class="cv-footer"><span>Updated {e(d["updated"])}</span><span>{i} / 3</span></footer></div>' for i,body in enumerate((page1,page2,page3),1))+'</main></body></html>\n'
(ROOT/'resume.html').write_text(output)
# PDF uses the same facts as the HTML and explicit page boundaries for reliable printing.
fontdir=Path('/usr/share/fonts/truetype/dejavu')
if (fontdir/'DejaVuSans.ttf').exists():
    for n,f in [('CV','DejaVuSans.ttf'),('CV-Bold','DejaVuSans-Bold.ttf')]:pdfmetrics.registerFont(TTFont(n,str(fontdir/f)))
    pdfmetrics.registerFontFamily('CV',normal='CV',bold='CV-Bold',italic='CV',boldItalic='CV-Bold')
    font='CV';bold='CV-Bold'
else:font='Helvetica';bold='Helvetica-Bold'
ink=colors.HexColor('#142a3b');muted=colors.HexColor('#526474');accent=colors.HexColor('#235d65')
styles={
 'name':ParagraphStyle('name',fontName=bold,fontSize=23,leading=28,textColor=ink,spaceAfter=7),
 'role':ParagraphStyle('role',fontName=bold,fontSize=10.4,leading=15,textColor=accent,spaceAfter=5),
 'body':ParagraphStyle('body',fontName=font,fontSize=9,leading=12.5,textColor=ink,spaceAfter=5),
 'meta':ParagraphStyle('meta',fontName=font,fontSize=8.3,leading=11,textColor=muted,spaceAfter=2),
 'small':ParagraphStyle('small',fontName=font,fontSize=7.6,leading=11,textColor=muted,spaceAfter=4),
 'section':ParagraphStyle('section',fontName=bold,fontSize=10,leading=14,textColor=accent,spaceBefore=10,spaceAfter=6),
 'entry':ParagraphStyle('entry',fontName=bold,fontSize=9.3,leading=13,textColor=ink,spaceAfter=2),
 'pub':ParagraphStyle('pub',fontName=font,fontSize=8.6,leading=12.3,textColor=ink,spaceAfter=8),
}
def clean(s):return str(s).replace('–','-').replace('—','-').replace('‑','-')
def para(s,style='body'):return Paragraph(clean(s),styles[style])
def plink(url,label):return f'<link href="{e(url,quote=True)}" color="#235d65">{e(label)}</link>'
def section(title):story.append(para(e(title.upper()),'section'))
def entry(title,meta,body=None):
    block=[para(e(title),'entry'),para(e(meta),'meta')]
    if body:block.append(para(e(body)))
    story.append(KeepTogether(block));story.append(Spacer(1,1))
story=[]
story.extend([para('ACADEMIC CURRICULUM VITAE','small'),para(e(p['name']),'name'),para('PhD Student in Computer Science | Wright State University','role'),para(plink('mailto:'+p['email'],p['email'])+' | '+e(p['location']),'meta'),para(' | '.join([plink(p['website'],'Portfolio'),plink(p['scholar'],'Google Scholar'),plink(p['github'],'GitHub'),plink(p['orcid'],'ORCID '+p['orcidId'])]),'small')])
section('Research focus');story.append(para(e(d['researchDirection'])));story.append(para('Doctoral advisor: '+e(p['advisor']),'meta'))
section('Education')
for x in d['education']:entry(x['title'],x['meta'])
section('Research & professional experience')
for x in d['experience']:entry(x['title'],x['meta'],x['description'])
section('Methods & tools')
for k,v in d['skills']:story.append(para(f'<b>{e(k)}:</b> {e(v)}','meta'))
story.append(PageBreak());story.append(para(e(p['name'])+' | Published research','role'))
for group in ('Journal Articles','Conference Papers'):
    section(group)
    for i,x in enumerate(publications[group],1):
        doi=next((l['url'] for l in x.get('links',[]) if l['label']=='DOI'),None)
        content=f'{i}. <b>{e(x["title"])}</b><br/>{e(x["venue"])} | {e(x["year"])}'
        if doi:content+='<br/>'+plink(doi,doi)
        story.append(para(content,'pub'))
story.append(PageBreak());story.append(para(e(p['name'])+' | Research & academic service','role'))
section('Accepted for publication')
for i,x in enumerate(publications.get('Accepted Articles',[]),1):
    story.append(para(f'{i}. <b>{e(x["title"])}</b><br/>{e(x["venue"])} | Accepted {e(x["acceptedDate"])}','pub'))
section('Manuscripts')
for i,x in enumerate(publications['Manuscripts'],1):story.append(para(f'{i}. <b>{e(x["title"])}</b><br/>{e(x["venue"])} | {e(x["type"])} | {e(x["year"])}<br/>{e(x["description"])}','pub'))
section('Selected research projects')
for x in d['projects']:
    story.append(KeepTogether([para(e(x['cvTitle']),'entry'),para(e(x['summary']),'meta'),para(plink(x['repo'],x['repo'].split('/')[-1]),'small')]))
    story.append(Spacer(1,3))
section('Peer review & service');story.append(para('<b>'+e(d['service']['reviews']['count'])+'</b>'));story.append(para(e(d['service']['reviews']['note']),'small'))
for x in d['service']['reviews']['items']:story.append(para('• '+e(x),'meta'))
section('Selected certifications')
for x in d['service']['certifications']:story.append(para('• '+(plink(x['url'],x['label']) if x['url'] else e(x['label'])),'meta'))
def footer(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(colors.HexColor('#cedade'));canvas.line(43,36,A4[0]-43,36);canvas.setFont(font,7);canvas.setFillColor(muted);canvas.drawString(43,24,'Updated '+d['updated']);canvas.drawRightString(A4[0]-43,24,str(doc.page));canvas.restoreState()
pdf=ROOT/'assets/Rahat_Academic_CV.pdf'
doc=SimpleDocTemplate(str(pdf),pagesize=A4,rightMargin=43,leftMargin=43,topMargin=35,bottomMargin=47,title='Academic CV - '+p['name'],author=p['name'])
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(f'Generated {ROOT/"resume.html"} and {pdf}')
