import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Acesso temporariamente suspenso | ROTA29",
  description: "O piloto ROTA29 está temporariamente suspenso por solicitação da coordenação.",
  robots: { index: false, follow: false },
};
export default function PilotStatus() {
 return (
  <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] flex items-center justify-center px-5 py-12">
   <section className="w-full max-w-md rounded-3xl bg-white border border-[#C79A5B]/40 p-8 text-center space-y-5 shadow-xl">
    <img src="/brand/rota29-logo.svg" alt="ROTA29" width="240" height="80" className="mx-auto w-48 h-auto"/>
    <div className="mx-auto w-14 h-14 rounded-full bg-[#0F3D33]/10 flex items-center justify-center">
     <svg width="28" height="28" viewBox="0 0 24 24" stroke="#0F3D33" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>
     </svg>
    </div>
    <h1 className="text-2xl font-serif font-bold">Acesso temporariamente suspenso</h1>
    <p className="text-[#36534b] leading-relaxed">Por orientação da coordenação, os acessos, cadastros e atividades do piloto ROTA29 estão bloqueados para revisão.</p>
    <p className="text-sm font-semibold">O prazo do piloto foi ampliado provisoriamente até 20 de novembro de 2026. A reabertura depende de autorização expressa da coordenação.</p>
    <p className="text-xs text-[#58746a]">Nenhum progresso foi apagado. Aguarde a comunicação oficial antes de tentar entrar novamente.</p>
    <div className="pt-4 border-t border-[#C79A5B]/25 text-xs tracking-wider uppercase">ROTA29 · Discipulado no cotidiano</div>
   </section>
  </main>
 );
}
