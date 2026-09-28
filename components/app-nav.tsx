"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Search, Lock, Unlock, LogOut, BarChart3, Megaphone } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLoginModal } from "./auth/admin-login-modal";

export function AppNav() {
  const pathname = usePathname();
  const { isAdmin, login, logout } = useAdminAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const isTimeline = pathname === "/";
  const isAnalytics = pathname === "/analytics";
  const isAnnouncements = pathname === "/announcements";
  const isSearch = pathname === "/search";

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Brand Identity (Prudential CI) */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ED1C24] flex items-center justify-center text-white font-black text-lg shadow-xs">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-[#ED1C24]">
                  PRUDENTIAL
                </span>
                <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
                  THAILAND
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#5A646E] leading-none">
                ฝ่ายพัฒนาหลักสูตร <span className="hidden md:inline">• Curriculum Development Dashboard</span>
              </div>
            </div>
          </div>

          {/* Right: Navigation Tabs & Admin Status */}
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
                  isTimeline
                    ? "bg-red-50 text-[#ED1C24] border border-red-200 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Product Timeline</span>
                <span className="inline sm:hidden">Timeline</span>
              </Link>

              {/* ข่าวสาร & ประชาสัมพันธ์ (Announcements) */}
              <Link
                href="/announcements"
                className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
                  isAnnouncements
                    ? "bg-red-50 text-[#ED1C24] border border-red-200 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#ED1C24]" />
                <span className="hidden sm:inline">ประชาสัมพันธ์</span>
                <span className="inline sm:hidden">ข่าว</span>
              </Link>

              {/* สรุปสถิติ & สรุปภาพรวม (Admin Analytics) */}
              {isAdmin ? (
                <Link
                  href="/analytics"
                  className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
                    isAnalytics
                      ? "bg-red-50 text-[#ED1C24] border border-red-200 shadow-2xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#ED1C24]" />
                  <span className="hidden sm:inline">สรุปสถิติ (Analytics)</span>
                  <span className="inline sm:hidden">สถิติ</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
                  title="เข้าสู่ระบบ Admin เพื่อดูสรุปสถิติโครงการ"
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-gray-400" />
                  <span className="hidden sm:inline">สรุปสถิติ (Admin)</span>
                  <span className="inline sm:hidden">สถิติ</span>
                  <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                </button>
              )}
            </nav>

            {/* Admin Lock / Status */}
            <div className="pl-2 border-l border-gray-200">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <Unlock className="w-3 h-3" />
                    <span>Admin Mode</span>
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    title="ออกจากโหมด Admin"
                    className="p-1.5 text-gray-400 hover:text-[#ED1C24] hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="ใส่รหัสผ่านเพื่อปลดล็อกสิทธิ์แก้ไข"
                >
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="hidden sm:inline">Admin Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {}}
        loginFn={login}
      />
    </>
  );
}
