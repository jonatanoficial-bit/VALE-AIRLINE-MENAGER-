'use client';

import { useState } from 'react';
import { AIRPORTS, aircraftById, airportByIata } from './data';
import { acceptContract, availableDestinations, claimContract, configureCabin, createRoute, distanceKm, money, openHub, recommendedFare, removeRoute, toggleRoute, upgradeInfrastructure } from './engine';
import type { ActionResult, CabinConfiguration, GameState } from './types';
import AircraftPhoto from './AircraftPhoto';

type Props = { game: GameState; apply: (result: ActionResult) => void };

function SectionTitle({ label, title, description }: { label: string; title: string; description: string }) {
  return <header className="page-head"><div><span className="eyebrow">{label}</span><h1>{title}</h1><p>{description}</p></div></header>;
}

const facilities = [
  { id: 'terminal', label: 'Terminal e portões', field: 'level', effect: '+2 posições por nível' },
  { id: 'lounge', label: 'Sala VIP', field: 'loungeLevel', effect: 'Tarifas premium e reputação' },
  { id: 'maintenance', label: 'Centro de manutenção', field: 'maintenanceLevel', effect: 'Manutenção mais econômica' },
  { id: 'fuel', label: 'Depósito de combustível', field: 'fuelDepotLevel', effect: 'Abastecimento mais econômico' },
  { id: 'cargo', label: 'Terminal de cargas', field: 'cargoLevel', effect: 'Receita de carga ampliada' },
] as const;

export function InfrastructureScreen({ game, apply }: Props) {
  const [candidate, setCandidate] = useState('');
  const prospects = AIRPORTS.filter(airport => !game.hubs.includes(airport.iata));
  return <>
    <SectionTitle label="EXPANSÃO DA REDE" title="Hubs e aeroportos" description="Amplie sua malha com novos centros operacionais. Portões, manutenção, combustível e carga impactam os voos reais." />
    <div className="progression-grid">
      {game.infrastructure.map(infra => {
        const airport = airportByIata(infra.airportIata);
        return <article className="panel progress-card" key={infra.airportIata}>
          <div className="progress-card-head"><div><span className="eyebrow">HUB ATIVO</span><h2>{infra.airportIata} · {airport?.city}</h2><p>{airport?.name}</p></div><b className="progress-badge">{infra.gates} portões</b></div>
          <div className="facility-list">{facilities.map(facility => {
            const level = infra[facility.field];
            return <div className="facility-row" key={facility.id}><div><strong>{facility.label}</strong><span>Nível {level}/5 · {facility.effect}</span></div><button type="button" onClick={() => apply(upgradeInfrastructure(game, infra.airportIata, facility.id))} disabled={level >= 5}> {level >= 5 ? 'Máximo' : 'Expandir'} </button></div>;
          })}</div>
        </article>;
      })}
      <article className="panel progress-card">
        <div className="progress-card-head"><div><span className="eyebrow">PRÓXIMA EXPANSÃO</span><h2>Inaugurar um novo hub</h2><p>Disponível ao alcançar o certificado operacional nível 2.</p></div></div>
        <label className="field"><span>Aeroporto</span><select value={candidate} onChange={event => setCandidate(event.target.value)}><option value="">Escolha uma cidade</option>{prospects.map(airport => <option key={airport.iata} value={airport.iata}>{airport.iata} · {airport.city}, {airport.country}</option>)}</select></label>
        {candidate && <div className="airport-preview"><span>Pista: {airportByIata(candidate)?.runwayLength.toLocaleString('pt-BR')} m</span><span>Demanda: {airportByIata(candidate)?.demand}/100</span><span>Taxas: {airportByIata(candidate)?.fees.toFixed(1)}×</span></div>}
        <button className="primary wide" type="button" disabled={!candidate || game.stage < 2} onClick={() => { apply(openHub(game, candidate)); setCandidate(''); }}>Abrir hub {candidate || ''} →</button>
        {game.stage < 2 && <p className="progress-hint">Avance para o nível 2 operando voos com segurança e reputação.</p>}
      </article>
    </div>
  </>;
}

