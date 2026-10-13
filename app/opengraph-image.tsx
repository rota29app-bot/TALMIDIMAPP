import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
 return new ImageResponse(
  <div style={{display:"flex",height:"100%",width:"100%",background:"linear-gradient(140deg,#071e1a,#0F3D33 53%,#224D40)",color:"#F8F5F0",fontFamily:"Arial, sans-serif",position:"relative",overflow:"hidden"}}>
   <div style={{position:"absolute",right:-65,top:-160,width:560,height:560,border:"2px solid rgba(199,154,91,.23)",borderRadius:"50%"}}/>
   <div style={{position:"absolute",right:80,bottom:-320,width:680,height:680,border:"2px solid rgba(199,154,91,.26)",borderRadius:"50%"}}/>
   <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"72px 90px",zIndex:1}}>
    <div style={{fontSize:27,fontWeight:600,letterSpacing:10,color:"#C79A5B",marginBottom:34}}>O CAMINHO CONTINUA</div>
    <div style={{display:"flex",alignItems:"baseline",fontWeight:900,fontSize:150,letterSpacing:-8}}>
     <span>ROTA</span><span style={{color:"#C79A5B"}}>29</span>
    </div>
    <div style={{fontSize:33,letterSpacing:6,marginTop:10}}>Discipulado no cotidiano</div>
    <div style={{width:100,height:5,background:"#C79A5B",marginTop:44}}/>
   </div>
  </div>,size);
}