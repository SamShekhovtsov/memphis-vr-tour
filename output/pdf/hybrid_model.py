"""Planning scenarios, USD; no measured sales. All figures after commercial MVP."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
CASES={
 'Downside':dict(units=[150,60,60,70,80,90,100,110,120,130,140,150,150,160,160,170,170,180,180,190,190,200,200,200],wins=[5,8,11,14,17,20],losses=[17],visits=120,refund=.20,paid=.40,cac=10,fixed=[6500,7500]),
 'Base':dict(units=[300,120,130,150,180,200,240,260,300,330,360,400,440,480,520,560,600,640,680,700,720,750,780,800],wins=[3,5,7,9,11,12,14,16,18,19,21,22,23,24],losses=[15,17],visits=180,refund=.10,paid=.25,cac=8,fixed=[6500,7500]),
 'Upside':dict(units=[600,300,350,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400],wins=[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],losses=[14,18,22],visits=240,refund=.08,paid=.25,cac=6,fixed=[7500,9500])}
def model(p,consumer=True,venues=True):
 rows=[]; cohorts=[]; cum=0; prev=0
 for m in range(1,25):
  new=int(m in p['wins']) if venues else 0; lost=int(m in p['losses']) if venues else 0
  if lost: cohorts.remove(m-12)
  if new: cohorts.append(m)
  n=len(cohorts); visits=sum(p['visits']*([.5,.75][m-a] if m-a<2 else 1) for a in cohorts)
  u=p['units'][m-1] if consumer else 0; kept=u*(1-p['refund']); gross=kept*8.5; store=gross*.30
  d=gross-store; venue=250*n+2.5*visits+500*new
  acq=u*p['paid']*p['cac']; dc=u*.25+gross*.05
  vc=n*60+visits*.25+venue*.08+new*300
  fixed=p['fixed'][0 if m<=12 else 1]; rev=d+venue; op=rev-acq-dc-vc-fixed
  capex=6000 if m==1 else (2000 if m==13 else 0)
  cash=prev-acq-dc-vc-fixed-capex; cum+=cash
  rows.append(dict(month=m,orders=u,retained=kept,new_sites=new,lost_sites=lost,active_sites=n,paid_visits=visits,consumer_gross=gross,store_fee=store,consumer_net=d,venue_revenue=venue,revenue=rev,acquisition=acq,consumer_cost=dc,venue_cost=vc,fixed=fixed,operating_result=op,capex=capex,collections=prev,cashflow=cash,cumulative_cash=cum,traffic=u/.02))
  prev=rev
 peak=-min(r['cumulative_cash'] for r in rows)
 s={key:sum(r[key] for r in rows) for key in ['orders','retained','paid_visits','revenue','consumer_net','venue_revenue','operating_result','acquisition','fixed']}
 s.update(end_sites=rows[-1]['active_sites'],end_result=rows[-1]['operating_result'],first_profit=next((r['month'] for r in rows if r['operating_result']>=0),None),first_cash_profit=next((r['month'] for r in rows if r['cashflow']>=0),None),payback=next((r['month'] for r in rows if r['cumulative_cash']>=0),None),peak_need=peak,funding=math.ceil(peak*1.2/5000)*5000,end_cash=cum)
 return dict(inputs=p,monthly=rows,summary=s)
ALL={name:model(p) for name,p in CASES.items()}
ALL['Consumer only']=model(CASES['Base'],venues=False)
ALL['Lean venues only']=model(CASES['Base'],consumer=False)
def validate():
 for case in ALL.values():
  last=0
  for r in case['monthly']:
   assert abs(r['revenue']-r['consumer_net']-r['venue_revenue'])<1e-7
   assert abs(r['operating_result']-(r['revenue']-r['acquisition']-r['consumer_cost']-r['venue_cost']-r['fixed']))<1e-7
   assert abs(r['cumulative_cash']-last-r['cashflow'])<1e-7
   assert r['paid_visits']<=r['active_sites']*1200
   last=r['cumulative_cash']
  assert abs(last-(case['summary']['operating_result']-8000-case['monthly'][-1]['revenue']))<1e-6
validate()
if __name__=='__main__':
 (ROOT/'Ancient_Memphis_24_Month_Model.json').write_text(json.dumps(ALL,indent=2),encoding='utf-8')
 for n,c in ALL.items(): print(n,json.dumps(c['summary']))
