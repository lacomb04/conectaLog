type AssetLike = {
  asset_code?: string | null
  name?: string | null
  description?: string | null
  category?: string | null
  status?: string | null
  inventoried?: boolean | null
  license_expiry?: string | null
  next_maintenance_date?: string | null
}

export function normalizeAssetFilter<T extends AssetLike>(
  assets: T[],
  options: {
    term?: string
    category?: string
    status?: string
  },
): T[] {
  const search = options.term?.trim().toLowerCase() || ""
  const category = options.category || "all"
  const status = options.status || "all"

  return assets.filter((asset) => {
    const matchesTerm =
      !search ||
      (asset.asset_code ?? "").toLowerCase().includes(search) ||
      (asset.name ?? "").toLowerCase().includes(search) ||
      (asset.description ? asset.description.toLowerCase().includes(search) : false)
    const matchesCategory = category === "all" || asset.category === category
    const matchesStatus = status === "all" || asset.status === status
    return matchesTerm && matchesCategory && matchesStatus
  })
}

export function buildAssetIndicators(assets: AssetLike[]) {
  const total = assets.length
  const inventoried = assets.filter((item) => Boolean(item.inventoried)).length
  const pendingInventory = total - inventoried
  const today = new Date()
  const in30Days = new Date()
  in30Days.setDate(today.getDate() + 30)

  const expiringLicense = assets.filter((item) => {
    if (!item.license_expiry) return false
    const expiry = new Date(item.license_expiry)
    if (Number.isNaN(expiry.getTime())) return false
    return expiry <= in30Days
  }).length

  const maintenanceDue = assets.filter((item) => {
    if (!item.next_maintenance_date) return false
    const next = new Date(item.next_maintenance_date)
    if (Number.isNaN(next.getTime())) return false
    return next <= today
  }).length

  const obsolete = assets.filter((item) => item.status === "obsoleto").length

  return {
    total,
    inventoried,
    pendingInventory,
    expiringLicense,
    maintenanceDue,
    obsolete,
  }
}
