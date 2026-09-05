import { AIRCRAFT, AIRPORTS, aircraftById, airportByIata } from './data';
import type { Acquisition, ActionResult, Company, Competitor, Difficulty, FinancialStatement, FleetAircraft, GameState, OfflineReport, Route, StaffState } from './types';

const DAY = 86_400_000;
const uid = (prefix:string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const clone = <T,>(value:T):T => structuredClone(value);
const clamp = (min:number,max:number,value:number) => Math.max(min,Math.min(max,value));

export const money = (value:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value);
export const compact = (value:number) => new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value);

export function distanceKm(aIata:string,bIata:string) {
  const a=airportByIata(aIata), b=airportByIata(bIata); if(!a||!b) return 0;
  const r=6371, dLat=(b.latitude-a.latitude)*Math.PI/180, dLon=(b.longitude-a.longitude)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.latitude*Math.PI/180)*Math.cos(b.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));
}

function transact(state:GameState, amount:number, category:string, description:string, timestamp=Date.now()) {
  if(!Number.isFinite(amount)||amount===0) return;
  state.cash=Math.round((state.cash+amount)*100)/100;
  state.transactions.unshift({id:uid('TX'),timestamp,amount,category,description});
  state.transactions=state.transactions.slice(0,600);
  if(amount<0 && !['loan','fuel_inventory'].includes(category)) state.stats.expenses+=Math.abs(amount);
}

const openingCapital:Record<Difficulty,number>={easy:35_000_000,normal:22_000_000,realistic:15_000_000};

const initialCompetitors=(now:number):Competitor[]=>[
  {id:'cruzeiro',name:'Cruzeiro Connect',code:'CZ',strategy:'Preço e frequência',aggression:78,service:64,fareIndex:.88,marketShare:27,activeRoutes:18,trend:1.2},
  {id:'horizonte',name:'Horizonte Air',code:'HZ',strategy:'Serviço premium',aggression:59,service:88,fareIndex:1.18,marketShare:24,activeRoutes:14,trend:.4},
  {id:'meridian',name:'Meridian Global',code:'MG',strategy:'Conexões internacionais',aggression:67,service:81,fareIndex:1.08,marketShare:31,activeRoutes:26,trend:.8},
  {id:'cargasul',name:'CargaSul Logistics',code:'CL',strategy:'Carga expressa',aggression:71,service:73,fareIndex:.97,marketShare:18,activeRoutes:11,trend:-.2},
].map(c=>({...c,trend:c.trend+Math.sin(now/DAY+c.marketShare)*.1}));

export function hydrateGameState(current:GameState):GameState {
  const now=Date.now(),state=clone(current);
  state.staff={...state.staff,fatigue:Number.isFinite(state.staff?.fatigue)?state.staff.fatigue:8};
  state.stats={...state.stats,delayedFlights:Number.isFinite(state.stats?.delayedFlights)?state.stats.delayedFlights:0};
  state.competitors=Array.isArray(state.competitors)&&state.competitors.length?state.competitors:initialCompetitors(now);
  state.marketState=state.marketState||{economicIndex:1,seasonIndex:1,demandIndex:1,competitorPressure:.54,fuelVolatility:.5,updatedAt:now};
  state.events=Array.isArray(state.events)?state.events:[];
  state.flightLog=Array.isArray(state.flightLog)?state.flightLog:[];
  return state;
}

export function createNewGame(input:Omit<Company,'id'|'foundedAt'>):GameState {
  const now=Date.now(), capital=openingCapital[input.difficulty];
  const state:GameState={
    version:1, company:{...input,id:uid('CO'),foundedAt:now}, cash:capital,
    fuelStockKg:25_000,fuelCapacityKg:150_000,fuelPrice:5.35,fuelAverageCost:5.15,
    fleet:[],routes:[],schedules:[],
    staff:{pilots:2,cabin:2,engineers:1,mechanics:1,admin:2,morale:82,training:1,fatigue:8},
    transactions:[], stats:{flights:0,passengers:0,cargoKg:0,revenue:0,expenses:0,distanceKm:0,cancellations:0,onTime:100,safety:95,reputation:50,passengerReputation:50,cargoReputation:45,delayedFlights:0},
    loans:[],marketingUntil:0,marketingBoost:0,competitors:initialCompetitors(now),marketState:{economicIndex:1,seasonIndex:1,demandIndex:1,competitorPressure:.54,fuelVolatility:.5,updatedAt:now},events:[],flightLog:[],stage:1,lastSimulationAt:now,lastSavedAt:now,lastBackupAt:now
  };
  state.transactions.push({id:uid('TX'),timestamp:now,amount:capital,category:'capital',description:'Capital inicial da companhia'});
  return state;
}

