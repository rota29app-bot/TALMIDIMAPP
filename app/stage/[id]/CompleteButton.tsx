"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stageOrder } from "../../data";
import { createClient } from "../../../utils/supabase/client";
export default function CompleteButton({ id, dayIndex, canComplete = true }:{
 id:string; dayIndex:number; canComplete?:boolean;
}) {
 const router=useRouter();
 const [saving,setSaving]=useState(false);
 const complete=async()=>{
  const index=stageOrder.indexOf(id);
  if(!canComplete||saving||index<0||(id!=="house"&&dayIndex>7))return;
  setSaving(true);
  try{
   const {data,error}=await createClient().rpc("pilot_complete_day",{p_stage:id,p_day:dayIndex});
   if(error)throw error;
   localStorage.setItem("talmidim-day-"+id,String(data.day_index));
   if(data.milestone)localStorage.setItem("talmidim-progress",String(index+1));
   router.push(data.first_badge?"/congratulations?stage=house":data.milestone?"/marco?stage="+id:"/");
  }catch(e){
   const message=e&&typeof e==="object"&&"message" in e?String(e.message):"Tente novamente.";
   alert("Não foi possível registrar o dia: "+message);
  }finally{setSaving(false);}
 };
 return <div className="flex flex-col items-center w-full">
  <button onClick={()=>void complete()} disabled={saving||!canComplete} className={"w-3/4 max-w-[250px] py-3 rounded-xl font-bold text-lg shadow-md transition-all duration-300 "+(!canComplete?"bg-[#c69c6d]/30 text-white/60 cursor-not-allowed":"bg-[#c69c6d] text-white active:scale-95")}>{saving?"Salvando…":"Concluir"}</button>
  <p className="text-[13px] font-medium text-[#1a202c]/70 text-center mt-3">Um dia de cada vez. Não avance sem praticar.</p>
 </div>;
}
