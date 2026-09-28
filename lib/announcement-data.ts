export type AnnouncementStatus = "sent" | "pending" | "draft";

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  authorColor?: string;
  status: AnnouncementStatus;
  scheduledAt: string; // ISO date-time string
  sentAt?: string;
  createdAt: string; // ISO date-time string
}

/**
 * Filter announcements to strictly retain items created within the last 1 year (365 days).
 * Items older than 365 days are automatically pruned.
 */
export function filterWithinOneYear(items: AnnouncementItem[]): AnnouncementItem[] {
  const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const itemDate = new Date(item.createdAt).getTime();
    return !isNaN(itemDate) && itemDate >= oneYearAgoMs;
  });
}

// Initial sample announcements within the current year for immediate preview
export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann-1",
    title: "📢 สรุปภาพรวมหลักสูตรใหม่ และเริ่มเปิดระบบ e-Learning ประจำไตรมาส",
    content: "แจ้งทีมงานทุกท่าน ขณะนี้หลักสูตรใหม่สำหรับกลุ่ม New Broker และ ttb ได้รับการอนุมัติและพร้อมเปิดระบบ e-Learning เรียบร้อยแล้ว ขอให้ผู้รับผิดชอบแต่ละโครงการตรวจสอบความถูกต้องของเนื้อหาในระบบ LMS เพิ่มเติมครับ",
    imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
    author: "Surakit P.",
    authorColor: "#10B981",
    status: "sent",
    scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ann-2",
    title: "⏳ แจ้งเตือนส่งมอบ Final Approval: โครงการ ttb growth and protect booster",
    content: "ขอความร่วมมือทีมงานที่เกี่ยวข้อง ตรวจสอบเอกสารสรุปก่อนส่ง Final Approval ภายในสัปดาห์นี้ เพื่อให้ทันกำหนดการ Internal Training และส่งมอบตามเป้าหมายครับ",
    author: "Nitikan B.",
    authorColor: "#6366F1",
    status: "pending",
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];