function registrationFor(state:GameState) {
  const prefixes:Record<string,string>={'Brasil':'PR','Argentina':'LV','Chile':'CC','Estados Unidos':'N','Portugal':'CS','Reino Unido':'G'};
  const prefix=prefixes[state.company.country]||'XA';
  return `${prefix}-${state.company.iata}${String(state.fleet.length+1).padStart(2,'0')}`;
}

export function acquireAircraft(current:GameState,modelId:string,acquisition:Acquisition):ActionResult {
  const state=clone(current), model=aircraftById(modelId); if(!model) return {state:current,error:'Modelo de aeronave inválido.'};
  if(model.stage>state.stage) return {state:current,error:`Requer certificado operacional nível ${model.stage}.`};
  const base=airportByIata(state.company.base); if(!base||base.runwayLength<model.runwayRequiredM) return {state:current,error:'A pista da sua base não comporta este modelo.'};
  const price=acquisition==='new'?model.purchasePrice:acquisition==='used'?Math.round(model.purchasePrice*.43):model.leasePrice*2;
  if(state.cash<price) return {state:current,error:'Caixa insuficiente para esta aquisição.'};
  const used=acquisition==='used', condition=used?Math.round(72+Math.random()*17):100, age=used?Math.round(5+Math.random()*13):0;
  const aircraft:FleetAircraft={id:uid('AC'),modelId,registration:registrationFor(state),acquisition,acquisitionPrice:price,monthlyLease:acquisition==='lease'?model.leasePrice:0,ageYears:age,hours:used?Math.round(age*1900):0,cycles:used?Math.round(age*1250):0,condition,value:acquisition==='lease'?0:price,status:'ground',location:state.company.base,lastCheckHours:0,acquiredAt:Date.now()};
  state.fleet.push(aircraft); transact(state,-price,acquisition==='lease'?'leasing':'aircraft',`${acquisition==='lease'?'Entrada de leasing':'Aquisição'} — ${model.manufacturer} ${model.model}`);
  return {state,message:`${aircraft.registration} incorporada à frota.`};
}

export function sellAircraft(current:GameState,aircraftId:string):ActionResult {
  const state=clone(current), aircraft=state.fleet.find(a=>a.id===aircraftId); if(!aircraft) return {state:current,error:'Aeronave não encontrada.'};
  if(state.routes.some(r=>r.aircraftId===aircraftId&&r.active)) return {state:current,error:'Desative e remova a rota vinculada antes da venda.'};
  const model=aircraftById(aircraft.modelId)!;
  if(aircraft.acquisition==='lease') { state.fleet=state.fleet.filter(a=>a.id!==aircraftId); return {state,message:`Leasing de ${aircraft.registration} encerrado.`}; }
  const value=Math.max(0,Math.round(aircraft.value*(aircraft.condition/100)*.92)); state.fleet=state.fleet.filter(a=>a.id!==aircraftId);
  transact(state,value,'aircraft_sale',`Venda de ${aircraft.registration} — ${model.model}`); return {state,message:`Aeronave vendida por ${money(value)}.`};
}

export function recommendedFare(origin:string,destination:string) {
  const d=distanceKm(origin,destination), a=airportByIata(origin), b=airportByIata(destination);
  return Math.round(Math.max(170,d*.48+((a?.fees||1)+(b?.fees||1))*55));
}

function autoTimes(modelId:string,distance:number,frequency:number) {
  const model=aircraftById(modelId)!; const duration=distance/model.cruiseSpeedKmh*60+35; const block=duration*2+model.turnaroundMin*2;
  const starts:number[]=[]; let cursor=360;
  for(let i=0;i<frequency;i++){ if(cursor+block>1380) break; starts.push(cursor); cursor+=Math.max(block+35,(1020-block)/Math.max(1,frequency-1)); }
  return starts.map(total=>`${String(Math.floor(total/60)).padStart(2,'0')}:${String(Math.round(total%60)).padStart(2,'0')}`);
}

