from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parent
TMP=ROOT.parent.parent/'tmp'/'pdfs'; TMP.mkdir(parents=True,exist_ok=True)
REF=Path('D:/Projects/EgyptVRTourResources/CityMemphis')
CLIP=Path('C:/Users/SEMYUE~1/AppData/Local/Temp')
for name,file in [('Sans','segoeui.ttf'),('Bold','segoeuib.ttf'),('Serif','georgia.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file))
W,H=960,600
INK='#152D30'; GOLD='#B78745'; PAPER='#F6F1E7'; MUTED='#586B6B'; WHITE='#FFFFFF'
c=canvas.Canvas(str(ROOT/'Ancient_Memphis_Investor_Brief.pdf'),pagesize=(W,H),pageCompression=1)
c.setTitle('Ancient Memphis | Walk into history'); c.setAuthor('Egypt VR Tour')
c.setSubject('Investor concept brief: prototype, applications, proposed business model and visual ambition')
def rect(x,y,w,h,color):
    c.setFillColor(HexColor(color)); c.rect(x,H-y-h,w,h,stroke=0,fill=1)
def text(s,x,y,size=12,color=INK,font='Sans'):
    c.setFillColor(HexColor(color)); c.setFont(font,size); c.drawString(x,H-y-size,s)
def para(s,x,y,w,size=12,color=INK,leading=None,font='Sans'):
    st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.38,textColor=HexColor(color))
    p=Paragraph(s,st); pw,ph=p.wrap(w,1000); p.drawOn(c,x,H-y-ph); return ph
def pic(path,x,y,w,h):
    im=Image.open(path).convert('RGB'); im.thumbnail((1900,1500))
    b=BytesIO(); im.save(b,'JPEG',quality=87,optimize=True); b.seek(0)
    iw,ih=im.size; scale=min(w/iw,h/ih); dw,dh=iw*scale,ih*scale
    c.drawImage(ImageReader(b),x+(w-dw)/2,H-y-h+(h-dh)/2,dw,dh)
def logo(x,y,s=1,light=False):
    c.saveState(); c.translate(x,H-y-70*s); c.scale(s,s)
    c.setStrokeColor(HexColor(GOLD)); c.setLineWidth(2.4)
    c.circle(34,48,11,stroke=1,fill=0)
    p=c.beginPath(); p.moveTo(4,9); p.lineTo(11,60); p.lineTo(25,60); p.lineTo(25,16); p.moveTo(43,16); p.lineTo(43,60); p.lineTo(57,60); p.lineTo(64,9); c.drawPath(p)
    p=c.beginPath(); p.moveTo(3,3); p.curveTo(22,11,41,-3,64,5); c.drawPath(p)
    c.setFillColor(HexColor(PAPER if light else INK)); c.setFont('Serif',27); c.drawString(83,34,'ANCIENT MEMPHIS')
    c.setFillColor(HexColor(GOLD)); c.setFont('Sans',10); c.drawString(85,13,'W A L K   I N T O   H I S T O R Y')
    c.restoreState()
def page(n,kicker,title,sub=None):
    rect(0,0,W,H,PAPER); text('EGYPT VR TOUR  /  ANCIENT MEMPHIS',40,22,9,MUTED,'Bold')
    text(kicker.upper(),40,65,10,GOLD,'Bold'); text(title,40,86,32,INK,'Serif')
    if sub: para(sub,40,137,865,12,MUTED)
    rect(40,559,880,0.6,'#C9C7BD'); text('INVESTOR BRIEF  •  OCTOBER 2026',40,573,8,MUTED)
    text(f'{n:02d} / 09',880,573,8,MUTED)
def end(): c.showPage()

# 1: the concept, deliberately separating aspiration from the prototype.
rect(0,0,W,H,INK); rect(594,0,366,H,'#0F2023')
pic(REF/'Memphis_cinematic_quality.jpg',608,0,338,600)
logo(40,36,1.02,True)
text('A WALK THROUGH THE WHITE WALLS',43,151,11,GOLD,'Bold')
para('The past becomes<br/>a place you can enter.',40,191,525,41,PAPER,49,'Serif')
para('A VR-first living-history start-up: put on a headset and enter a historically plausible ancient Memphis district, from the Nile landing to the early Ptah precinct.',43,314,485,16,PAPER,23)
para('The flagship: a high-end, immersive headset experience.<br/>The companion: a simplified tour in your browser.',43,415,490,14,'#D1DCD7',21)
rect(43,489,485,1,GOLD)
text('VR-FIRST VISION  /  WORKING BROWSER PROTOTYPE',43,510,10,GOLD,'Bold')
text('Investor & venture partner brief  •  Updated 22 October 2026',43,540,10,'#D1DCD7')
text('VISUAL QUALITY REFERENCE • NOT PRODUCT FOOTAGE',618,580,7,PAPER)
end()

# The headset experience is the flagship, with hardware pictured as examples.
page(2,'The flagship / immersive VR','Put on a headset. Step into ancient Memphis.',
     'The core product vision is presence: looking around a life-size ancient city, sensing its scale and exploring it from within.')
devices=[('rift.jpg','Oculus Rift','PC VR reference','Illustrates the PC-connected VR experience: an immersive view into a world rendered by a computer.'),
         ('quest3.jpg','Meta Quest 3','Standalone VR target','A proposed route to accessible headset experiences at home, in classrooms and at cultural venues.'),
         ('visionpro.jpg','Apple Vision Pro','Spatial computing opportunity','A potential premium immersive edition, requiring a dedicated visionOS delivery and validation path.')]
for i,(file,title,label,body) in enumerate(devices):
    x=40+i*298; rect(x,181,284,181,WHITE); pic(ROOT/'assets'/file,x+7,187,270,168)
    text(title,x,374,22,INK,'Serif'); text(label.upper(),x,407,9,GOLD,'Bold'); para(body,x,430,273,11)
para('<b>Experience goal:</b> stereoscopic depth, natural head movement, spatial sound and comfortable exploration. Hardware shown illustrates the vision; compatibility is not yet certified. Rift is a legacy PC VR reference, not the proposed launch device.',40,486,880,10,MUTED)
para('Photos (resized): <link href="https://commons.wikimedia.org/wiki/File:Oculus-Rift-CV1-Headset-Front.jpg">Rift: Evan-Amos, public domain</link>; <link href="https://commons.wikimedia.org/wiki/File:Meta_Quest_3_-_1.jpg">Quest 3: Kyu3a</link>, <link href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</link>; <link href="https://commons.wikimedia.org/wiki/File:Vision_Pro_-_Facing_left.jpg">Vision Pro: Hay Kranen</link>, <link href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</link>. No manufacturer endorsement implied.',40,530,880,8,MUTED)
end()

page(3,'How it is built / two delivery paths','One historical world. VR first. Browser alongside.',
     'A shared content foundation keeps the historical story consistent while each version is tuned for its device and audience.')
rect(40,181,880,65,INK)
text('SHARED CONTENT & PRODUCTION TOOLS',60,193,11,'#D8B37D','Bold')
para('Historical research  •  Evidence records  •  Scene and route data  •  3D assets  •  Source provenance',60,217,835,13,PAPER)
for x in [254,704]:
    rect(x,246,2,26,GOLD)
rect(40,272,430,200,'#EAE5D9'); rect(490,272,430,200,'#EAE5D9')
text('01  FLAGSHIP HEADSET EXPERIENCE',58,288,11,GOLD,'Bold')
text('Unreal Engine / Unity',58,314,25,INK,'Serif')
para('The planned high-end VR path: cinematic environments, detailed materials, lifelike animation, spatial audio and headset-specific interaction and comfort.',58,355,393,12)
para('<b>Engine strategy:</b> Unreal is the primary target; Unity is an alternative adapter for platform or production needs.',58,422,393,11,MUTED)
text('02  SIMPLIFIED BROWSER COMPANION',508,288,11,GOLD,'Bold')
text('TypeScript + Babylon.js',508,314,25,INK,'Serif')
para('A lighter experience designed for laptop browsers and broad access. WebGL today, with a WebGL-WebGPU direction for future rendering development.',508,355,393,12)
para('<b>Role:</b> easy discovery, demonstrations and learning access. The existing browser prototype can request WebXR.',508,422,393,11,MUTED)
para('<b>Current implementation:</b> browser prototype and shared data contracts. Unreal remains a project shell; Unity is reserved. Engine import bridges, headset-specific builds and performance/comfort validation are production milestones, not completed features.',40,491,880,11,MUTED)
end()

# 2: all three user-supplied product screenshots.
page(4,'The prototype today / foundation for VR','A small world. A credible foundation.',
     'A calm first-person walk through living history, with a configured 210-second guided route and optional exploration.')
shots=[('24883de2-0122-4bd2-b408-8427bedd7f1b','01  White Walls threshold'),('db8d8944-dd0c-46c0-b73f-5029c6d7c59b','02  Craftsmen area'),('ca791078-962a-4e6d-8881-06f7373c9976','03  Early Ptah precinct')]
for i,(id,cap) in enumerate(shots):
    x=40+i*298; rect(x,185,284,161,INK)
    pic(CLIP/f'codex-clipboard-{id}.png',x,185,284,161); text(cap,x,355,12,INK,'Bold')
para('CURRENT PROTOTYPE',40,397,270,10,GOLD,font='Bold')
para('Browser-rendered district, route playback, ambient movement and soundscape controls. Compatible browsers can request a WebXR session.',40,421,267,12)
para('TRUST AS A PRODUCT FEATURE',338,397,270,10,GOLD,font='Bold')
para('An evidence view separates confirmed, inferred and speculative reconstruction, with claim-level notes and source links.',338,421,267,12)
para('WHAT COMES NEXT',636,397,270,10,GOLD,font='Bold')
para('Cinematic materials, natural character motion and headset comfort validation. Unreal is a project shell; Unity is reserved. Neither is a finished VR release.',636,421,277,12)
text('Images: user-supplied browser screenshots. Prototype visuals are distinct from the reference imagery on pages 1, 8 and 9.',40,535,8,MUTED)
end()

# 3: applications and grounded positioning.
page(5,'Who it can serve','One reconstructed district. Several doors in.',
     'Proposed initial focus: immersive VR at cultural and education venues, supported by an accessible browser preview.')
cards=[('01','Museums & heritage venues','An immersive introduction before visitors encounter collections or ruins.','Buyer: exhibitions or digital interpretation team.','Paid pilot, then a venue content licence.'),
('02','Schools & universities','A guided visual setting for discussing daily life and how historical evidence is interpreted.','Buyer: department, school or learning provider.','Annual institutional access plus teaching packs.'),
('03','Tourism & cultural travel','A preview of ancient urban life before a trip, or an interpretive experience on location.','Buyer: visitor centre, tour operator or hotel group.','Branded licence or bundled visitor access.'),
('04','History enthusiasts & VR venues','A focused, atmospheric journey for curious audiences and future headset visitors.','Buyer: individual visitor or venue operator.','Premium episodes; later ticketed VR sessions.')]
for i,(num,title,body,buyer,model) in enumerate(cards):
    x=40+(i%2)*450; y=190+(i//2)*151
    rect(x,y,430,132,'#EAE5D9'); text(num,x+17,y+14,12,GOLD,'Bold'); text(title,x+48,y+12,17,INK,'Serif')
    para(body,x+17,y+42,394,11); para(buyer+'<br/>'+model,x+17,y+86,395,10,MUTED)
para('<b>Category precedent:</b> Excurio markets <i>Horizon of Khufu</i>, an immersive Egyptian heritage experience [1]. This establishes a relevant category, not demand or revenue for this project.',40,506,580,10,MUTED)
para('<b>Positioning hypothesis:</b> headset presence + everyday city life + transparent evidence.',660,506,258,11,INK)
end()

# 4: no invented pricing or financial projections.
page(6,'Proposed monetization','Sell a place to explore. License a world to teach.',
     'Build toward paid VR venue and institutional pilots; use the browser companion for discovery, demonstrations and wider reach.')
cols=[40,253,578]; widths=[195,307,342]
for x,w,label in zip(cols,widths,['REVENUE STREAM','COMMERCIAL DESIGN','WHAT MUST BE PROVEN']):
    rect(x,185,w,30,INK); text(label,x+12,193,10,PAPER,'Bold')
rows=[('Institutional licences','Paid pilot → annual site or institution licence. Charge separately for onboarding and localisation.','Renewal intent, manageable support effort and repeat use by teachers or visitors.'),
('Premium consumer tours','Free short preview → one-time paid episode or multi-tour bundle. Subscriptions only after a larger catalogue exists.','Conversion, acquisition cost, completion and willingness to buy another journey.'),
('Venue VR distribution','Content licence and/or per-ticket share with an operating partner once headset delivery is validated.','Comfort, session throughput, reliable operation and partner economics.'),
('Commissioned experiences','Funded adaptations for museums or destinations, with reusable content and rights agreed in the contract.','Delivery margin, controlled scope and a repeatable production process.')]
for i,row in enumerate(rows):
    y=224+i*63
    for j,s in enumerate(row):
        rect(cols[j],y,widths[j],58,'#EAE5D9' if i%2==0 else '#F0ECE3'); para(s,cols[j]+12,y+9,widths[j]-24,11,INK,font='Bold' if j==0 else 'Sans')
para('<b>Economic discipline</b>  Track net receipts after platform fees or partner share, hosting, support and content upkeep. Recover research and production costs across repeat licences before expanding the catalogue.',40,489,570,12)
para('<b>Status:</b> these are proposals. No pricing, revenue, customers or signed partnerships were substantiated by the reviewed repository.',649,489,265,11,MUTED)
end()

# 5: practical investment case, readiness and concise sources.
page(7,'The next investable milestone','From browser prototype to flagship VR pilot.',
     'Fund a cinematic headset experience, prove comfort and performance, and test its commercial value with real partners.')
for i,(label,title,body) in enumerate([
 ('BUILD','A cinematic VR slice','Bring the locked hero street into the chosen VR engine. Develop materials, lighting, natural motion, spatial sound and headset interaction.'),
 ('VALIDATE','A headset-ready experience','Test frame rate, input, seated/standing use and comfortable locomotion on chosen headsets. Add reviewed narration and learning content.'),
 ('COMMERCIALISE','A paid institutional pilot','Recruit pilot partners, instrument completion and satisfaction, test pricing, and seek renewal or expansion commitments.')]):
    x=40+i*298; text(label,x,187,10,GOLD,'Bold'); text(title,x,213,19,INK,'Serif'); para(body,x,249,266,12)
rect(40,336,880,1,'#C9C7BD')
para('<b>Reusable foundation.</b> TypeScript/Babylon.js browser runtime, shared route and evidence contracts, source register and generated asset pipeline. Reuse across future engines is an architectural intention, not yet proven production portability.',40,356,424,11)
para('<b>Execution risks.</b> Visual quality remains below the references. Headset performance and comfort need testing; historical review and media rights need clearance. The reviewed app has no established billing or commercial analytics flow.',494,356,426,11)
para('<b>Partner invitation:</b> fund the flagship VR slice, supply curatorial expertise or host a headset pilot. Funding size, team plan and delivery dates should follow a costed production scope; no forecast or investment return is implied.',40,444,880,12)
para('<b>Review basis, 8 Oct 2026:</b> CODEx_handoff.MD; README.md; README_ABOUT.MD; browser UI and scene code; shared contracts; tour/evidence manifests; engine notes and production roadmap. Static checks recorded in the companion review notes; no headset test performed.',40,501,590,8.3,MUTED)
para('[1] <link href="https://www.excurio.com/en/horizon-of-khufu/" color="#586B6B">Excurio: Horizon of Khufu</link><br/>Primary product source, consulted 8 Oct 2026.<br/>No partnership with Excurio is represented.',666,502,249,8.3,MUTED)
end()

# 6: cinematic target; full images preserve their provenance cues.
page(8,'Visual ambition / supplied references','The feeling: “I was there.”',
     'Warm light, tactile surfaces, atmospheric depth and everyday life. These images communicate ambition; they are not current application output.')
items=[('Memphis_cinematic_quality2.jpg','Street life & material detail'),('Memphis8.jpg','Urban scale'),('Memphis9.jpg','Crowds & light'),('Memphis10.jpg','Atmosphere'),('Memphis11.jpg','Depth & colour')]
for i,(f,cap) in enumerate(items):
    x=40+i*178; rect(x,187,166,298,INK); pic(REF/f,x+4,191,158,290); text(cap,x,495,10,INK,'Bold')
para('Visual references span different periods and artistic interpretations, including New Kingdom and monumental imagery. They guide mood only; the product remains scoped to Early Dynastic / Old Kingdom Memphis.',40,521,880,10,MUTED)
end()

# 7: include every remaining supplied visual without historical or ownership overclaim.
page(9,'Reference collection / supplied imagery','A shared visual language for the next chapter.',
     'Architecture, riverfront life, colour and composition: a compact visual brief for production and investor discussion.')
files=['Memphis1.jpg','Memphis2.jpg','Memphis3.jpg','Memphis4.jpg','Memphis5.jpg','Memphis6.jpg','Memphis7.jpg','Memphis12.jpg']
for i,f in enumerate(files):
    x=40+(i%4)*223; y=184+(i//4)*158
    rect(x,y,211,127,'#E5E0D4'); pic(REF/f,x+3,y+3,205,121); text(f.replace('.jpg',''),x,y+133,9,MUTED)
para('All reference imagery was supplied by the project owner; original creator marks are retained. Ownership and redistribution permissions have not been verified. Clear permissions or replace references with owned/licensed art before public promotion. These are not archaeological proof, licensed runtime assets or finished product screenshots.',40,510,880,9,MUTED)
end(); c.save()

# Editable vector logotype: a gateway, sun and river, rather than a claimed historical symbol.
svg='''<svg xmlns="http://www.w3.org/2000/svg" width="760" height="150" viewBox="0 0 760 150"><title>Ancient Memphis — Walk into history</title><g transform="translate(22,22)" fill="none" stroke="#B78745" stroke-width="3.6"><circle cx="51" cy="33" r="16.5"/><path d="M6 91.5 L16.5 15 H37.5 V81 M64.5 81 V15 H85.5 L96 91.5 M4.5 100.5 C33 88.5 61.5 109.5 96 97.5"/></g><text x="148" y="77" font-family="Georgia,serif" font-size="42" fill="#152D30">ANCIENT MEMPHIS</text><text x="151" y="110" font-family="Segoe UI,Arial,sans-serif" font-size="15" letter-spacing="4" fill="#B78745">WALK INTO HISTORY</text></svg>'''
(ROOT/'Ancient_Memphis_Logotype.svg').write_text(svg,encoding='utf-8')
old=c; c=canvas.Canvas(str(TMP/'logo_preview.pdf'),pagesize=(760,150)); H=150
rect(0,0,760,150,PAPER); logo(25,20,1.48); c.showPage(); c.save(); c=old
print(ROOT/'Ancient_Memphis_Investor_Brief.pdf')
