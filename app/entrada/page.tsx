"use client";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import {isAdminTestMode} from "../../utils/admin-test-mode";

/** Única porta de entrada depois do login — função > jornada. */
export default function Entrada() {
 const router=useRouter();
 const [error,setError]=useState("");
 useEffect(()=>{
   let alive=true;
   (async()=>{
     const db=createClient();
     const {data:{user},error:authError}=await db.auth.getUser();
     if(!alive)return;
     if(authError || !user) { router.replace("/start"); return; }
     const {data:access,error:accessError}=await db.rpc("pilot_my_church");
     if(!alive)return;
     if(accessError || !access) {setError("Não foi possível verificar seu acesso. Tente novamente.");return;}
     if(access.is_admin===true) {
       router.replace(isAdminTestMode(user.id)
         ? (user.user_metadata?.profile ? "/" : "/start") : "/admin");return;
     }
     if(access.role==="pastor") {router.replace("/pastor");return;}
     // Só participantes pessoais ou membros vinculados entram na jornada.
     if(access.individual || access.igreja_id) {
       if(user.user_metadata?.profile!=="male" && user.user_metadata?.profile!=="female") {
         router.replace("/start?profile=1");return;
       }
       router.replace("/");return;
     }
     router.replace("/igreja");
   })();
   return()=>{alive=false};
 },[router]);
 return <main className="min-h-screen flex flex-col justify-center items-center gap-5 bg-bg-main text-text-main p-6">
  <img src="/brand/rota29-logo.svg" width="225" height="70" alt="ROTA29" />
  <p role="status">{error || "Preparando sua experiência…"}</p>
  {error&&<button type="button" className="rounded-xl border border-accent p-3" onClick={()=>window.location.reload()}>Tentar novamente</button>}
 </main>;
}