export function createRoute(current:GameState,input:{destination:string;aircraftId:string;fare:number;frequency:number;businessShare:number;firstShare:number}):ActionResult {
  const state=clone(current), aircraft=state.fleet.find(a=>a.id===input.aircraftId), model=aircraft&&aircraftById(aircraft.modelId);
  if(!aircraft||!model) return {state:current,error:'Selecione uma aeronave válida.'};
  if(state.schedules.some(s=>s.aircraftId===aircraft.id&&s.active)) return {state:current,error:'Esta aeronave já possui uma programação ativa.'};
  const origin=state.company.base,destination=airportByIata(input.destination),originAirport=airportByIata(origin),distance=distanceKm(origin,input.destination);
  if(!destination||!originAirport||destination.iata===origin) return {state:current,error:'Escolha um destino diferente da base.'};
  if(distance>model.rangeKm*.9) return {state:current,error:'A rota excede a autonomia operacional desta aeronave.'};
  if(destination.runwayLength<model.runwayRequiredM) return {state:current,error:'A pista do destino é incompatível com a aeronave.'};
  if(input.fare<=0||input.frequency<1||input.frequency>3) return {state:current,error:'Revise a tarifa e a frequência.'};
  const times=autoTimes(model.id,distance,input.frequency); if(times.length<input.frequency) return {state:current,error:'Não há janela diária suficiente para essa frequência.'};
  const route:Route={id:uid('RT'),origin,destination:destination.iata,aircraftId:aircraft.id,fare:input.fare,businessShare:clamp(0,.3,input.businessShare),firstShare:clamp(0,.08,input.firstShare),distanceKm:distance,frequency:input.frequency,createdAt:Date.now(),active:true};
  state.routes.push(route); state.schedules.push({id:uid('SC'),routeId:route.id,aircraftId:aircraft.id,flightNumber:`${state.company.iata}${String(100+state.routes.length*10)}`,days:[0,1,2,3,4,5,6],departureTimes:times,active:true});
  return {state,message:`Rota ${origin}–${destination.iata} programada automaticamente.`};
}

export function toggleRoute(current:GameState,routeId:string):ActionResult {
  const state=clone(current),route=state.routes.find(r=>r.id===routeId); if(!route)return {state:current,error:'Rota não encontrada.'};
  route.active=!route.active; const schedule=state.schedules.find(s=>s.routeId===routeId); if(schedule)schedule.active=route.active;
  return {state,message:`Rota ${route.active?'ativada':'pausada'}.`};
}

export function removeRoute(current:GameState,routeId:string):ActionResult {
  const state=clone(current),route=state.routes.find(r=>r.id===routeId);if(!route)return {state:current,error:'Rota não encontrada.'};
  state.routes=state.routes.filter(r=>r.id!==routeId);state.schedules=state.schedules.filter(s=>s.routeId!==routeId);
  return {state,message:`Rota ${route.origin}–${route.destination} removida do planejamento.`};
}

const salaryRates:Record<keyof Omit<StaffState,'morale'|'training'|'fatigue'>,number>={pilots:18500,cabin:6200,engineers:12800,mechanics:9200,admin:6800};

function hasCrew(state:GameState,modelId:string){const m=aircraftById(modelId)!;return state.staff.pilots>=m.crewPilots&&state.staff.cabin>=m.crewCabin&&state.staff.engineers>=1&&state.staff.mechanics>=1;}

function connectionScore(state:GameState,route:Route){const other=state.routes.filter(r=>r.active&&r.id!==route.id&&r.origin===route.origin).length;return clamp(0,.16,other*.025+route.frequency*.012);}
export function routeMarketForecast(state:GameState,route:Route){const recommended=recommendedFare(route.origin,route.destination),priceFactor=clamp(.55,1.2,recommended/route.fare),connection=connectionScore(state,route),pressure=state.marketState.competitorPressure;const demand=clamp(.3,1.25,state.marketState.demandIndex*priceFactor*(1-pressure*.18)+connection);return {demand,pressure,recommended,connection,expectedLoad:clamp(.28,.97,.54+demand*.22+(state.stats.reputation-50)/190)};}

function recordCancellation(state:GameState,route:Route,timestamp:number,registration='Indisponível') {const schedule=state.schedules.find(s=>s.routeId===route.id);state.flightLog.unshift({id:uid('FL'),timestamp,flightNumber:schedule?.flightNumber||state.company.iata,routeId:route.id,origin:route.origin,destination:route.destination,aircraftRegistration:registration,passengers:0,cargoKg:0,revenue:0,delayMinutes:0,status:'canceled',connectionBonus:0});state.flightLog=state.flightLog.slice(0,160);}

