import type { MonthlyStore, ProductItem } from "./timeline-data"

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function mergeList(
  base: ProductItem[] = [],
  mine: ProductItem[] = [],
  theirs: ProductItem[] = []
): ProductItem[] {
  const baseById = new Map(base.map((p) => [p.id, p]))
  const mineById = new Map(mine.map((p) => [p.id, p]))
  const theirsById = new Map(theirs.map((p) => [p.id, p]))

  const pick = (id: string): ProductItem | undefined => {
    const m = mineById.get(id)
    const b = baseById.get(id)
    if (!m) return b ? undefined : theirsById.get(id) // removed here, or added by them
    if (!b || !same(m, b)) return m // added or changed here
    return theirsById.get(id) // untouched here: their copy, or gone if they removed it
  }

  const order = [...theirs.map((p) => p.id), ...mine.map((p) => p.id)]
  const seen = new Set<string>()
  const merged: ProductItem[] = []
  order.forEach((id) => {
    if (seen.has(id)) return
    seen.add(id)
    const item = pick(id)
    if (item) merged.push(item)
  })
  return merged
}

/**
 * Three-way merge of the timeline by month and project id. `base` is what this tab last
 * had from the server. Only what changed here is laid over `theirs`, so two people editing
 * different projects both keep their work; on the same project the later save wins.
 */
export function mergeStores(base: MonthlyStore, mine: MonthlyStore, theirs: MonthlyStore): MonthlyStore {
  const merged: MonthlyStore = {}
  new Set([...Object.keys(theirs), ...Object.keys(mine)]).forEach((month) => {
    const b = base[month]
    const m = mine[month]
    const t = theirs[month]
    if (!m) {
      if (!b && t) merged[month] = t
      return
    }
    if (!t) {
      if (!b || !same(m, b)) merged[month] = m
      return
    }
    merged[month] = {
      ...t,
      asOfText: b && m.asOfText === b.asOfText ? t.asOfText : m.asOfText,
      products: mergeList(b?.products, m.products, t.products),
      enhancements: mergeList(b?.enhancements, m.enhancements, t.enhancements),
    }
  })
  return merged
}
