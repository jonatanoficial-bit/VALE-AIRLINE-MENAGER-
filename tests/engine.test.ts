import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireAircraft, createNewGame, createRoute, financialStatement, hydrateGameState, mitigateEvent, processSimulation, repayLoan, setCompanyAvatar, takeLoan } from '../app/game/engine';
import { validateGame } from '../app/game/storage';
import type { GameState } from '../app/game/types';

function game(){return createNewGame({playerName:'Teste',name:'Teste Linhas Aéreas',iata:'TL',icao:'TLA',callsign:'TESTE',country:'Brasil',base:'GRU',primaryColor:'#0c3153',secondaryColor:'#59d6c7',difficulty:'normal'});}

test('aquisição desconta caixa, individualiza aeronave e registra transação',()=>{const before=game(),result=acquireAircraft(before,'c208','new');assert.equal(result.error,undefined);assert.equal(result.state.fleet.length,1);assert.ok(result.state.cash<before.cash);assert.equal(result.state.transactions[0].category,'aircraft');assert.match(result.state.fleet[0].id,/^AC-/);});

test('saldo insuficiente impede compra sem alterar o estado',()=>{const before=game();before.cash=1;const result=acquireAircraft(before,'c208','new');assert.ok(result.error);assert.equal(result.state.fleet.length,0);assert.equal(result.state.cash,1);});

test('criação de rota gera scheduler recorrente integrado',()=>{const acquired=acquireAircraft(game(),'c208','new').state;const aircraft=acquired.fleet[0];const result=createRoute(acquired,{destination:'GIG',aircraftId:aircraft.id,fare:350,frequency:2,businessShare:0,firstShare:0});assert.equal(result.error,undefined);assert.equal(result.state.routes.length,1);assert.equal(result.state.schedules.length,1);assert.equal(result.state.schedules[0].departureTimes.length,2);assert.equal(result.state.schedules[0].active,true);});

test('simulação offline conclui voos uma única vez e atualiza economia',()=>{let state=acquireAircraft(game(),'c208','new').state;state=createRoute(state,{destination:'GIG',aircraftId:state.fleet[0].id,fare:350,frequency:1,businessShare:0,firstShare:0}).state;const now=Date.now();state.lastSimulationAt=now-2*86_400_000;const first=processSimulation(state,now);assert.ok(first.report.flights>=2);assert.ok(first.state.stats.flights>=2);assert.ok(first.state.transactions.some(t=>t.category==='flight_revenue'));const flights=first.state.stats.flights;const second=processSimulation(first.state,now);assert.equal(second.state.stats.flights,flights);});

test('validador aceita save atual e rejeita objeto corrompido',()=>{assert.equal(validateGame(game()),true);assert.equal(validateGame({cash:Number.NaN,version:1}),false);});

test('perfil executivo aceita somente avatares disponíveis',()=>{const before=game(),updated=setCompanyAvatar(before,4);assert.equal(updated.error,undefined);assert.equal(updated.state.company.avatarId,4);assert.equal(setCompanyAvatar(before,7).error,'Avatar inválido.');});

test('migração acrescenta mercado, concorrentes e histórico sem invalidar save antigo',()=>{const old=game() as GameState;delete (old as Partial<GameState>).marketState;delete (old as Partial<GameState>).competitors;delete (old as Partial<GameState>).flightLog;const migrated=hydrateGameState(old);assert.equal(migrated.competitors.length,4);assert.equal(migrated.marketState.demandIndex,1);assert.deepEqual(migrated.flightLog,[]);});

test('contingência encerra evento e registra custo',()=>{const before=game();before.events.push({id:'EV-TEST',title:'Teste',description:'Evento de teste',severity:'warning',startedAt:Date.now()-1000,expiresAt:Date.now()+100000,resolved:false,demandImpact:-.1,delayImpact:.2,fuelImpact:0,mitigationCost:1000});const result=mitigateEvent(before,'EV-TEST');assert.equal(result.error,undefined);assert.equal(result.state.events[0].resolved,true);assert.equal(result.state.cash,before.cash-1000);});

test('empréstimo pode ser amortizado e aparece na demonstração financeira',()=>{const financed=takeLoan(game(),2_000_000).state;const result=repayLoan(financed,financed.loans[0].id,500_000);assert.equal(result.state.loans[0].balance,1_500_000);const statement=financialStatement(result.state);assert.equal(statement.days,30);});
