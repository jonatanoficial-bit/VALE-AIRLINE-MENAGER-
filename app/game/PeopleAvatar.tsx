'use client';

const labels = [
  'Executivo de companhia aérea',
  'Executiva de companhia aérea',
  'Executivo de companhia aérea',
  'Executiva de companhia aérea',
  'Executivo de companhia aérea',
  'Comandante',
  'Comissária de bordo',
  'Engenheiro aeronáutico',
  'Mecânico de aeronaves',
  'Gestora aeroportuária',
];

export default function PeopleAvatar({index,className='',label}:{index:number;className?:string;label?:string}){
  const safe=Math.max(0,Math.min(9,index)),column=safe%5,row=Math.floor(safe/5);
  const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';
  return <span
    className={`people-avatar ${className}`}
    role="img"
    aria-label={label||labels[safe]}
    style={{backgroundImage:`url("${basePath}/assets/avatars/cinematic-people-sprite.webp")`,backgroundPosition:`${column*25}% ${row*100}%`}}
  />;
}

export const executiveAvatars=[0,1,2,3,4];
export const staffAvatars={pilots:5,cabin:6,engineers:7,mechanics:8,admin:9} as const;
