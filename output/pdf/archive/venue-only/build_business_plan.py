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
from business_plan_model import ALL, PARAMS, validate

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

B=ALL['Base']; S=B['summary']
# 1 Executive proposition and the headline answer.
rect(0,0,W,H,INK); rect(650,0,310,H,'#0F2023'); pic(REF/'Memphis_cinematic_quality.jpg',660,0,290,600)
logo(40,27,.98,True); txt('VR-FIRST BUSINESS PLAN',43,132,11,GOLD,'Bold')
para('Build a place<br/>people can step into.',40,166,575,37,PAPER,44,'Serif')
para('A cinematic, evidence-aware journey through ancient Memphis, licensed to museums and cultural venues. The headset is the flagship; the browser is the discovery companion.',43,270,555,14,PAPER,20)
for x,value,label in [(43,'20','ACTIVE VENUES AT M24'),(243,'46,500','PAID VISITS IN 24 MONTHS'),(443,'$179,750','24-MONTH COMPANY REVENUE')]:
    txt(value,x,360,27,'#E5BE83','Serif'); para(label,x,399,186,9,PAPER,font='Bold')
rect(43,438,565,1,GOLD)
para('<b>Base-case conclusion:</b> commercial proof is plausible, but operating break-even is not reached in two years. Modelled post-MVP funding need: <b>$460,000</b>, including a 20% buffer.',43,456,555,12,PAPER,17)
para('All forward figures are assumptions-based scenarios, not measured demand or promised earnings. M1 begins after a commercially ready VR pilot/MVP. Prepared 22 October 2026.',43,526,555,9,'#B6C8C4')
txt('ASPIRATIONAL REFERENCE • NOT PRODUCT FOOTAGE',667,582,7,PAPER); end()

# 2 Measured evidence and the limits of addressability.
page(2,'Market evidence / what is known','A real category. A demanding market.',
     'Primary sources support cultural VR demand and ticketed experiences. They do not establish Ancient Memphis conversion rates or sales.')
metric(40,177,276,'80,000','REPORTED VR VISITORS','Musée d’Orsay, 2024 experience [3]')
metric(342,177,276,'$8–$13','PUBLISHED US VR TICKETS','Field / Intrepid member & general prices [1,2]')
metric(644,177,276,'55%','BELOW 2019 ATTENDANCE','US museums, AAM 2025 survey [7]')
txt('COMPETITIVE LANDSCAPE',40,285,10,GOLD,'Bold')
rows=[('Horizon of Khufu [4]','45-minute Egyptian VR expedition','Direct theme competitor; larger destination format.'),
      ('Field Museum [1]','8-minute VR; $12 general / $10 member','Closest short-format pricing reference.'),
      ('Dreams of Dalí [5]','Institutional licensing; included onsite','Licensing precedent; also competes for exhibit budgets.')]
for i,(a,b,d) in enumerate(rows):
    y=311+i*62; rect(40,y,555,56,'#EAE5D9'); txt(a,51,y+7,11,INK,'Bold'); para(b+'<br/>'+d,51,y+24,532,10,MUTED)
txt('REACHABLE MARKET, NOT A GLOBAL TAM',625,285,10,GOLD,'Bold')
para('AAM reported roughly <b>33,000 US museums</b> and <b>1,116 accredited museums</b> in April 2025 [6]. These are context counts, not buyers ready to purchase VR.',625,310,289,11)
para('Initial focus: US English-language history, science and multidisciplinary venues with suitable footfall, staff and space. Build a <b>200-account qualified prospect list</b> over two years; this is a research task and planning assumption, not an existing pipeline.',625,382,289,11)
para('<b>Differentiation to test:</b> ordinary ancient city life + visible evidence levels + compact venue footprint. No exclusive technology or proven moat is claimed.',40,511,880,11,MUTED)
end()

# 3 Product, technical route and monetisation.
page(3,'Product & commercial offer','The headset experience is the business.',
     'Proposed launch product: a polished 8–10 minute VR journey, designed for a 20-minute slot including briefing, reset and cleaning.')
