"use client";

import {useCallback,useEffect,useState} from "react";
import {createClient} from "../../utils/supabase/client";
import {radarAreas} from "../radar/data";
import {Activity,RefreshCw,ShieldCheck,Users} from "lucide-react";

type Group={id:string;name:string;active:boolean};
type Summary={
 scope:"church"|"group";scope_name:string;total_members:number;answered_members:number;
 minimum_required:number;available:boolean;max_area_score:number;averages:Record<string,number>|null;
};
const maximum=15;
const center=168;
const radius=109;
const angles=radarAreas.map((_,i)=>(i*2*Math.PI)/radarAreas.length-Math.PI/2);
const point=(a:number,r:number)=>({x:center+r*Math.cos(a),y:center+r*Math.sin(a)});
const polygon=(values:number[])=>values.map((value,i)=>{
 const p=point(angles[i],Math.max(0,Math.min(maximum,value))/maximum*radius);
 return p.x.toFixed(2)+","+p.y.toFixed(2);
}).join(" ");
const scoreText=(v:number)=>new Intl.NumberFormat("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}).format(v);

export default function CollectiveRadar({pastor,groups=[]}:{pastor:boolean;groups?:Group[]}){
 const [scope,setScope]=useState("church");
 const [result,setResult]=useState<Summary|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [version,setVersion]=useState(0);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data,error:failure}=await createClient().rpc("rota29_pg_collective_radar",{
   p_group:pastor&&scope!=="church"?scope:null
  });
  if(failure){setResult(null);setError(failure.message||"Não foi possível buscar o Radar coletivo.");}
  else setResult(data as Summary);
  setLoading(false);
 },[pastor,scope]);
 useEffect(()=>{void load();},[load,version]);
 const scores=radarAreas.map(a=>Math.max(0,Math.min(maximum,Number(result?.averages?.[a.id])||0)));
 const totalScore=scores.reduce((acc,v)=>acc+v,0);
 const border="border border-[#E8D8BF]";
 return <section className={border+" rounded-2xl bg-white p-4 sm:p-6 space-y-5"} aria-label="Radar coletivo do discipulado">
  <div className="flex items-start justify-between gap-3">
   <div className="flex items-start gap-3">
    <div className="rounded-xl bg-[#0F3D33] p-3 text-[#C79A5B]"><Activity size={20}/></div>
    <div>
     <h2 className="font-bold text-lg text-[#0F3D33]">Radar Discipular Coletivo</h2>
     <p className="text-xs text-[#52665F] mt-1">Média do Radar mais recente de cada participante.</p>
    </div>
   </div>
   <button className={border+" rounded-xl p-2 text-[#0F3D33] disabled:opacity-40"} title="Atualizar" aria-label="Atualizar Radar"
    disabled={loading} onClick={()=>setVersion(v=>v+1)}><RefreshCw size={18}/></button>
  </div>
  {pastor&&groups.some(g=>g.active)&&<label className="block text-xs font-semibold text-[#0F3D33]">
   Visualizar Radar
   <select className="mt-2 block w-full rounded-xl border border-[#DCC8A9] bg-[#F8F5F0] px-3 py-3 text-sm text-[#0F3D33]"
    value={scope} onChange={e=>setScope(e.target.value)}>
    <option value="church">Igreja inteira</option>
    {groups.filter(g=>g.active).map(g=><option value={g.id} key={g.id}>{g.name}</option>)}
   </select>
  </label>}
  {loading?<div role="status" className="bg-[#F8F5F0] rounded-xl p-5 text-sm">Calculando médias…</div>:
   error?<div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>:
   result&&<>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8F5F0] p-4">
     <div className="min-w-0"><p className="text-xs text-[#986D37] font-semibold">{result.scope==="church"?"Igreja":"Pequeno Grupo"}</p>
      <strong className="text-[#0F3D33] break-words">{result.scope_name}</strong></div>
     <div className="text-[#0F3D33] text-xs font-bold flex gap-2 items-center">
      <Users size={16}/>{result.answered_members} de {result.total_members} responderam
     </div>
    </div>
    {!result.available?<div className="rounded-xl bg-[#F8F5F0] p-5 space-y-2">
     <p className="font-bold text-[#0F3D33]">Radar coletivo aguardando respostas</p>
     <p className="text-sm text-[#52665F]">
      {result.total_members===0?"Ainda não há participantes aprovados nesta seleção.":"É necessário que pelo menos "+result.minimum_required+" participantes preencham o Radar para exibir as médias. Isso protege a privacidade das respostas pessoais."}
     </p>
    </div>:<>
     <div className="flex flex-col items-center gap-2">
      <div className="w-full max-w-[390px] aspect-square">
       <svg viewBox="0 0 336 336" role="img" aria-label="Radar coletivo das sete áreas de discipulado com notas médias de zero a quinze" className="w-full h-full">
        <title>Médias coletivas do Radar Discipular</title>
        {[1,2,3,4,5].map(n=><polygon key={n} points={polygon(angles.map(()=>n*3))}
          fill="none" stroke="#D7E0D7" strokeWidth="1.4"/>)}
        {angles.map((angle,i)=>{
         const p=point(angle,radius);
         return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#CAD6CC" strokeWidth="1.2"/>;
        })}
        <polygon points={polygon(scores)} fill="#C79A5B" fillOpacity="0.35" stroke="#99703A" strokeWidth="2.5" strokeLinejoin="round"/>
        {angles.map((angle,i)=>{
         const p=point(angle,scores[i]/maximum*radius);
         return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0F3D33" stroke="white" strokeWidth="1"/>;
        })}
        {angles.map((angle,i)=>{
         const p=point(angle,radius+22);
         return <g key={i}><circle cx={p.x} cy={p.y} r="10.5" fill="#0F3D33"/>
          <text x={p.x} y={p.y+3.2} fill="#F8F5F0" textAnchor="middle" fontWeight="bold" fontSize="10">{i+1}</text></g>;
        })}
       </svg>
      </div>
      <p className="text-xs text-[#52665F] text-center">Escala de 0 a 15 por área · Média total: {scoreText(totalScore)}/105</p>
     </div>
     <div className="grid gap-3 sm:grid-cols-2">
      {radarAreas.map((area,i)=><div key={area.id} className="rounded-xl border border-[#EFE4D2] p-3">
       <div className="flex justify-between items-start gap-2">
        <strong className="text-xs text-[#0F3D33]">{i+1}. {area.name}</strong>
        <span className="font-bold text-xs text-[#926B34] whitespace-nowrap">{scoreText(scores[i])}/15</span>
       </div>
       <div className="mt-3 h-2 rounded-full bg-[#EDEFE8] overflow-hidden">
        <div className="h-full rounded-full bg-[#B38A53]" style={{width:(scores[i]/maximum*100)+"%"}}/>
       </div>
      </div>)}
     </div>
    </>}
    <p className="text-xs text-[#52665F] flex gap-2 items-start"><ShieldCheck size={17} className="shrink-0"/>
     São exibidas somente médias, sem revelar notas ou respostas individuais. O Radar orienta o cuidado, não mede o valor espiritual das pessoas.
    </p>
   </>}
 </section>;
}
