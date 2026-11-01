"use client";

import {useState} from "react";
import {LogOut} from "lucide-react";
import {createClient} from "../../utils/supabase/client";
import {leavePastorJourneyMode} from "../../utils/pastor-journey-mode";

/**
 * Encerra apenas a sessão atual do Google no ROTA29.
 * Não altera o vínculo pastoral, a licença ou os participantes da igreja.
 */
export default function PastoralSignOut(){
  const [signingOut,setSigningOut]=useState(false);
  const [error,setError]=useState("");
  const logout=async()=>{
    if(signingOut)return;
    setSigningOut(true);
    setError("");
    try{
      const {error:failure}=await createClient().auth.signOut({scope:"local"});
      if(failure){
        setError("Não foi possível sair da conta. Tente novamente.");
        setSigningOut(false);
        return;
      }
      leavePastorJourneyMode();
      window.location.replace("/start?logout=1");
    }catch{
      setError("Não foi possível sair da conta. Verifique sua conexão.");
      setSigningOut(false);
    }
  };
  return <div className="flex flex-col items-end gap-1">
    <button type="button" disabled={signingOut} onClick={()=>void logout()}
      aria-label="Sair da conta do ROTA29"
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-bg-card px-4 py-2.5 text-sm font-bold text-text-main disabled:opacity-50 min-h-11">
      <LogOut size={17} aria-hidden="true"/>
      {signingOut?"Saindo…":"Sair da conta"}
    </button>
    {error&&<p role="alert" className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
  </div>;
}
