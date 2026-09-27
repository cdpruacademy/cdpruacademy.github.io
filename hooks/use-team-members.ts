"use client";

import { useState, useEffect, useCallback } from "react";

export const DEFAULT_TEAM_MEMBERS = [
  "Jirapat O.",
  "Sakkarin S.",
  "Nitikan B.",
  "Surakit P.",
];

export const DEFAULT_MEMBER_COLORS: Record<string, string> = {
  "Jirapat O.": "#ED1C24",
  "Sakkarin S.": "#0066CC",
  "Nitikan B.": "#8B5CF6",
  "Surakit P.": "#10B981",
};

const STORAGE_KEY = "pru_team_members_v1";
const MEMBER_COLORS_KEY = "pru_member_colors_v1";

const PALETTE = [
  "#ED1C24",
  "#0066CC",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#009FE3",
  "#0B2265",
  "#334155",
];

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<string[]>(DEFAULT_TEAM_MEMBERS);
  const [memberColors, setMemberColors] = useState<Record<string, string>>(DEFAULT_MEMBER_COLORS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const storedMembers = localStorage.getItem(STORAGE_KEY);
      if (storedMembers) {
        const parsed = JSON.parse(storedMembers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeamMembers(parsed);
        }
      }

      const storedColors = localStorage.getItem(MEMBER_COLORS_KEY);
      if (storedColors) {
        const parsed = JSON.parse(storedColors);
        if (parsed && typeof parsed === "object") {
          setMemberColors({ ...DEFAULT_MEMBER_COLORS, ...parsed });
        }
      }
    } catch (err) {
      console.error("Failed to load team members from storage", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save helper
  const saveMembers = useCallback((newList: string[], newColors?: Record<string, string>) => {
    setTeamMembers(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      if (newColors) {
        setMemberColors(newColors);
        localStorage.setItem(MEMBER_COLORS_KEY, JSON.stringify(newColors));
      }
    } catch (err) {
      console.error("Failed to save team members", err);
    }
  }, []);

  // Update a single member's color
  const updateMemberColor = useCallback(
    (name: string, color: string) => {
      const updated = { ...memberColors, [name]: color };
      setMemberColors(updated);
      try {
        localStorage.setItem(MEMBER_COLORS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save member color", err);
      }
    },
    [memberColors]
  );

  // Add Member
  const addMember = useCallback(
    (name: string, customColor?: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      if (teamMembers.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
        return false; // Already exists
      }
      const updated = [...teamMembers, trimmed];
      const assignedColor = customColor || PALETTE[updated.length % PALETTE.length];
      const updatedColors = { ...memberColors, [trimmed]: assignedColor };
      saveMembers(updated, updatedColors);
      return true;
    },
    [teamMembers, memberColors, saveMembers]
  );

  // Update Member name
  const updateMember = useCallback(
    (oldName: string, newName: string): boolean => {
      const trimmed = newName.trim();
      if (!trimmed) return false;
      const index = teamMembers.indexOf(oldName);
      if (index === -1) return false;
      if (
        teamMembers.some(
          (m, i) => i !== index && m.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return false;
      }
      const updated = [...teamMembers];
      updated[index] = trimmed;

      // Transfer color to new name
      const updatedColors = { ...memberColors };
      if (updatedColors[oldName]) {
        updatedColors[trimmed] = updatedColors[oldName];
        delete updatedColors[oldName];
      }
      saveMembers(updated, updatedColors);
      return true;
    },
    [teamMembers, memberColors, saveMembers]
  );

  // Delete Member
  const deleteMember = useCallback(
    (name: string): boolean => {
      if (teamMembers.length <= 1) {
        return false; // Prevent removing all members
      }
      const updated = teamMembers.filter((m) => m !== name);
      const updatedColors = { ...memberColors };
      delete updatedColors[name];
      saveMembers(updated, updatedColors);
      return true;
    },
    [teamMembers, memberColors, saveMembers]
  );

  // Reset to Default
  const resetToDefault = useCallback(() => {
    saveMembers(DEFAULT_TEAM_MEMBERS, DEFAULT_MEMBER_COLORS);
  }, [saveMembers]);

  return {
    teamMembers,
    memberColors,
    isLoaded,
    addMember,
    updateMember,
    updateMemberColor,
    deleteMember,
    resetToDefault,
  };
}
