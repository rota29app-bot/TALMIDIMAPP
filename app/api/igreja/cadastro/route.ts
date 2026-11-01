import {NextResponse} from "next/server";
import {createClient} from "../../../../utils/supabase/server";

// Mesma origem do ROTA29: evita dependência do envio direto do navegador iOS ao Supabase.
// A função SQL continua sendo a autoridade para autorizar ou recusar cada cadastro.
export async function POST(request: Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin){
  return NextResponse.json({ok:false,message:"Origem do pedido não autorizada."},{status:403});
 }
 let body:Record<string,unknown>;
 try{
  const json:unknown=await request.json();
  if(!json||typeof json!=="object"||Array.isArray(json)){
   return NextResponse.json({ok:false,message:"Dados do formulário inválidos."},{status:400});
  }
  body=json as Record<string,unknown>;
 }catch{
  return NextResponse.json({ok:false,message:"Não foi possível ler o formulário. Tente novamente."},{status:400});
 }
 const text=(value:unknown)=>typeof value==="string"?value.trim():"";
 const nome=text(body.nome),cidade=text(body.cidade),estado=text(body.estado).toUpperCase();
 const pastor=text(body.pastor),contato=text(body.contato);
 const quantidade=body.convidados;
 const aceite=body.aceite===true;
 if(nome.length<4||nome.length>130||!cidade||cidade.length>90||!/^[A-Z]{2}$/.test(estado)
  ||!pastor||pastor.length>130||!contato||contato.length>150
  ||typeof quantidade!=="number"||!Number.isInteger(quantidade)||quantidade<0||quantidade>10||!aceite){
  return NextResponse.json({ok:false,message:"Confira os campos obrigatórios e a autorização institucional."},{status:400});
 }
 try{
  const db=await createClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){
   return NextResponse.json({ok:false,message:"Sua sessão expirou. Abra o ROTA29 no Safari e entre novamente com Google."},{status:401});
  }
  const {error}=await db.rpc("pilot_register_church",{
   p_nome:nome,p_cidade:cidade,p_estado:estado,p_pastor:pastor,
   p_contato:contato,p_convidados:quantidade,p_aceite:aceite
  });
  if(error){
   // A regra institucional segue no banco. Não há bypass de igreja nem de aprovação.
   console.warn("ROTA29: cadastro da igreja recusado",{code:error.code});
   return NextResponse.json({ok:false,message:error.message||"Cadastro não autorizado."},{status:400});
  }
  return NextResponse.json({ok:true,message:"Cadastro recebido. Aguarde a aprovação da coordenação."},{headers:{"Cache-Control":"no-store"}});
 }catch{
  console.error("ROTA29: falha inesperada ao processar cadastro de igreja.");
  return NextResponse.json({ok:false,message:"Não foi possível concluir o cadastro. Tente novamente. Se persistir, informe a coordenação."},{status:503});
 }
}
