import { clsx, type ClassValue } from 'clsx'
import type { Asset } from '@/lib/types'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeAssetFilter(
  assets: Asset[],
  options: {
    term?: string
    category?: string
    status?: string
  },
): Asset[] {
  const search = options.term?.trim().toLowerCase() || ""
  const category = options.category || "all"
  const status = options.status || "all"

  return assets.filter((asset) => {
    const matchesTerm =
      !search ||
      asset.asset_code.toLowerCase().includes(search) ||
      asset.name.toLowerCase().includes(search) ||
      (asset.description ? asset.description.toLowerCase().includes(search) : false)
    const matchesCategory = category === "all" || asset.category === category
    const matchesStatus = status === "all" || asset.status === status
    return matchesTerm && matchesCategory && matchesStatus
  })
}

export function buildAssetIndicators(assets: Asset[]) {
  const total = assets.length
  const inventoried = assets.filter((item) => item.inventoried).length
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