function CabinEditor({ game, aircraftId, apply }: Props & { aircraftId: string }) {
  const aircraft = game.fleet.find(item => item.id === aircraftId)!;
  const model = aircraftById(aircraft.modelId)!;
  const [draft, setDraft] = useState<CabinConfiguration>({ ...aircraft.cabin });
  const seats = draft.economy + draft.premiumEconomy + draft.business + draft.first;
  const space = draft.economy + draft.premiumEconomy * 1.25 + draft.business * 1.8 + draft.first * 2.8;
  const valid = seats > 0 && seats <= model.maxPassengers && space <= model.maxPassengers;
  return <article className="panel progress-card cabin-card">
    <div className="cabin-photo"><AircraftPhoto modelId={model.id} /></div>
    <div className="progress-card-head"><div><span className="eyebrow">{aircraft.registration}</span><h2>{model.manufacturer} {model.model}</h2><p>{model.maxPassengers} posições de espaço · {aircraft.condition}% de condição</p></div></div>
    <div className="cabin-fields">{([['economy', 'Econômica'], ['premiumEconomy', 'Premium'], ['business', 'Executiva'], ['first', 'Primeira classe']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input type="number" inputMode="numeric" min="0" max={model.maxPassengers} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: Number(event.target.value) })} /></label>)}</div>
    <div className={`cabin-summary ${valid ? '' : 'invalid'}`}><span>{seats} assentos · {Math.ceil(space)}/{model.maxPassengers} de espaço</span><b>{valid ? 'Layout viável' : 'Excede o espaço disponível'}</b></div>
    <button className="primary wide" type="button" disabled={!valid} onClick={() => apply(configureCabin(game, aircraftId, draft))}>Salvar configuração de cabine</button>
  </article>;
}

export function CabinsScreen({ game, apply }: Props) {
  const passengerFleet = game.fleet.filter(item => (aircraftById(item.modelId)?.maxPassengers || 0) > 0);
  return <><SectionTitle label="EXPERIÊNCIA A BORDO" title="Configuração de cabines" description="Distribua espaço entre econômica, premium, executiva e primeira classe. A ocupação e a receita mudam em cada voo." />
    {passengerFleet.length ? <div className="progression-grid">{passengerFleet.map(aircraft => <CabinEditor key={`${aircraft.id}-${JSON.stringify(aircraft.cabin)}`} aircraftId={aircraft.id} game={game} apply={apply} />)}</div> : <article className="panel progress-card"><h2>Sem aeronaves de passageiros</h2><p>Adquira um avião no mercado para desenhar sua cabine.</p></article>}
  </>;
}

const contractStatus = { offered: 'Disponível', active: 'Em andamento', completed: 'Concluído', claimed: 'Resgatado', expired: 'Expirado' } as const;

export function ContractsScreen({ game, apply }: Props) {
  const ordered = [...game.contracts].sort((a, b) => ({ completed: 0, active: 1, offered: 2, claimed: 3, expired: 4 }[a.status] - { completed: 0, active: 1, offered: 2, claimed: 3, expired: 4 }[b.status]));
  return <><SectionTitle label="OBJETIVOS DA COMPANHIA" title="Missões e contratos" description="Aceite objetivos, voe para cumprir metas e resgate recompensas. Seu histórico de conquistas acompanha a empresa." />
    <div className="progression-grid">{ordered.map(contract => <article className="panel progress-card" key={contract.id}>
      <div className="progress-card-head"><div><span className="eyebrow">{contract.destination} · {contract.type === 'cargo' ? 'CARGA' : contract.type === 'flights' ? 'VOOS' : 'PASSAGEIROS'}</span><h2>{contract.title}</h2><p>{contract.description}</p></div><b className={`progress-badge status-${contract.status}`}>{contractStatus[contract.status]}</b></div>
      <div className="contract-progress"><div><span>Progresso</span><strong>{Math.min(contract.progress, contract.target).toLocaleString('pt-BR')} / {contract.target.toLocaleString('pt-BR')}</strong></div><i><b style={{ width: `${Math.min(100, contract.progress / contract.target * 100)}%` }} /></i></div>
      <div className="contract-meta"><span>Recompensa <b>{money(contract.reward)}</b></span><span>Reputação <b>+{contract.reputationReward}</b></span><span>Prazo <b>{new Date(contract.deadline).toLocaleDateString('pt-BR')}</b></span></div>
      {contract.status === 'offered' && <button className="primary wide" onClick={() => apply(acceptContract(game, contract.id))}>Aceitar contrato</button>}
      {contract.status === 'completed' && <button className="primary wide" onClick={() => apply(claimContract(game, contract.id))}>Resgatar recompensa</button>}
    </article>)}</div>
    <h2 className="progress-subhead">Conquistas</h2><div className="achievement-grid">{game.achievements.map(achievement => <div className={`achievement ${achievement.unlockedAt ? 'unlocked' : ''}`} key={achievement.id}><b>{achievement.unlockedAt ? '◆' : '◇'}</b><div><strong>{achievement.title}</strong><span>{achievement.description}</span></div></div>)}</div>
  </>;
}

