"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { QuestionItem, INITIAL_QUESTIONS } from "@/lib/search-data";
import { PromptInput } from "@/components/ui/ai-chat-input";
import { GeminiSettingsModal } from "./gemini-settings-modal";
import { AdminLoginModal } from "@/components/auth/admin-login-modal";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { askGeminiOrKnowledgeBase, getStoredGeminiKey } from "@/lib/gemini-service";
import {
  Sparkles,
  User,
  Bot,
  Copy,
  Check,
  RotateCcw,
  MessageSquarePlus,
  Loader2,
  Lock,
  Plus,
  CheckCircle2,
  X,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  notFound?: boolean;
  matchedQuestion?: QuestionItem;
  modelUsed?: string;
}

export function KnowledgeSearch() {
  const { isAdmin, login } = useAdminAuth();

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pru_questions_v2");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return INITIAL_QUESTIONS;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Form states for new FAQ
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState<QuestionItem["category"]>("Product");
  const [newTags, setNewTags] = useState("");
  const [newAskedBy, setNewAskedBy] = useState("");
  const [newAnsweredBy, setNewAnsweredBy] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasApiKey = !!getStoredGeminiKey();

  // Scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAiLoading]);

  // Handle user submit query
  const handleSendMessage = async (text: string) => {
    const q = text.trim();
    if (!q || isAiLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsAiLoading(true);

    try {
      const result = await askGeminiOrKnowledgeBase(q, questions);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        notFound: !result.found,
        matchedQuestion: result.matchedQuestion,
        modelUsed: result.modelUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat error", err);
      const errMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleOpenAddWithQuery = (questionText: string) => {
    if (!isAdmin) {
      setIsAdminModalOpen(true);
      return;
    }
    setNewQuestion(questionText);
    setNewAnswer("");
    setIsAddModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newItem: QuestionItem = {
      id: `q-${Date.now()}`,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      category: newCategory,
      tags: newTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
      askedBy: newAskedBy.trim() || undefined,
      answeredBy: newAnsweredBy.trim() || undefined,
      updatedAt: "วันนี้",
    };

    const updated = [newItem, ...questions];
    setQuestions(updated);
    try {
      localStorage.setItem("pru_questions_v2", JSON.stringify(updated));
    } catch (_) {}

    // Reset & close
    setNewQuestion("");
    setNewAnswer("");
    setNewTags("");
    setNewAskedBy("");
    setNewAnsweredBy("");
    setIsAddModalOpen(false);

    // Add confirmation message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-sys-${Date.now()}`,
        role: "assistant",
        content: `บันทึกคำถาม "${newItem.question}" เข้าสู่คลัง FAQ สำเร็จแล้ว! ตอนนี้ระบบและ AI สามารถตอบคำถามนี้ได้แล้วครับ`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6">
      {/* 1. INITIAL STATE: Centered View (ตามรูปที่ 3 เป๊ะๆ) */}
      {!hasMessages && (
        <div className="min-h-[calc(85vh-4rem)] flex flex-col items-center justify-center -mt-6 animate-in fade-in zoom-in-95 duration-400">
          {/* Subtle Logo / Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#ED1C24] text-xs font-bold mb-3 border border-red-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Knowledge Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              ถาม-ตอบข้อมูลหลักสูตรและการทำงาน
            </h1>
          </div>

          {/* Centered PromptInput with Short Placeholder */}
          <div className="w-full flex justify-center">
            <PromptInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={(val) => handleSendMessage(val)}
              placeholder="ถามอะไรก็ได้..."
            />
          </div>

          {/* Action Buttons below input */}
          <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 shadow-2xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {hasApiKey ? "Google Gemini: เชื่อมต่อแล้ว" : "ตั้งค่า Gemini API Key"}
              </span>
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setNewQuestion("");
                  setNewAnswer("");
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2D2D2D] hover:bg-black text-white shadow-2xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึก FAQ ใหม่</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                title="เข้าสู่ระบบ Admin เพื่อเพิ่ม FAQ"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. CHAT STATE: Conversation Thread (ตามรูปที่ 4 เป๊ะๆ) */}
      {hasMessages && (
        <div className="py-6 flex flex-col min-h-[calc(100vh-6rem)]">
          {/* Top Chat Bar */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 sticky top-16 bg-white/95 backdrop-blur-md z-20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center font-bold shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">การสนทนากับ AI</h2>
                <p className="text-[11px] text-gray-400">
                  {hasApiKey ? "ขับเคลื่อนด้วย Google Gemini API" : "ขับเคลื่อนด้วย Local Knowledge Base"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMessages([])}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                title="เริ่มการสนทนาใหม่"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เริ่มใหม่</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 space-y-6 pb-24">
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {/* Message Bubble Container with Avatar */}
                  <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
                    {/* Left AI Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-red-50 text-[#ED1C24] flex items-center justify-center shrink-0 mt-1 border border-red-100 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-2xs ${
                        isUser
                          ? "bg-[#2D2D2D] text-white rounded-tr-xs"
                          : "bg-white text-gray-800 border border-gray-200 rounded-tl-xs"
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>

                      {/* Not Found Suggestion in AI Bubble */}
                      {msg.notFound && (
                        <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50/70 p-3 rounded-xl">
                          <p className="text-xs text-amber-900 font-semibold mb-2">
                            ไม่พบคำตอบในคลังข้อมูล ต้องการให้ทีมบันทึกเรื่องนี้เป็น FAQ ใหม่หรือไม่?
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              // Find user's last question
                              const lastUserMsg = [...messages]
                                .reverse()
                                .find((m) => m.role === "user");
                              handleOpenAddWithQuery(lastUserMsg ? lastUserMsg.content : "");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#ED1C24] hover:bg-[#D4181F] text-white rounded-lg shadow-2xs transition-colors"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>บันทึกเป็น FAQ ใหม่</span>
                          </button>
                        </div>
                      )}

                      {/* Footer Info inside bubble */}
                      <div
                        className={`flex items-center justify-between gap-3 text-[10px] mt-2 pt-1 ${
                          isUser ? "text-gray-300" : "text-gray-400"
                        }`}
                      >
                        <span>{msg.timestamp}</span>

                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="hover:text-gray-700 flex items-center gap-1 transition-colors"
                            title="คัดลอกข้อความ"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-green-600" />
                                <span className="text-green-600 font-semibold">คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>คัดลอก</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right User Avatar */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Typing / Loading Indicator */}
            {isAiLoading && (
              <div className="flex items-start gap-2.5 animate-in fade-in">
                <div className="w-8 h-8 rounded-full bg-red-50 text-[#ED1C24] flex items-center justify-center shrink-0 mt-1 border border-red-100">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 text-[#ED1C24] animate-spin" />
                  <span>AI กำลังวิเคราะห์และเรียบเรียงคำตอบ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Bottom Input Bar */}
          <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 py-3 z-30">
            <div className="max-w-3xl mx-auto px-4 flex justify-center">
              <PromptInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={(val) => handleSendMessage(val)}
                placeholder="ถามอะไรก็ได้..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Settings for Gemini API Key */}
      <GeminiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Modal: Admin Login */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {}}
        loginFn={login}
      />

      {/* Modal: Add New FAQ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">บันทึกคำถาม-คำตอบใหม่เข้าคลัง FAQ</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  คำถาม <span className="text-[#ED1C24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="เช่น หลักสูตร PRUInfinity เริ่มเมื่อไหร่?"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  คำตอบ / คำอธิบาย <span className="text-[#ED1C24]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="พิมพ์คำตอบอย่างละเอียด..."
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                  >
                    <option value="Product">Product</option>
                    <option value="Training">Training</option>
                    <option value="Process">Process</option>
                    <option value="e-Learning">e-Learning</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tags (คั่นด้วยจุลภาค)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="เช่น timeline, e-learning"
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ผู้ถาม</label>
                  <input
                    type="text"
                    value={newAskedBy}
                    onChange={(e) => setNewAskedBy(e.target.value)}
                    placeholder="เช่น ทีม Broker"
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ผู้ตอบ</label>
                  <input
                    type="text"
                    value={newAnsweredBy}
                    onChange={(e) => setNewAnsweredBy(e.target.value)}
                    placeholder="เช่น Surakit P."
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-lg shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึก FAQ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