function simulateService(state:GameState,route:Route,timestamp:number,report:OfflineReport){
  const aircraft=state.fleet.find(a=>a.id===route.aircraftId), model=aircraft&&aircraftById(aircraft.modelId), a=airportByIata(route.origin), b=airportByIata(route.destination);
  if(!aircraft||!model||!a||!b||aircraft.status==='maintenance'||aircraft.condition<55||aircraft.hours-aircraft.lastCheckHours>190||!hasCrew(state,model.id)){report.canceled++;state.stats.cancellations++;recordCancellation(state,route,timestamp,aircraft?.registration);return;}
  const forecast=routeMarketForecast(state,route),demandFactor=(a.demand+b.demand)/190,marketing=timestamp<state.marketingUntil?state.marketingBoost:0,noise=(Math.sin(timestamp/100000+route.distanceKm)*.5+.5)*.07;
  const activeEvents=state.events.filter(e=>!e.resolved&&timestamp>=e.startedAt&&timestamp<=e.expiresAt),eventDemand=activeEvents.reduce((s,e)=>s+e.demandImpact,0);
  const load=clamp(.28,.97,.43+demandFactor*.18+(state.stats.reputation-50)/180+marketing+forecast.demand*.19+eventDemand+noise);
  const paxPerLeg=Math.floor(model.maxPassengers*load), passengers=paxPerLeg*2;
  const businessPax=Math.floor(passengers*route.businessShare), firstPax=Math.floor(passengers*route.firstShare), economyPax=passengers-businessPax-firstPax;
  const passengerRevenue=economyPax*route.fare+businessPax*route.fare*2.25+firstPax*route.fare*4;
  const cargoKg=model.category==='cargo'?Math.round(model.cargoKg*(.55+load*.35)):Math.round(model.cargoKg*.09*load);
  const cargoRevenue=cargoKg*(.72+route.distanceKm/8000); const revenue=Math.round(passengerRevenue+cargoRevenue);
  const hours=(route.distanceKm/model.cruiseSpeedKmh+.58)*2, fuelKg=Math.round(hours*model.fuelBurnKgHour*1.08), fuelEconomicCost=Math.round(fuelKg*state.fuelAverageCost);
  if(state.fuelStockKg<fuelKg){const short=fuelKg-state.fuelStockKg,cost=Math.round(short*state.fuelPrice);if(state.cash<cost){report.canceled++;state.stats.cancellations++;recordCancellation(state,route,timestamp,aircraft.registration);return;}transact(state,-cost,'fuel',`Compra automática de ${compact(short)} kg de combustível`,timestamp);report.fuelCost+=cost;state.fuelStockKg+=short;}
  state.fuelStockKg=Math.max(0,state.fuelStockKg-fuelKg);
  const fees=Math.round((a.fees+b.fees)*1450+passengers*5.2), maintenance=Math.round(route.distanceKm*model.maintenanceFactor*.42);
  transact(state,revenue,'flight_revenue',`${route.origin}–${route.destination} · ${aircraft.registration}`,timestamp);
  transact(state,-fees,'airport_fees',`Taxas aeroportuárias · ${route.origin}–${route.destination}`,timestamp);
  transact(state,-maintenance,'maintenance_accrual',`Reserva de manutenção · ${aircraft.registration}`,timestamp);
  const crewNeed=Math.max(1,state.fleet.filter(f=>state.routes.some(r=>r.aircraftId===f.id&&r.active)).length),crewCoverage=clamp(.45,1,(state.staff.pilots+state.staff.cabin)/Math.max(1,crewNeed*(model.crewPilots+model.crewCabin))),eventDelay=activeEvents.reduce((s,e)=>s+e.delayImpact,0),delayRisk=clamp(.03,.88,.08+(100-aircraft.condition)/190+state.staff.fatigue/230+(1-crewCoverage)*.32+eventDelay-state.staff.training*.012),delayRoll=(Math.sin(timestamp/420000+route.distanceKm)*.5+.5),delayMinutes=delayRoll<delayRisk?Math.round(8+delayRisk*52+delayRoll*18):0;
  aircraft.hours+=hours; aircraft.cycles+=2; aircraft.condition=clamp(0,100,aircraft.condition-hours*.075-model.maintenanceFactor*.035); aircraft.value=Math.max(0,aircraft.value*(1-hours/90_000)); aircraft.location=route.origin;
  state.stats.flights+=2;state.stats.passengers+=passengers;state.stats.cargoKg+=cargoKg;state.stats.revenue+=revenue;state.stats.distanceKm+=route.distanceKm*2;
  if(delayMinutes){state.stats.delayedFlights+=2;report.delayed+=2;}state.stats.onTime=clamp(0,100,(state.stats.onTime*Math.max(0,state.stats.flights-2)+(delayMinutes?0:200))/Math.max(1,state.stats.flights));
  state.stats.reputation=clamp(0,100,state.stats.reputation+(load>.72?.012:-.01));state.stats.passengerReputation=clamp(0,100,state.stats.passengerReputation+(load>.68?.01:-.012));
  report.flights+=2;report.passengers+=passengers;report.cargoKg+=cargoKg;report.revenue+=revenue;report.fuelCost+=fuelEconomicCost;report.fees+=fees;report.maintenanceCost+=maintenance;
  const schedule=state.schedules.find(s=>s.routeId===route.id);state.flightLog.unshift({id:uid('FL'),timestamp,flightNumber:schedule?.flightNumber||state.company.iata,routeId:route.id,origin:route.origin,destination:route.destination,aircraftRegistration:aircraft.registration,passengers,cargoKg,revenue,delayMinutes,status:delayMinutes?'delayed':'completed',connectionBonus:forecast.connection});state.flightLog=state.flightLog.slice(0,160);
}

