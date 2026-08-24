import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireAircraft, createNewGame, createRoute, processSimulation } from '../app/game/engine';
import { validateGame } from '../app/game/storage';

function game(){return createNewGame({playerName:'Teste',name:'Teste Linhas Aéreas',iata:'TL',icao:'TLA',callsign:'TESTE',country:'Brasil',base:'GRU',primaryColor:'#0c3153',secondaryColor:'#59d6c7',difficulty:'normal'});}

test('aquisição desconta caixa, individualiza aeronave e registra transação',()=>{const before=game(),result=acquireAircraft(before,'c208','new');assert.equal(result.error,undefined);assert.equal(result.state.fleet.length,1);assert.ok(result.state.cash<before.cash);assert.equal(result.state.transactions[0].category,'aircraft');assert.match(result.state.fleet[0].id,/^AC-/);});

test('saldo insuficiente impede compra sem alterar o estado',()=>{const before=game();before.cash=1;const result=acquireAircraft(before,'c208','new');assert.ok(result.error);assert.equal(result.state.fleet.length,0);assert.equal(result.state.cash,1);});

test('criação de rota gera scheduler recorrente integrado',()=>{const acquired=acquireAircraft(game(),'c208','new').state;const aircraft=acquired.fleet[0];const result=createRoute(acquired,{destination:'GIG',aircraftId:aircraft.id,fare:350,frequency:2,businessShare:0,firstShare:0});assert.equal(result.error,undefined);assert.equal(result.state.routes.length,1);assert.equal(result.state.schedules.length,1);assert.equal(result.state.schedules[0].departureTimes.length,2);assert.equal(result.state.schedules[0].active,true);});

test('simulação offline conclui voos uma única vez e atualiza economia',()=>{let state=acquireAircraft(game(),'c208','new').state;state=createRoute(state,{destination:'GIG',aircraftId:state.fleet[0].id,fare:350,frequency:1,businessShare:0,firstShare:0}).state;const now=Date.now();state.lastSimulationAt=now-2*86_400_000;const first=processSimulation(state,now);assert.ok(first.report.flights>=2);assert.ok(first.state.stats.flights>=2);assert.ok(first.state.transactions.some(t=>t.category==='flight_revenue'));const flights=first.state.stats.flights;const second=processSimulation(first.state,now);assert.equal(second.state.stats.flights,flights);});

test('validador aceita save atual e rejeita objeto corrompido',()=>{assert.equal(validateGame(game()),true);assert.equal(validateGame({cash:Number.NaN,version:1}),false);});
