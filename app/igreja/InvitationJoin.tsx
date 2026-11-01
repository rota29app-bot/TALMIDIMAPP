"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";

type Church={role?:string;pilot?:boolean;igreja_id?:string|null;is_admin?:boolean;pending_igreja?:string|null};
type Invite={valid:boolean;nome?:string;igreja_id?:string};
export default function InvitationJoin({code,church,refresh}:{code:string;church:Church|null;refresh:()=>Promise<void>}){
 const router=useRouter();
 const [invite,setInvite]=useState<Invite|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  if(!/^[A-F0-9]{16}$/.test(code)){setInvite({valid:false});return;}
  void createClient().rpc("rota29_invitation_details",{p_codigo:code}).then(({data,error})=>{
   if(active){setInvite(error?{valid:false}:data as Invite);if(error)setError(error.message);}
  });
  return()=>{active=false;};
 },[code]);
 const run=async(recover:boolean)=>{
  if(busy||!invite?.valid)return;
  if(recover&&!window.confirm("Sua conta está cadastrada como responsável por outra igreja. Deseja corrigir seu cadastro RECENTE e solicitar participação em "+invite.nome+"? A correção só será permitida se não houver membros nem PGs vinculados."))return;
  setBusy(true);setError("");setNotice("");
  const {error:failure}=recover
   ?await createClient().rpc("rota29_recover_accidental_church_invitation",{p_codigo:code,p_confirm:true})
   :await createClient().rpc("pilot_join_church",{p_codigo:code});
  if(failure)setError(failure.message);
  else{setNotice("Pedido enviado. Aguarde a aprovação individual do pastor.");await refresh();}
  setBusy(false);
 };
 const approved=church?.role==="membro"&&church?.pilot&&church?.igreja_id===invite?.igreja_id;
 const otherApproved=church?.role==="membro"&&church?.pilot&&church?.igreja_id!==invite?.igreja_id;
 const pending=Boolean(church?.pending_igreja&&church.pending_igreja===invite?.nome);
 return <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] p-5">
  <div className="mx-auto max-w-xl space-y-5">
   <header className="pt-8 text-center space-y-2">
    <img src="/brand/rota29-logo.svg" alt="ROTA29" className="w-40 mx-auto"/>
    <h1 className="text-3xl font-serif font-bold">Convite para participar</h1>
    <p className="text-sm">Este convite é para entrar em uma igreja existente, não para cadastrar uma nova.</p>
   </header>
   <section className="rounded-2xl bg-white border border-[#C79A5B]/40 p-5 space-y-4">
    {!invite?<p role="status">Identificando igreja convidante…</p>:
     !invite.valid?<p role="alert">Convite indisponível ou inválido. Solicite um novo link ao pastor.</p>:
     <>
      <p className="text-xs uppercase font-bold text-[#A47A3F]">Igreja convidante</p>
      <h2 className="text-xl font-bold">{invite.nome}</h2>
      {church?.is_admin?<p>Entre com sua conta pessoal para solicitar participação.</p>:
       approved?<button className="w-full bg-[#0F3D33] text-white p-4 rounded-xl font-bold" onClick={()=>router.push("/entrada")}>Continuar minha jornada</button>:
       pending?<p className="rounded-xl bg-[#F8F5F0] p-4">Sua solicitação já está aguardando aprovação pastoral.</p>:
       otherApproved?<p className="rounded-xl bg-amber-50 p-4">Você já está vinculado a outra igreja. Solicite transferência à coordenação.</p>:
       church?.role==="pastor"?<>
        <p className="text-sm">Sua conta foi registrada como responsável por uma igreja. Se isso aconteceu por engano ao abrir o convite, é possível solicitar correção para um cadastro recente sem membros nem grupos.</p>
        <button disabled={busy} onClick={()=>void run(true)} className="w-full bg-[#0F3D33] text-white p-4 rounded-xl font-bold disabled:opacity-50">{busy?"Conferindo…":"Corrigir cadastro e solicitar vínculo"}</button>
        <p className="text-xs">A correção exige sua confirmação e não aprova sua participação automaticamente.</p>
       </>:<>
        <p className="text-sm">Ao solicitar participação, o pastor desta igreja deverá aprovar sua entrada. Mesmo que você exerça o ministério pastoral, não precisa cadastrar outra igreja.</p>
        <button disabled={busy} onClick={()=>void run(false)} className="w-full bg-[#0F3D33] text-white p-4 rounded-xl font-bold disabled:opacity-50">{busy?"Enviando…":"Solicitar vínculo com "+invite.nome}</button>
       </>}
     </>}
   </section>
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">{error}</p>}
   {notice&&<p role="status" className="rounded-xl bg-green-50 p-4 text-sm">{notice}</p>}
   <button onClick={async()=>{await createClient().auth.signOut({scope:"local"});router.replace("/start?convite="+encodeURIComponent(code));}} className="block mx-auto text-sm underline">Entrar com outra conta Google</button>
  </div>
 </main>;
}