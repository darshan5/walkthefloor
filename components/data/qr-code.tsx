"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRCodeSVG({ value, size = 120 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    QRCode.toString(value, { type: "svg", width: size, margin: 1 })
      .then(setSvg)
      .catch(() => {});
  }, [value, size]);

  if (!svg) return null;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
