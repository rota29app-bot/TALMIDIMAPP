"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
type Access={status:string;allowed:boolean;starts_on?:string;ends_on?:string};
const messages:Record<string,[string,string]>={
 pending:["Sua igreja aguarda aprovação","A coordenação do ROTA29 precisa liberar a igreja. Depois disso, o pastor poderá compartilhar o convite para as 10 vagas."],
 suspended:["Participação suspensa","Entre em contato com a coordenação do piloto."],
 archived:["Uma nova jornada está começando","Sua conta pertence ao aplicativo anterior e não está inscrita neste piloto. Seu histórico foi preservado. Procure a coordenação para uma nova participação."],
 scheduled:["Sua jornada começa em 15 de outubro","Seu cadastro está pronto. O piloto acontece de 15/10 a 13/11/2026. Volte na data de início."],
 expired:["O período do piloto terminou","Obrigado por participar. Seu progresso foi preservado para a avaliação do piloto. Procure seu pastor para dar seu retorno sobre a experiência."],
 completed:["Parabéns! Você conquistou A Semente","Você concluiu a primeira insígnia e encerrou sua participação nesta jornada do piloto. Seu progresso está salvo. Compartilhe sua experiência com seu pastor."],
 unselected:["Escolha como participar","Cadastre sua igreja, informe o convite do pastor ou escolha o Básico individual."],
};
export default function PilotStatus(){
 const router=useRouter();const [access,setAccess]=useState<Access|null>(null);const [error,setError]=useState("");
 useEffect(()=>{let alive=true;void(async()=>{
  const {data,error:e}=await createClient().rpc("rota29_pilot_access");
  if(!alive)return;if(e||!data)setError("Não foi possível conferir seu acesso. Atualize a página.");else setAccess(data);
 })();return()=>{alive=false;};},[]);
 const content=messages[access?.status||""]||[access?.allowed?"Seu acesso está liberado":"Conferindo seu acesso",access?.allowed?"Você já pode continuar.":""];
 return <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] flex items-center justify-center p-6"><section className="max-w-md w-full bg-white rounded-2xl p-7 space-y-5 text-center">
  <p className="font-bold tracking-widest">ROTA29</p>
  {access?.status==="completed"&&<p aria-label="Primeira insígnia" className="text-5xl">🌱</p>}
  <h1 className="font-serif font-bold text-2xl">{error||content[0]}</h1><p>{content[1]}</p>
  <p className="text-sm">Discipulado no cotidiano</p>
  {access?.allowed&&<button className="w-full rounded-xl bg-[#0F3D33] text-white p-3" onClick={()=>router.push("/entrada")}>Continuar</button>}
  {(access?.status==="pending"||access?.status==="unselected")&&<button className="w-full rounded-xl border p-3" onClick={()=>router.push("/igreja")}>Minha igreja</button>}
  <button type="button" className="underline text-sm" onClick={()=>window.location.reload()}>Atualizar</button>
  <button type="button" className="block mx-auto underline text-sm" onClick={async()=>{const {error:e}=await createClient().auth.signOut({scope:"local"});if(e)setError("Não foi possível sair. Tente novamente.");else window.location.replace("/start");}}>Sair da conta</button>
 </section></main>;
}
