"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { isAdminTestMode, leaveAdminTestMode } from "../../utils/admin-test-mode";
import { isPastorJourneyMode, leavePastorJourneyMode } from "../../utils/pastor-journey-mode";

export default function AdminTestBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [visiblePath, setVisiblePath] = useState<string | null>(null);
  const [journeyType, setJourneyType] = useState<"admin" | "pastor" | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (pathname.startsWith("/admin")) {
        leaveAdminTestMode();
        return;
      }
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!alive) return;
      if (!user) { setVisiblePath(null); setJourneyType(null); return; }
      const { data, error } = await db.rpc("pilot_my_church");
      if (!alive) return;
      const adminMode=!error&&data?.is_admin&&isAdminTestMode(user.id);
      const pastorMode=!error&&data?.role==="pastor"&&data?.pilot===true&&isPastorJourneyMode(user.id);
      setJourneyType(adminMode?"admin":pastorMode?"pastor":null);
      setVisiblePath(adminMode||pastorMode?pathname:null);
    })();
    return () => { alive = false; };
  }, [pathname]);
  if (visiblePath !== pathname || pathname.startsWith("/admin")) return null;
  return <aside aria-label="Alternar entre aplicativo e administração"
    className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-[#C79A5B] bg-[#0F3D33] px-4 py-3 text-[#E9DFCE]">
    <span className="text-xs">{journeyType==="pastor"?"Jornada pessoal · Pastor":"Usando o app · Superadmin"}</span>
    <button type="button" className="shrink-0 rounded-lg border border-[#C79A5B] px-3 py-2 text-xs font-bold"
      onClick={() => { if(journeyType==="pastor"){leavePastorJourneyMode();router.push("/pastor");}else{leaveAdminTestMode();router.push("/admin");} }}>
      {journeyType==="pastor"?"Voltar ao painel pastoral":"Voltar à administração"}
    </button>
  </aside>;
}
