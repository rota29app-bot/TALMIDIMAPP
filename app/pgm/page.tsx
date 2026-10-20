"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import {ArrowLeft,Users,Plus,RefreshCw,UserRound,MessageSquareText,AlertCircle,ShieldCheck,FolderArchive,Undo2,Save} from "lucide-react";

type PG={id:string;name:string;leader_id:string|null;leader_name:string;active:boolean;member_count:number};
type Member={user_id:string;name:string;email:string;group_id:string|null;house:number;street:number;office:number;last_progress:string|null;needs_attention:boolean};
type Overview={role:"pastor"|"leader"|"none";groups:PG[];members:Member[];alert_after_days:number};
type Note={id:string;type:string;text:string;created_at:string;pastor_only:boolean;author:string};
const careLabels:Record<string,string>={message:"Mensagem enviada",visit:"Visita realizada",discipleship:"Discipulado pessoal",other:"Outro acompanhamento"};
const getDate=(value:string|null)=>value?new Date(value).toLocaleDateString("pt-BR"):"Ainda sem avanço";
const errorText=(e:unknown)=>e instanceof Error?e.message:"Não foi possível concluir a operação.";

export default function PequenosGruposPage(){
 const router=useRouter();
 const [overview,setOverview]=useState<Overview|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [newName,setNewName]=useState("");
 const [selectedGroup,setSelectedGroup]=useState("all");
 const [editing,setEditing]=useState<string|null>(null);
 const [editName,setEditName]=useState("");
 const [selectedMember,setSelectedMember]=useState<Member|null>(null);
 const [notes,setNotes]=useState<Note[]>([]);
 const [notesLoading,setNotesLoading]=useState(false);
 const [careType,setCareType]=useState("message");
 const [careText,setCareText]=useState("");
 const [pastorOnly,setPastorOnly]=useState(false);

 const refresh=useCallback(async()=>{
  const db=createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user){router.replace("/start");return;}
  const {data,error:e}=await db.rpc("rota29_pg_overview");
  if(e){setError(e.message||"Não foi possível carregar os pequenos grupos.");}
  else {setOverview(data as Overview);setError("");}
  setLoading(false);
 },[router]);
 useEffect(()=>{void refresh();},[refresh]);

 const manage=async(action:string,group:string|null=null,name:string|null=null,leader:string|null=null,member:string|null=null)=>{
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  const {error:e}=await createClient().rpc("rota29_pg_manage",{
   p_action:action,p_group:group,p_name:name,p_leader:leader,p_member:member
  });
  if(e)setError(e.message);
  else{setNotice("Alteração salva.");await refresh();}
  setBusy(false);
 };
 const create=async()=>{
  if(newName.trim().length<2){setError("Informe um nome para o grupo.");return;}
  await manage("create",null,newName.trim());
  setNewName("");
 };
 const openNotes=async(m:Member)=>{
  setSelectedMember(m);setNotes([]);setCareText("");setPastorOnly(false);setNotesLoading(true);setError("");
  const {data,error:e}=await createClient().rpc("rota29_pg_notes",{p_member:m.user_id});
  if(e)setError(e.message);else setNotes((data||[]) as Note[]);
  setNotesLoading(false);
 };
 const saveNote=async()=>{
  if(!selectedMember||busy)return;
  if(careText.trim().length<2){setError("Descreva o acompanhamento.");return;}
  setBusy(true);setError("");
  const {error:e}=await createClient().rpc("rota29_pg_add_note",{
   p_member:selectedMember.user_id,p_type:careType,p_text:careText.trim(),p_pastor_only:pastorOnly
  });
  if(e)setError(e.message);
  else{setCareText("");setNotice("Registro de acompanhamento salvo.");await openNotes(selectedMember);}
  setBusy(false);
 };
 const isPastor=overview?.role==="pastor";
 const groups=overview?.groups||[];
 const members=overview?.members||[];
 const filtered=useMemo(()=>members.filter(m=>selectedGroup==="all"||selectedGroup==="unassigned"&&!m.group_id||m.group_id===selectedGroup),[members,selectedGroup]);
 const attention=filtered.filter(m=>m.needs_attention).length;
 const activeGroups=groups.filter(g=>g.active);
 const titleClass="text-lg font-bold text-[#0F3D33]";
 const fieldClass="w-full min-w-0 rounded-xl border border-[#DCC8A9] bg-white px-3 py-3 text-sm text-[#0F3D33]";
 const buttonClass="rounded-xl bg-[#0F3D33] px-4 py-3 font-semibold text-white text-sm disabled:opacity-40";
 if(loading)return <main className="min-h-screen bg-[#F8F5F0] p-6 text-[#0F3D33]" role="status">Carregando Pequenos Grupos…</main>;
 if(!overview||overview.role==="none")return <main className="min-h-screen bg-[#F8F5F0] p-6 text-[#0F3D33] space-y-4">
  <h1 className={titleClass}>Pequenos Grupos</h1>
  <p>Este painel é exclusivo do pastor responsável e dos líderes de PG autorizados. A jornada individual continua disponível normalmente.</p>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  <button className="underline" onClick={()=>router.back()}>Voltar</button>
 </main>;
 return <main className="min-h-screen bg-[#F8F5F0] text-[#0F3D33] pb-20">
  <header className="bg-[#0F3D33] text-[#F8F5F0] px-5 py-6">
   <div className="max-w-5xl mx-auto flex items-center gap-3">
    <button type="button" className="p-2 rounded-full border border-white/20" onClick={()=>router.push(isPastor?"/pastor":"/hoje")} aria-label="Voltar"><ArrowLeft size={20}/></button>
    <div className="flex-1 min-w-0"><p className="text-xs uppercase tracking-widest text-[#C79A5B]">ROTA29 · Acompanhamento</p>
     <h1 className="text-xl sm:text-2xl font-bold">Pequenos Grupos</h1>
     <p className="text-xs text-[#F8F5F0]/70">{isPastor?"Gestão pastoral da igreja":"Seu grupo de discipulado"}</p>
    </div>
    <button className="p-2 rounded-full border border-white/20" aria-label="Atualizar" onClick={()=>void refresh()}><RefreshCw size={20}/></button>
   </div>
  </header>
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
   <section className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Resumo dos grupos">
    <div className="bg-white rounded-2xl border border-[#E8D8BF] p-4"><Users className="text-[#9A6B31]" size={20}/><strong className="block text-3xl mt-2">{activeGroups.length}</strong><span className="text-xs">Grupos ativos</span></div>
    <div className="bg-white rounded-2xl border border-[#E8D8BF] p-4"><UserRound className="text-[#9A6B31]" size={20}/><strong className="block text-3xl mt-2">{isPastor?members.filter(m=>m.group_id).length:members.length}</strong><span className="text-xs">Acompanhados</span></div>
    <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-[#E8D8BF] p-4"><AlertCircle className="text-[#9A6B31]" size={20}/><strong className="block text-3xl mt-2">{attention}</strong><span className="text-xs">Sem avançar há {overview.alert_after_days} dias</span></div>
   </section>

   {isPastor&&<section className="bg-white rounded-2xl border border-[#E8D8BF] p-5 space-y-3">
     <h2 className={titleClass}>Criar novo pequeno grupo</h2>
     <p className="text-sm text-[#455B54]">Organize a igreja em quantos grupos precisar. Só participantes previamente aprovados podem ser atribuídos.</p>
     <form onSubmit={e=>{e.preventDefault();void create();}} className="flex flex-col sm:flex-row gap-2">
      <input className={fieldClass} value={newName} onChange={e=>setNewName(e.target.value)} maxLength={90} placeholder="Ex.: PG Esperança" aria-label="Nome do novo grupo"/>
      <button type="submit" disabled={busy||newName.trim().length<2} className={buttonClass+" flex items-center justify-center gap-2 whitespace-nowrap"}><Plus size={17}/> Criar PG</button>
     </form>
    </section>}

   <section className="space-y-3">
    <h2 className={titleClass}>{isPastor?"Grupos da igreja":"Grupo sob sua liderança"}</h2>
    {groups.length===0?<div className="bg-white border border-[#E8D8BF] p-5 rounded-2xl text-sm">Nenhum pequeno grupo criado. A jornada pessoal dos participantes continua sem alterações.</div>:
    <div className="grid gap-3 md:grid-cols-2">{groups.map(g=><article key={g.id} className="bg-white rounded-2xl border border-[#E8D8BF] p-5 space-y-3">
      <div className="flex justify-between gap-2"><div className="min-w-0"><h3 className="font-bold text-lg break-words">{g.name}</h3><p className="text-xs text-[#455B54]">{g.member_count} participante(s) · {g.active?"Ativo":"Arquivado"}</p></div>
       <button type="button" className="text-sm underline shrink-0" onClick={()=>setSelectedGroup(g.id)}>Ver membros</button></div>
      <p className="text-sm"><strong>Líder:</strong> {g.leader_id?g.leader_name:"Não definido"}</p>
      {isPastor&&<>
       <label className="block text-xs font-semibold">Definir líder aprovado
        <select disabled={busy||!g.active} className={fieldClass+" mt-1"} value={g.leader_id||""} onChange={e=>void manage("leader",g.id,null,e.target.value||null)}>
         <option value="">Sem líder</option>
         {members.filter(m=>!groups.some(other=>other.id!==g.id&&other.active&&other.leader_id===m.user_id)).map(m=><option value={m.user_id} key={m.user_id}>{m.name}</option>)}
        </select>
       </label>
       {editing===g.id?<form className="flex gap-2" onSubmit={e=>{e.preventDefault();void manage("rename",g.id,editName.trim());setEditing(null);}}>
        <input className={fieldClass} aria-label="Novo nome" value={editName} maxLength={90} onChange={e=>setEditName(e.target.value)}/>
        <button type="submit" disabled={busy||editName.trim().length<2} className={buttonClass} aria-label="Salvar novo nome"><Save size={18}/></button>
       </form>:<button className="text-sm underline" onClick={()=>{setEditing(g.id);setEditName(g.name);}}>Renomear</button>}
       <div className="border-t border-[#E8D8BF] pt-3">
        <button type="button" disabled={busy} className="flex items-center gap-2 text-xs text-[#455B54] underline"
         onClick={()=>{if(g.active){if(window.confirm("Arquivar o grupo? Seus participantes ficarão sem grupo, mas as anotações serão preservadas."))void manage("archive",g.id);}else void manage("reopen",g.id);}}>
          {g.active?<FolderArchive size={15}/>:<Undo2 size={15}/>}
          {g.active?"Arquivar grupo":"Reativar grupo"}
        </button>
       </div>
      </>}
    </article>)}</div>}
   </section>
   <section className="bg-white rounded-2xl border border-[#E8D8BF] p-5 space-y-4" aria-label="Participantes e avanço">
    <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
     <div><h2 className={titleClass}>Participantes e andamento</h2><p className="text-xs text-[#455B54]">Dias concluídos nas estações. Não inclui diário espiritual ou orações particulares.</p></div>
     {isPastor&&<select aria-label="Filtrar por grupo" className={fieldClass+" sm:w-56"} value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)}>
      <option value="all">Todos os participantes</option><option value="unassigned">Sem grupo</option>
      {groups.filter(g=>g.active).map(g=><option value={g.id} key={g.id}>{g.name}</option>)}
     </select>}
    </div>
    {filtered.length===0?<p className="text-sm text-[#455B54]">Nenhum participante nesta seleção.</p>:<div className="space-y-3">
     {filtered.map(m=><article key={m.user_id} className="rounded-xl border border-[#E8D8BF] bg-[#FFFEFC] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
       <div className="min-w-0"><h3 className="font-semibold break-words">{m.name}</h3><p className="text-xs text-[#455B54] break-all">{m.email}</p></div>
       {m.needs_attention&&<span className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded-lg font-bold shrink-0">Acompanhar</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
       <div className="bg-[#F4EEE3] p-2 rounded-lg"><strong className="block text-lg">{m.house}/21</strong>Intimidade</div>
       <div className="bg-[#F4EEE3] p-2 rounded-lg"><strong className="block text-lg">{m.street}/7</strong>Família</div>
       <div className="bg-[#F4EEE3] p-2 rounded-lg"><strong className="block text-lg">{m.office}/7</strong>Compaixão</div>
      </div>
      <p className="text-xs text-[#455B54]">Último avanço: {getDate(m.last_progress)}</p>
      {isPastor&&<label className="block text-xs font-semibold">Grupo
       <select className={fieldClass+" mt-1"} disabled={busy} value={m.group_id||""}
        onChange={e=>void manage(e.target.value?"assign":"unassign",e.target.value||m.group_id,null,null,m.user_id)}>
        <option value="">Sem grupo</option>
        {activeGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
       </select>
      </label>}
      <button onClick={()=>void openNotes(m)} className={buttonClass+" w-full flex justify-center items-center gap-2"}>
       <MessageSquareText size={17}/> Histórico de cuidado
      </button>
     </article>)}
    </div>}
   </section>
   <p className="text-xs text-[#455B54] flex gap-2 items-start"><ShieldCheck size={17} className="shrink-0"/> O líder vê somente os membros do seu grupo e as anotações compartilhadas com a liderança. Registros reservados são exclusivos do pastor.</p>
   {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
   {notice&&<p role="status" className="text-sm text-[#0F3D33]">{notice}</p>}
  </div>

  {selectedMember&&<div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-5" role="dialog" aria-modal="true" aria-label="Histórico de cuidado pastoral">
   <div className="w-full max-w-xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#F8F5F0] p-5 space-y-4 shadow-2xl">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase text-[#986D37] font-bold">Acompanhamento</p><h2 className="text-xl font-bold">{selectedMember.name}</h2></div>
     <button className="px-3 py-2 underline text-sm" onClick={()=>{setSelectedMember(null);setError("");}}>Fechar</button>
    </div>
    <form onSubmit={e=>{e.preventDefault();void saveNote();}} className="bg-white p-4 rounded-2xl border border-[#E8D8BF] space-y-3">
     <h3 className="font-bold">Registrar cuidado</h3>
     <label className="text-sm block">Ação realizada
      <select className={fieldClass+" mt-1"} value={careType} onChange={e=>setCareType(e.target.value)}>
       {Object.entries(careLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select>
     </label>
     <label className="text-sm block">Anotação
      <textarea rows={3} className={fieldClass+" mt-1"} value={careText} onChange={e=>setCareText(e.target.value)} maxLength={2000} placeholder="O que foi feito? Qual o próximo passo?"/>
     </label>
     {isPastor&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={pastorOnly} onChange={e=>setPastorOnly(e.target.checked)}/> Reservar esta anotação apenas para o pastor</label>}
     <button type="submit" disabled={busy||careText.trim().length<2} className={buttonClass+" w-full"}>{busy?"Salvando…":"Salvar registro"}</button>
    </form>
    <section className="space-y-3"><h3 className="font-bold">Histórico de acompanhamento</h3>
     {notesLoading?<p className="text-sm">Carregando histórico…</p>:notes.length===0?<p className="text-sm text-[#455B54]">Ainda não há registros disponíveis.</p>:
     notes.map(n=><article key={n.id} className="bg-white rounded-xl border border-[#E8D8BF] p-4">
      <div className="flex justify-between gap-2 text-xs"><strong>{careLabels[n.type]||"Acompanhamento"}</strong><span>{getDate(n.created_at)}</span></div>
      <p className="text-sm whitespace-pre-wrap break-words mt-2">{n.text}</p>
      <p className="text-xs text-[#455B54] mt-2">{n.author}{n.pastor_only?" · Reservado ao pastor":""}</p>
     </article>)}
    </section>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   </div>
  </div>}
 </main>;
}
