"use client";
import {useEffect,useState} from "react";
import {createClient} from "../../utils/supabase/client";
import {savePrayerCalendarReminder} from "../../utils/prayer-calendar";
export default function DailyPrayerSettings(){
 const [time,setTime]=useState("07:00");
 const [zone,setZone]=useState("America/Belem");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const localZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  setZone(localZone||"America/Belem");
  void createClient().rpc("rota29_my_prayer_schedule").then(({data,error})=>{
   if(!error && data?.configured){
    if(data.prayer_time)setTime(String(data.prayer_time));
    if(data.time_zone)setZone(String(data.time_zone));
   }else if(error){setMessage(error.message);}
   setLoading(false);
  });
 },[]);
 const save=async()=>{
  if(busy)return;setBusy(true);setMessage("");
  const {error}=await createClient().rpc("rota29_set_daily_schedule",{
   p_prayer_time:time,p_time_zone:zone
  });
  setBusy(false);
  setMessage(error?error.message:"Horário salvo. O dia já programado continua no horário anterior; a mudança vale para os próximos dias.");
 };
 return <section className="bg-bg-card border border-accent/30 rounded-2xl p-5 space-y-3">
   <h2 className="font-bold text-lg">Horário diário da jornada</h2>
   <p className="text-sm text-text-muted">Os conteúdos abrem no horário escolhido, no dia seguinte à conclusão anterior. Alterações não antecipam um dia que já está aguardando.</p>
   <label className="block text-sm font-semibold">Minha oração diária
    <input type="time" disabled={busy||loading} value={time} onChange={e=>setTime(e.target.value)}
     className="mt-2 w-full border border-accent/30 bg-bg-main p-3 rounded-xl"/>
   </label>
   <p className="text-xs text-text-muted">Fuso horário: {zone}</p>
   <button disabled={busy||loading||!time} onClick={()=>void save()}
    className="w-full bg-accent text-bg-main rounded-xl p-3 font-bold disabled:opacity-50">
    {busy?"Salvando…":"Salvar horário de oração"}
   </button>
   <button type="button" disabled={busy||loading}
    onClick={()=>{
      try{
        savePrayerCalendarReminder(time,zone);
        setMessage("Lembrete criado. Abra o arquivo no calendário do celular e confirme a importação para receber o aviso diário.");
      }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível criar o lembrete.");}
    }} className="w-full rounded-xl border border-accent/50 p-3 text-sm font-bold disabled:opacity-50">
    Adicionar lembrete ao calendário (21 dias)
   </button>
   {message&&<p role="status" className="text-sm text-text-main">{message}</p>}
   <p className="text-xs text-text-muted">O envio de notificações com o app fechado ainda requer configuração do serviço push. Use também o alarme do celular.</p>
 </section>;
}
