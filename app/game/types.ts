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
  secondaryColor: string; difficulty: Difficulty; foundedAt: number;
}

export interface StaffState {
  pilots: number; cabin: number; engineers: number; mechanics: number; admin: number;
  morale: number; training: number;
}

export interface GameStats {
  flights: number; passengers: number; cargoKg: number; revenue: number;
  expenses: number; distanceKm: number; cancellations: number; onTime: number;
  safety: number; reputation: number; passengerReputation: number; cargoReputation: number;
}

export interface OfflineReport {
  elapsedMs: number; flights: number; passengers: number; cargoKg: number;
  revenue: number; fuelCost: number; staffCost: number; maintenanceCost: number;
  fees: number; leasing: number; canceled: number; result: number;
}

export interface Loan { id: string; principal: number; balance: number; rate: number; takenAt: number; }

export interface GameState {
  version: number; company: Company; cash: number; fuelStockKg: number;
  fuelCapacityKg: number; fuelPrice: number; fuelAverageCost: number;
  fleet: FleetAircraft[]; routes: Route[]; schedules: Schedule[];
  staff: StaffState; transactions: Transaction[]; stats: GameStats;
  loans: Loan[]; marketingUntil: number; marketingBoost: number;
  stage: number; lastSimulationAt: number; lastSavedAt: number; lastBackupAt: number;
}

export interface ActionResult { state: GameState; error?: string; message?: string; }
