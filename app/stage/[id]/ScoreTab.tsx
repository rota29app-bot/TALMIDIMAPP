"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../utils/supabase/client";

// Avaliação exclusiva do dia atual; avaliações de outros dias nunca são reaproveitadas.
export default function ScoreTab({
  id, dayIndex, onChange,
}: { id: string; dayIndex: number; onChange?: () => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setScore(null);
    setError("");
    void (async () => {
      const { data, error: fetchError } = await supabase.rpc(
        "rota29_my_daily_assessment",
        { p_stage: id, p_day: dayIndex }
      );
      if (!active) return;
      if (fetchError) {
        setError("Não foi possível consultar sua avaliação. Tente atualizar a página.");
      } else {
        const value = data?.score;
        setScore(typeof value === "number" ? value : null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id, dayIndex, supabase]);

  const handleScore = async (value: number) => {
    if (saving || loading) return;
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.rpc(
      "rota29_save_daily_assessment",
      { p_stage: id, p_day: dayIndex, p_score: value }
    );
    setSaving(false);
    if (saveError) {
      setError("Não foi possível salvar a avaliação: " + saveError.message);
      return;
    }
    setScore(value);
    onChange?.();
  };

  if (loading) return <div className="p-8 text-center text-text-main/60">Carregando avaliação do dia…</div>;

  return (
    <section className="animate-fade-in-left" aria-labelledby="daily-score-heading">
      <div className="mb-6">
        <h3 id="daily-score-heading" className="text-[19px] font-bold text-[#8b6131] mb-2">
          Avaliação Diária · Dia {dayIndex}
        </h3>
        <p className="text-[13px] text-text-muted leading-relaxed mb-4">
          Pensando <strong>somente no dia de hoje</strong>, como você vivenciou as práticas propostas?
          Responda com sinceridade, sem cobrança: isso é um registro do seu aprendizado,
          não uma medida de mérito ou valor espiritual.
        </p>
        <div className="flex flex-col gap-3">
          {[
            { val: 0, label: "Não realizei as práticas de hoje" },
            { val: 1, label: "Realizei parcialmente" },
            { val: 2, label: "Realizei de forma intencional" },
            { val: 3, label: "Realizei com intenção e reflexão" },
          ].map(item => (
            <button
              key={item.val}
              type="button"
              disabled={saving}
              aria-pressed={score === item.val}
              onClick={() => void handleScore(item.val)}
              className={`flex items-center p-4 rounded-xl border text-left transition-all active:scale-[0.98]
                ${score === item.val
                  ? "bg-text-main border-text-main text-bg-main shadow-md"
                  : "bg-bg-card/50 border-accent/30 text-text-main hover:bg-bg-main"}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black mr-4 flex-shrink-0
                ${score === item.val ? "bg-accent text-bg-main" : "bg-text-main/10 text-text-muted"}`}>
                {item.val}
              </span>
              <span className="font-bold text-[14px]">{item.label}</span>
            </button>
          ))}
        </div>
        {score !== null && !error && (
          <p role="status" className="mt-4 text-[13px] text-text-muted">
            Avaliação do Dia {dayIndex} registrada. Você poderá continuar para o Memorial do dia.
          </p>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