pic(ROOT/'assets'/'quest3.jpg',40,177,270,159)
pic(REPO/'docs/design/screenshots/hero-street-step7-performance.jpg',333,177,287,159)
pic(REF/'Memphis10.jpg',657,177,263,159)
txt('HEADSET DELIVERY TARGET',40,346,9,GOLD,'Bold'); txt('EXISTING BROWSER PROTOTYPE',333,346,9,GOLD,'Bold'); txt('VISUAL AMBITION',657,346,9,GOLD,'Bold')
para('<b>VR:</b> choose one headset/PC configuration and one engine first. Unreal is the primary planned engine; Unity is an alternative. Quest 3 can be a delivery target. Vision Pro is a later option, with no revenue forecast here.',40,373,277,11)
para('<b>Browser:</b> TypeScript + Babylon.js, WebGL today and a WebGPU direction. Shared scene, route and evidence data. Browser access supports demos; it generates no direct forecast revenue.',342,373,277,11)
para('<b>Offer to test:</b> $250 per venue/month + $2.50 per paid visit + $500 launch service. Venue owns ticketing, hardware and operations. Indicative visitor ticket: $10 before tax.',644,373,276,11)
para('<b>Launch condition:</b> current browser route is 210 seconds; the richer paid VR edition still needs production and hardware validation. M1 is conditional on finishing that work. Engine shells are not finished headset builds.',40,489,880,11,MUTED)
para('Quest photo: <link href="https://commons.wikimedia.org/wiki/File:Meta_Quest_3_-_1.jpg">Kyu3a</link>, <link href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</link>, resized. Browser image: repository QA capture. Memphis image: supplied aspirational reference. No hardware endorsement.',40,535,880,8,MUTED)
end()

# 4 The bottom-up acquisition and operating logic.
page(4,'Forecast drivers / all forward inputs are assumptions','From outreach to paying visitors.',
     'No public comparable publishes a transferable sales conversion rate for this product. The following are testable planning inputs, not industry averages.')
txt('BASE SALES FUNNEL',40,178,10,GOLD,'Bold')
for i,(label,y1,y2) in enumerate([('Qualified venue prospects','100','100'),('Live demos','40','50'),('Venue trials','16','28'),('New paying venues','8','14')]):
    y=204+i*37; rect(40,y,410,32,'#EAE5D9'); txt(label,52,y+7,11); right(y1,360,y+7,12,INK,'Bold'); right(y2,435,y+7,12,INK,'Bold')
txt('Year 1',318,183,9,MUTED); txt('Year 2',394,183,9,MUTED)
para('Start from zero contracted customers. Assume 60–120 day sales cycles, first close in M3, and founder-led outreach to about 30 raw accounts/month. Year 2 improvement requires referrals and pilot evidence.',40,365,410,11)
para('<b>22 gross wins − 2 lost sites = 20 active sites at M24.</b> Non-renewals in M15 and M21 represent two of the eight Year 1 accounts; 75% first-renewal retention. No automatic customer growth is assumed.',40,448,410,11)
txt('PER-VENUE USAGE & PRICING',490,178,10,GOLD,'Bold')
para('<b>Capacity:</b> 4 headsets × 3 slots/hour × 5 hours/day × 20 days = <b>1,200 paid visit slots/month</b>. This is a capacity ceiling, not demand.',490,204,430,12)
para('<b>Base demand:</b> 120 visits in a site’s first month, 180 in its second, then 240/month. Mature use is <b>20% of capacity</b>: 12 visitors/day, or 2.4% of an assumed 10,000 monthly venue visitors.',490,280,430,12)
para('<b>Company revenue:</b> $250 × active sites + $2.50 × net paid visits + $500 × newly launched sites. Launch services are delivered and billed in the first live month.',490,374,430,12)
para('Visits count paid sessions after refunds, not unique people. Sites count paying customer locations, not necessarily unique parent institutions. Prices remain flat; no calendar seasonality, subscriptions, grants or consumer-store sales are assumed.',490,454,430,10,MUTED)
end()

