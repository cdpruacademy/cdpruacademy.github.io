import { UsersView } from "@/components/users/users-view"

// In the menu for superadmins only
export const metadata = {
  title: "Users | Prudential Thailand",
  robots: { index: false, follow: false },
}

export default function UsersPage() {
  return <UsersView />
}