function updateMarket(state:GameState,now:number){const economy=clamp(.84,1.17,1+Math.sin(now/DAY/43)*.08+Math.sin(now/DAY/113)*.05),season=clamp(.86,1.14,1+Math.sin(now/DAY/29)*.09),reputationEdge=(state.stats.reputation-50)/500;state.competitors=state.competitors.map((c,i)=>{const wave=Math.sin(now/DAY/(9+i*3)+i)*.8;return {...c,fareIndex:clamp(.78,1.28,c.fareIndex+wave*.002),marketShare:clamp(8,42,c.marketShare+wave*.018-reputationEdge),trend:wave};});const pressure=clamp(.28,.86,state.competitors.reduce((s,c)=>s+c.marketShare*c.aggression/100,0)/100);state.marketState={economicIndex:economy,seasonIndex:season,demandIndex:clamp(.72,1.25,economy*season),competitorPressure:pressure,fuelVolatility:clamp(0,1,.5+Math.sin(now/DAY/8)*.35),updatedAt:now};}

function generateEvents(state:GameState,from:number,now:number){state.events=state.events.filter(e=>e.expiresAt>now-DAY*7).map(e=>e.expiresAt<=now?{...e,resolved:true}:e);const firstDay=Math.floor(from/DAY)+1,lastDay=Math.floor(now/DAY),templates=[{title:'Frente de tempestades',description:'Meteorologia adversa pressiona a pontualidade da malha.',severity:'warning' as const,demandImpact:-.03,delayImpact:.24,fuelImpact:.03},{title:'Feira internacional',description:'Um grande evento elevou a procura por viagens corporativas.',severity:'info' as const,demandImpact:.11,delayImpact:.01,fuelImpact:0},{title:'Alta do combustível',description:'O mercado spot elevou temporariamente o custo do querosene.',severity:'critical' as const,demandImpact:0,delayImpact:0,fuelImpact:.16},{title:'Restrição aeroportuária',description:'Obras de pista reduzem a capacidade operacional por alguns dias.',severity:'warning' as const,demandImpact:-.05,delayImpact:.18,fuelImpact:.02}];for(let day=firstDay;day<=lastDay;day++){const roll=(Math.sin(day*12.9898)*43758.5453)%1;if(Math.abs(roll)>.84&&!state.events.some(e=>Math.floor(e.startedAt/DAY)===day)){const t=templates[Math.abs(Math.floor(roll*1000))%templates.length],startedAt=day*DAY+9*3_600_000;state.events.unshift({id:`EV-${day}`,title:t.title,description:t.description,severity:t.severity,startedAt,expiresAt:startedAt+DAY*3,resolved:false,demandImpact:t.demandImpact,delayImpact:t.delayImpact,fuelImpact:t.fuelImpact,mitigationCost:t.severity==='critical'?480000:t.severity==='warning'?240000:120000});}}state.events=state.events.slice(0,12);}

