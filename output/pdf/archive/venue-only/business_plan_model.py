"""Auditable planning assumptions, not measured customer demand. All money USD."""
import json, math
from pathlib import Path

PARAMS = dict(ticket_price=10, monthly_licence=250, per_paid_visit=2.5,
              onboarding_fee=500, direct_cost_per_site=60, direct_cost_per_visit=.25,
              revenue_cost_reserve=.08, onboarding_cost=300,
              capacity_per_site=1200, first_month_capex=15000, month13_capex=3000,
              collection_lag_months=1, funding_buffer=.20)
CASES = {
 'Conservative': dict(new=[0,0,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
                      lost_months=[16,19], mature_visits=120, fixed_y1=18000, fixed_y2=22000),
 'Base': dict(new=[0,0,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1],
             lost_months=[15,21], mature_visits=240, fixed_y1=18000, fixed_y2=22000),
 'Upside': dict(new=[0,1,1,1,1,1,1,1,1,2,1,2]+[2]*12,
               lost_months=[14,18,22], mature_visits=360, fixed_y1=18000, fixed_y2=26000)
}

def model(name):
    p=PARAMS; s=CASES[name]; cohorts=[]; rows=[]; cumulative_cash=0; previous_rev=0
    for month,new in enumerate(s['new'],1):
        lost=0
        if month in s['lost_months']:
            candidates=[x for x in cohorts if x['start']==month-12 and x['active']]
            assert candidates, (name,month)
            candidates[0]['active']=False; lost=1
        for _ in range(new): cohorts.append(dict(start=month,active=True))
        active=[x for x in cohorts if x['active']]
        visits=sum(round(s['mature_visits']*([.5,.75,1][min(month-x['start'],2)])) for x in active)
        recurring=len(active)*p['monthly_licence']+visits*p['per_paid_visit']
        onboarding=new*p['onboarding_fee']; revenue=recurring+onboarding
        fixed=s['fixed_y1'] if month<=12 else s['fixed_y2']
        direct=len(active)*p['direct_cost_per_site']+visits*p['direct_cost_per_visit']+revenue*p['revenue_cost_reserve']+new*p['onboarding_cost']
        cost=fixed+direct; operating=revenue-cost
        capex=p['first_month_capex'] if month==1 else p['month13_capex'] if month==13 else 0
        collections=previous_rev; cashflow=collections-cost-capex; cumulative_cash+=cashflow
        rows.append(dict(month=month,new_sites=new,lost_sites=lost,active_sites=len(active),
                         paid_visits=visits,venue_ticket_sales=visits*p['ticket_price'],
                         recurring_revenue=recurring,onboarding_revenue=onboarding,revenue=revenue,
                         direct_cost=round(direct,2),fixed_cost=fixed,total_cost=round(cost,2),
                         operating_result=round(operating,2),capex=capex,collections=collections,
                         cashflow=round(cashflow,2),cumulative_cash=round(cumulative_cash,2)))
        previous_rev=revenue
    def total(key,a=0,b=24): return round(sum(x[key] for x in rows[a:b]),2)
    summary=dict(year1_revenue=total('revenue',0,12),year2_revenue=total('revenue',12,24),
                 year1_visits=total('paid_visits',0,12),year2_visits=total('paid_visits',12,24),
                 revenue=total('revenue'),paid_visits=total('paid_visits'),new_sites=total('new_sites'),
                 lost_sites=total('lost_sites'),end_sites=rows[-1]['active_sites'],
                 operating_result=total('operating_result'),year1_result=total('operating_result',0,12),
                 year2_result=total('operating_result',12,24),direct_cost=total('direct_cost'),
                 fixed_cost=total('fixed_cost'),end_month_revenue=rows[-1]['revenue'],
                 end_recurring=rows[-1]['recurring_revenue'],end_receivables=rows[-1]['revenue'],
                 end_cash=rows[-1]['cumulative_cash'],peak_cash_need=-min(x['cumulative_cash'] for x in rows),
                 first_positive_month=next((r['month'] for r in rows if r['operating_result']>=0),None))
    summary['funding_with_buffer']=math.ceil(summary['peak_cash_need']*1.2/5000)*5000
    return dict(assumptions=s,monthly=rows,summary=summary)

ALL={name:model(name) for name in CASES}

def validate():
    for name,m in ALL.items():
        rows=m['monthly']; running=0
        for i,r in enumerate(rows):
            running+=r['new_sites']-r['lost_sites']; assert running==r['active_sites']
            assert 0<=r['paid_visits']<=r['active_sites']*PARAMS['capacity_per_site']
            assert abs(r['revenue']-r['recurring_revenue']-r['onboarding_revenue'])<.01
            assert abs(r['operating_result']-(r['revenue']-r['total_cost']))<.01
            assert r['collections']==(rows[i-1]['revenue'] if i else 0)
        assert abs(m['summary']['operating_result']-m['summary']['end_receivables']-18000-m['summary']['end_cash'])<.01
    assert ALL['Base']['summary']['new_sites']==22 and ALL['Base']['summary']['end_sites']==20
    assert ALL['Conservative']['summary']['end_sites']==8
    assert ALL['Upside']['summary']['end_sites']==34

if __name__=='__main__':
    validate()
    out=Path(__file__).parent/'Ancient_Memphis_24_Month_Model.json'
    out.write_text(json.dumps(dict(currency='USD',as_of='2026-10-22',
         month1='First full month after a commercially ready VR pilot/MVP; no calendar launch date assumed',
         status='Conditional scenarios; all forward inputs are assumptions, not observed demand',
         parameters=PARAMS,scenarios=ALL),indent=2),encoding='utf-8')
    for name,x in ALL.items(): print(name,json.dumps(x['summary']))
    print('All arithmetic and reconciliation checks passed.')
