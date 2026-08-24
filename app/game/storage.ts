import type { GameState } from './types';

const DB_NAME='atlas-operations-db',STORE='saves',DB_VERSION=1;

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}

async function put(key:string,value:GameState){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}

export async function loadGame():Promise<GameState|null>{const db=await openDb();const result=await new Promise<GameState|null>((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get('primary');request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});db.close();return result;}

export async function saveGame(state:GameState,forceBackup=false){const saved={...state,lastSavedAt:Date.now()};await put('primary',saved);if(forceBackup||Date.now()-state.lastBackupAt>15*60_000){saved.lastBackupAt=Date.now();await put(`backup:${saved.lastBackupAt}`,saved);await trimBackups();await put('primary',saved);}return saved;}

async function trimBackups(){const db=await openDb();const keys=await new Promise<IDBValidKey[]>((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).getAllKeys();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});const backups=keys.filter(k=>String(k).startsWith('backup:')).sort((a,b)=>String(b).localeCompare(String(a)));if(backups.length>5){await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');backups.slice(5).forEach(k=>tx.objectStore(STORE).delete(k));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}db.close();}

export function validateGame(value:unknown):value is GameState {if(!value||typeof value!=='object')return false;const v=value as Partial<GameState>;return v.version===1&&!!v.company&&typeof v.cash==='number'&&Number.isFinite(v.cash)&&Array.isArray(v.fleet)&&Array.isArray(v.routes)&&Array.isArray(v.schedules)&&!!v.stats&&typeof v.lastSimulationAt==='number';}

export async function importGame(file:File){const parsed:unknown=JSON.parse(await file.text());if(!validateGame(parsed))throw new Error('O arquivo não contém um save válido.');const state=parsed as GameState;state.lastSimulationAt=Math.min(Date.now(),state.lastSimulationAt);return saveGame(state,true);}

export function exportGame(state:GameState){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`atlas-operations-${state.company.iata.toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}

export async function clearGame(){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}
