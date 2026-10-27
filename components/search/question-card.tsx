"use client";

import * as React from "react";
import { useState } from "react";
import { QuestionItem } from "@/lib/search-data";
import { ChevronDown, ChevronUp, UserCheck, HelpCircle, Tag } from "lucide-react";

interface QuestionCardProps {
  item: QuestionItem;
  searchQuery?: string;
  onTagClick?: (tag: string) => void;
}

export function QuestionCard({ item, searchQuery = "", onTagClick }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Category badge colors
  const getCategoryColor = (cat: QuestionItem["category"]) => {
    switch (cat) {
      case "Product":
        return "bg-red-50 text-[#ED1C24] border-red-200";
      case "Training":
        return "bg-slate-100 text-[#2D2D2D] border-slate-300";
      case "e-Learning":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Compliance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Process":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Simple text highlighter for matched query
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-100 text-red-900 rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden">
      {/* Question Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(
                  item.category
                )}`}
              >
                {item.category}
              </span>
              <span className="text-xs text-gray-400">อัปเดต: {item.updatedAt}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              {highlightText(item.question, searchQuery)}
            </h3>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? "ย่อคำตอบ" : "ขยายคำตอบ"}
          className="p-1 text-gray-400 hover:text-gray-700 rounded-md shrink-0 mt-1"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Answer Body */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-gray-100 bg-slate-50/40">
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mt-2 whitespace-pre-line">
            {highlightText(item.answer, searchQuery)}
          </p>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
              <Tag className="w-3 h-3 text-gray-400 mr-1" />
              {item.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 px-2 py-0.5 rounded-md transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Metadata footer */}
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 mt-3 pt-2">
            {item.askedBy && (
              <div>
                ถามโดย: <span className="font-medium text-gray-700">{item.askedBy}</span>
              </div>
            )}
            {item.answeredBy && (
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-green-600" />
                ตอบโดย: <span className="font-semibold text-gray-800">{item.answeredBy}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