function stageFor(state:GameState){const worth=state.cash+state.fleet.reduce((s,a)=>s+a.value,0)-state.loans.reduce((s,l)=>s+l.balance,0),f=state.stats.flights,r=state.stats.reputation,s=state.stats.safety; if(f>=1000&&worth>=250_000_000&&r>=78&&s>=85)return 5;if(f>=400&&worth>=80_000_000&&r>=68)return 4;if(f>=120&&worth>=28_000_000&&r>=58)return 3;if(f>=25&&worth>=12_000_000&&r>=52)return 2;return 1;}

export function processSimulation(current:GameState,now=Date.now()):{state:GameState;report:OfflineReport;clockWarning?:string}{
  const state=hydrateGameState(current),from=state.lastSimulationAt,report:OfflineReport={elapsedMs:Math.max(0,now-from),flights:0,passengers:0,cargoKg:0,revenue:0,fuelCost:0,staffCost:0,maintenanceCost:0,fees:0,leasing:0,insurance:0,taxes:0,interest:0,canceled:0,delayed:0,result:0};
  if(now<from-60_000)return {state,report,clockWarning:'O relógio do dispositivo retrocedeu. Nenhuma operação foi processada.'};
  const effectiveFrom=Math.max(from,now-DAY*30),cashBefore=state.cash;updateMarket(state,now);generateEvents(state,effectiveFrom,now);
  for(const schedule of state.schedules.filter(s=>s.active)){
    const route=state.routes.find(r=>r.id===schedule.routeId&&r.active);if(!route)continue;
    const start=new Date(effectiveFrom);start.setHours(0,0,0,0);
    for(let day=start.getTime();day<=now;day+=DAY){const date=new Date(day);if(!schedule.days.includes(date.getDay()))continue;for(const time of schedule.departureTimes){const [h,m]=time.split(':').map(Number),ts=day+h*3_600_000+m*60_000;if(ts>effectiveFrom&&ts<=now)simulateService(state,route,ts,report);}}
  }
  const elapsedDays=Math.max(0,(now-from)/DAY),staffMonthly=(Object.keys(salaryRates) as (keyof typeof salaryRates)[]).reduce((sum,k)=>sum+state.staff[k]*salaryRates[k],0);
  const staffCost=Math.round(staffMonthly/30*elapsedDays),leasing=Math.round(state.fleet.reduce((s,a)=>s+a.monthlyLease,0)/30*elapsedDays),interest=Math.round(state.loans.reduce((s,l)=>s+l.balance*l.rate/365,0)*elapsedDays),insurance=Math.round(state.fleet.reduce((s,a)=>s+(aircraftById(a.modelId)?.purchasePrice||0)*.006,0)/30*elapsedDays);
  if(staffCost){transact(state,-staffCost,'salary','Folha salarial proporcional',now);report.staffCost=staffCost;} if(leasing){transact(state,-leasing,'leasing','Parcelas proporcionais de leasing',now);report.leasing=leasing;} if(interest){transact(state,-interest,'loan_interest','Juros de financiamentos',now);report.interest=interest;}if(insurance){transact(state,-insurance,'insurance','Seguro aeronáutico proporcional',now);report.insurance=insurance;}
  const taxable=Math.max(0,report.revenue-report.fuelCost-report.staffCost-report.maintenanceCost-report.fees-report.leasing-report.insurance-report.interest),taxes=Math.round(taxable*.12);if(taxes){transact(state,-taxes,'tax','Tributos sobre o resultado operacional',now);report.taxes=taxes;}
  const fuelEvent=state.events.filter(e=>!e.resolved&&now<=e.expiresAt).reduce((s,e)=>s+e.fuelImpact,0);state.fuelPrice=Math.round((5.15+Math.sin(now/DAY/8)*.52+Math.sin(now/DAY/31)*.24)*(1+fuelEvent)*100)/100;const activeFleet=state.routes.filter(r=>r.active).length,crewCapacity=Math.max(1,(state.staff.pilots+state.staff.cabin)/3),fatigueDelta=activeFleet?Math.max(-.45,activeFleet/crewCapacity*.8-.48):-.5;state.staff.fatigue=clamp(0,100,state.staff.fatigue+elapsedDays*fatigueDelta);state.staff.morale=clamp(35,100,state.staff.morale-elapsedDays*(.025+state.staff.fatigue/12000));
  state.stats.safety=clamp(0,100,96-state.fleet.reduce((s,a)=>s+Math.max(0,72-a.condition),0)*.08);state.stage=stageFor(state);state.lastSimulationAt=now;report.result=Math.round(state.cash-cashBefore);return {state,report};
}