# 5-6 Full monthly base-case forecast, in dollars.
def forecast_page(n,start):
    yr=1 if start==0 else 2; rows=B['monthly'][start:start+12]
    rev=sum(r['revenue'] for r in rows); visits=sum(r['paid_visits'] for r in rows); result=sum(r['operating_result'] for r in rows)
    page(n,f'Base case / Year {yr} / conditional forecast',f'Every month, with the economics visible.',
         'M1 is the first full month after a commercially ready VR pilot/MVP. Company revenue excludes venue ticket proceeds and sales taxes.')
    metric(40,171,276,money(rev),'YEAR COMPANY REVENUE'); metric(342,171,276,f'{visits:,}','NET PAID VISITS'); metric(644,171,276,money(result),'YEAR OPERATING RESULT')
    widths=[48,64,62,96,135,95,150,230]; xs=[40]
    for w in widths[:-1]: xs.append(xs[-1]+w)
    heads=['Month','New / lost','Active sites','Paid visits','Licence + usage','Launch fees','Company revenue','Operating result*']
    rect(40,268,880,27,INK)
    for x,w,h in zip(xs,widths,heads): txt(h,x+7,276,8.5,PAPER,'Bold')
    for i,r in enumerate(rows):
        y=296+i*18.2
        if i%2==0: rect(40,y,880,18.2,'#EAE5D9')
        vals=[f"M{r['month']:02}",f"{r['new_sites']} / {r['lost_sites']}",str(r['active_sites']),f"{r['paid_visits']:,}",money(r['recurring_revenue']),money(r['onboarding_revenue']),money(r['revenue']),money(r['operating_result'])]
        for j,(x,w,v) in enumerate(zip(xs,widths,vals)):
            txt(v,x+7,y+3.1,10,RED if j==7 else INK,'Bold' if j==6 else 'Sans')
    para('*Revenue less modelled direct costs and fixed operating spend; before tax, interest and depreciation. Cash also reflects equipment purchases and 30-day collections (page 8). Values are scenario outputs, not bookings. Active-site counts must not be summed across months.',40,525,880,9,MUTED)
    end()
forecast_page(5,0); forecast_page(6,12)

# 7 Scenarios and charts, no implied probability.
page(7,'24-month outlook / uncertainty made visible','Three scenarios. No guaranteed growth curve.',
     'Scenarios vary both sales execution and visitor uptake. They are not statistical confidence intervals and carry no assigned probability.')
series=[('Conservative','revenue',1000,RED,'Conservative'),('Base','revenue',1000,GOLD,'Base'),('Upside','revenue',1000,TEAL,'Upside')]
lineplot(series,40,186,510,180,40,'Company revenue / month, USD thousands')
for i,(_,_,_,col,label) in enumerate(series): rect(83+i*145,371,17,3,col); txt(label,105+i*145,365,9,MUTED)
lineplot([(a,'active_sites',1,d,e) for a,b,c,d,e in series],40,405,510,122,40,'Active paying venue sites')
txt('SCENARIO SUMMARY',588,179,10,GOLD,'Bold')
headers=['','Low','Base','Upside']; tx=[588,741,806,874]
for x,s in zip(tx,headers): txt(s,x,205,10,MUTED,'Bold')
stats=[('Active sites','end_sites',False),('Mature visits/site',None,False),('Year 1 revenue','year1_revenue',True),('Year 2 revenue','year2_revenue',True),('24-month revenue','revenue',True),('24-month op. result','operating_result',True)]
for i,(label,key,ismoney) in enumerate(stats):
    y=232+i*31; txt(label,588,y,10)
    for x,name in zip(tx[1:],ALL):
        val=ALL[name]['summary'][key] if key else ALL[name]['assumptions']['mature_visits']; txt(k(val) if ismoney else str(val),x,y,9,INK,'Bold')
para('Base: <b>46,500 paid visits</b> in two years. Month 24 delivers <b>$17,050</b> company revenue, including $500 onboarding; $16,550 is recurring.',588,433,330,11)
para('Only the upside reaches a positive monthly operating result, in <b>M22</b>; its cumulative result remains negative. Conservative spending is not reduced automatically when sales disappoint.',588,490,330,10,MUTED)
para('Gross wins / losses: low 10 / 2; base 22 / 2; upside 37 / 3. All usage ramps 50% / 75% / 100%. Upside fixed spend rises to $26k/month in Year 2.',40,537,880,8,MUTED)
end()

# 8 Costs and cash reconciliation.
page(8,'Costs, funding & break-even','Revenue is not profit. Plan the runway.',
     'Base spending assumes a lean, distributed contractor team and founder-led sales. It is not a fully staffed US studio budget.')
