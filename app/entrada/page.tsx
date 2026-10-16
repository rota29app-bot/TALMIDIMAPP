"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";

export default function Entrada(){
 const router=useRouter();const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  void(async()=>{
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!active)return;
   if(!user){router.replace("/start");return;}
   const [role,policy]=await Promise.all([db.rpc("pilot_my_church"),db.rpc("rota29_pilot_access")]);
   if(!active)return;
   if(role.error||policy.error||!role.data||!policy.data){setError("Falha ao verificar a autorização. Atualize a página.");return;}
   const person=role.data;const access=policy.data;
   if(access.status==="maintenance"){router.replace("/pilot-status");return;}
   if(person.is_admin && access.allowed){router.replace("/admin");return;}
   if(person.role==="pastor"&&person.pilot&&access.allowed){router.replace("/pastor");return;}
   if(person.role==="membro"&&person.igreja_id&&person.pilot&&access.allowed){
    if(!["male","female"].includes(user.user_metadata?.profile)){router.replace("/start?profile=1");return;}
    router.replace("/");return;
   }
   router.replace("/igreja");
  })();
  return()=>{active=false};
 },[router]);
 return <main className="min-h-screen flex items-center justify-center flex-col gap-4 bg-bg-main text-text-main p-6"><img src="/brand/rota29-logo.svg" alt="ROTA29" width="210" height="70"/><p role="status">{error||"Conferindo autorização pastoral…"}</p></main>;
}