export function HubRoutesScreen({ game, apply }: Props) {
  const freeFleet = game.fleet.filter(aircraft => !game.schedules.some(schedule => schedule.aircraftId === aircraft.id && schedule.active));
  const [aircraftId, setAircraftId] = useState(freeFleet[0]?.id || '');
  const [origin, setOrigin] = useState(game.company.base);
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState(300);
  const [frequency, setFrequency] = useState(1);
  const destinations = availableDestinations(game, aircraftId, origin);
  const route = destination ? `${origin} ↔ ${destination}` : '';
  return <><SectionTitle label="PLANEJAMENTO DE MALHA" title="Rotas entre hubs" description="Selecione a origem, aeronave e destino. Cada voo precisa de portões disponíveis, equipe e alcance suficiente." />
    <div className="progression-grid"><article className="panel progress-card"><h2>Nova operação</h2>{freeFleet.length ? <form className="progress-form" onSubmit={event => { event.preventDefault(); apply(createRoute(game, { origin, destination, aircraftId, fare, frequency, businessShare: 0, firstShare: 0 })); setDestination(''); }}>
      <label className="field"><span>Aeronave</span><select value={aircraftId} onChange={event => { setAircraftId(event.target.value); setDestination(''); }}>{freeFleet.map(aircraft => <option key={aircraft.id} value={aircraft.id}>{aircraft.registration} · {aircraftById(aircraft.modelId)?.model}</option>)}</select></label>
      <label className="field"><span>Hub de origem</span><select value={origin} onChange={event => { setOrigin(event.target.value); setDestination(''); }}>{game.hubs.map(iata => <option key={iata} value={iata}>{iata} · {airportByIata(iata)?.city}</option>)}</select></label>
      <label className="field"><span>Destino</span><select required value={destination} onChange={event => { setDestination(event.target.value); if (event.target.value) setFare(recommendedFare(origin, event.target.value)); }}><option value="">Escolha o destino</option>{destinations.map(airport => <option key={airport.iata} value={airport.iata}>{airport.iata} · {airport.city}</option>)}</select></label>
      <div className="cabin-fields"><label><span>Tarifa base</span><input type="number" min="50" step="10" value={fare} onChange={event => setFare(Number(event.target.value))} /></label><label><span>Idas e voltas/dia</span><select value={frequency} onChange={event => setFrequency(Number(event.target.value))}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label></div>
      {destination && <p className="progress-hint">{route} · {distanceKm(origin, destination).toLocaleString('pt-BR')} km</p>}
      <button className="primary wide" type="submit">Programar rota →</button></form> : <p>Adquira uma aeronave ou pause uma rota ativa para liberar uma aeronave.</p>}</article>
      <article className="panel progress-card"><h2>Malha atual · {game.routes.length} rota(s)</h2><div className="facility-list">{game.routes.map(route => <div className="facility-row" key={route.id}><div><strong>{route.origin} ↔ {route.destination}</strong><span>{route.frequency} ida(s) e volta(s) · {route.active ? 'Ativa' : 'Pausada'} · {money(route.fare)}</span></div><div className="route-controls"><button type="button" onClick={() => apply(toggleRoute(game, route.id))}>{route.active ? 'Pausar' : 'Ativar'}</button><button type="button" onClick={() => apply(removeRoute(game, route.id))}>Remover</button></div></div>)}</div></article></div>
  </>;
}
