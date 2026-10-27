"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  ProductItem,
  PHASES,
  PhaseKey,
  MilestoneStatus,
  TimelineType,
} from "@/lib/timeline-data"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PruIcon, type PruIconName } from "@/components/pru-icon"
import { resolveBrokerColor } from "@/lib/broker-colors"
import {
  X,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Clock,
  Sparkles,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"

type PhaseState = "todo" | "current" | "done"

const PHASE_STATES: {
  key: PhaseState
  label: string
  icon: PruIconName
  selectedClass: string
}[] = [
  {
    key: "todo",
    label: "ยังไม่ถึง",
    icon: "clock",
    selectedClass:
      "bg-surface text-ink outline-2 -outline-offset-2 outline-ink",
  },
  {
    key: "current",
    label: "ตอนนี้",
    icon: "pin",
    selectedClass:
      "bg-pru-red-soft text-brand-ink outline-2 -outline-offset-2 outline-pru-red",
  },
  {
    key: "done",
    label: "เสร็จแล้ว",
    icon: "check",
    selectedClass: "bg-ink text-white",
  },
]

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  timelineType?: TimelineType
  selectedMonth?: string
  productToEdit?: ProductItem | null
  onSave: (product: Omit<ProductItem, "id">, id?: string) => void
  onDelete?: (id: string) => void
  teamMembers?: string[]
  availableBrokers?: Record<string, string>
}

const DEFAULT_BROKER_OPTIONS = [
  { value: "ttb", label: "ttb", color: "#009FE3" },
  { value: "ttb touch", label: "ttb touch", color: "#009FE3" },
  { value: "UOB", label: "UOB", color: "#0B2265" },
  { value: "Agency", label: "Agency (Prudential)", color: "#ED1C24" },
  { value: "Audit", label: "Audit", color: "#1E293B" },
  { value: "New Broker", label: "New Broker", color: "#334155" },
]

const DEFAULT_MEMBERS = [
  "Jirapat O.",
  "Sakkarin S.",
  "Nitikan B.",
  "Surakit P.",
]

const THAI_NAME_MAP: Record<string, string> = {
  "Jirapat O.": "จิรภัทร",
  "Sakkarin S.": "ศักรินทร์",
  "Nitikan B.": "นิติกานต์",
  "Surakit P.": "สุรกิจ",
}

