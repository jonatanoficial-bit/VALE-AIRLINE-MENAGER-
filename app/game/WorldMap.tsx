'use client';

import { useEffect, useRef, useState } from 'react';
import { AIRPORTS, airportByIata } from './data';
import type { GameState } from './types';

declare global { interface Window { L?: any } }

function loadLeaflet(){return new Promise<void>((resolve,reject)=>{if(window.L){resolve();return;}if(!document.getElementById('leaflet-css')){const link=document.createElement('link');link.id='leaflet-css';link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(link);}const existing=document.getElementById('leaflet-js') as HTMLScriptElement|null;if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(),{once:true});return;}const script=document.createElement('script');script.id='leaflet-js';script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Leaflet indisponível'));document.body.appendChild(script);});}

export default function WorldMap({game}: {game:GameState}){
  const host=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),layersRef=useRef<any[]>([]),[error,setError]=useState(false);
  useEffect(()=>{let active=true;loadLeaflet().then(()=>{if(!active||!host.current||mapRef.current)return;const L=window.L;const base=airportByIata(game.company.base)!;const map=L.map(host.current,{zoomControl:false,worldCopyJump:true}).setView([base.latitude,base.longitude],game.routes.length?3:4);L.control.zoom({position:'bottomright'}).addTo(map);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);mapRef.current=map;setTimeout(()=>map.invalidateSize(),0);}).catch(()=>setError(true));return()=>{active=false;mapRef.current?.remove();mapRef.current=null;};},[]);
  useEffect(()=>{const L=window.L,map=mapRef.current;if(!L||!map)return;layersRef.current.forEach(layer=>map.removeLayer(layer));layersRef.current=[];const activeIatas=new Set([game.company.base,...game.routes.flatMap(r=>[r.origin,r.destination])]);for(const airport of AIRPORTS){if(!activeIatas.has(airport.iata)&&airport.size!=='major')continue;const isBase=airport.iata===game.company.base,active=activeIatas.has(airport.iata);const marker=L.circleMarker([airport.latitude,airport.longitude],{radius:isBase?8:active?6:2.6,color:isBase?'#59d6c7':active?'#7be4d8':'#71889b',weight:isBase?3:1,fillColor:isBase?'#59d6c7':active?'#21a997':'#38556c',fillOpacity:active?1:.55}).bindTooltip(`<b>${airport.iata}</b> · ${airport.city}<br>${airport.name}`);marker.addTo(map);layersRef.current.push(marker);}for(const route of game.routes.filter(r=>r.active)){const a=airportByIata(route.origin),b=airportByIata(route.destination);if(!a||!b)continue;const line=L.polyline([[a.latitude,a.longitude],[b.latitude,b.longitude]],{color:'#59d6c7',weight:2.4,opacity:.82,dashArray:'8 7'}).addTo(map);layersRef.current.push(line);}map.invalidateSize();},[game.routes,game.company.base]);
  if(error)return <div className="map-error"><b>Mapa online indisponível</b><span>O jogo continua acessível; verifique sua conexão para carregar o OpenStreetMap.</span></div>;
  return <div ref={host} className="leaflet-host" aria-label="Mapa operacional da companhia"/>;
}
