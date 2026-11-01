"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function PilotActivity() {
  const path = usePathname();
  useEffect(() => {
    // Record a day of participant use, without paths or spiritual content.
    // Pré-cadastro, administração e configurações não comprovam o início da jornada.
    const journey = path === "/" || path.startsWith("/radar") || path.startsWith("/pdd")
      || path.startsWith("/stage") || path.startsWith("/hoje") || path.startsWith("/diary");
    if (!journey) return;
    const client = createClient();
    void client.auth.getUser().then(({ data }) => {
      if (data.user) void client.rpc("record_pilot_activity");
    });
  }, [path]);
  return null;
}
