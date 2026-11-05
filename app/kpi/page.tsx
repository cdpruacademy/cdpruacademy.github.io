import { KpiView } from "@/components/kpi/kpi-view"

// In the menu for superadmins only
export const metadata = {
  title: "KPI | Prudential Thailand",
  robots: { index: false, follow: false },
}

export default function KpiPage() {
  return <KpiView />
}
