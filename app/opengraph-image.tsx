import { ImageResponse } from "next/og";
import { Rota29Icon } from "../utils/rota29-icon";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Exatamente o ÍCONE VERDE utilizado na instalação do PWA.
// Sem selo em areia, sem logo horizontal, sem outros elementos decorativos.
export default function Image() {
 return new ImageResponse(
   <div style={{display:"flex",width:"100%",height:"100%",alignItems:"center",
       justifyContent:"center",background:"#E9DFCE"}}>
     <div style={{display:"flex",alignItems:"center",justifyContent:"center",
        background:"#0F3D33",padding:24,borderRadius:128}}>
       <Rota29Icon size={510} />
     </div>
   </div>,size);
}
