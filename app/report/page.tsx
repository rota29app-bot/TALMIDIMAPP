"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { radarAreas } from "../radar/data";
import { ArrowLeft, Download, FileText, CheckCircle2, Info } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import BottomNav from "../components/BottomNav";

export default function ReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/start");
        return;
      }
      
      const userId = session.user.id;
      const userMeta = session.user.user_metadata;

      // Fetch PDD
      const { data: pddData } = await supabase
        .from("user_pdds")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Fetch Latest Radar
      const { data: radarData } = await supabase
        .from("user_radars")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      // Fetch Latest Station Scores
      const { data: scoresData } = await supabase
        .from("user_station_scores")
        .select("*")
        .eq("user_id", userId);

      setUserData({
        name: userMeta?.name || "Discípulo",
        email: session.user.email,
        date: new Date().toLocaleDateString('pt-BR'),
        pdd: pddData ? [pddData.person_1, pddData.person_2, pddData.person_3, pddData.person_4, pddData.person_5] : [],
        radar: radarData,
        scores: scoresData || []
      });
      
      setLoading(false);
    };
    
    fetchData();
  }, [router, supabase]);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        backgroundColor: "#0C2D26"
      });
      
      const imgData = canvas.toDataURL("image/png");
      
      // A4 dimensions: 210 x 297 mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_ROTA29_${userData.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Houve um erro ao gerar o PDF.");
    } finally {
      setGenerating(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0C2D26] flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#E9DFCE]/30 border-t-[#C79A5B] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans pb-24">
      {/* Header Mobile UI */}
      <div className="bg-[#12382F] text-white pt-6 pb-4 px-6 sticky top-0 z-20 shadow-lg flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[#C79A5B] p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[18px] font-serif font-bold text-[#E9DFCE]">Exportar Relatório</h1>
        <div className="w-8"></div>
      </div>

      <div className="px-6 mt-8">
        <p className="text-text-muted text-[14px] leading-relaxed mb-6">
          Gere um relatório elegante em PDF com seus dados, radar e plano de discipulado para compartilhar com seu pastor ou discipulador.
        </p>

        <button
          onClick={generatePDF}
          disabled={generating}
          className="w-full bg-gradient-to-r from-[#C79A5B] to-[#b38a53] text-[#12382F] py-4 rounded-[16px] font-bold shadow-[0_10px_25px_rgba(198,155,92,0.2)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {generating ? (
            <div className="w-5 h-5 border-2 border-[#12382F]/30 border-t-[#12382F] rounded-full animate-spin"></div>
          ) : (
            <Download size={20} />
          )}
          {generating ? "Gerando PDF..." : "Baixar Relatório (PDF)"}
        </button>
      </div>

      <div className="mt-12 px-2 overflow-hidden flex justify-center">
        {/* DOCUMENTO PDF OCULTO/VISÍVEL (Estilo Premium) */}
        <div 
          ref={reportRef} 
          className="w-[800px] bg-[#0C2D26] text-[#E9DFCE] p-12 relative overflow-hidden"
          style={{ 
            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
            transform: 'scale(0.45)', // Visually scale it down for mobile preview
            transformOrigin: 'top center',
            marginBottom: '-50%' // Fix space after scaling
          }}
        >
          {/* Fundo Decorativo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C79A5B] rounded-full blur-[150px] opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C79A5B] rounded-full blur-[150px] opacity-10"></div>

          {/* Header do Relatório */}
          <div className="border-b-2 border-[#C79A5B]/30 pb-8 mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-[48px] font-serif font-black text-white leading-none tracking-tight mb-2">
                Relatório ROTA29
              </h1>
              <p className="text-[18px] text-[#C79A5B] uppercase tracking-widest font-bold">
                Discipulado no cotidiano
              </p>
            </div>
            <div className="text-right">
              <p className="text-[16px] text-white/70 mb-1">Discípulo</p>
              <p className="text-[24px] font-bold text-white">{userData.name}</p>
              <p className="text-[14px] text-[#C79A5B] mt-2">Data: {userData.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
            
            {/* Coluna 1 */}
            <div>
              {/* Radar Result */}
              <div className="bg-[#12382F] border border-[#2a302a] rounded-[24px] p-8 mb-8">
                <div className="flex items-center gap-3 mb-6 border-b border-[#2a302a] pb-4">
                  <div className="w-10 h-10 bg-[#C79A5B]/10 rounded-full flex items-center justify-center">
                    <FileText className="text-[#C79A5B]" size={20} />
                  </div>
                  <h2 className="text-[20px] font-bold text-white uppercase tracking-wider">Radar Discipular</h2>
                </div>
                
                {userData.radar ? (
                  <div className="space-y-5">
                    {radarAreas.map((area) => {
                      const score = userData.radar[`score_${area.id}`] || 0;
                      const percentage = (score / 15) * 100;
                      return (
                        <div key={area.id}>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[16px] font-medium text-white/90">{area.name}</span>
                            <span className="text-[14px] font-bold text-[#C79A5B]">{score}/15</span>
                          </div>
                          <div className="w-full bg-[#0C2D26] h-2 rounded-full overflow-hidden border border-[#2a302a]">
                            <div 
                              className="bg-gradient-to-r from-[#C79A5B] to-[#C79A5B] h-full rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-white/50 italic">Nenhum radar preenchido ainda.</p>
                )}
              </div>
            </div>

            {/* Coluna 2 */}
            <div>
              {/* PDD Result */}
              <div className="bg-[#12382F] border border-[#2a302a] rounded-[24px] p-8 mb-8">
                <div className="flex items-center gap-3 mb-6 border-b border-[#2a302a] pb-4">
                  <div className="w-10 h-10 bg-[#C79A5B]/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-[#C79A5B]" size={20} />
                  </div>
                  <h2 className="text-[20px] font-bold text-white uppercase tracking-wider">Plano de Discipulado</h2>
                  <button
                    type="button"
                    onClick={() => router.push("/pdd/intro")}
                    aria-label="O que é o PDD?"
                    className="text-[#C79A5B]/70 active:scale-90 transition-transform ml-auto"
                  >
                    <Info size={16} />
                  </button>
                </div>
                
                {userData.pdd && userData.pdd.length > 0 ? (
                  <ul className="space-y-4">
                    {userData.pdd.map((person: string, i: number) => (
                      person ? (
                        <li key={i} className="flex items-center gap-4 bg-[#0C2D26] p-4 rounded-xl border border-[#2a302a]">
                          <div className="w-8 h-8 rounded-full bg-[#C79A5B]/20 text-[#C79A5B] flex items-center justify-center font-bold text-[14px]">
                            {i + 1}
                          </div>
                          <span className="text-[18px] font-medium text-white">{person}</span>
                        </li>
                      ) : null
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/50 italic">Nenhum PDD criado ainda.</p>
                )}
              </div>

              {/* Assinatura */}
              <div className="mt-16 pt-8 border-t border-[#2a302a] text-center">
                <div className="w-64 h-px bg-gradient-to-r from-transparent via-[#C79A5B] to-transparent mx-auto mb-4"></div>
                <p className="text-[16px] text-white/70 italic">
                  "Sede meus imitadores, como também eu de Cristo."
                </p>
                <p className="text-[14px] text-[#C79A5B] mt-2 font-bold uppercase tracking-widest">
                  1 Coríntios 11:1
                </p>
              </div>

            </div>

          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