export function buyFuel(current:GameState,kg:number):ActionResult {const state=clone(current);if(!Number.isFinite(kg)||kg<=0)return {state:current,error:'Informe uma quantidade válida.'};if(state.fuelStockKg+kg>state.fuelCapacityKg)return {state:current,error:'Capacidade de armazenamento excedida.'};const cost=Math.round(kg*state.fuelPrice);if(state.cash<cost)return {state:current,error:'Caixa insuficiente.'};state.fuelAverageCost=(state.fuelStockKg*state.fuelAverageCost+kg*state.fuelPrice)/(state.fuelStockKg+kg);state.fuelStockKg+=kg;transact(state,-cost,'fuel_inventory',`Compra de ${compact(kg)} kg de combustível`);return {state,message:`Estoque abastecido por ${money(cost)}.`};}

export function repairAircraft(current:GameState,aircraftId:string):ActionResult {const state=clone(current),a=state.fleet.find(x=>x.id===aircraftId);if(!a)return {state:current,error:'Aeronave não encontrada.'};const model=aircraftById(a.modelId)!;const cost=Math.round((100-a.condition)*model.purchasePrice*.0012+model.maintenanceFactor*28_000);if(state.cash<cost)return {state:current,error:'Caixa insuficiente para a manutenção.'};a.status='maintenance';transact(state,-cost,'maintenance',`Revisão preventiva · ${a.registration}`);a.condition=Math.min(100,a.condition+32);a.lastCheckHours=a.hours;a.status='ground';state.stats.safety=clamp(0,100,state.stats.safety+1.2);return {state,message:`${a.registration} liberada com ${a.condition.toFixed(0)}% de condição.`};}

export function hireStaff(current:GameState,role:keyof typeof salaryRates,count:number):ActionResult {const state=clone(current);if(!Number.isInteger(count)||count<1||count>25)return {state:current,error:'Quantidade inválida.'};const recruitment=salaryRates[role]*count*.22;if(state.cash<recruitment)return {state:current,error:'Caixa insuficiente para recrutamento.'};state.staff[role]+=count;transact(state,-recruitment,'recruitment',`Contratação de ${count} profissional(is) · ${role}`);return {state,message:`Equipe de ${role} ampliada.`};}

export function setCompanyAvatar(current:GameState,avatarId:number):ActionResult {const state=clone(current);if(!Number.isInteger(avatarId)||avatarId<0||avatarId>4)return {state:current,error:'Avatar inválido.'};state.company.avatarId=avatarId;return {state,message:'Perfil executivo atualizado.'};}

export function trainStaff(current:GameState):ActionResult {const state=clone(current),cost=240_000*state.staff.training;if(state.cash<cost)return {state:current,error:'Caixa insuficiente.'};state.staff.training+=1;state.staff.morale=clamp(0,100,state.staff.morale+6);state.stats.safety=clamp(0,100,state.stats.safety+1.5);transact(state,-cost,'training','Programa integrado de treinamento');return {state,message:'Treinamento concluído.'};}

export function launchMarketing(current:GameState,tier:'local'|'national'|'global'):ActionResult {const state=clone(current),plans={local:{cost:180_000,boost:.035,days:7},national:{cost:650_000,boost:.075,days:14},global:{cost:2_400_000,boost:.13,days:21}},p=plans[tier];if(state.cash<p.cost)return {state:current,error:'Caixa insuficiente para a campanha.'};transact(state,-p.cost,'marketing',`Campanha ${tier}`);state.marketingBoost=p.boost;state.marketingUntil=Date.now()+p.days*DAY;state.stats.reputation=clamp(0,100,state.stats.reputation+p.boost*18);return {state,message:`Campanha ativa por ${p.days} dias.`};}

export function takeLoan(current:GameState,amount:number):ActionResult {const state=clone(current);if(![2_000_000,5_000_000,10_000_000].includes(amount))return {state:current,error:'Linha de crédito inválida.'};const exposure=state.loans.reduce((s,l)=>s+l.balance,0);if(exposure>state.cash*1.5)return {state:current,error:'Limite de endividamento atingido.'};const rate=.115+exposure/Math.max(1,state.cash)*.04;state.loans.push({id:uid('LN'),principal:amount,balance:amount,rate,takenAt:Date.now()});transact(state,amount,'loan',`Empréstimo contratado a ${(rate*100).toFixed(1)}% a.a.`);return {state,message:`Crédito de ${money(amount)} liberado.`};}

