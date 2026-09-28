"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  ProductItem,
  PHASES,
  PhaseKey,
  MilestoneStatus,
  TimelineType,
} from "@/lib/timeline-data";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ElearningMonitorIcon } from "./elearning-icon";
import { resolveBrokerColor } from "@/lib/broker-colors";
import {
  X,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Clock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineType?: TimelineType;
  selectedMonth?: string;
  productToEdit?: ProductItem | null;
  onSave: (product: Omit<ProductItem, "id">, id?: string) => void;
  onDelete?: (id: string) => void;
  teamMembers?: string[];
  availableBrokers?: Record<string, string>;
}

const DEFAULT_BROKER_OPTIONS = [
  { value: "ttb", label: "ttb", color: "#009FE3" },
  { value: "ttb touch", label: "ttb touch", color: "#009FE3" },
  { value: "UOB", label: "UOB", color: "#0B2265" },
  { value: "Agency", label: "Agency (Prudential)", color: "#ED1C24" },
  { value: "Audit", label: "Audit", color: "#1E293B" },
  { value: "New Broker", label: "New Broker", color: "#334155" },
];

const DEFAULT_MEMBERS = [
  "Jirapat O.",
  "Sakkarin S.",
  "Nitikan B.",
  "Surakit P.",
];

const THAI_NAME_MAP: Record<string, string> = {
  "Jirapat O.": "จิรภัทร",
  "Sakkarin S.": "ศักรินทร์",
  "Nitikan B.": "นิติกานต์",
  "Surakit P.": "สุรกิจ",
};

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
  const isEnhancement = timelineType === "enhancement";

  // Build dynamic broker list from availableBrokers or fallback
  const brokerOptions = React.useMemo(() => {
    let list: { value: string; label: string; color: string }[] = [];
    if (availableBrokers && Object.keys(availableBrokers).length > 0) {
      list = Object.entries(availableBrokers).map(([key, color]) => ({
        value: key,
        label: key,
        color: color,
      }));
    } else {
      list = [...DEFAULT_BROKER_OPTIONS];
    }
    // If productToEdit has a broker that's not in the list and not "Other", add it
    if (
      productToEdit?.broker &&
      productToEdit.broker !== "Other" &&
      !list.some((b) => b.value.toLowerCase() === productToEdit.broker.toLowerCase())
    ) {
      list.push({
        value: productToEdit.broker,
        label: productToEdit.broker,
        color: resolveBrokerColor(productToEdit.broker, availableBrokers),
      });
    }
    list.push({ value: "Other", label: "อื่นๆ (ระบุเอง)", color: "#64748B" });
    return list;
  }, [availableBrokers, productToEdit?.broker]);

  const effectiveMembers = teamMembers && teamMembers.length > 0 ? teamMembers : DEFAULT_MEMBERS;
  const teamOwnersList = effectiveMembers.map((m) => ({
    id: m,
    label: THAI_NAME_MAP[m] ? `${m} (${THAI_NAME_MAP[m]})` : m,
  }));

  const [broker, setBroker] = useState<string>(isEnhancement ? "ttb" : "New Broker");
  const [customBroker, setCustomBroker] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [customOwner, setCustomOwner] = useState<string>("");
  const [internalDate, setInternalDate] = useState<string>("TBC");
  const [commercialDate, setCommercialDate] = useState<string>("TBC");
  const [csDate, setCsDate] = useState<string>("");
  const [customRightLabel, setCustomRightLabel] = useState<string>("");

  interface MilestoneFormState {
    enabled: boolean;
    date: string;
    status: MilestoneStatus;
    isElearningIcon: boolean;
  }

  const [milestonesState, setMilestonesState] = useState<Record<PhaseKey, MilestoneFormState>>({
    "kick-off": { enabled: true, date: "", status: "completed", isElearningIcon: false },
    "first-draft": { enabled: true, date: "", status: "completed", isElearningIcon: false },
    "first-draft-elearning": { enabled: false, date: "", status: "pending", isElearningIcon: false },
    "final-approval": { enabled: true, date: "", status: "completed", isElearningIcon: false },
    "final-elearning": { enabled: false, date: "", status: "pending", isElearningIcon: false },
    "internal-training": { enabled: false, date: "", status: "pending", isElearningIcon: false },
    launch: { enabled: true, date: "", status: "completed", isElearningIcon: false },
  });

  const [errors, setErrors] = useState<{ name?: string; owner?: string }>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      const knownBroker = brokerOptions.find(
        (b) => b.value.toLowerCase() === productToEdit.broker?.toLowerCase()
      );
      if (knownBroker && knownBroker.value !== "Other") {
        setBroker(knownBroker.value);
        setCustomBroker("");
      } else {
        setBroker("Other");
        setCustomBroker(productToEdit.broker);
      }
      setName(productToEdit.name);

      // Parse owners (e.g. "Nitikan B. / Surakit P." or "Surakit P.")
      const rawOwner = productToEdit.owner || "";
      const splitOwners = rawOwner.split(/[\/,]+/).map((s) => s.trim()).filter(Boolean);
      const matchedKnown: string[] = [];
      const leftoverCustom: string[] = [];

      splitOwners.forEach((own) => {
        const found = teamOwnersList.find(
          (t) => t.id.toLowerCase() === own.toLowerCase() || t.id.toLowerCase().includes(own.toLowerCase())
        );
        if (found) {
          if (!matchedKnown.includes(found.id)) matchedKnown.push(found.id);
        } else {
          leftoverCustom.push(own);
        }
      });

      setSelectedOwners(matchedKnown);
      setCustomOwner(leftoverCustom.join(", "));

      setInternalDate(productToEdit.internalDate || "TBC");
      setCommercialDate(productToEdit.commercialDate || "TBC");
      setCsDate(productToEdit.csDate || "");
      setCustomRightLabel(productToEdit.customRightLabel || "");

      // Find which phase has the active monitor icon (ensure only 1 active)
      let activePhaseKey: PhaseKey | null = null;
      const reversedPhases = [...PHASES].reverse();
      for (const p of reversedPhases) {
        if (productToEdit.milestones[p.key]?.isElearningIcon) {
          activePhaseKey = p.key;
          break;
        }
      }

      const nextMState: Record<PhaseKey, MilestoneFormState> = { ...milestonesState };
      PHASES.forEach((p) => {
        const existing = productToEdit.milestones[p.key];
        if (existing) {
          nextMState[p.key] = {
            enabled: true,
            date: existing.date || "",
            status: existing.status || "completed",
            isElearningIcon: activePhaseKey === p.key,
          };
        } else {
          nextMState[p.key] = {
            enabled: false,
            date: "",
            status: "pending",
            isElearningIcon: false,
          };
        }
      });
      setMilestonesState(nextMState);
    } else {
      setBroker(isEnhancement ? "ttb" : "New Broker");
      setCustomBroker("");
      setName("");
      setSelectedOwners([]);
      setCustomOwner("");
      setInternalDate("TBC");
      setCommercialDate("TBC");
      setCsDate("");
      setCustomRightLabel("");
      setMilestonesState({
        "kick-off": { enabled: true, date: "", status: "completed", isElearningIcon: false },
        "first-draft": { enabled: true, date: "", status: "completed", isElearningIcon: false },
        "first-draft-elearning": { enabled: false, date: "", status: "pending", isElearningIcon: false },
        "final-approval": { enabled: true, date: "", status: "completed", isElearningIcon: false },
        "final-elearning": { enabled: false, date: "", status: "pending", isElearningIcon: false },
        "internal-training": { enabled: false, date: "", status: "pending", isElearningIcon: false },
        launch: { enabled: true, date: "", status: "completed", isElearningIcon: false },
      });
    }
    setErrors({});
    setIsConfirmingDelete(false);
    setIsSubmitting(false);
  }, [productToEdit, isOpen, isEnhancement, brokerOptions]);

  const handleToggleCurrentPhase = (phaseKey: PhaseKey) => {
    setMilestonesState((prev) => {
      const isCurrentlyActive = !!prev[phaseKey]?.isElearningIcon;
      const next = { ...prev };
      // Turn off icon on all phases
      (Object.keys(next) as PhaseKey[]).forEach((k) => {
        next[k] = {
          ...next[k],
          isElearningIcon: false,
        };
      });
      // Toggle on only for this phase if it was not already active
      if (!isCurrentlyActive) {
        next[phaseKey] = {
          ...next[phaseKey],
          isElearningIcon: true,
        };
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; owner?: string } = {};
    if (!name.trim()) newErrors.name = "กรุณาระบุชื่องาน";

    const allOwners: string[] = [...selectedOwners];
    if (customOwner.trim()) {
      allOwners.push(customOwner.trim());
    }
    const finalOwner = allOwners.join(" / ");

    if (!finalOwner) newErrors.owner = "กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 ท่าน";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalBroker = broker === "Other" ? (customBroker.trim() || "Other") : broker;

      const builtMilestones: Record<string, any> = {};
      PHASES.forEach((p) => {
        const state = milestonesState[p.key];
        if (state.enabled) {
          builtMilestones[p.key] = {
            date: state.date.trim() || undefined,
            status: state.status,
            isElearningIcon: state.isElearningIcon || undefined,
          };
        }
      });

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
      };

      onSave(payload, productToEdit?.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (productToEdit && onDelete) {
      onDelete(productToEdit.id);
      onClose();
    }
  };

  const currentBrokerObj = brokerOptions.find((b) => b.value === broker) || {
    color: "#64748B",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Soft translucent backdrop for desktop (no blur so timeline remains readable) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/20 sm:bg-slate-950/25 transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Right-docked slide-over container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="w-screen max-w-full sm:max-w-xl lg:max-w-[620px] h-full bg-white shadow-2xl flex flex-col border-l border-gray-200"
        >
          {/* Sticky Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gray-100 bg-white/95 backdrop-blur-xs flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: isEnhancement ? "#0066CC" : "#ED1C24" }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                    {productToEdit ? "แก้ไขข้อมูลรายการ" : "เพิ่มรายการใหม่"}
                  </h2>
                  <Badge variant={isEnhancement ? "secondary" : "default"} className="text-xs">
                    {isEnhancement ? "Enhancement" : "New Product"}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-gray-600">
                    {selectedMonth}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  กรอกข้อมูลกำหนดการและ Milestone เพื่อแสดงผลบน Dashboard
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content (Scrollable Body) */}
          <form id="product-panel-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 tracking-wider uppercase">
                <Layers className="w-3.5 h-3.5 text-[#ED1C24]" />
                <span>1. ข้อมูลพื้นฐาน (Basic Information)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name -> ชื่องาน (Task Name) */}
                <div className="md:col-span-2 space-y-1.5">
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
                    <p className="text-xs text-[#ED1C24] font-medium">{errors.name}</p>
                  )}
                </div>

                {/* Broker / Partner Select (Single dot) */}
                <div className="md:col-span-2 space-y-1.5">
                  <Label required>ช่องทาง / พาร์ทเนอร์ (Channel / Broker)</Label>
                  <Select
                    value={broker}
                    onValueChange={(val) => {
                      setBroker(val);
                      if (val !== "Other") setCustomBroker("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกช่องทาง" />
                    </SelectTrigger>
                    <SelectContent>
                      {brokerOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
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
                <div className="md:col-span-2 space-y-2">
                  <Label required>ผู้รับผิดชอบ (Responsible Persons)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50/80 rounded-xl border border-gray-200">
                    {teamOwnersList.map((t) => {
                      const isChecked = selectedOwners.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all text-xs font-medium",
                            isChecked
                              ? "bg-red-50/80 border-red-200 text-[#ED1C24] font-semibold"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100/70"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOwners([...selectedOwners, t.id]);
                              } else {
                                setSelectedOwners(selectedOwners.filter((id) => id !== t.id));
                              }
                            }}
                            className="w-4 h-4 text-[#ED1C24] rounded border-gray-300 focus:ring-[#ED1C24]"
                          />
                          <span>{t.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Custom Owner add-on */}
                  <div className="pt-1">
                    <Input
                      leftIcon={<User className="w-3.5 h-3.5 text-gray-400" />}
                      placeholder="หรือระบุชื่อผู้รับผิดชอบเพิ่มเติม (เช่น บุคคลภายนอก)..."
                      value={customOwner}
                      onChange={(e) => setCustomOwner(e.target.value)}
                      size="sm"
                    />
                  </div>

                  {errors.owner && (
                    <p className="text-xs text-[#ED1C24] font-medium">{errors.owner}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Launch & Target Dates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 tracking-wider uppercase">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>2. กำหนดการเปิดตัว (Target Launch Dates)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 tracking-wider uppercase">
                  <Clock className="w-3.5 h-3.5 text-green-600" />
                  <span>3. กำหนดขั้นตอนความคืบหน้า (Phase Milestones)</span>
                </div>
                <span className="text-[11px] text-gray-500">
                  คลิกไอคอนหน้าจอเพื่อระบุ Phase ปัจจุบัน (เลือกได้ 1 จุด)
                </span>
              </div>

              <div className="space-y-2.5">
                {PHASES.map((phase) => {
                  const ms = milestonesState[phase.key];
                  if (!ms) return null;

                  return (
                    <div
                      key={phase.key}
                      className={`p-3 rounded-xl border transition-all ${
                        ms.enabled
                          ? "bg-gray-50/80 border-gray-200"
                          : "bg-white border-dashed border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Checkbox toggle */}
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                            className="w-4 h-4 text-[#ED1C24] rounded border-gray-300 focus:ring-[#ED1C24]"
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

                            {/* Status toggle button */}
                            <button
                              type="button"
                              onClick={() =>
                                setMilestonesState((prev) => ({
                                  ...prev,
                                  [phase.key]: {
                                    ...prev[phase.key],
                                    status:
                                      prev[phase.key].status === "completed"
                                        ? "pending"
                                        : "completed",
                                  },
                                }))
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                                ms.status === "completed"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-gray-100 text-gray-600 border-gray-300"
                              }`}
                            >
                              {ms.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  <span>Completed</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  <span>Pending</span>
                                </>
                              )}
                            </button>

                            {/* Current Active Phase Monitor Icon Toggle (Single-select) */}
                            <button
                              type="button"
                              onClick={() => handleToggleCurrentPhase(phase.key)}
                              title={
                                ms.isElearningIcon
                                  ? "ตำแหน่งปัจจุบันของงาน (คลิกเพื่อยกเลิก)"
                                  : "คลิกเพื่อระบุว่างานกำลังอยู่ใน Phase นี้ (แสดงไอคอนหน้าจอ)"
                              }
                              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                                ms.isElearningIcon
                                  ? isEnhancement
                                    ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                                    : "bg-red-50 border-red-300 ring-2 ring-red-500/20 shadow-xs"
                                  : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100 opacity-60 hover:opacity-100"
                              }`}
                            >
                              <ElearningMonitorIcon
                                color={ms.isElearningIcon ? (isEnhancement ? "blue" : "red") : "gray"}
                                className="w-4 h-4"
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>

          {/* Sticky Footer Actions */}
          <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50/90 backdrop-blur-xs flex items-center justify-between gap-3 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div>
              {productToEdit && onDelete && (
                <div>
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#ED1C24] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ยืนยันการลบ?
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        className="h-8 text-xs"
                      >
                        ยืนยัน
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="h-8 text-xs"
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="text-[#ED1C24] hover:text-[#D4181F] hover:bg-red-50 text-xs gap-1.5 h-9"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ลบรายการนี้</span>
                      <span className="sm:hidden">ลบ</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs sm:text-sm h-9 px-3 sm:px-4"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                loading={isSubmitting}
                size="sm"
                className="bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs sm:text-sm font-semibold gap-1.5 h-9 px-4 sm:px-5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{productToEdit ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
