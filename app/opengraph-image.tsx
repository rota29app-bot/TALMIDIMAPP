import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const path = "M113 12C110 3 96 4 81 5C62 5 42 15 24 26C44 18 76 8 100 13C115 15 86 26 68 41C51 54 61 61 87 61C101 61 115 59 126 58C114 56 101 60 85 57C72 55 66 53 75 45C87 33 111 20 113 12ZM101 18C77 20 41 33 18 53C9 60 8 67 11 72C13 76 16 75 16 70C17 53 47 34 101 18Z";

export default function Image() {
  return new ImageResponse(
    <div style={{
      display: "flex", width: "100%", height: "100%",
      alignItems: "center", justifyContent: "center", flexDirection: "column",
      background: "linear-gradient(135deg, #FBF8F1 0%, #E9DFCE 100%)",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
        background: "#FFFEFA", borderRadius: 42, padding: "50px 60px",
        border: "2px solid #D7CDBB" }}>
        <svg viewBox="0 0 164 100" width="240" height="155">
          <path d={path} fill="#0F3D33" fillRule="evenodd" />
          <circle cx="133" cy="57" r="5.8" fill="#C79A5B"/>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 22 }}>
          <div style={{ display: "flex", fontSize: 108, fontWeight: 900,
            letterSpacing: -6, alignItems: "center" }}>
            <span style={{ color: "#0F3D33" }}>ROTA</span>
            <span style={{ color: "#C79A5B" }}>29</span>
          </div>
          <div style={{ display: "flex", color: "#2E2E2E", fontSize: 24,
            letterSpacing: 5 }}>Discipulado no cotidiano</div>
        </div>
      </div>
      <div style={{ display: "flex", color: "#0F3D33", marginTop: 42,
        fontSize: 23, letterSpacing: 7, fontWeight: 600 }}>SUA JORNADA CONTINUA</div>
    </div>, size);
}
