'use client';

import { useEffect, useState } from 'react';

const pages:Record<string,string>={
  c208:'Cessna_208_Caravan',pc12:'Pilatus_PC-12',b1900d:'Beechcraft_1900',e120:'Embraer_EMB_120_Brasilia',saab340:'Saab_340',atr42:'ATR_42',atr72:'ATR_72',q400:'De_Havilland_Canada_Dash_8',erj145:'Embraer_ERJ_family',crj700:'Bombardier_CRJ700_series',e170:'Embraer_E-Jet_family',e195e2:'Embraer_E-Jet_E2_family',a220:'Airbus_A220',a320neo:'Airbus_A320neo_family',a321neo:'Airbus_A320neo_family',b738:'Boeing_737_Next_Generation',b38m:'Boeing_737_MAX',b752:'Boeing_757',a339:'Airbus_A330neo',a359:'Airbus_A350',b789:'Boeing_787_Dreamliner',b77w:'Boeing_777',b763f:'Boeing_767',c680a:'Cessna_Citation_Latitude',g650:'Gulfstream_G650/G700/G800'
};
const cache=new Map<string,string>();

export default function AircraftPhoto({modelId,className=''}:{modelId:string;className?:string}){
  const page=pages[modelId],[src,setSrc]=useState(cache.get(modelId)||''),[failed,setFailed]=useState(false);
  useEffect(()=>{if(!page||src)return;let active=true;fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{const parsed=data as {originalimage?:{source?:string};thumbnail?:{source?:string}};const image=parsed.originalimage?.source||parsed.thumbnail?.source;if(active&&image){cache.set(modelId,image);setSrc(image)}else if(active)setFailed(true)}).catch(()=>active&&setFailed(true));return()=>{active=false}},[modelId,page,src]);
  return <div className={`aircraft-photo ${className} ${failed?'photo-fallback':''}`}>{src?<img src={src} alt="Foto real do modelo de aeronave" loading="lazy"/>:<><span className="photo-loader"/><b>✈</b></>}<a href={`https://en.wikipedia.org/wiki/${page}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>Wikimedia Commons ↗</a></div>
}
