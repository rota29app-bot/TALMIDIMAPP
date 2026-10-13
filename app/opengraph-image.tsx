import { ImageResponse } from "next/og";
import { Rota29Icon } from "../utils/rota29-icon";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A prévia de WhatsApp usa apenas o ícone verde oficial ROTA29.
export default function Image() {
  return new ImageResponse(
    <div style={{
      width:"100%",height:"100%",display:"flex",
      alignItems:"center",justifyContent:"center",
      background:"#0F3D33"
    }}>
      <Rota29Icon size={520} />
    </div>,size);
}
