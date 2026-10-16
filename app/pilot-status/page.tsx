import type { Metadata } from "next";
import { createClient } from "../../utils/supabase/server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
 title:"Situação do acesso | ROTA29",
 description:"Consulte a autorização de sua igreja para o piloto ROTA29.",
 robots:{index:false,follow:false}
};
type Info={title:string;description:string;action:string;href:string};
const labels:Record<string,Info>={
 maintenance:{
  title:"Acesso temporariamente suspenso",
  description:"A coordenação está revisando os acessos do ROTA29. Nenhum histórico foi apagado. Aguarde a comunicação oficial.",
  action:"Voltar mais tarde",href:"/pilot-status"
 },
 unauthenticated:{
  title:"Entre com sua conta Google",
  description:"O ROTA29 funciona por igreja. Após se identificar, informe o código fornecido por seu pastor e aguarde sua autorização.",
  action:"Entrar com Google",href:"/start"
 },
 no_church:{
  title:"Sua igreja é o primeiro passo",
  description:"Você ainda não possui autorização para a jornada. Solicite ao pastor o código de sua igreja e faça o pedido de participação.",
  action:"Informar código da igreja",href:"/igreja"
 },
 unselected:{
  title:"Solicite acesso à sua igreja",
  description:"Somente participantes vinculados a uma igreja aprovada, com autorização pastoral, podem iniciar a jornada.",
  action:"Solicitar participação",href:"/igreja"
 },
 pending_pastor:{
  title:"Aguardando aprovação do pastor",
  description:"Seu pedido foi recebido, mas o código não libera acesso automaticamente. Seu pastor verificará a solicitação antes de autorizar a jornada.",
  action:"Conferir meu pedido",href:"/igreja"
 },
 pending:{
  title:"Aguardando autorização",
  description:"Sua participação depende da aprovação da coordenação e do pastor responsável.",
  action:"Verificar situação",href:"/igreja"
 },
 church_pending:{
  title:"Igreja aguardando a coordenação",
  description:"O cadastro da igreja precisa ser aprovado antes de os participantes acessarem a jornada.",
  action:"Conferir minha igreja",href:"/igreja"
 },
 suspended:{
  title:"Participação suspensa",
  description:"Procure seu pastor ou a coordenação para obter informações sobre a suspensão.",
  action:"Consultar minha igreja",href:"/igreja"
 },
 archived:{
  title:"Seu histórico foi preservado",
  description:"Sua conta anterior não equivale a uma autorização para o novo piloto. Entre com o código de uma igreja participante e aguarde o pastor.",
  action:"Solicitar participação",href:"/igreja"
 },
 scheduled:{
  title:"Sua participação está programada",
  description:"Seu acesso está autorizado, mas o período da jornada ainda não começou.",
  action:"Atualizar situação",href:"/entrada"
 },
 expired:{
  title:"O período do piloto terminou",
  description:"Obrigado por participar. Seu progresso permanece salvo para acompanhamento pastoral.",
  action:"Consultar minha igreja",href:"/igreja"
 },
 completed:{
  title:"Parabéns pela primeira insígnia!",
  description:"Você concluiu os 21 dias de Intimidade com Deus. Sua conquista permanece registrada no ROTA29.",
  action:"Ver minha insígnia",href:"/congratulations?stage=house"
 },
 admin:{title:"Acesso da coordenação liberado",description:"Sua conta possui permissão administrativa.",action:"Abrir administração",href:"/admin"},
 pastor:{title:"Acesso pastoral liberado",description:"Sua igreja está autorizada. Confira os pedidos de participação no painel pastoral.",action:"Abrir painel pastoral",href:"/pastor"},
 active:{title:"Sua jornada está liberada",description:"Seu pastor autorizou sua participação. Continue sua jornada de discipulado.",action:"Continuar minha jornada",href:"/entrada"}
};
export default async function PilotStatus(){
 const db=await createClient();
 const {data:{user},error:userError}=await db.auth.getUser();
 let status=!user?"unauthenticated":userError?"error":"unselected";
 if(user && !userError){
  const {data,error}=await db.rpc("rota29_pilot_access");
  status=error?"error":String(data?.status||"unselected");
 }
 const info=labels[status]||{
  title:"Não foi possível confirmar seu acesso",
  description:"Por segurança, a jornada permanece indisponível até que a autorização seja verificada.",
  action:"Tentar novamente",href:"/start"
 };
 return <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] px-5 py-12 grid place-items-center">
  <section className="w-full max-w-md rounded-3xl bg-white border border-[#C79A5B]/40 p-8 text-center shadow-xl space-y-5">
   <img src="/brand/rota29-logo.svg" alt="ROTA29" width="240" height="80" className="mx-auto w-48 h-auto"/>
   <div aria-hidden="true" className="mx-auto w-14 h-14 rounded-full bg-[#0F3D33]/10 flex items-center justify-center">
    <svg width="28" height="28" viewBox="0 0 24 24" stroke="#0F3D33" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
     <rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
    </svg>
   </div>
   <h1 className="font-serif font-bold text-2xl">{info.title}</h1>
   <p className="text-[#36534b] leading-relaxed">{info.description}</p>
   <a href={info.href} className="block rounded-xl bg-[#0F3D33] text-white p-4 font-bold">{info.action}</a>
   <p className="text-xs text-[#58746a]">O prazo do piloto foi ampliado até 20 de novembro de 2026.</p>
   <p className="pt-4 border-t border-[#C79A5B]/25 text-xs tracking-wider uppercase">ROTA29 · Discipulado no cotidiano</p>
  </section>
 </main>;
}