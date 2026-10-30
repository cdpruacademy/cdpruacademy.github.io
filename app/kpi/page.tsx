import { KpiView } from "@/components/kpi/kpi-view"

// Not in the menu; the owner opens /kpi directly
export const metadata = {
  title: "KPI | Prudential Thailand",
  robots: { index: false, follow: false },
}

export default function KpiPage() {
  return <KpiView />
}
