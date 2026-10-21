from pathlib import Path
from io import BytesIO
import math, json
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics import renderPDF
from hybrid_model import ALL, CASES, validate

validate()
ROOT=Path(__file__).resolve().parent; REPO=ROOT.parent.parent
REF=Path('D:/Projects/EgyptVRTourResources/CityMemphis')
for name,file in [('Sans','segoeui.ttf'),('Bold','segoeuib.ttf'),('Serif','georgia.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file))
W,H=960,600
INK='#152D30'; GOLD='#B78745'; PAPER='#F6F1E7'; MUTED='#586B6B'; RED='#A25143'; TEAL='#438F88'
C=canvas.Canvas(str(ROOT/'Ancient_Memphis_Business_Plan.pdf'),pagesize=(W,H),pageCompression=1)
C.setTitle('Ancient Memphis | VR-first business plan and 24-month scenarios')
C.setAuthor('Egypt VR Tour'); C.setSubject('Research-backed market evidence and explicitly assumed USD financial scenarios, 22 October 2026')
def rect(x,y,w,h,col):
    C.setFillColor(HexColor(col)); C.rect(x,H-y-h,w,h,stroke=0,fill=1)
def txt(s,x,y,size=12,col=INK,font='Sans'):
    C.setFillColor(HexColor(col)); C.setFont(font,size); C.drawString(x,H-y-size,s)
def right(s,x,y,size=12,col=INK,font='Sans'):
    C.setFillColor(HexColor(col)); C.setFont(font,size); C.drawRightString(x,H-y-size,s)
def para(s,x,y,w,size=11,col=INK,lead=None,font='Sans'):
    p=Paragraph(s,ParagraphStyle('body',fontName=font,fontSize=size,leading=lead or size*1.36,textColor=HexColor(col)))
    _,h=p.wrap(w,900); p.drawOn(C,x,H-y-h); return h
def pic(path,x,y,w,h):
    im=Image.open(path).convert('RGB'); im.thumbnail((1800,1400)); iw,ih=im.size
    buf=BytesIO(); im.save(buf,'JPEG',quality=86,optimize=True); buf.seek(0)
    s=min(w/iw,h/ih); dw,dh=iw*s,ih*s
    C.drawImage(ImageReader(buf),x+(w-dw)/2,H-y-h+(h-dh)/2,dw,dh)
def logo(x,y,s=.9,light=False):
    C.saveState(); C.translate(x,H-y-70*s); C.scale(s,s)
    C.setStrokeColor(HexColor(GOLD)); C.setLineWidth(2.4); C.circle(34,48,11,stroke=1,fill=0)
    p=C.beginPath(); p.moveTo(4,9); p.lineTo(11,60); p.lineTo(25,60); p.lineTo(25,16); p.moveTo(43,16); p.lineTo(43,60); p.lineTo(57,60); p.lineTo(64,9); C.drawPath(p)
    p=C.beginPath(); p.moveTo(3,3); p.curveTo(22,11,41,-3,64,5); C.drawPath(p)
    C.setFillColor(HexColor(PAPER if light else INK)); C.setFont('Serif',27); C.drawString(83,34,'ANCIENT MEMPHIS')
    C.setFillColor(HexColor(GOLD)); C.setFont('Sans',10); C.drawString(85,13,'W A L K   I N T O   H I S T O R Y'); C.restoreState()
def page(n,kicker,title,sub=''):
    rect(0,0,W,H,PAPER); txt('EGYPT VR TOUR  /  BUSINESS PLAN',40,22,9,MUTED,'Bold')
    txt(kicker.upper(),40,61,10,GOLD,'Bold'); txt(title,40,82,30,INK,'Serif')
    if sub: para(sub,40,128,880,11.5,MUTED)
    rect(40,559,880,.6,'#C9C7BD'); txt('USD  •  RESEARCH AS OF 22 OCTOBER 2026  •  CONDITIONAL SCENARIOS',40,573,8,MUTED)
    right(f'{n:02d} / 10',920,573,8,MUTED)
def end(): C.showPage()
def money(v): return ('-' if v<0 else '')+'$'+f'{abs(v):,.0f}'
def k(v): return ('-' if v<0 else '')+'$'+f'{abs(v)/1000:,.1f}k'
def metric(x,y,w,value,label,note=None):
    rect(x,y,w,82,'#EAE5D9'); txt(value,x+14,y+10,27,INK,'Serif'); txt(label,x+14,y+47,10,GOLD,'Bold')
    if note: txt(note,x+14,y+64,8,MUTED)
def lineplot(series,x,y,w,h,ymax,ylabel):
    d=Drawing(w,h); lp=LinePlot(); lp.x=42; lp.y=25; lp.width=w-55; lp.height=h-43
    lp.data=[[(r['month'],r[key]/scale) for r in ALL[name]['monthly']] for name,key,scale,col,label in series]
    lp.xValueAxis.valueMin=1; lp.xValueAxis.valueMax=24; lp.xValueAxis.valueSteps=[1,6,12,18,24]
    lp.yValueAxis.valueMin=0; lp.yValueAxis.valueMax=ymax; lp.yValueAxis.valueStep=ymax/4
    lp.xValueAxis.labels.fontName='Sans'; lp.xValueAxis.labels.fontSize=8
    lp.yValueAxis.labels.fontName='Sans'; lp.yValueAxis.labels.fontSize=8
    lp.yValueAxis.visibleGrid=1; lp.yValueAxis.gridStrokeColor=HexColor('#DCD9CF')
    lp.xValueAxis.strokeColor=HexColor('#ADB3AD'); lp.yValueAxis.strokeColor=HexColor('#ADB3AD')
    for i,(_,_,_,col,label) in enumerate(series):
        lp.lines[i].strokeColor=HexColor(col); lp.lines[i].strokeWidth=2
    d.add(lp); renderPDF.draw(d,C,x,H-y-h); txt(ylabel,x+42,y-7,8,MUTED)

# Page bodies appended to the existing ReportLab design helpers.
B=ALL['Base']; S=B['summary']
rect(0,0,W,H,INK); pic(REF/'Memphis_cinematic_quality.jpg',660,0,290,600)
logo(40,27,.98,True)
txt('VR-FIRST BUSINESS PLAN / REVISED ECONOMICS',43,132,11,GOLD,'Bold')
para('A smaller launch.<br/>Two routes to revenue.',40,168,575,36,PAPER,44,'Serif')
para('Ancient Memphis brings an evidence-aware ancient city to VR headset owners and cultural venues. Start with one beautiful district, one engine and one supported headset configuration.',43,273,555,14,PAPER,20)
for x,value,label in [(43,'M23','FIRST MONTHLY OPERATING PROFIT'),(243,'$149k','24-MONTH NET COMPANY REVENUE'),(443,'$115k','POST-MVP FUNDING ENVELOPE')]:
 txt(value,x,365,28,'#E5BE83','Serif'); para(label,x,407,175,9,PAPER,font='Bold')
rect(43,449,565,1,GOLD)
para('<b>Recommended path:</b> a lean hybrid, not a large studio launch. Base case still loses <b>$71,583</b> over 24 months and does not repay invested capital. Consumer demand and founder-led delivery remain unvalidated.',43,466,555,12,PAPER,17)
para('USD. Conditional scenarios after a commercially ready VR MVP. Research: 22 October 2026. No existing sales, contracts or measured conversion are assumed.',43,535,555,9,'#B6C8C4')
txt('ASPIRATIONAL REFERENCE / NOT PRODUCT FOOTAGE',667,582,7,PAPER); end()

page(2,'Market evidence','Sell the experience, not the headset market.',
 'Published comparables support a paid category. They do not establish how many people will buy Ancient Memphis.')
metric(40,177,276,'$14.99','BRINK TRAVELER / STEAM [1]','Current displayed US price; broader destination library')
metric(342,177,276,'$12','FIELD MUSEUM VR TICKET [2]','8-minute experience; general-admission add-on')
metric(644,177,276,'80,000','ORSAY VR VISITORS / 2024 [3]','Major institution; not a small-venue forecast')
txt('DIRECT SALES: A TESTABLE ADJACENCY',40,286,10,GOLD,'Bold')
para('Target existing VR owners interested in travel, history and cultural experiences. Offer a <b>$9.99 one-time purchase</b>, subject to price testing. BRINK validates paid exploration, but has substantially more locations and features. Ancient Memphis needs a compelling reason to buy a smaller experience.',40,310,420,12)
para('An 8-minute guided route alone is a weak home offer. Add optional exploration, narrated evidence stops and replayable viewpoints in the same district. Test value with real buyers; do not inflate duration to discourage refunds.',40,419,420,11)
txt('VENUES: SMALLER PIPELINE, RECURRING INCOME',500,286,10,GOLD,'Bold')
para('Start with US English-language museums and cultural venues that already have staff, visitor flow and space. AAM reports <b>55% of surveyed museums remained below 2019 attendance</b> in 2025 [4]: budgets and demand cannot be taken for granted.',500,310,420,12)
para('The base case targets <b>14 wins from 120 qualified accounts</b> over two years, with two non-renewals. These are hypotheses, not leads. No global VR market CAGR, headset installed-base percentage or review-to-sales multiplier is used.',500,419,420,11)
para('<b>Investor interpretation:</b> category evidence is real; pricing, conversion, customer counts and revenue below are explicitly assumed. Validate willingness to pay before scaling.',40,514,880,11,MUTED); end()

page(3,'Development costs & scope','Reduce the work before reducing the quality.',
 'The current product is a browser prototype. Commercial headset production and hardware performance remain launch gates.')
pic(ROOT/'assets/quest3.jpg',40,173,265,132)
pic(REPO/'docs/design/screenshots/hero-street-step7-performance.jpg',332,173,286,132)
pic(REF/'Memphis10.jpg',655,173,265,132)
txt('QUEST 3 / TARGET DEVICE',40,313,9,GOLD,'Bold'); txt('BROWSER PROTOTYPE / TODAY',332,313,9,GOLD,'Bold'); txt('ART DIRECTION / TARGET',655,313,9,GOLD,'Bold')
para('<b>Build once:</b> Unreal is the primary planned engine; Unity remains an alternative, not a parallel build. Target Quest 3 standalone first, conditional on a performance spike. Cinematic lighting must fit mobile GPU limits. PC VR can follow; Rift is legacy context and Vision Pro is deferred.',40,343,420,11)
para('<b>Reuse deliberately:</b> one district, modular buildings, licensed props, baked lighting, limited NPC loops and shared route/evidence data. Keep historian review, comfort testing and asset-rights checks. Defer multiplayer, procedural crowds, extra cities and bespoke venue integrations.',40,443,420,11)
para('<b>Monthly fixed cash budget / Year 1 → Year 2</b><br/>Technical founder: $2,500 → $3,000<br/>Contract art: $1,500 → $1,500<br/>Engineering help: $1,000 → $1,250<br/>History / QA: $500 → $500<br/>Sales / content: $500 → $750<br/>Tools / insurance / admin: $500 → $500<br/><b>Total: $6,500 → $7,500</b> (excludes variable ads)',500,343,420,11,lead=17)
para('Browser: TypeScript + Babylon.js / WebGL; WebGPU is a direction. Maintain a demo, not a second paid product. Photo: Kyu3a, CC BY-SA 4.0 [10]; other images are repo QA and supplied concept reference.',40,535,880,8,MUTED); end()

page(4,'Unit economics / planning assumptions','A $9.99 sale is not $9.99 of income.',
 'Base case, USD excluding sales taxes. “Net company revenue” deducts consumer refunds and store fees; it is a management measure.')
txt('CONSUMER / PER ORDER BEFORE REFUNDS',40,177,10,GOLD,'Bold')
items=[('List price / realised price after discounts','$9.99 / $8.50'),('10% refunded; retained buyer spend','$7.65'),('Store fee assumption: 30% of retained spend','-$2.30'),('Net company revenue','$5.36'),('Support $0.25 + contingency 5% of spend','-$0.63'),('Paid acquisition: 25% of orders × $8 CAC','-$2.00'),('Contribution after variable costs','$2.72')]
for i,(a,b) in enumerate(items):
 y=207+i*33; rect(40,y,423,29,'#EAE5D9'); txt(a,49,y+7,9.3); right(b,451,y+6,11,INK,'Bold')
para('CAC is per paid-channel order before refunds. A fully paid order loses about <b>$3.28</b> at $8 CAC: sustainable growth needs organic/referral sales or lower CAC. The 75% organic share requires work; founder and content time are budgeted.',40,456,423,11)
txt('VENUE / PER MATURE SITE PER MONTH',500,177,10,GOLD,'Bold')
para('<b>$250 licence + $2.50 × 180 paid visits = $700</b><br/>Less $60 support + $45 usage cost + $56 reserve = <b>$539 contribution</b>. One-time onboarding: $500 revenue less $300 delivery and $40 reserve = $160 contribution.',500,207,420,12)
para('At a $10 ticket, 180 visitors generate $1,800 for the venue. Less $700 licence, $54 payment fees, $600 shared staffing (30h × $20), $250 equipment allowance and $100 hygiene leaves <b>$96</b>. Dedicated staffing would usually erase this margin.',500,307,420,11)
para('Venue pricing and cost inputs are estimates, not signed offers. Usage ramps 50% / 75% / 100% in the first three months. Four devices × 3 slots/hour × 5 hours × 20 days = 1,200 slots; 180 visits is only 15% utilisation, not guaranteed demand.',500,415,420,11)
para('30% store fee is a planning allowance, to confirm in distribution terms. Steam allows eligible refunds within 14 days and under two hours [5]. The 5% consumer contingency and 8% venue reserve cover commercial uncertainty; they are not calculated engine royalties [8].',40,527,880,8.5,MUTED); end()

def forecast(n,start):
 rs=B['monthly'][start:start+12]; yr=1+start//12
 page(n,f'Base case / Year {yr} / monthly forecast','From customers to company income.',
      'M1 starts after a commercially ready paid headset product. Orders are before refunds; expected retained purchases are 90% of orders.')
 metric(40,174,276,money(sum(r['revenue'] for r in rs)),'YEAR NET COMPANY REVENUE')
 metric(342,174,276,f"{sum(r['orders'] for r in rs):,}",'YEAR CONSUMER ORDERS')
 metric(644,174,276,money(sum(r['operating_result'] for r in rs)),'YEAR OPERATING RESULT')
 xs=[40,91,163,224,304,405,505,610,720,820]; widths=[51,72,61,80,101,100,105,110,100,100]
 heads=['Month','Orders','Sites','VR visits','Consumer net','Venue rev.','Total net rev.','Total costs*','Op. result','Cash flow**']
 rect(40,271,880,26,INK)
 for x,h in zip(xs,heads): txt(h,x+5,279,8.3,PAPER,'Bold')
 for i,r in enumerate(rs):
  y=299+i*17.5
  if i%2==0: rect(40,y,880,17.5,'#EAE5D9')
  vals=[f"M{r['month']:02d}",f"{r['orders']:,}",str(r['active_sites']),f"{r['paid_visits']:,.0f}",money(r['consumer_net']),money(r['venue_revenue']),money(r['revenue']),money(r['revenue']-r['operating_result']),money(r['operating_result']),money(r['cashflow'])]
  for x,w,v in zip(xs,widths,vals): right(v,x+w-7,y+3,8.6)
 para('*Fixed pay/overhead plus acquisition, support, delivery and reserves. **One-month collections lag, cash costs paid immediately; $6,000 initial equipment/setup and $2,000 M13 refresh. Values rounded only for display.',40,518,880,8.8,MUTED)
 end()
forecast(5,0); forecast(6,12)

page(7,'Scenarios / no probabilities assigned','Earlier profit is possible. It is not assured.',
 'All three cases include founder pay. Upside needs much stronger demand and a higher support/production budget.')
series=[(name,'revenue',1000,col,name) for name,col in [('Downside',RED),('Base',TEAL),('Upside',GOLD)]]
lineplot(series,40,185,420,174,40,'MONTHLY NET COMPANY REVENUE / $000')
lineplot([(a,'active_sites',1,c,a) for a,_,_,c,_ in series],500,185,420,174,24,'ACTIVE PAYING VENUE SITES')
for x,name,col in [(80,'Downside',RED),(205,'Base',TEAL),(315,'Upside',GOLD)]: txt(name,x,365,10,col,'Bold')
heads=['24-month result','Downside','Base','Upside']; xs=[40,390,570,750]
rect(40,392,880,24,INK)
for x,h in zip(xs,heads): txt(h,x+8,399,10,PAPER,'Bold')
rr=[('Orders / end sites',lambda s:f"{s['orders']:,} / {s['end_sites']}"),('Net company revenue / operating result',lambda s:k(s['revenue'])+' / '+k(s['operating_result'])),('First operating profit / post-MVP cash payback',lambda s:(f"M{s['first_profit']}" if s['first_profit'] else '>M24')+' / '+(f"M{s['payback']}" if s['payback'] else '>M24')),('Post-MVP funding incl. 20% buffer',lambda s:money(s['funding']))]
for i,(label,fn) in enumerate(rr):
 y=418+i*24; rect(40,y,880,23,'#EAE5D9'); txt(label,48,y+5,9.5)
 for x,name in zip(xs[1:],['Downside','Base','Upside']): txt(fn(ALL[name]['summary']),x+8,y+5,10,INK,'Bold')
para('Upside recovers post-MVP operating cash in M22, but does not recover the additional $60k pre-launch budget by M24. Downside is a stress case, not a loss ceiling; a failed launch can produce zero sales.',40,526,880,9,MUTED); end()

page(8,'Capital & break-even','Cut fixed burn; keep both revenue channels.',
 'Comparable counterfactuals hold the lean base budget constant and remove one revenue stream. They are not separately optimised companies.')
for i,(name,label) in enumerate([('Consumer only','CONSUMER ONLY'),('Lean venues only','LEAN VENUES ONLY'),('Base','LEAN HYBRID')]):
 s=ALL[name]['summary']; x=40+i*302
 metric(x,177,276,money(s['end_result']),'MONTH 24 OPERATING RESULT',label)
 para(f"24-month net revenue: <b>{money(s['revenue'])}</b><br/>Funding envelope: <b>{money(s['funding'])}</b><br/>First operating profit: <b>{'M'+str(s['first_profit']) if s['first_profit'] else 'not within 24 months'}</b>",x,276,276,11)
txt('WHAT CHANGED FROM THE PREVIOUS PLAN',40,357,10,GOLD,'Bold')
para('Original venue-only base: $480k fixed costs over 24 months, 20 end sites and $460k funding envelope. Revised hybrid: <b>$168k fixed costs (65% less)</b>, 12 end sites, $115k funding envelope. This is a change in team, scope and sales ambition, not free productivity.',40,382,420,11)
para('<b>Break-even without new-site fees:</b> at $7,500 fixed cost, about 2,755 consumer orders/month alone; or 14 mature venues alone; or 10 mature venues + 776 consumer orders/month. At 2% conversion, that hybrid requires about 38,800 qualified store visits/month.',40,462,420,11)
txt('FUND THE PATH TO THE MVP AS WELL',500,357,10,GOLD,'Bold')
para('Indicative pre-launch budget: six months × $6,500 = $39k, plus $11k scoped assets/voice/QA and $10k contingency = <b>$60k</b>. This is an estimate requiring contractor quotes and a headset spike, not a delivery commitment.',500,382,420,11)
para('Base peak post-MVP cash deficit: <b>$92,652</b>; 20% buffer rounded up gives $115k. Combined indicative raise: <b>$175k</b> including pre-launch. Opening equipment is in the post-MVP model. Historical sunk costs, finance costs and income taxes are excluded.',500,465,420,11); end()

page(9,'Validation & execution','Buy evidence before buying growth.',
 'The model is a decision tool. These gates prevent a low-cost plan becoming an underfunded production promise.')
blocks=[('01 / PROVE HEADSET DELIVERY','Before committing the $60k pre-launch envelope: benchmark one hero scene on Quest 3, lock one engine and get contractor quotes. If fidelity fails, revise the scope or choose PC VR and rebuild the demand model.'),
('02 / PROVE PAID VALUE','Before scaling: test at least 100 paid consumer orders. Proposed gates: refunds <=10%, positive blended contribution and explicit value feedback. Scale paid ads only below $4.72 CAC; the base $8 CAC is a limited test allowance, subsidised by organic sales.'),
('03 / PROVE VENUE ECONOMICS','Seek three paid pilots. Track paid visits, staffing, comfort incidents and repeat bookings. Base needs 180 paid visits/site/month and acceptable partner margin. Avoid custom work unless its fee covers delivery and ongoing support.'),
('04 / RELEASE CAPITAL IN STAGES','Review monthly. If two consecutive months miss consumer contribution or venue usage gates, stop loss-making ads, freeze new locations/features and reforecast. Do not chase the upside by adding payroll before recurring demand.')]
for i,(h,b) in enumerate(blocks):
 x=40+(i%2)*460; y=181+(i//2)*161
 rect(x,y,420,143,'#EAE5D9'); txt(h,x+14,y+13,10,GOLD,'Bold'); para(b,x+14,y+40,391,11)
para('<b>Founder dependence:</b> the budget assumes a capable technical founder accepts $2.5k-$3k/month, with no deferred salary owed. Adding $4k/month replacement pay changes the base M24 result from +$1,029 to -$2,971. Add two months of cost for a two-month launch delay; re-time revenue too.',40,514,880,10,MUTED); end()

page(10,'Sources, assumptions & audit trail','Measured evidence. Explicit hypotheses.',
 'Live primary sources checked 22 October 2026. Links are clickable. Local model contains monthly figures for all five cases.')
sources=[
('[1] BRINK Traveler / Steam: displayed $14.99; product scope.','https://store.steampowered.com/app/1462520/BRINK_Traveler/'),
('[2] Field Museum: 8-minute Drop in the Ocean; $12 general.','https://www.fieldmuseum.org/exhibition/experience/drop-in-the-ocean'),
('[3] Musee d\u2019Orsay: 2024 results, 80,000 VR visitors.','https://presse-orsay-orangerie.epmo-musees.fr/4-950-000-visiteurs-pour-letablissement-public-du-musee-dorsay-et-du-musee-de-lorangerie-en-2024/?lang=fra'),
('[4] AAM: 2025 survey, 55% below 2019 attendance.','https://www.aam-us.org/2026/02/23/museum-attendance-trends-and-adaptations/'),
('[5] Steam: standard 14-day / under-2-hour refund policy.','https://store.steampowered.com/steam_refunds/'),
('[6] Steam Direct: $100 fee/product; submission lead times.','https://partner.steamgames.com/steamdirect/'),
('[7] Steamworks: prior-month sales paid at next month end.','https://partner.steamgames.com/doc/finance/payments_salesreporting'),
('[8] Unreal: 5% royalty above $1m attributable lifetime gross.','https://www.unrealengine.com/license'),
('[9] BLS: US developer median $133,080 in May 2024.','https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm'),
('[10] Quest 3 photograph: Kyu3a, CC BY-SA 4.0, resized.','https://commons.wikimedia.org/wiki/File:Meta_Quest_3_-_1.jpg')]
for i,(label,url) in enumerate(sources):
 para(f'<link href="{url}" color="{TEAL}">{label}</link>',40,177+i*28,430,9.5)
txt('WHAT THE CASES ACTUALLY ASSUME',500,177,10,GOLD,'Bold')
para('<b>Downside / Base / Upside:</b><br/>M24 consumer orders: 200 / 800 / 2,400<br/>Refunds: 20% / 10% / 8%<br/>Paid order share: 40% / 25% / 25%<br/>Paid-channel CAC: $10 / $8 / $6<br/>Mature venue visits: 120 / 180 / 240<br/>Gross venue wins: 6 / 14 / 23; losses: 1 / 2 / 3<br/>Fixed cost Year 1: $6.5k / $6.5k / $7.5k per month<br/>Fixed cost Year 2: $7.5k / $7.5k / $9.5k per month',500,201,420,10.2,lead=16)
para('All cases: $8.50 realised price, 30% store deduction; constant price, no subscriptions, DLC, grants or hardware revenue. Orders are gross transactions; retained purchases are expected net licences, not verified unique people. Venue visits are sessions, not unique customers.',500,359,420,10)
para('At assumed 2% store conversion, base needs 15k visits in M1 and 40k in M24; upside needs 120k in M24. Launch spike then growth requires content/community/referrals. Base M24 needs 600 organic orders (30k qualified visits). Traffic and conversion are unmeasured; no seasonality is assumed.',500,439,420,10)
para('Model: hybrid_model.py + Ancient_Memphis_24_Month_Model.json. One-month settlement lag for both channels; Meta terms may differ [7]. Amounts before income tax, interest and depreciation; cash includes capex. Reserve is conservatively expensed, not counted twice. Formal revenue presentation depends on contracts.',40,516,880,9,MUTED)
end(); C.save(); print(ROOT/'Ancient_Memphis_Business_Plan.pdf')
