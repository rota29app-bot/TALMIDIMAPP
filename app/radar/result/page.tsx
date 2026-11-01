"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import { radarAreas } from "../data";
import { generateDiagnostico } from "../diagnostico";
import { ArrowRight, ChevronRight, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function RadarResultPage() {
  const router = useRouter();
  const supabase = createClient();
  const exportRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [previousScores, setPreviousScores] = useState<number[] | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [previousTotal, setPreviousTotal] = useState<number | null>(null);
  const [userName, setUserName] = useState("Discipulo");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchRadar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/start");
        return;
      }
      const { data: permit, error: permitError } = await supabase.rpc("rota29_pilot_access");
      if (permitError || permit?.allowed !== true) {
        router.replace("/igreja");
        return;
      }
      setMounted(true);
      
      const { data, error: radarError } = await supabase
        .from("user_radars")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
        
      const metaName = session.user.user_metadata?.name;
      if (metaName) setUserName(metaName);

      if (radarError) {
        setLoadError("Não foi possível carregar seu Radar. Confira a conexão e tente novamente.");
        return;
      }
      if (data && data.length > 0) {
        setHistory(data);

        // Latest score
        const latestData = data[0];
        const areaScores = radarAreas.map(area => latestData[`score_${area.id}`] || 0);
        setScores(areaScores);
        setTotalScore(areaScores.reduce((a, b) => a + b, 0));
        
        // If there's history, get the oldest one to compare (or the immediate previous)
        // Usually you compare current with the oldest (baseline) or previous. Let's compare with baseline (oldest)
        if (data.length > 1) {
          const baselineData = data[data.length - 1]; // oldest
          const oldScores = radarAreas.map(area => baselineData[`score_${area.id}`] || 0);
          setPreviousScores(oldScores);
          setPreviousTotal(oldScores.reduce((a, b) => a + b, 0));
        }
      } else {
        setLoadError("Ainda não encontramos um Radar salvo nesta conta. Você pode retornar ao questionário.");
        return;
      }
    };
    fetchRadar();
  }, [router, supabase]);

  if (loadError) return <main className="min-h-screen bg-[#F8F5F0] p-8 flex flex-col justify-center gap-4 text-[#0F3D33]"><p role="alert">{loadError}</p><button onClick={() => window.location.reload()} className="rounded-xl bg-[#0F3D33] text-white p-4">Tentar carregar novamente</button><button className="underline" onClick={() => router.push("/radar")}>Voltar ao Radar</button></main>;

  if (!mounted || scores.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#E9DFCE]/30 border-t-[#C79A5B] rounded-full animate-spin"></div>
      </div>
    );
  }

  const scoresById: Record<string, number> = {};
  radarAreas.forEach((area, i) => { scoresById[area.id] = scores[i] || 0; });
  const diagnostico = generateDiagnostico(scoresById);

  // SVG Math for 7-axis radar chart
  const size = 300;
  const center = size / 2;
  const radius = (size / 2) - 40;
  const angles = Array.from({ length: 7 }).map((_, i) => (i * 2 * Math.PI) / 7 - Math.PI / 2);

  const getPoint = (angle: number, r: number) => {
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Grid lines
  const gridLevels = [1, 2, 3, 4, 5];
  
  // Data polygon (Latest)
  const maxScore = 15;
  const dataPoints = scores.map((score, i) => getPoint(angles[i], (score / maxScore) * radius));
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  // Old Data polygon (Baseline)
  const oldDataPoints = previousScores ? previousScores.map((score, i) => getPoint(angles[i], (score / maxScore) * radius)) : null;
  const oldDataPolygon = oldDataPoints ? oldDataPoints.map(p => `${p.x},${p.y}`).join(" ") : null;

  const generatePDF = async () => {
    if (!exportRef.current) return;
    setGenerating(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0C2D26"
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Radar_ROTA29_${userName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Houve um erro ao gerar o PDF.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C2D26] text-[#E9DFCE] flex flex-col items-center pb-24 font-sans">
      <div className="w-full bg-[#12382F] pt-12 pb-8 px-6 text-center border-b border-[#C79A5B]/10">
        <h1 className="text-[28px] font-serif font-bold text-white mb-2">Seu Radar</h1>
        <p className="text-[#E9DFCE]/70 text-[14px]">
          {previousScores ? "Veja a sua evolução comparada ao seu primeiro radar." : "Diagnóstico da sua vida espiritual hoje."}
        </p>
        {!previousScores && (
          <p className="text-[#E9DFCE]/50 text-[12px] italic mt-2 max-w-[320px] mx-auto leading-relaxed">
            Este resultado representa apenas seu ponto de partida. Todo discípulo está em processo de crescimento — receba este diagnóstico como um convite para caminhar com perseverança.
          </p>
        )}

        <div className="mt-6 inline-flex flex-col items-center bg-[#C79A5B]/10 border border-[#C79A5B]/30 rounded-2xl px-6 py-3">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#C79A5B] mb-1">Pontuação Total</span>
          <div className="flex items-end gap-2">
            <span className="text-[32px] font-bold text-white leading-none">{totalScore}</span>
            {previousTotal !== null && (
              <span className={`text-[16px] font-bold pb-1 ${totalScore >= previousTotal ? "text-green-500" : "text-red-400"}`}>
                {totalScore >= previousTotal ? "+" : ""}{totalScore - previousTotal}
              </span>
            )}
          </div>
          <span className="text-[12px] text-[#E9DFCE]/50 mt-1">de 105 possíveis</span>
        </div>
      </div>

      <div className="w-full max-w-[500px] px-6 mt-8 flex flex-col items-center animate-in zoom-in-95 duration-1000">

      <div ref={exportRef} className="w-full flex flex-col items-center bg-[#0C2D26] p-2">
        <h2 className="text-[16px] font-serif font-bold text-white mb-4">Radar Discipular de {userName}</h2>
        {/* Radar Chart */}
        <div className="relative w-full aspect-square max-w-[350px] mb-8">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
            {/* Grid */}
            {gridLevels.map(level => {
              const r = (level / 5) * radius;
              const points = angles.map(angle => getPoint(angle, r));
              const polygon = points.map(p => `${p.x},${p.y}`).join(" ");
              return (
                <polygon key={level} points={polygon} fill="none" stroke="#2a302a" strokeWidth="1" />
              );
            })}
            
            {/* Axes */}
            {angles.map((angle, i) => {
              const p = getPoint(angle, radius);
              return (
                <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#2a302a" strokeWidth="1" />
              );
            })}

            {/* Old Data Polygon (Baseline) */}
            {oldDataPolygon && (
              <polygon 
                points={oldDataPolygon} 
                fill="none" 
                stroke="#666666" 
                strokeWidth="1.5" 
                strokeDasharray="4 4"
                strokeLinejoin="round" 
              />
            )}

            {/* Data Polygon */}
            <polygon 
              points={dataPolygon} 
              fill="#C79A5B" 
              fillOpacity="0.3" 
              stroke="#C79A5B" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />
            
            {/* Data points */}
            {dataPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4" fill="#C79A5B" />
            ))}

            {/* Labels */}
            {angles.map((angle, i) => {
              // Push text slightly further out
              const p = getPoint(angle, radius + 25);
              const name = radarAreas[i].name.split(" ");
              return (
                <text 
                  key={i} 
                  x={p.x} 
                  y={p.y} 
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  fill="#E9DFCE"
                  fontSize="10"
                  fontWeight="bold"
                  className="opacity-90"
                >
                  <tspan x={p.x} dy="-0.5em">{name[0]}</tspan>
                  {name.length > 1 && <tspan x={p.x} dy="1.2em">{name.slice(1).join(" ")}</tspan>}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Detailed Scores */}
        <div className="w-full bg-[#12382F] border border-[#2a302a] rounded-[24px] p-6 mb-8">
          <h3 className="text-[14px] font-bold text-[#C79A5B] uppercase tracking-widest mb-6 border-b border-[#2a302a] pb-4">Detalhamento</h3>
          <div className="space-y-4">
            {radarAreas.map((area, i) => {
              const score = scores[i];
              const previousScore = previousScores ? previousScores[i] : null;
              const delta = previousScore !== null ? score - previousScore : 0;
              
              const percentage = (score / maxScore) * 100;
              return (
                <div key={area.id}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[14px] font-medium text-white">{area.name}</span>
                    <div className="flex items-center gap-2">
                      {previousScore !== null && delta !== 0 && (
                        <span className={`text-[12px] font-bold ${delta > 0 ? "text-green-500" : "text-red-400"}`}>
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                      <span className="text-[13px] font-bold text-[#E9DFCE]/80">{score}/15</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#0C2D26] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#C79A5B] to-[#C79A5B] h-full rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DIAGNÓSTICO REAL — não é o gráfico, é a leitura das combinações
            entre áreas, adaptada diretamente do capítulo "Radar Discipular"
            do livro (não é texto genérico). */}
        <div className="w-full bg-[#12382F] border border-[#2a302a] rounded-[24px] p-6 mb-8">
          <h3 className="text-[14px] font-bold text-[#C79A5B] uppercase tracking-widest mb-2 border-b border-[#2a302a] pb-4">Seu diagnóstico</h3>

          <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#E9DFCE]/50 mb-2">Pontos mais fortes</span>
              <ul className="space-y-1">
                {diagnostico.pontosFortes.map((n) => (
                  <li key={n} className="text-[13px] text-white font-medium">{n}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#E9DFCE]/50 mb-2">Pontos mais fracos</span>
              <ul className="space-y-1">
                {diagnostico.pontosFracos.map((n) => (
                  <li key={n} className="text-[13px] text-white font-medium">{n}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            {diagnostico.combinacoes.map((insight) => (
              <div key={insight.titulo} className="border-t border-[#2a302a] pt-4">
                <h4 className="text-[14px] font-bold text-white mb-1.5">{insight.titulo}</h4>
                <p className="text-[13px] text-[#E9DFCE]/80 leading-relaxed">{insight.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={generatePDF}
        disabled={generating}
        className="w-full bg-[#12382F] border border-[#C79A5B]/40 text-[#C79A5B] py-3.5 rounded-[16px] font-bold active:scale-95 transition-all flex items-center justify-center gap-2 mb-8 disabled:opacity-50"
      >
        {generating ? (
          <div className="w-4 h-4 border-2 border-[#C79A5B]/30 border-t-[#C79A5B] rounded-full animate-spin"></div>
        ) : (
          <Download size={18} />
        )}
        {generating ? "Gerando PDF..." : "Baixar meu Radar (PDF)"}
      </button>

        {/* REFLEXÃO — etapa Radar -> Diagnóstico -> Reflexão -> PDD.
            Perguntas adaptadas das perguntas de reflexão do livro. Salva
            local (sem precisar de tabela nova no banco). */}
        <div className="w-full bg-[#12382F] border border-[#2a302a] rounded-[24px] p-6 mb-8">
          <h3 className="text-[14px] font-bold text-[#C79A5B] uppercase tracking-widest mb-4 border-b border-[#2a302a] pb-4">Reflexão</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] text-white font-medium mb-2">Dentre seus pontos fortes e fracos, qual mais te surpreendeu ou incomodou — positiva ou negativamente? Por quê?</label>
              <textarea
                defaultValue={typeof window !== "undefined" ? localStorage.getItem("talmidim-radar-reflexao-1") || "" : ""}
                onChange={(e) => localStorage.setItem("talmidim-radar-reflexao-1", e.target.value)}
                className="w-full min-h-[80px] bg-[#0C2D26] border border-[#2a302a] rounded-xl p-3 text-[13px] text-[#E9DFCE] placeholder:text-[#E9DFCE]/30 focus:outline-none focus:border-[#C79A5B]/50 resize-none"
                placeholder="Escreva aqui..."
              />
            </div>
            <div>
              <label className="block text-[13px] text-white font-medium mb-2">Olhando o diagnóstico como um todo, o que você reconhece de si mesmo nele?</label>
              <textarea
                defaultValue={typeof window !== "undefined" ? localStorage.getItem("talmidim-radar-reflexao-2") || "" : ""}
                onChange={(e) => localStorage.setItem("talmidim-radar-reflexao-2", e.target.value)}
                className="w-full min-h-[80px] bg-[#0C2D26] border border-[#2a302a] rounded-xl p-3 text-[13px] text-[#E9DFCE] placeholder:text-[#E9DFCE]/30 focus:outline-none focus:border-[#C79A5B]/50 resize-none"
                placeholder="Escreva aqui..."
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/pdd/intro")}
          className="w-full bg-gradient-to-r from-[#C79A5B] to-[#b38a53] text-[#12382F] py-4 rounded-[16px] font-bold shadow-[0_10px_25px_rgba(198,155,92,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Criar meu PDD Digital <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
