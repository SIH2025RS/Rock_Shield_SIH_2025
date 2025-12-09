import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LowLiteracyContext = createContext({ enabled: false, toggle: () => {} });

export function LowLiteracyProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const v = localStorage.getItem("rs_low_literacy");
      return v === "1";
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem("rs_low_literacy", enabled ? "1" : "0");
    } catch {}
    try {
      const cls = "low-literacy";
      if (enabled) document.documentElement.classList.add(cls);
      else document.documentElement.classList.remove(cls);
    } catch {}
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      toggle: () => setEnabled((v) => !v),
      setEnabled,
    }),
    [enabled]
  );

  return (
    <LowLiteracyContext.Provider value={value}>
      {children}
    </LowLiteracyContext.Provider>
  );
}

export function useLowLiteracy() {
  return useContext(LowLiteracyContext);
}