txt('FIXED OPERATING SPEND / MONTH',40,178,10,GOLD,'Bold')
costs=[('VR engineering',6000,7000),('3D art / technical art',4500,5500),('Founder / business development',2500,3000),('Historical review / QA / content',1500,2000),('Sales / demonstrations / travel',1500,2000),('Software / insurance / administration',1000,1500),('General contingency',1000,1000)]
txt('Year 1',335,181,9,MUTED); txt('Year 2',424,181,9,MUTED)
for i,(label,a,b) in enumerate(costs):
    y=210+i*24; txt(label,40,y,10); right(money(a),391,y,10); right(money(b),480,y,10)
rect(40,384,440,25,INK); txt('TOTAL FIXED',50,390,10,PAPER,'Bold'); right('$18,000',391,390,10,PAPER,'Bold'); right('$22,000',470,390,10,PAPER,'Bold')
para('Direct costs: $60/site/month + $0.25/visit + $300/new site + 8% of company revenue reserved for collections/payment costs (3%) and engine/distribution contingency (5%). These are budget inputs, not quoted supplier rates.',40,423,440,10)
para('BLS reports a $133,080 US developer median annual wage for May 2024 [8], before employer costs. The assumed staffing budget requires part-time/distributed capacity. Engine terms must be confirmed [9,10].',40,497,440,9,MUTED)
txt('24-MONTH BASE CASH REQUIREMENT',522,178,10,GOLD,'Bold')
cash=[('Operating deficit',345455),('Demo/test equipment: M1 + M13',18000),('Uncollected M24 invoices',17050),('Peak funding gap',380505)]
for i,(label,v) in enumerate(cash): txt(label,522,209+i*28,11); right(money(v),920,209+i*28,12,INK,'Bold')
rect(522,333,398,54,INK); txt('PLANNING CAPITAL ENVELOPE',536,342,10,'#E5BE83','Bold'); right('$460,000',906,354,23,PAPER,'Serif')
para('Peak deficit × 1.20, rounded up to $5,000. Assumes collection one month after revenue; expenses paid when incurred. Includes $18,000 equipment cash spend, excludes pre-MVP development, tax, debt and financing costs.',522,402,398,10)
para('<b>Break-even:</b> at 240 visits/site, recurring revenue is $850 and contribution is $662/site/month. About <b>34 mature sites</b> cover $22,000 fixed spend. Base ends with 20 sites; no break-even date is claimed.',522,480,398,11)
end()

# 9 Deployment economics and execution gates.
page(9,'Execution plan / investment discipline','Prove the venue economics before scaling.',
     'Seek cultural-tech angels, strategic operators and impact-oriented capital first. Conventional venture scale would require repeatable distribution and a broader catalogue.')
txt('ONE MATURE VENUE / BASE ASSUMPTIONS',40,177,10,GOLD,'Bold')
for i,(label,v) in enumerate([('240 visits × $10 ticket',2400),('Paid to Ancient Memphis',-850),('Venue payment fees: 3%',-72),('Shared staff: 40 extra hours × $20',-800),('Equipment allocation / month',-250),('Hygiene / incremental overhead',-100),('Venue contribution / month',328)]):
    y=204+i*25; txt(label,40,y,11); right(money(v),445,y,11,INK,'Bold' if i==6 else 'Sans')
para('Illustrative $12,000 venue equipment investment spread over 48 months; obtain hardware quotes. Existing space and shared trained staff are essential. A dedicated 100-hour attendant at $20/hour would turn this contribution into a <b>$872 monthly loss</b>. Launch fee adds $500 in the first month.',40,398,410,10,MUTED)
para('<b>Go/no-go:</b> target at least 200 paid visits/site/month, reliable billing and acceptable visitor comfort before adding sites. At base costs, venue break-even is about 195 visits/month.',40,492,410,10)
txt('RELEASE CAPITAL IN STAGES',495,177,10,GOLD,'Bold')
para('<b>Before M1:</b> finish the VR pilot; confirm content rights, historical review, 8–10 minute value, target-hardware performance and a safe operating protocol. Price-test with actual venues.',495,204,425,11)
para('<b>M1–M6:</b> indicative first tranche <b>$150,000</b>. Base ends M6 at 3 paying sites and a $121,470 cumulative cash deficit. Review sales cycle, comfort, paid usage and support burden.',495,281,425,11)
para('<b>M7–M24:</b> release the remaining <b>$310,000</b> only if pilot evidence supports scaling. Target 8 active sites by M12 and 20 by M24. If usage or contracts miss milestones, reduce spend or revise the offer.',495,365,425,11)
para('<b>Risks to monitor:</b> slow procurement; low attendance; content fatigue and non-renewal; headset support; rights and accessibility. A 25% visit shortfall alone reduces base two-year operating contribution by about <b>$23,831</b>. No pre-MVP funding is included.',495,461,425,10,MUTED)
end()

