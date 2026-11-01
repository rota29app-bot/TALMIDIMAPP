import { ImageResponse } from "next/og";

const symbol = "M113 12C110 3 96 4 81 5C62 5 42 15 24 26C44 18 76 8 100 13C115 15 86 26 68 41C51 54 61 61 87 61C101 61 115 59 126 58C114 56 101 60 85 57C72 55 66 53 75 45C87 33 111 20 113 12ZM101 18C77 20 41 33 18 53C9 60 8 67 11 72C13 76 16 75 16 70C17 53 47 34 101 18Z";

export function Rota29Icon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rota29-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#153F37" />
        <stop offset="1" stopColor="#09231F" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="112" fill="url(#rota29-grad)" />
    <g transform="translate(32 143) scale(3.05)" fill="#F8F5F0" fillRule="evenodd">
      <path d={symbol} />
      <circle cx="133" cy="57" r="5.8" fill="#C79A5B"/>
    </g>
  </svg>;
}

export function renderIcon(size: number) {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <Rota29Icon size={size}/>
    </div>, {width:size,height:size});
}
