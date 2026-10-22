"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { getStage, stageOrder, badgeNames } from "../data";
import { GLOBAL_STAGE_KEY, todayEpochDay } from "../stage/[id]/PracticesTab";
import BottomNav from "../components/BottomNav";
import { Sun, BookText, Trophy, ChevronRight, Flame, Users } from "lucide-react";

export default function HojePage() {
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userName, setUserName] = useState("Peregrino");
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [journeyDone, setJourneyDone] = useState(false);
  const [tsdDone, setTsdDone] = useState(false);
  const [intercessionDone, setIntercessionDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canLeadPG, setCanLeadPG] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/start");
        return;
      }

      const fullName = session.user?.user_metadata?.full_name || session.user?.user_metadata?.name;
      if (fullName) setUserName(String(fullName).split(" ")[0]);

      // O acesso ao PG é separado da jornada individual e autorizado no servidor.
      const {data: pgContext} = await supabase.rpc("rota29_pg_context");
      if(pgContext?.role === "leader") setCanLeadPG(true);

      // Mesmas guardas do Mapa: sem Radar ou sem PDD, não é "Hoje" ainda —
      // é Fase 0 que falta completar.
      const { data: userRadars, error: userRadarsError } = await supabase
        .from("user_radars")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (userRadarsError) {
        setLoadError("Não foi possível verificar seu progresso. Confira a conexão e tente novamente.");
        setLoading(false);
        return;
      }
      if (!userRadars) {
        router.push("/radar");
        return;
      }

      const { data: userPdds, error: userPddsError } = await supabase
        .from("user_pdds")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (userPddsError) {
        setLoadError("Não foi possível verificar seu progresso. Confira a conexão e tente novamente.");
        setLoading(false);
        return;
      }
      if (!userPdds) {
        router.push("/pdd");
        return;
      }

      const { data: unlockData } = await supabase
        .from("user_stage_unlocks")
        .select("current_stage_index")
        .eq("user_id", session.user.id)
        .single();

      const resolvedIndex = unlockData?.current_stage_index ?? 0;

      const { data: allDaysData } = await supabase
        .from("user_daily_progress")
        .select("stage_id, day_index")
        .eq("user_id", session.user.id)
        .in("stage_id", stageOrder);

      const dayMap: Record<string, number> = {};
      (allDaysData || []).forEach((row) => {
        dayMap[row.stage_id] = row.day_index;
      });

      const { data: badge } = await supabase.from("user_badges")
        .select("id").eq("user_id",session.user.id).eq("badge_id","house").maybeSingle();
      const done = !!badge;
      setJourneyDone(done);

      if (!done) {
        const unlocked = stageOrder[Math.min(Math.max(0, resolvedIndex), stageOrder.length - 1)];
        const stageId = unlocked !== "house" && (dayMap[unlocked] || 1) > 7 ? "house" : unlocked;
        setActiveStageId(stageId);
        setActiveDay(dayMap[stageId] || 1);
      }

      const { data: globalPractice } = await supabase
        .from("user_practices")
        .select("tsd_done, intercession_done")
        .eq("user_id", session.user.id)
        .eq("stage_id", GLOBAL_STAGE_KEY)
        .eq("day_number", todayEpochDay())
        .single();

      setTsdDone(globalPractice?.tsd_done || false);
      setIntercessionDone(globalPractice?.intercession_done || false);
      setLoading(false);
    };
    load();
  }, [router]);

  const toggleGlobalPractice = async (field: "tsd_done" | "intercession_done") => {
    const current = field === "tsd_done" ? tsdDone : intercessionDone;
    const newValue = !current;
    if (field === "tsd_done") setTsdDone(newValue);
    else setIntercessionDone(newValue);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);
    const { error } = await supabase.from("user_practices").upsert({
      user_id: session.user.id,
      stage_id: GLOBAL_STAGE_KEY,
      day_number: todayEpochDay(),
      [field]: newValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id, stage_id, day_number" });

    if (error) {
      if (field === "tsd_done") setTsdDone(current);
      else setIntercessionDone(current);
    }
    setSaving(false);
  };

  if (loadError) return <main className="min-h-screen bg-[#F8F5F0] text-[#0F3D33] p-8 flex flex-col justify-center gap-4"><p role="alert">{loadError}</p><button className="rounded-xl bg-[#0F3D33] text-white p-4" onClick={() => window.location.reload()}>Tentar novamente</button></main>;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#E9DFCE] border-t-[#C79A5B] rounded-full animate-spin"></div>
      </div>
    );
  }

  const stage = activeStageId ? getStage(activeStageId) : null;
  const dayData = stage?.days.find((d) => d.day === activeDay);
  const isInPractice = activeDay >= 8 && activeDay <= 21;

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#0F3D33] font-sans pb-32">
      <div className="pt-12 pb-6 px-6 border-b border-[#E9DFCE]/60 bg-[#F8F5F0]">
        <div className="flex items-center gap-2 mb-1 opacity-80">
          <Sun size={18} className="text-[#C79A5B]" />
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#C79A5B]">Hoje</span>
        </div>
        <h1 className="text-[26px] font-serif font-bold text-[#0F3D33]">Olá, {userName}</h1>
      </div>

      <div className="px-6 pt-6 space-y-4">
        {/* Card principal: o que fazer hoje na jornada */}
        {journeyDone ? (
          <div className="bg-white border border-[#f0e4cd] rounded-2xl p-6 text-center shadow-sm">
            <p className="text-[15px] text-[#3b5238] font-medium">
              Você concluiu os 21 dias de Intimidade do piloto. O acompanhamento de experiência e resultados segue até 13 de novembro.
            </p>
          </div>
        ) : stage && dayData ? (
          <button
            onClick={() => router.push(`/stage/${activeStageId}`)}
            className="w-full text-left bg-white border border-[#f0e4cd] rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-widest text-[#C79A5B] uppercase">
                {stage.title} · Dia {activeDay} de 21
              </span>
              <ChevronRight size={18} className="text-[#C79A5B]" />
            </div>
            <p className="text-[16px] font-bold text-[#0F3D33] mb-1">{dayData.title}</p>
            {isInPractice && (
              <span className="inline-block text-[11px] font-bold text-[#8b6131] bg-[#8b6131]/10 rounded-full px-3 py-1 mt-1">
                Fase de prática contínua
              </span>
            )}

            {/* Lembrete elegante de quanto falta pra insígnia (pedido do
                Nilton) — barra fina + contagem, no lugar de só um texto. */}
            <div className="mt-4">
              <div className="w-full h-1.5 rounded-full bg-[#E9DFCE]/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C79A5B] to-[#C79A5B]"
                  style={{ width: `${(activeDay / 21) * 100}%` }}
                />
              </div>
              <p className="text-[12px] text-[#8b6131] font-bold mt-2">
                {`Primeira insígnia "${badgeNames.house}" ao concluir os 21 dias de Intimidade.`}
              </p>
            </div>
          </button>
        ) : (
          <div className="bg-white border border-[#f0e4cd] rounded-2xl p-6 text-center shadow-sm">
            <p className="text-[14px] text-[#3b5238]">Nenhuma estação ativa no momento.</p>
          </div>
        )}

        {/* Hábitos diários fixos — valem para o dia, não para a estação */}
        <div className="bg-white border border-[#f0e4cd] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-[#C79A5B]" />
            <h3 className="text-[14px] font-bold text-[#8b6131]">Práticas Diárias</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tsdDone}
                onChange={() => toggleGlobalPractice("tsd_done")}
                disabled={saving}
                className="mt-1 w-5 h-5 accent-[#C79A5B] rounded-sm"
              />
              <div>
                <span className="block font-bold text-[#0F3D33] text-[14px]">Tempo a Sós com Deus (TSD)</span>
                <span className="text-[12px] text-[#3b5238]/70">15 min de oração + 15 min de leitura bíblica.</span>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={intercessionDone}
                onChange={() => toggleGlobalPractice("intercession_done")}
                disabled={saving}
                className="mt-1 w-5 h-5 accent-[#C79A5B] rounded-sm"
              />
              <div>
                <span className="block font-bold text-[#0F3D33] text-[14px]">5 Pessoas em Oração</span>
                <span className="text-[12px] text-[#3b5238]/70">Orar por 5 pessoas de seu círculo de relacionamentos.</span>
              </div>
            </label>
          </div>
        </div>

        {canLeadPG && <button
          type="button" onClick={()=>router.push("/pgm")}
          className="w-full rounded-2xl border border-[#C79A5B]/40 bg-[#0F3D33] text-[#F8F5F0] px-5 py-4 text-left flex items-center gap-3"
        ><Users size={21} className="text-[#C79A5B]"/><span className="flex-1"><strong className="block text-sm">Meu Pequeno Grupo</strong><span className="text-xs text-[#F8F5F0]/70">Acompanhar participantes e registrar cuidado</span></span><ChevronRight size={18}/></button>}
        {/* Atalhos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/diary")}
            className="bg-white border border-[#f0e4cd] rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform"
          >
            <BookText size={20} className="text-[#8b6131]" />
            <span className="text-[12px] font-bold text-[#0F3D33]">Memorial</span>
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-white border border-[#f0e4cd] rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform"
          >
            <Trophy size={20} className="text-[#8b6131]" />
            <span className="text-[12px] font-bold text-[#0F3D33]">Conquistas</span>
          </button>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
