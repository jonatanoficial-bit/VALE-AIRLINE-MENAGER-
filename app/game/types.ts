export type Difficulty = 'easy' | 'normal' | 'realistic';
export type AircraftCategory = 'light' | 'regional' | 'turboprop' | 'narrowbody' | 'widebody' | 'cargo' | 'executive';
export type FleetStatus = 'ground' | 'flying' | 'maintenance';
export type Acquisition = 'new' | 'used' | 'lease';

export interface Airport {
  iata: string; icao: string; name: string; city: string; country: string;
  latitude: number; longitude: number; runwayLength: number;
  size: 'regional' | 'medium' | 'major'; demand: number; fees: number;
}

export interface AircraftModel {
  id: string; manufacturer: string; model: string; category: AircraftCategory;
  rangeKm: number; cruiseSpeedKmh: number; maxPassengers: number; cargoKg: number;
  fuelBurnKgHour: number; purchasePrice: number; leasePrice: number;
  crewPilots: number; crewCabin: number; runwayRequiredM: number;
  maintenanceFactor: number; stage: number; turnaroundMin: number;
}

export interface FleetAircraft {
  id: string; modelId: string; registration: string; acquisition: Acquisition;
  acquisitionPrice: number; monthlyLease: number; ageYears: number; hours: number;
  cycles: number; condition: number; value: number; status: FleetStatus;
  location: string; lastCheckHours: number; acquiredAt: number;
}

export interface Route {
  id: string; origin: string; destination: string; aircraftId: string;
  fare: number; businessShare: number; firstShare: number; distanceKm: number;
  frequency: number; createdAt: number; active: boolean;
}

export interface Schedule {
  id: string; routeId: string; aircraftId: string; flightNumber: string;
  days: number[]; departureTimes: string[]; active: boolean;
}

export interface Transaction {
  id: string; timestamp: number; amount: number; category: string; description: string;
}

export interface Company {
  id: string; playerName: string; name: string; iata: string; icao: string;
  callsign: string; country: string; base: string; primaryColor: string;
  secondaryColor: string; difficulty: Difficulty; foundedAt: number; avatarId?: number;
}

export interface StaffState {
  pilots: number; cabin: number; engineers: number; mechanics: number; admin: number;
  morale: number; training: number; fatigue: number;
}

export interface GameStats {
  flights: number; passengers: number; cargoKg: number; revenue: number;
  expenses: number; distanceKm: number; cancellations: number; onTime: number;
  safety: number; reputation: number; passengerReputation: number; cargoReputation: number;
  delayedFlights: number;
}

export interface OfflineReport {
  elapsedMs: number; flights: number; passengers: number; cargoKg: number;
  revenue: number; fuelCost: number; staffCost: number; maintenanceCost: number;
  fees: number; leasing: number; insurance: number; taxes: number; interest: number;
  canceled: number; delayed: number; result: number;
}

export interface Loan { id: string; principal: number; balance: number; rate: number; takenAt: number; }

export interface Competitor {
  id: string; name: string; code: string; strategy: string;
  aggression: number; service: number; fareIndex: number; marketShare: number;
  activeRoutes: number; trend: number;
}

export interface MarketState {
  economicIndex: number; seasonIndex: number; demandIndex: number;
  competitorPressure: number; fuelVolatility: number; updatedAt: number;
}

export type EventSeverity = 'info' | 'warning' | 'critical';
export interface GameEvent {
  id: string; title: string; description: string; severity: EventSeverity;
  startedAt: number; expiresAt: number; resolved: boolean;
  demandImpact: number; delayImpact: number; fuelImpact: number; mitigationCost: number;
}

export interface FlightRecord {
  id: string; timestamp: number; flightNumber: string; routeId: string;
  origin: string; destination: string; aircraftRegistration: string;
  passengers: number; cargoKg: number; revenue: number; delayMinutes: number;
  status: 'completed' | 'delayed' | 'canceled'; connectionBonus: number;
}

export interface FinancialStatement {
  days: number; revenue: number; airportFees: number; fuel: number; salaries: number;
  maintenance: number; leasing: number; insurance: number; marketing: number;
  interest: number; taxes: number; other: number; operatingResult: number; netResult: number;
}

export interface GameState {
  version: number; company: Company; cash: number; fuelStockKg: number;
  fuelCapacityKg: number; fuelPrice: number; fuelAverageCost: number;
  fleet: FleetAircraft[]; routes: Route[]; schedules: Schedule[];
  staff: StaffState; transactions: Transaction[]; stats: GameStats;
  loans: Loan[]; marketingUntil: number; marketingBoost: number;
  competitors: Competitor[]; marketState: MarketState; events: GameEvent[];
  flightLog: FlightRecord[];
  stage: number; lastSimulationAt: number; lastSavedAt: number; lastBackupAt: number;
}

export interface ActionResult { state: GameState; error?: string; message?: string; }