# 10 Source register and forecasting definitions.
page(10,'Sources & methodology','Evidence you can inspect. Assumptions you can test.',
     'Primary sources consulted 22 October 2026. Prices are published snapshots; institutional licensing rates and the sales funnel are not publicly validated.')
sources=[
('1','Field Museum — VR Odyssey: Drop in the Ocean','8 minutes; $12 general / $10 member.','https://www.fieldmuseum.org/exhibition/experience/drop-in-the-ocean'),
('2','Intrepid Museum — Apollo 11 & Beyond VR','Published tickets: $13 general / $8 member.','https://intrepidmuseum.org/plan-your-visit/experiences/3d-4d-films-vr/apollo-beyond-vr'),
('3','Musée d’Orsay / Orangerie — 2024 results','6 Jan 2025: 80,000 visitors for the VR exhibition.','https://presse-orsay-orangerie.epmo-musees.fr/4-950-000-visiteurs-pour-letablissement-public-du-musee-dorsay-et-du-musee-de-lorangerie-en-2024/?lang=fra'),
('4','Horizon of Khufu — official experience page','45-minute Egyptian VR format; not a sales benchmark for this project.','https://horizonkheopsexperience.com/nyc/'),
('5','The Dalí Museum — Dreams of Dalí','Institutional licensing offered; onsite experience included with admission.','https://thedali.org/exhibit/dreams-of-dali-in-virtual-reality/'),
('6','AAM — accreditation announcement, 1 Apr 2025','Estimated 33,000 US museums; 1,116 accredited at publication.','https://www.aam-us.org/2025/04/01/aam-announces-latest-accreditation-awards-35-museums-achieve-this-distinction-2/'),
('7','AAM — attendance trends, 23 Feb 2026','2025 survey: 55% below 2019 attendance; sector headwind.','https://www.aam-us.org/2026/02/23/museum-attendance-trends-and-adaptations/'),
('8','US Bureau of Labor Statistics — software developers','Median annual wage $133,080, May 2024.','https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm'),
('9','Epic Games — Unreal Engine licensing','Commercial royalty/seat terms depend on product and use.','https://www.unrealengine.com/license'),
('10','Unity — plans and pricing','Commercial plan eligibility and platform features.','https://unity.com/products')]
for i,(num,title,desc,url) in enumerate(sources):
    x=40+(i//5)*450; y=177+(i%5)*53
    txt(num.zfill(2),x,y,11,GOLD,'Bold'); para(f'<link href="{url}" color="{INK}"><b>{title}</b></link><br/>{desc}',x+28,y,395,9.3,MUTED)
rect(40,450,880,.6,'#C9C7BD')
para('<b>Model conventions.</b> Constant USD, no inflation or FX conversion. M1 is relative to VR commercial readiness; no launch date assumed. Net paid visits are sessions, not unique people. All new sites begin billing at month start. Venue ticket sales are separate from company revenue. Operating result excludes tax, interest and depreciation; cash includes capex and a one-month collection lag. No terminal value or investment return is forecast.',40,466,880,9.2,MUTED)
para('<b>Limitations.</b> No signed customer pipeline, founder budget or pilot conversion data supplied. Scenario adoption, prices, renewal losses, costs and usage are estimates. Sample venues above are comparables, not customers. Source imagery is credited on page 3; supplied Memphis references are aspirational and require rights clearance for public promotion. Financial calculations are reproducible in the companion model JSON and Python source.',40,518,880,8.7,MUTED)
end(); C.save()
print(ROOT/'Ancient_Memphis_Business_Plan.pdf')