export function ProductFormModal({
  isOpen,
  onClose,
  timelineType = "product",
  selectedMonth = "AUG 2026",
  productToEdit,
  onSave,
  onDelete,
  teamMembers,
  availableBrokers,
}: ProductFormModalProps) {
  const isEnhancement = timelineType === "enhancement"

  // Build dynamic broker list from availableBrokers or fallback
  const brokerOptions = React.useMemo(() => {
    let list: { value: string; label: string; color: string }[] = []
    if (availableBrokers && Object.keys(availableBrokers).length > 0) {
      list = Object.entries(availableBrokers).map(([key, color]) => ({
        value: key,
        label: key,
        color: color,
      }))
    } else {
      list = [...DEFAULT_BROKER_OPTIONS]
    }
    // If productToEdit has a broker that's not in the list and not "Other", add it
    if (
      productToEdit?.broker &&
      productToEdit.broker !== "Other" &&
      !list.some(
        (b) => b.value.toLowerCase() === productToEdit.broker.toLowerCase()
      )
    ) {
      list.push({
        value: productToEdit.broker,
        label: productToEdit.broker,
        color: resolveBrokerColor(productToEdit.broker, availableBrokers),
      })
    }
    list.push({ value: "Other", label: "อื่นๆ (ระบุเอง)", color: "#64748B" })
    return list
  }, [availableBrokers, productToEdit?.broker])

  const effectiveMembers =
    teamMembers && teamMembers.length > 0 ? teamMembers : DEFAULT_MEMBERS
  const teamOwnersList = effectiveMembers.map((m) => ({
    id: m,
    label: THAI_NAME_MAP[m] ? `${m} (${THAI_NAME_MAP[m]})` : m,
  }))

  const [broker, setBroker] = useState<string>(() => {
    if (productToEdit?.broker) {
      const bTrim = productToEdit.broker.trim()
      const known = brokerOptions.find(
        (b) => b.value.toLowerCase().trim() === bTrim.toLowerCase()
      )
      if (known && known.value !== "Other") return known.value
      if (bTrim && bTrim !== "Other") return bTrim
    }
    try {
      const last = localStorage.getItem("pru_last_used_broker")
      if (last) {
        const found = brokerOptions.find(
          (b) => b.value.toLowerCase().trim() === last.toLowerCase().trim()
        )
        if (found && found.value !== "Other") return found.value
      }
    } catch (_) {}
    return isEnhancement ? "ttb" : "New Broker"
  })

  const [customBroker, setCustomBroker] = useState<string>(() => {
    if (productToEdit?.broker) {
      const bTrim = productToEdit.broker.trim()
      const known = brokerOptions.find(
        (b) => b.value.toLowerCase().trim() === bTrim.toLowerCase()
      )
      if (known && known.value !== "Other") return ""
      return bTrim === "Other" ? "" : bTrim
    }
    return ""
  })

  const [name, setName] = useState<string>(() => productToEdit?.name || "")
  const [selectedOwners, setSelectedOwners] = useState<string[]>([])
  const [customOwner, setCustomOwner] = useState<string>("")
  const [internalDate, setInternalDate] = useState<string>(
    () => productToEdit?.internalDate || "TBC"
  )
  const [commercialDate, setCommercialDate] = useState<string>(
    () => productToEdit?.commercialDate || "TBC"
  )
  const [csDate, setCsDate] = useState<string>(
    () => productToEdit?.csDate || ""
  )
  const [customRightLabel, setCustomRightLabel] = useState<string>(
    () => productToEdit?.customRightLabel || ""
  )

  interface MilestoneFormState {
    enabled: boolean
    date: string
    status: MilestoneStatus
    isElearningIcon: boolean
  }

  const createInitialMilestones = (): Record<PhaseKey, MilestoneFormState> => ({
    "kick-off": {
      enabled: true,
      date: "",
      status: "completed",
      isElearningIcon: false,
    },
    "first-draft": {
      enabled: false,
      date: "",
      status: "pending",
      isElearningIcon: false,
    },
    "first-draft-elearning": {
      enabled: false,
      date: "",
      status: "pending",
      isElearningIcon: false,
    },
    "final-approval": {
      enabled: false,
      date: "",
      status: "pending",
      isElearningIcon: false,
    },
    "final-elearning": {
      enabled: false,
      date: "",
      status: "pending",
      isElearningIcon: false,
    },
    "internal-training": {
      enabled: false,
      date: "",
      status: "pending",
      isElearningIcon: false,
    },
    launch: {
      enabled: false,
      date: "",
      status: "pending",
      isElearningIcon: false,
    },
  })

  const [milestonesState, setMilestonesState] = useState<
    Record<PhaseKey, MilestoneFormState>
  >(createInitialMilestones())

  const [errors, setErrors] = useState<{ name?: string; owner?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (productToEdit) {
      const bTrim = (productToEdit.broker || "").trim()
      const knownBroker = brokerOptions.find(
        (b) => b.value.toLowerCase().trim() === bTrim.toLowerCase()
      )
      if (knownBroker && knownBroker.value !== "Other") {
        setBroker(knownBroker.value)
        setCustomBroker("")
      } else if (bTrim) {
        if (bTrim === "Other") {
          setBroker("Other")
          setCustomBroker("")
        } else {
          const match = brokerOptions.find(
            (b) => b.value.toLowerCase().trim() === bTrim.toLowerCase()
          )
          if (match && match.value !== "Other") {
            setBroker(match.value)
            setCustomBroker("")
          } else {
            setBroker("Other")
            setCustomBroker(bTrim)
          }
        }
      } else {
        setBroker(isEnhancement ? "ttb" : "New Broker")
        setCustomBroker("")
      }
      setName(productToEdit.name)

      // Parse owners (e.g. "Nitikan B. / Surakit P." or "Surakit P.")
      const rawOwner = productToEdit.owner || ""
      const splitOwners = rawOwner
        .split(/[\/,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      const matchedKnown: string[] = []
      const leftoverCustom: string[] = []

      splitOwners.forEach((own) => {
        const found = teamOwnersList.find(
          (t) =>
            t.id.toLowerCase() === own.toLowerCase() ||
            t.id.toLowerCase().includes(own.toLowerCase())
        )
        if (found) {
          if (!matchedKnown.includes(found.id)) matchedKnown.push(found.id)
        } else {
          leftoverCustom.push(own)
        }
      })

      setSelectedOwners(matchedKnown)
      setCustomOwner(leftoverCustom.join(", "))

      setInternalDate(productToEdit.internalDate || "TBC")
      setCommercialDate(productToEdit.commercialDate || "TBC")
      setCsDate(productToEdit.csDate || "")
      setCustomRightLabel(productToEdit.customRightLabel || "")

      // Find which phase has the active monitor icon (ensure only 1 active)
      let activePhaseKey: PhaseKey | null = null
      const reversedPhases = [...PHASES].reverse()
      for (const p of reversedPhases) {
        if (productToEdit.milestones[p.key]?.isElearningIcon) {
          activePhaseKey = p.key
          break
        }
      }

      const nextMState: Record<PhaseKey, MilestoneFormState> =
        createInitialMilestones()
      PHASES.forEach((p) => {
        const existing = productToEdit.milestones[p.key]
        if (existing) {
          nextMState[p.key] = {
            enabled: true,
            date: existing.date || "",
            status: existing.status || "completed",
            isElearningIcon: activePhaseKey === p.key,
          }
        } else {
          nextMState[p.key] = {
            enabled: false,
            date: "",
            status: "pending",
            isElearningIcon: false,
          }
        }
      })
      setMilestonesState(nextMState)
    } else {
      let defaultB = isEnhancement ? "ttb" : "New Broker"
      try {
        const last = localStorage.getItem("pru_last_used_broker")
        if (last) {
          const match = brokerOptions.find(
            (b) => b.value.toLowerCase().trim() === last.toLowerCase().trim()
          )
          if (match && match.value !== "Other") defaultB = match.value
        }
      } catch (_) {}
      setBroker(defaultB)
      setCustomBroker("")
      setName("")
      setSelectedOwners([])
      setCustomOwner("")
      setInternalDate("TBC")
      setCommercialDate("TBC")
      setCsDate("")
      setCustomRightLabel("")
      setMilestonesState(createInitialMilestones())
    }
    setErrors({})
    setIsSubmitting(false)
  }, [productToEdit, isOpen, isEnhancement, brokerOptions])

  // One choice per phase. "ตอนนี้" is the isElearningIcon flag (one phase at most);
  // choosing it marks earlier phases in use as completed and later ones as pending.
  const setPhaseState = (phaseKey: PhaseKey, state: PhaseState) => {
    setMilestonesState((prev) => {
      const next = { ...prev }
      const target = PHASES.findIndex((p) => p.key === phaseKey)
      PHASES.forEach((p, i) => {
        const ms = next[p.key]
        if (!ms) return
        if (p.key === phaseKey) {
          next[p.key] = {
            ...ms,
            status: state === "done" ? "completed" : "pending",
            isElearningIcon: state === "current",
          }
        } else if (state === "current") {
          next[p.key] = {
            ...ms,
            isElearningIcon: false,
            // Earlier phases are finished, later ones not started yet
            status: !ms.enabled
              ? ms.status
              : i < target
                ? "completed"
                : "pending",
          }
        }
      })
      return next
    })
  }

  const dialogRef = useDialogA11y(isOpen, onClose)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { name?: string; owner?: string } = {}
    if (!name.trim()) newErrors.name = "กรุณาระบุชื่องาน"

    const allOwners: string[] = [...selectedOwners]
    if (customOwner.trim()) {
      allOwners.push(customOwner.trim())
    }
    const finalOwner = allOwners.join(" / ")

    if (!finalOwner) newErrors.owner = "กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 ท่าน"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const finalBroker =
        broker === "Other" ? customBroker.trim() || "Other" : broker
      try {
        if (finalBroker && finalBroker !== "Other") {
          localStorage.setItem("pru_last_used_broker", finalBroker)
        }
      } catch (_) {}

      const builtMilestones: Record<string, any> = {}
      PHASES.forEach((p) => {
        const state = milestonesState[p.key]
        if (state.enabled) {
          builtMilestones[p.key] = {
            date: state.date.trim() || undefined,
            status: state.status,
            isElearningIcon: state.isElearningIcon || undefined,
          }
        }
      })

      const payload: Omit<ProductItem, "id"> = {
        broker: finalBroker,
        name: name.trim(),
        owner: finalOwner,
        internalDate: internalDate.trim() || undefined,
        commercialDate: commercialDate.trim() || undefined,
        csDate: csDate.trim() || undefined,
        customRightLabel: customRightLabel.trim() || undefined,
        milestones: builtMilestones,
        month: selectedMonth,
      }

      onSave(payload, productToEdit?.id)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (productToEdit && onDelete) {
      onDelete(productToEdit.id)
      onClose()
    }
  }

  const currentBrokerObj = React.useMemo(() => {
    if (broker === "Other") {
      return {
        value: "Other",
        label: customBroker ? `${customBroker}` : "อื่นๆ (ระบุเอง)",
        color: resolveBrokerColor(customBroker, availableBrokers) || "#64748B",
      }
    }
    const found = brokerOptions.find(
      (b) =>
        b.value.toLowerCase().trim() === (broker || "").toLowerCase().trim()
    )
    if (found) return found
    return {
      value: broker,
      label: broker,
      color: resolveBrokerColor(broker, availableBrokers) || "#64748B",
    }
  }, [broker, customBroker, brokerOptions, availableBrokers])

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Soft translucent backdrop for desktop (no blur so timeline remains readable) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/20 transition-opacity duration-200 sm:bg-slate-950/25"
        aria-hidden="true"
      />

      {/* Right-docked slide-over container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="flex h-full w-screen max-w-full flex-col border-l border-gray-200 bg-white shadow-2xl sm:max-w-xl lg:max-w-[620px]"
        >
          {/* Sticky Header */}
          <div className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3.5 backdrop-blur-xs sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <div
                style={{
                  backgroundColor: isEnhancement ? "#0066CC" : "#ED1C24",
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs sm:h-10 sm:w-10"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="product-form-title"
                    className="text-base leading-tight font-bold text-gray-900 sm:text-lg"
                  >
                    {productToEdit ? "แก้ไขข้อมูลรายการ" : "เพิ่มรายการใหม่"}
                  </h2>
                  <Badge
                    variant={isEnhancement ? "secondary" : "default"}
                    className="text-xs"
                  >
                    {isEnhancement ? "Enhancement" : "New Product"}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-gray-600">
                    {selectedMonth}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  กรอกข้อมูลกำหนดการและ Milestone เพื่อแสดงผลบน Dashboard
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content (Scrollable Body) */}
          <form
            id="product-panel-form"
            onSubmit={handleSubmit}
            className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6"
          >
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-700 uppercase">
                <Layers className="h-3.5 w-3.5 text-brand-ink" />
                <span>1. ข้อมูลพื้นฐาน (Basic Information)</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Product Name -> ชื่องาน (Task Name) */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label required>ชื่องาน (Task Name)</Label>
                  <Input
                    placeholder="เช่น PRUWealth Max, Rider Cancer Plus"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={!!errors.name}
                    clearable
                    onClear={() => setName("")}
                  />
                  {errors.name && (
                    <p className="text-xs font-medium text-brand-ink">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Broker / Partner Select (Single dot) */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label required>
                    ช่องทาง / พาร์ทเนอร์ (Channel / Broker)
                  </Label>
                  <Select
                    value={broker}
                    onValueChange={(val) => {
                      setBroker(val)
                      if (val !== "Other") {
                        setCustomBroker("")
                        try {
                          localStorage.setItem("pru_last_used_broker", val)
                        } catch (_) {}
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="เลือกช่องทาง">
                        {broker ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: currentBrokerObj.color,
                              }}
                            />
                            <span className="truncate font-medium text-gray-800">
                              {currentBrokerObj.label || broker}
                            </span>
                          </div>
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {brokerOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          textValue={opt.label}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: opt.color }}
                            />
                            <span>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {broker === "Other" && (
                    <div className="pt-2">
                      <Input
                        placeholder="พิมพ์ชื่อช่องทางใหม่..."
                        value={customBroker}
                        onChange={(e) => setCustomBroker(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Owner Checklist (Multi-select) */}
                <div className="space-y-2 md:col-span-2">
                  <Label required>ผู้รับผิดชอบ (Responsible Persons)</Label>
                  <div className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:grid-cols-2">
                    {teamOwnersList.map((t) => {
                      const isChecked = selectedOwners.includes(t.id)
                      return (
                        <label
                          key={t.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all select-none",
                            isChecked
                              ? "border-red-200 bg-red-50/80 font-semibold text-brand-ink"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100/70"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOwners([...selectedOwners, t.id])
                              } else {
                                setSelectedOwners(
                                  selectedOwners.filter((id) => id !== t.id)
                                )
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-brand-ink focus:ring-brand"
                          />
                          <span>{t.label}</span>
                        </label>
                      )
                    })}
                  </div>

                  {/* Custom Owner add-on */}
                  <div className="pt-1">
                    <Input
                      leftIcon={<User className="h-3.5 w-3.5 text-gray-500" />}
                      placeholder="หรือระบุชื่อผู้รับผิดชอบเพิ่มเติม (เช่น บุคคลภายนอก)..."
                      value={customOwner}
                      onChange={(e) => setCustomOwner(e.target.value)}
                      size="sm"
                    />
                  </div>

                  {errors.owner && (
                    <p className="text-xs font-medium text-brand-ink">
                      {errors.owner}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Launch & Target Dates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-700 uppercase">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>2. กำหนดการเปิดตัว (Target Launch Dates)</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Internal Training Date</Label>
                  <DatePicker
                    value={internalDate}
                    onChange={(val) => setInternalDate(val)}
                    placeholder="เลือกวันที่ หรือ TBC"
                    allowTBC
                    defaultMonth={selectedMonth}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Commercial Launch Date</Label>
                  <DatePicker
                    value={commercialDate}
                    onChange={(val) => setCommercialDate(val)}
                    placeholder="เลือกวันที่ หรือ TBC"
                    allowTBC
                    defaultMonth={selectedMonth}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label optional>CS Date (ถ้ามี)</Label>
                  <DatePicker
                    value={csDate}
                    onChange={(val) => setCsDate(val)}
                    placeholder="เลือกวันที่ CS Date"
                    allowTBC
                    defaultMonth={selectedMonth}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label optional>ข้อความสถานะพิเศษทางขวา</Label>
                  <Input
                    placeholder="เช่น Sent out : Sep 2026"
                    value={customRightLabel}
                    onChange={(e) => setCustomRightLabel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Milestones & Progress */}
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-700 uppercase">
                  <Clock className="h-3.5 w-3.5 text-pru-red" />
                  <span>3. กำหนดขั้นตอนความคืบหน้า (Phase Milestones)</span>
                </div>
                <span className="text-xs text-gray-500">
                  เลือก “ตอนนี้” ได้ทีละ 1 ขั้น · ขั้นก่อนหน้าจะเป็น “เสร็จแล้ว”
                  ให้อัตโนมัติ
                </span>
              </div>

              <div className="space-y-2.5">
                {PHASES.map((phase) => {
                  const ms = milestonesState[phase.key]
                  if (!ms) return null

                  return (
                    <div
                      key={phase.key}
                      className={`rounded-xl border p-3 transition-all ${
                        ms.enabled
                          ? "border-gray-200 bg-gray-50/80"
                          : "border-dashed border-gray-200 bg-white opacity-60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Checkbox toggle */}
                        <label className="flex cursor-pointer items-center gap-2.5 select-none">
                          <input
                            type="checkbox"
                            checked={ms.enabled}
                            onChange={(e) =>
                              setMilestonesState((prev) => ({
                                ...prev,
                                [phase.key]: {
                                  ...prev[phase.key],
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 rounded border-gray-300 text-brand-ink focus:ring-brand"
                          />
                          <span className="text-xs font-bold text-gray-800">
                            {phase.label.replace("\n", " ")}
                          </span>
                        </label>

                        {/* Status & Settings when enabled */}
                        {ms.enabled && (
                          <div className="flex items-center gap-2">
                            {/* Milestone Date */}
                            <div className="w-36">
                              <DatePicker
                                value={ms.date}
                                onChange={(val) =>
                                  setMilestonesState((prev) => ({
                                    ...prev,
                                    [phase.key]: {
                                      ...prev[phase.key],
                                      date: val,
                                    },
                                  }))
                                }
                                placeholder="เลือกวันที่"
                                defaultMonth={selectedMonth}
                              />
                            </div>

                            {/* Status: one of ยังไม่ถึง / ตอนนี้ / เสร็จแล้ว */}
                            <div
                              role="radiogroup"
                              aria-label={`สถานะของ ${phase.label.replace("\n", " ")}`}
                              className="flex gap-0.5 border-2 border-rule bg-rule"
                            >
                              {PHASE_STATES.map((option) => {
                                const current: PhaseState = ms.isElearningIcon
                                  ? "current"
                                  : ms.status === "completed"
                                    ? "done"
                                    : "todo"
                                const selected = current === option.key
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() =>
                                      setPhaseState(phase.key, option.key)
                                    }
                                    className={`inline-flex h-10 touch-target items-center gap-1.5 px-3 text-xs font-bold whitespace-nowrap ${
                                      selected
                                        ? option.selectedClass
                                        : "bg-white text-ink-soft hover:text-ink"
                                    }`}
                                  >
                                    <PruIcon
                                      name={option.icon}
                                      size={14}
                                      strokeWidth={4}
                                    />
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </form>

          {/* Sticky Footer Actions */}
          <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xs sm:px-6 sm:py-4">
            <div>
              {productToEdit && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-9 gap-1.5 text-xs text-brand-ink hover:bg-red-50 hover:text-brand-hover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>ลบถาวร</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-3 text-xs sm:px-4 sm:text-sm"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                loading={isSubmitting}
                size="sm"
                className="h-9 gap-1.5 bg-brand-fill px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover sm:px-5 sm:text-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{productToEdit ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
