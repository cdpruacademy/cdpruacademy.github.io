import { AnnouncementView } from "@/components/announcements/announcement-view";

export const metadata = {
  title: "ข่าวสาร & ประชาสัมพันธ์ทีม | Prudential Thailand",
  description: "ศูนย์รวมข่าวสาร กำหนดการ และประชาสัมพันธ์หลักสูตรของฝ่ายพัฒนาหลักสูตร",
};

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen py-3 bg-slate-50/50">
      <AnnouncementView />
    </div>
  );
}