export function repayLoan(current:GameState,loanId:string,requested?:number):ActionResult {const state=hydrateGameState(current),loan=state.loans.find(l=>l.id===loanId);if(!loan)return {state:current,error:'Financiamento não encontrado.'};const amount=Math.min(loan.balance,requested||loan.balance);if(amount<=0||state.cash<amount)return {state:current,error:'Caixa insuficiente para a amortização.'};loan.balance=Math.max(0,loan.balance-amount);transact(state,-amount,'loan_repayment','Amortização de financiamento');state.loans=state.loans.filter(l=>l.balance>0);return {state,message:`Dívida reduzida em ${money(amount)}.`};}

export function mitigateEvent(current:GameState,eventId:string):ActionResult {const state=hydrateGameState(current),event=state.events.find(e=>e.id===eventId);if(!event||event.resolved)return {state:current,error:'Evento já encerrado.'};if(state.cash<event.mitigationCost)return {state:current,error:'Caixa insuficiente para o plano de contingência.'};transact(state,-event.mitigationCost,'contingency',`Plano de contingência · ${event.title}`);event.resolved=true;state.stats.reputation=clamp(0,100,state.stats.reputation+.4);return {state,message:'Plano de contingência ativado.'};}

export function financialStatement(state:GameState,days=30):FinancialStatement {const cutoff=Date.now()-days*DAY,tx=state.transactions.filter(t=>t.timestamp>=cutoff);const expenses=(category:string)=>tx.filter(t=>t.category===category&&t.amount<0).reduce((s,t)=>s-Math.abs(t.amount),0);const revenue=tx.filter(t=>t.category==='flight_revenue').reduce((s,t)=>s+t.amount,0),airportFees=-expenses('airport_fees'),fuel=-expenses('fuel')-expenses('fuel_inventory'),salaries=-expenses('salary'),maintenance=-expenses('maintenance_accrual')-expenses('maintenance'),leasing=-expenses('leasing'),insurance=-expenses('insurance'),marketing=-expenses('marketing'),interest=-expenses('loan_interest'),taxes=-expenses('tax');const known=new Set(['airport_fees','fuel','salary','maintenance_accrual','maintenance','leasing','insurance','marketing','loan_interest','tax','loan_repayment','fuel_inventory','aircraft']);const other=tx.filter(t=>t.amount<0&&!known.has(t.category)).reduce((s,t)=>s+Math.abs(t.amount),0),operatingResult=revenue-airportFees-fuel-salaries-maintenance-leasing-insurance-marketing-other;return {days,revenue,airportFees,fuel,salaries,maintenance,leasing,insurance,marketing,interest,taxes,other,operatingResult,netResult:operatingResult-interest-taxes};}

export function netWorth(state:GameState){return state.cash+state.fleet.reduce((s,a)=>s+a.value,0)-state.loans.reduce((s,l)=>s+l.balance,0);}
export function staffMonthlyCost(state:GameState){return (Object.keys(salaryRates) as (keyof typeof salaryRates)[]).reduce((sum,k)=>sum+state.staff[k]*salaryRates[k],0);}
export function routeProjection(state:GameState,route:Route){const a=state.fleet.find(x=>x.id===route.aircraftId),m=a&&aircraftById(a.modelId);if(!m)return 0;const forecast=routeMarketForecast(state,route),pax=Math.round(m.maxPassengers*forecast.expectedLoad)*2,rev=pax*route.fare,fuel=(route.distanceKm/m.cruiseSpeedKmh+.58)*2*m.fuelBurnKgHour*state.fuelPrice,fees=(airportByIata(route.origin)!.fees+airportByIata(route.destination)!.fees)*1450+pax*5.2;return Math.round(rev-fuel-fees-route.distanceKm*m.maintenanceFactor*.42);}
export const stageNames=['','Operador local','Operador regional','Companhia regional','Companhia nacional','Companhia internacional'];
export const unlockedAircraft=(state:GameState)=>AIRCRAFT.filter(a=>a.stage<=state.stage);
export const availableDestinations=(state:GameState,aircraftId:string)=>{const a=state.fleet.find(x=>x.id===aircraftId),m=a&&aircraftById(a.modelId);if(!m)return [];return AIRPORTS.filter(ap=>ap.iata!==state.company.base&&distanceKm(state.company.base,ap.iata)<=m.rangeKm*.9&&ap.runwayLength>=m.runwayRequiredM);};
