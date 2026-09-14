"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (tab: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue = "config",
  value,
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (tab: string) => {
    if (onValueChange) {
      onValueChange(tab);
    }
    setInternalTab(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 bg-dark-900/90 border border-dark-800/90 rounded-2xl overflow-x-auto scrollbar-none shadow-inner ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const isActive = ctx.activeTab === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setActiveTab(value)}
      className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 active:scale-[0.97] cursor-pointer min-h-[38px] flex items-center justify-center ${
        isActive
          ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20 border border-white/10"
          : "text-dark-400 hover:text-white hover:bg-dark-800/80 border border-transparent"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.activeTab !== value) return null;
  return <div className="py-4 animate-in">{children}</div>;
}

