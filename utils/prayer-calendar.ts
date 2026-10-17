// O aviso recorrente fica por conta do calendário do aparelho, não do PWA.
export function savePrayerCalendarReminder(time:string,timeZone:string){
 const portions=time.split(":").map(Number);
 if(portions.length!==2||!Number.isInteger(portions[0])||!Number.isInteger(portions[1])
   ||portions[0]<0||portions[0]>23||portions[1]<0||portions[1]>59){
  throw new Error("Horário inválido.");
 }
 const formatter=new Intl.DateTimeFormat("en-GB",{
  timeZone,year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 });
 const parts=Object.fromEntries(formatter.formatToParts(new Date())
   .filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 const localNow=Number(parts.hour)*60+Number(parts.minute);
 const selected=portions[0]*60+portions[1];
 const startDay=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,
  Number(parts.day)+(localNow>=selected?1:0)));
 const pad=(n:number)=>String(n).padStart(2,"0");
 const day=`${startDay.getUTCFullYear()}${pad(startDay.getUTCMonth()+1)}${pad(startDay.getUTCDate())}`;
 const start=`${day}T${pad(portions[0])}${pad(portions[1])}00`;
 const nowStamp=new Date().toISOString();
 const stamp=nowStamp.slice(0,19).replaceAll("-","").replaceAll(":","")+"Z";
 const uid=`rota29-${stamp}-${pad(portions[0])}${pad(portions[1])}@rota29.app`;
 const rows=[
  "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ROTA29//Rotina de Oracao//PT-BR",
  "CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
  `UID:${uid}`,`DTSTAMP:${stamp}`,`DTSTART;TZID=${timeZone}:${start}`,
  "DURATION:PT15M","RRULE:FREQ=DAILY;COUNT=21",
  "SUMMARY:ROTA29 - Meu horario de oracao",
  "DESCRIPTION:Tempo diario com Deus. Confira a etapa liberada no ROTA29.",
  "BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:PT0M",
  "DESCRIPTION:Hora do seu momento de oracao - ROTA29",
  "END:VALARM","END:VEVENT","END:VCALENDAR",""
 ];
 const ical=rows.join(String.fromCharCode(13,10));
 const url=URL.createObjectURL(new Blob([ical],{type:"text/calendar;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="rota29-lembrar-oracao.ics";
 document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),5000);
}
