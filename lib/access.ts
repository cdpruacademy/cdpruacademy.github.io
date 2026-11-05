export type Role = "superadmin" | "editor" | "viewer"

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Superadmin",
  editor: "Editor",
  viewer: "Viewer",
}

/** Which optional tabs each role sees; a superadmin always sees everything */
export interface TabAccess {
  editor: string[]
  viewer: string[]
}

export const DEFAULT_TAB_ACCESS: TabAccess = {
  editor: ["/analytics", "/announcements", "/partners"],
  viewer: ["/analytics", "/announcements"],
}

/** Tabs a superadmin can turn on or off, and for whom. Partners has no read-only view. */
export const OPTIONAL_TABS: { href: string; label: string; roles: ("editor" | "viewer")[] }[] = [
  { href: "/analytics", label: "Analytics", roles: ["editor", "viewer"] },
  { href: "/announcements", label: "Announcements", roles: ["editor", "viewer"] },
  { href: "/partners", label: "Partners", roles: ["editor"] },
]

/** The tab a page belongs to: "/analytics/" and "/analytics" are both "/analytics" */
export const tabOfPath = (pathname: string) => `/${pathname.split("/").filter(Boolean)[0] ?? ""}`

/** For people who are signed in. Pages decide for themselves what someone signed out sees. */
export function canViewTab(href: string, role: Role, tabs: TabAccess): boolean {
  if (role === "superadmin" || href === "/") return true
  if (href === "/kpi" || href === "/users") return false
  return tabs[role].includes(href)
}
