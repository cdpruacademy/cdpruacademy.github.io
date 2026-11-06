"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"

/** The heading and form of the login page */
export function LoginPanel({
  loginFn,
}: {
  loginFn: (email: string, pwd: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await loginFn(email, password)
      if (res.success) {
        setError(null)
        setPassword("")
      } else {
        setError(res.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
        <div className="flex items-start justify-between bg-pru-red px-6 pt-5 pb-6 text-white">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/20">
              <Icon name="lock" size={22} strokeWidth={1.9} />
            </span>
            <h2 id="admin-login-title" className="mt-3.5 text-[22px] leading-tight font-bold">
              Log in
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pt-5 pb-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-email" className="text-[13px] font-bold text-stone-700">
              Username
            </label>
            <input
              id="admin-email"
              type="text"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              className="h-[46px] w-full rounded-[14px] border-[1.5px] border-rule bg-white px-3.5 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-password" className="text-[13px] font-bold text-stone-700">
              Password
            </label>
            <span className="relative block">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                aria-invalid={!!error}
                className={`h-[46px] w-full rounded-[14px] border-[1.5px] bg-white pr-12 pl-3.5 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none ${
                  error ? "border-pru-red" : "border-rule"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={showPassword}
                className="absolute top-[5px] right-[5px] flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} strokeWidth={1.9} />
              </button>
            </span>
            {error && (
              <span role="alert" className="inline-flex items-center gap-1.5 text-[13px] text-brand-ink">
                <Icon name="warning" size={15} strokeWidth={2} />
                {error}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>
    </>
  )
}
