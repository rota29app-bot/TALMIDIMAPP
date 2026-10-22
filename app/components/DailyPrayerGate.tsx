"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export type DayGateState = {
  status: string;
  open?: boolean;
  ready_at?: string;
  day_index?: number;
  prayer_time?: string;
  time_zone?: string;
  memorial_saved?: boolean;
};

export function useDailyPrayerGate(stage: string, enabled=true) {
  const [gate,setGate]=useState<DayGateState|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const refresh=useCallback(async()=>{
    const {data,error:requestError}=await createClient().rpc("rota29_my_day_gate",{p_stage:stage});
    if(requestError) {
      setError("Não foi possível verificar seu horário: "+requestError.message);
      setGate({status:"error",open:false});
    } else {
      setError("");
      setGate(data as DayGateState);
    }
    setLoading(false);
  },[stage]);
  useEffect(()=>{
    if(!enabled)return;
    void refresh();
    const interval=window.setInterval(()=>{
      if(document.visibilityState==="visible")void refresh();
    },30000);
    const focus=()=>void refresh();
    const visibility=()=>{if(document.visibilityState==="visible")void refresh();};
    window.addEventListener("focus",focus);
    document.addEventListener("visibilitychange",visibility);
    return()=>{
      window.clearInterval(interval);
      window.removeEventListener("focus",focus);
      document.removeEventListener("visibilitychange",visibility);
    };
  },[enabled,refresh]);
  return {gate,loading:enabled?loading:false,error,refresh};
}

export default function DailyPrayerGate({
  gate,error,refresh
}:{
  gate:DayGateState|null;error:string;refresh:()=>Promise<void>;
}){
  const router=useRouter();
  const [prayerTime,setPrayerTime]=useState("07:00");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Belem";
  const save=async()=>{
    if(!prayerTime||busy)return;
    setBusy(true);setMessage("");
    const {error:e}=await createClient().rpc("rota29_set_daily_schedule",{
      p_prayer_time:prayerTime,p_time_zone:zone
    });
    setBusy(false);
    if(e)setMessage(e.message);else await refresh();
  };
  let when="";
  if(gate?.ready_at){
    try{
      when=new Intl.DateTimeFormat("pt-BR",{
        weekday:"long",day:"2-digit",month:"long",
        hour:"2-digit",minute:"2-digit",
        timeZone:gate.time_zone||zone
      }).format(new Date(gate.ready_at));
    }catch{when="no horário escolhido";}
  }
  return <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] grid place-items-center p-5">
    <section className="w-full max-w-md bg-white rounded-3xl border border-[#C79A5B]/40 p-7 space-y-5 text-center shadow-lg">
      <img src="/brand/rota29-logo.svg" className="w-40 mx-auto" alt="ROTA29"/>
      {gate?.status==="needs_setup"?<>
        <h1 className="font-serif font-bold text-2xl">Meu horário de oração</h1>
        <p className="text-sm leading-relaxed">Escolha a hora em que deseja começar seus dias com Deus. Cada novo dia abrirá no horário escolhido, desde que você tenha concluído o Memorial do dia anterior.</p>
        <label className="block text-sm font-bold text-left">
          Horário diário de oração
          <input type="time" value={prayerTime} onChange={e=>setPrayerTime(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[#C79A5B] bg-white p-4 text-center text-xl" required/>
        </label>
        <p className="text-xs opacity-75">Se a hora escolhida já passou hoje, o Dia 1 abrirá amanhã nesse horário. Fuso do aparelho: {zone}.</p>
        <button type="button" onClick={()=>void save()} disabled={busy||!prayerTime}
          className="w-full rounded-xl bg-[#0F3D33] text-white font-bold p-4 disabled:opacity-50">
          {busy?"Salvando…":"Confirmar horário"}
        </button>
      </>:gate?.status==="waiting"?<>
        <h1 className="font-serif font-bold text-2xl">Próximo dia programado</h1>
        <p className="text-sm leading-relaxed">Seu Dia {gate.day_index} abrirá <strong>{when}</strong>.</p>
        <p className="text-sm">A jornada considera o dia seguinte no horário da oração, não 24 horas após a conclusão do Memorial.</p>
        <button onClick={()=>void refresh()} className="w-full bg-[#0F3D33] text-white rounded-xl p-4 font-bold">Verificar liberação</button>
      </>:gate?.status==="previous_stage"?<>
        <h1 className="font-serif font-bold text-2xl">Conclua a estação anterior</h1>
        <p className="text-sm">A próxima estação será liberada após o período previsto da anterior, respeitando seu horário diário.</p>
      </>:gate?.status==="stage_completed"?<>
        <h1 className="font-serif font-bold text-2xl">Etapa concluída</h1>
        <p className="text-sm">Seu progresso está registrado. Continue pelo mapa do ROTA29.</p>
      </>:<>
        <h1 className="font-serif font-bold text-2xl">Acesso à jornada indisponível</h1>
        <p className="text-sm">{error||"Não conseguimos confirmar seu horário ou sua autorização pastoral. Tente novamente."}</p>
        <button onClick={()=>void refresh()} className="w-full bg-[#0F3D33] text-white rounded-xl p-4 font-bold">Tentar novamente</button>
      </>}
      {message&&<p role="alert" className="text-sm text-red-600">{message}</p>}
      <button className="block mx-auto text-sm underline" onClick={()=>router.push("/")}>Voltar ao mapa</button>
      <p className="text-xs text-[#6d7d70]">Você poderá ajustar seu horário em Meu ROTA29. Alterações não antecipam dias já programados.</p>
    </section>
  </main>;
}
