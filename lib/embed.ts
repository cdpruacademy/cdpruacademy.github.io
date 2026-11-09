// The /embed page shows Timeline and Analytics on another website without a login.
// Its link carries a code (?k=...) that the database checks in embed_data().

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** True for /embed, with or without the base path in front */
export function isEmbedPath(pathname: string): boolean {
  const p = BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname
  return p === "/embed" || p.startsWith("/embed/") || p === "/embed.html"
}

let token: string | null | undefined

/** The link's code on the /embed page ("" when it has none); null on every other page */
export function embedToken(): string | null {
  if (token !== undefined) return token
  if (typeof window === "undefined") return null
  token = isEmbedPath(window.location.pathname) ? new URLSearchParams(window.location.search).get("k") ?? "" : null
  return token
}

export const isEmbedMode = () => embedToken() !== null

/** The link to give the other website */
export function embedUrl(code: string): string {
  const origin = typeof window === "undefined" ? "https://cdpruacademy.github.io" : window.location.origin
  return `${origin}${BASE_PATH}/embed?k=${code}`
}
