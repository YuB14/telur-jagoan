"use client";

import { useEffect } from "react";

export function ReceiptAutoPrint() {
  useEffect(() => {
    window.print();
  }, []);

  return null;
}
