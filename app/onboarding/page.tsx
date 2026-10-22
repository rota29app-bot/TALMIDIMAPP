"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Ícones simples (mesmo padrão do resto do app: SVGs inline, sem lib externa)
const WalkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM10 8l-2 3 1.5 1.5L8 17M14 9l2 2-1 3 3 3M10 12l3 1 3-1" />
  </svg>
);

const CompassIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 15.75l-1.5-4.5 4.5-1.5-1.5 4.5-1.5 1.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
  </svg>
);

const MapRouteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

type Screen = {
  icon: (props: { className?: string }) => React.ReactElement;
  lines: string[];
  buttonLabel: string;
};

// Narrativa oficial da Fase 0 (documento ET-003 do Nilton, v1.1). Cada tela
// tem título + corpo + botão principal com o texto exato que ele escreveu —
// só a última troca de destino: em vez de avançar pra tela seguinte, ela
// manda pro Radar Discipular (fluxo que já existe e não muda).
const screens: Screen[] = [
  {
    icon: WalkIcon,
    lines: [
      "Bem-vindo ao ROTA29!",
      "Você está iniciando uma jornada para crescer como discípulo de Jesus. Mais do que aprender conteúdos, você será convidado a viver a Palavra de Deus no cotidiano, um passo de cada vez.",
    ],
    buttonLabel: "Começar",
  },
  {
    icon: CompassIcon,
    lines: [
      "Por que o ROTA29 existe?",
      "Muitos cristãos desejam amadurecer na fé, mas nem sempre conseguem transformar conhecimento em prática. O ROTA29 foi criado para incentivar hábitos que aproximam a vida do discípulo do modo de viver de Cristo.",
    ],
    buttonLabel: "Entendi",
  },
  {
    icon: WalkIcon,
    lines: [
      "O que é o ROTA29?",
      "ROTA29 representa uma jornada contínua de formação: conhecimento bíblico, práticas espirituais e missão no cotidiano, formando discípulos que vivem a fé todos os dias.",
    ],
    buttonLabel: "Continuar",
  },
  {
    icon: MapRouteIcon,
    lines: [
      "Como funciona a jornada?",
      "Você conhecerá seu ponto de partida e, neste piloto, percorrerá três estações: Intimidade com Deus, Família e Compaixão e Graça. A prática continua até a primeira insígnia, no 21º dia.",
    ],
    buttonLabel: "Conhecer meu ponto de partida",
  },
  {
    icon: CompassIcon,
    lines: [
      "Radar Discipular",
      "O Radar Discipular não mede seu valor diante de Deus. Ele apenas ajuda você a refletir sobre seu momento atual. Responda com sinceridade; não existem respostas certas ou erradas.",
    ],
    buttonLabel: "Iniciar Radar",
  },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Modo "rever" (pedido do Nilton): quem já passou da Fase 0 pode voltar
  // aqui pra reler o Dia Zero. Nesse caso o botão final volta pra trás em
  // vez de reiniciar o Radar.
  const isReviewing = searchParams?.get("rever") === "1";
  const [index, setIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const total = screens.length;
  const isLast = index === total - 1;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // reinicia a animação das linhas toda vez que a tela muda
    setReplayKey((k) => k + 1);
  }, [index]);

  const advance = () => {
    if (index < total - 1) setIndex(index + 1);
  };

  const start = () => {
    if (isReviewing) {
      router.back();
    } else {
      router.push("/entrada");
    }
  };

  const Screen = screens[index];
  const Icon = Screen.icon;

  return (
    <div
      ref={containerRef}
      onClick={advance}
      className="relative min-h-screen w-full flex justify-center cursor-pointer select-none"
      style={{ background: "linear-gradient(180deg, #0C2D26 0%, #16210f 100%)" }}
    >
      <div className="w-full max-w-[420px] relative flex flex-col min-h-screen px-8"><div className="relative z-10 mx-auto mt-8 h-12 w-32"><img src="/brand/rota29-symbol-negative.svg" alt="ROTA29" className="h-full w-full object-contain"/></div>
        {/* traço dourado decorativo — mesma linguagem visual do mapa da jornada */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px opacity-25"
          style={{ background: "linear-gradient(180deg, transparent 0%, #C79A5B 50%, transparent 100%)" }}
        />

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div
            className="w-11 h-11 rounded-full border flex items-center justify-center mb-6"
            style={{ borderColor: "#C79A5B" }}
          >
            <Icon className="w-5 h-5 text-[#C79A5B]" />
          </div>

          {Screen.lines.map((line, i) => (
            <p
              key={`${replayKey}-${i}`}
              className="leading-snug"
              style={{
                fontFamily: i === 0 ? "Georgia, serif" : undefined,
                fontSize: i === 0 ? 24 : 15,
                fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? "#fdf0d5" : "#E9DFCEcc",
                marginBottom: 12,
                opacity: 0,
                transform: "translateY(14px)",
                animation: `teleUp 0.7s cubic-bezier(0.25,1,0.5,1) ${i * 0.22}s forwards`,
              }}
            >
              {line}
            </p>
          ))}

          <button
            key={`btn-${replayKey}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isLast) start();
              else advance();
            }}
            className="mt-4 self-start uppercase font-bold tracking-wide text-[13px] px-6 py-3 rounded-xl"
            style={{
              background: "linear-gradient(90deg, #C79A5B, #E9DFCE)",
              color: "#1a1406",
              opacity: 0,
              animation: `teleUp 0.7s cubic-bezier(0.25,1,0.5,1) ${Screen.lines.length * 0.22 + 0.1}s forwards`,
            }}
          >
            {isLast && isReviewing ? "Voltar" : Screen.buttonLabel}
          </button>
        </div>

        {/* indicador de progresso + dica de toque */}
        <div className="pb-10 relative z-10">
          {!isLast && (
            <p
              className="text-center text-[10px] uppercase tracking-widest mb-4"
              style={{ color: "#E9DFCE80" }}
            >
              Toque pra continuar
            </p>
          )}
          <div className="flex justify-center gap-2">
            {screens.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: 6,
                  height: 6,
                  background: i === index ? "#E9DFCE" : "#E9DFCE40",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes teleUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#0C2D26" }} />}>
      <OnboardingContent />
    </Suspense>
  );
}
