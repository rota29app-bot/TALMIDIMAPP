"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stageOrder } from "../../data";
import { createClient } from "../../../utils/supabase/client";

function brazilDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(value));
}
export default function CompleteButton({ id, dayIndex, canComplete = true }: {
  id: string; dayIndex: number; canComplete?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const complete = async () => {
    const index = stageOrder.indexOf(id);
    if (!canComplete || saving || index < 0 || (id !== "house" && dayIndex > 7)) return;
    setSaving(true);
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) { router.push("/start"); return; }
      const uid = user.id;
      const { data: priorDay, error: readError } = await db.from("user_daily_progress")
        .select("day_index,updated_at").eq("user_id", uid).eq("stage_id", id).maybeSingle();
      if (readError) throw readError;
      const today = brazilDate(new Date());
      if ((priorDay?.day_index ?? 1) !== dayIndex) {
        alert("Seu progresso mudou em outro aparelho. Atualize a página."); return;
      }
      if (priorDay?.updated_at && brazilDate(priorDay.updated_at) === today) {
        alert("Você já concluiu a atividade deste dia. Continue amanhã."); return;
      }
      if (index > 0 && dayIndex === 1) {
        const { data: previousStage, error: previousError } = await db.from("user_daily_progress")
          .select("day_index,updated_at").eq("user_id", uid)
          .eq("stage_id", stageOrder[index - 1]).maybeSingle();
        if (previousError) throw previousError;
        if (!previousStage || (previousStage.day_index || 0) < 8) {
          alert("Conclua primeiro sete dias da estação anterior."); return;
        }
        if (previousStage.updated_at && brazilDate(previousStage.updated_at) === today) {
          alert("Esta estação começa amanhã."); return;
        }
      }
      const nextDay = Math.min(21, dayIndex + 1);
      const { error: saveError } = await db.from("user_daily_progress").upsert({
        user_id: uid, stage_id: id, day_index: nextDay, updated_at: new Date().toISOString()
      }, { onConflict: "user_id, stage_id" });
      if (saveError) throw saveError;
      localStorage.setItem(`talmidim-day-${id}`, nextDay.toString());
      const milestone = dayIndex === 7 && index + 1 < stageOrder.length;
      if (milestone) {
        const { data: previousUnlock, error: unlockReadError } = await db
          .from("user_stage_unlocks").select("current_stage_index")
          .eq("user_id", uid).maybeSingle();
        if (unlockReadError) throw unlockReadError;
        if ((previousUnlock?.current_stage_index ?? 0) <= index) {
          const { error: unlockError } = await db.from("user_stage_unlocks").upsert({
            user_id: uid, current_stage_index: index + 1, updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });
          if (unlockError) throw unlockError;
        }
        localStorage.setItem("talmidim-progress", String(index + 1));
      }
      const firstBadge = id === "house" && dayIndex === 21;
      router.push(firstBadge ? "/congratulations?stage=house" : milestone ? `/marco?stage=${id}` : "/");
    } catch (err) {
      console.error("Erro ao salvar progresso:", err);
      alert("Falha ao salvar o progresso. Nenhum registro anterior foi apagado. Recarregue a página antes de tentar novamente.");
    } finally { setSaving(false); }
  };
  return <div className="flex flex-col items-center w-full">
    <button type="button" onClick={() => void complete()} disabled={saving || !canComplete}
      className={`w-3/4 max-w-[250px] py-3 rounded-xl font-bold text-lg shadow-md transition-all duration-300 ${!canComplete ? "bg-[#c69c6d]/30 text-white/60 cursor-not-allowed" : "bg-[#c69c6d] text-white active:scale-95"}`}>
      {saving ? "Salvando…" : "Concluir"}
    </button>
    <p className="text-[13px] font-medium text-[#1a202c]/70 text-center mt-3">Um dia de cada vez. Não avance sem praticar.</p>
  </div>;
}
