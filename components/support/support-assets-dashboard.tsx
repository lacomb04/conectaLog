"use client"

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react"
import type { Asset, User } from "@/lib/types"
import { buildAssetIndicators, normalizeAssetFilter } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { AlertCircle, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { Input } from "@components/ui/input"
import { Badge } from "@components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"

interface SupportAssetsDashboardProps {
  assignedAssets: Asset[]
  currentUser: User | null
}

const assetCategoryLabels: Record<string, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Rede",
  peripherals: "Periféricos",
  licenses: "Licenças",
  mobile: "Dispositivos móveis",
}

const assetStatusMeta: Record<string, { label: string; className: string }> = {
  "em uso": {
    label: "Em uso",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  "em manutenção": {
    label: "Em manutenção",
    className: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  planejado: {
    label: "Planejado",
    className: "bg-sky-500/10 text-sky-700 border-sky-200",
  },
  obsoleto: {
    label: "Obsoleto",
    className: "bg-rose-500/10 text-rose-700 border-rose-200",
  },
}

export function SupportAssetsDashboard({ assignedAssets, currentUser }: SupportAssetsDashboardProps) {
  const supabase = getSupabaseBrowserClient()
  const [trackedAssets, setTrackedAssets] = useState<Asset[]>(() => assignedAssets ?? [])
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("all")
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all")
  const [assetSearch, setAssetSearch] = useState<string>("")

  const formatAssetDate = useCallback((value?: string | null) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "—"
    return new Intl.DateTimeFormat("pt-BR").format(parsed)
  }, [])

  const sortAssets = useCallback((list: Asset[]) => {
    return [...list].sort((a, b) => {
      const categoryCompare = (a.category || "").localeCompare(b.category || "")
      if (categoryCompare !== 0) return categoryCompare
      return a.name.localeCompare(b.name)
    })
  }, [])

  const upsertTrackedAsset = useCallback(
    (asset: Asset) => {
      setTrackedAssets((prev) => {
        const index = prev.findIndex((item) => item.id === asset.id)
        if (index >= 0) {
          const next = [...prev]
          next[index] = asset
          return sortAssets(next)
        }
        return sortAssets([...prev, asset])
      })
    },
    [sortAssets],
  )

  const removeTrackedAsset = useCallback((assetId: string) => {
    setTrackedAssets((prev) => prev.filter((asset) => asset.id !== assetId))
  }, [])

  const nextActionLabel = useCallback(
    (asset: Asset) => {
      if (asset.license_expiry) {
        return `Renovar licença até ${formatAssetDate(asset.license_expiry)}`
      }
      if (asset.next_maintenance_date) {
        return `Planejar manutenção em ${formatAssetDate(asset.next_maintenance_date)}`
      }
      if (asset.last_maintenance_date) {
        return `Última manutenção em ${formatAssetDate(asset.last_maintenance_date)}`
      }
      return "Nenhuma ação futura registrada"
    },
    [formatAssetDate],
  )

  const filteredAssets = useMemo(
    () =>
      normalizeAssetFilter(trackedAssets, {
        term: assetSearch,
        category: assetCategoryFilter,
        status: assetStatusFilter,
      }),
    [trackedAssets, assetCategoryFilter, assetStatusFilter, assetSearch],
  )

  useEffect(() => {
    setTrackedAssets(sortAssets(assignedAssets ?? []))
  }, [assignedAssets, sortAssets])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const channel = supabase
      .channel(`assets-owner-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assets",
        },
        async (payload: any) => {
          const newOwner = payload.new?.support_owner ?? null
          const previousOwner = payload.old?.support_owner ?? null

          if (payload.eventType === "DELETE") {
            if (payload.old?.id && previousOwner === currentUser.id) {
              removeTrackedAsset(payload.old.id as string)
            }
            return
          }

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (newOwner === currentUser.id) {
              const { data, error } = await supabase
                .from("assets")
                .select(
                  "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)",
                )
                .eq("id", payload.new?.id)
                .maybeSingle()

              if (error) {
                console.warn("[support-assets] Falha ao sincronizar ativo:", error.message)
                return
              }

              if (data) {
                upsertTrackedAsset(data as Asset)
              }
            } else if (previousOwner === currentUser.id && payload.new?.id) {
              removeTrackedAsset(payload.new.id as string)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUser, removeTrackedAsset, upsertTrackedAsset])

  const assetsStats = useMemo(() => buildAssetIndicators(filteredAssets), [filteredAssets])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ativos de TI atribuídos</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe inventário, status operacional e próximos passos dos ativos que estão sob sua responsabilidade.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativos atribuídos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventariados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.inventoried}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Licenças a vencer</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.expiringLicense}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Obsoletos / manutenção</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.obsolete + assetsStats.maintenanceDue}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventário sob responsabilidade</CardTitle>
          <CardDescription>Filtre rapidamente por categoria, status ou palavra-chave.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="asset-search" className="mb-1 block text-xs font-medium text-muted-foreground">
                Buscar
              </label>
              <Input
                id="asset-search"
                placeholder="Código, ativo ou palavra-chave"
                value={assetSearch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setAssetSearch(event.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="asset-category" className="mb-1 block text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <Select value={assetCategoryFilter} onValueChange={setAssetCategoryFilter}>
                <SelectTrigger id="asset-category">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="network">Rede</SelectItem>
                  <SelectItem value="peripherals">Periféricos</SelectItem>
                  <SelectItem value="licenses">Licenças</SelectItem>
                  <SelectItem value="mobile">Dispositivos móveis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label htmlFor="asset-status" className="mb-1 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
                <SelectTrigger id="asset-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="em uso">Em uso</SelectItem>
                  <SelectItem value="em manutenção">Em manutenção</SelectItem>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="obsoleto">Obsoleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ativo atribuído a você no momento.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground md:text-sm">
                <span>Total: {assetsStats.total}</span>
                <span>Inventariados: {assetsStats.inventoried}</span>
                <span>Pendentes: {assetsStats.pendingInventory}</span>
              </div>
              <div className="space-y-3">
                {filteredAssets.map((asset: Asset) => {
                  const statusMeta =
                    assetStatusMeta[asset.status] ?? {
                      label: asset.status,
                      className: "bg-slate-500/10 text-slate-700 border-slate-200",
                    }
                  const inventoryBadgeClass = asset.inventoried
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                    : "bg-amber-500/10 text-amber-700 border-amber-200"

                  return (
                    <div
                      key={asset.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold md:text-base">
                          {asset.asset_code} • {asset.name}
                        </p>
                        <p className="text-xs text-muted-foreground md:text-sm">
                          {assetCategoryLabels[asset.category] ?? asset.category}
                          {asset.location ? ` • ${asset.location}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Badge variant="outline" className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                        <Badge variant="outline" className={inventoryBadgeClass}>
                          {asset.inventoried ? "Inventariado" : "Inventário pendente"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground md:text-right md:text-sm">
                        <p>{nextActionLabel(asset)}</p>
                        {asset.warranty_expires_at && (
                          <p>Garantia: {formatAssetDate(asset.warranty_expires_at)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
