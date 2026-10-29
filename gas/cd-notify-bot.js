// =========================================================================
// CODY (โคดี้): บอทของทีม CD สำหรับกลุ่ม LINE (ชื่อเดิม CD-Notify)
// Google Apps Script (GAS) Backend for CD-Notify LINE Bot
// Last Updated: 28 October 2026 (CODY name, style B Flex with icons, grouped by Partner)
// =========================================================================

// 🔐 Secrets อยู่ใน Script Properties (Project Settings > Script properties) ห้ามใส่ในโค้ด
//   LINE_CHANNEL_ACCESS_TOKEN : Channel access token จาก LINE Developers Console
//   SUPABASE_SECRET_KEY       : Secret key (sb_secret_...) จาก Supabase > Project Settings > API Keys
//   MANAGER_PIN               : PIN สำหรับคำสั่ง "CD auth <PIN>" ยืนยันห้อง Lead
//   CRON_SECRET               : ค่าสุ่มยาว ๆ สำหรับเรียก ?action=send_monday&key=<CRON_SECRET>
// รันฟังก์ชัน checkScriptProperties() หนึ่งครั้งเพื่อตรวจว่าตั้งค่าครบ
const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const LINE_CHANNEL_ACCESS_TOKEN = SCRIPT_PROPS.getProperty("LINE_CHANNEL_ACCESS_TOKEN") || "";
const SUPABASE_URL = "https://bwevlsmrtbqbgsqjpppn.supabase.co";
const SUPABASE_SECRET_KEY = SCRIPT_PROPS.getProperty("SUPABASE_SECRET_KEY") || "";
const MANAGER_PIN = SCRIPT_PROPS.getProperty("MANAGER_PIN") || "";
const CRON_SECRET = SCRIPT_PROPS.getProperty("CRON_SECRET") || "";
const DASHBOARD_WEB_URL = "https://cdpruacademy.github.io/";
const BOT_NAME = "CODY";

// ข้อความที่บอทตอบ: ขึ้นต้นด้วย CODY, โคดี้, @CODY หรือ CD แบบเดิม (เว้นวรรคแล้วตามด้วยคำถาม)
// ภาษาไทยมักพิมพ์ติดกัน เช่น "โคดี้รูป" จึงไม่บังคับเว้นวรรคหลัง โคดี้
const BOT_PREFIX = /^@?(?:(?:cody|cd-notify|cd)(?:ครับ|คะ|ค่ะ)?(?:\s+[\s\S]*)?|โคดี้?[\s\S]*)$/i;
const BOT_PREFIX_STRIP = /^@?(?:cody|โคดี้|โคดี|cd-notify|cd)(?:ครับ|คะ|ค่ะ)?\s*/i;

// ไอคอน PNG บนเว็บ (สร้างจาก components/icon.tsx ด้วย scripts/make-cody-icons.mjs)
const ICON_BASE = DASHBOARD_WEB_URL + "cody/";
function iconUrl(name, color) {
  return ICON_BASE + name + "-" + color + ".png";
}

// สีและข้อความแบบ B ("Brand Hero") ให้ตรงกับหน้าเว็บ (ดู DESIGN.md)
const UI = {
  red: "#ED1B2E",
  redInk: "#ED1B2E",
  redSoft: "#FFE9EB",
  done: "#15803D",
  doneSoft: "#E3F5EA",
  ink: "#1C1917",
  soft: "#57534E",
  line: "#E7E5E4",
  surface: "#F5F5F4",
  paper: "#F7F5F3"
};

// Partner และ Channel ข้างใต้ (เหมือน lib/partners.ts บนเว็บ) ค่าจริงอ่านจาก timeline_store id "partners"
const DEFAULT_PARTNERS = [
  { id: "ttb", name: "ttb", color: "#0B2E6F", channels: ["ttb", "ttb touch"] },
  { id: "uob", name: "UOB", color: "#005CB9", channels: ["UOB", "Digital-UOB"] },
  { id: "prudential", name: "Prudential", color: "#ED1B2E", channels: ["Agency", "DMTM", "D2C"] },
  { id: "cimb", name: "CIMB THAI", color: "#7A1E3A", channels: ["CIMB"] },
  { id: "thai-credit", name: "Thai Credit", color: "#F28C28", channels: ["Thai Credit"] }
];
const UNASSIGNED_PARTNER = { id: "unassigned", name: "Other", color: "#A8A29E", channels: [] };

const STEPS = [
  { key: "kick-off", label: "Kick-off", icon: "kickoff" },
  { key: "first-draft", label: "First Draft", icon: "draft" },
  { key: "first-draft-elearning", label: "First Draft e-learning", icon: "elearning" },
  { key: "final-approval", label: "Final Approval", icon: "approval" },
  { key: "final-elearning", label: "Final e-learning", icon: "finalElearning" },
  { key: "internal-training", label: "Internal Training", icon: "training" }
];

let partnersCache = null;
function getPartners() {
  if (partnersCache) return partnersCache;
  partnersCache = DEFAULT_PARTNERS;
  try {
    const row = getTimelineStoreRow("partners");
    if (row && row.data && Array.isArray(row.data.items) && row.data.items.length > 0) {
      partnersCache = row.data.items;
    }
  } catch (e) {
    Logger.log("getPartners Error: " + e.message);
  }
  return partnersCache;
}

function normName(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Partner ของ Channel (ชื่อในช่อง broker ของงาน) ใช้กติกาเดียวกับ partnerOf() บนเว็บ
function partnerOf(channel, partners) {
  if (!channel) return UNASSIGNED_PARTNER;
  const key = normName(channel);
  const exact = partners.filter(p => (p.channels || []).some(c => normName(c) === key))[0];
  if (exact) return exact;
  const loose = partners.filter(p =>
    key.indexOf(normName(p.name)) >= 0 ||
    (p.channels || []).some(c => key.indexOf(normName(c)) >= 0 || normName(c).indexOf(key) >= 0)
  )[0];
  return loose || UNASSIGNED_PARTNER;
}

// งานแยกตาม Partner เรียงตามจำนวนงาน
function groupByPartner(items, partners) {
  const order = partners.concat([UNASSIGNED_PARTNER]).map(p => p.id);
  const map = {};
  items.forEach(it => {
    const p = partnerOf(it.broker, partners);
    if (!map[p.id]) map[p.id] = { partner: p, items: [], channels: {} };
    map[p.id].items.push(it);
    const ch = String(it.broker || "Other").trim();
    map[p.id].channels[ch] = (map[p.id].channels[ch] || 0) + 1;
  });
  return Object.keys(map)
    .map(k => map[k])
    .sort((a, b) => b.items.length - a.items.length || order.indexOf(a.partner.id) - order.indexOf(b.partner.id));
}

// งานเสร็จครบหรือยัง (เหมือน checkIsProjectCompleted บนเว็บ แต่เทียบวัน Launch ระดับเดือน)
function isProjectCompleted(item, targetMonth) {
  const ms = item.milestones || {};
  if (ms["launch"] && ms["launch"].status === "completed") return true;
  if (ms["internal-training"] && ms["internal-training"].status === "completed") return true;
  const keys = Object.keys(ms).filter(k => ms[k]);
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "kick-off")) return false;
  if (!keys.every(k => ms[k].status === "completed")) return false;
  if (!item.commercialDate || String(item.commercialDate).toLowerCase().indexOf("tbc") >= 0) return false;
  return hasLaunchedBefore(item, targetMonth) || matchesTargetMonth(item.commercialDate, targetMonth);
}

// ขั้นปัจจุบัน: ขั้นที่ทีมติ๊ก "ตอนนี้" (isElearningIcon) หรือขั้นแรกที่ยังไม่เสร็จ (-1 ถ้าเสร็จครบ)
function currentStepIndex(item, targetMonth) {
  if (isProjectCompleted(item, targetMonth)) return -1;
  const ms = item.milestones || {};
  let marked = -1;
  STEPS.forEach((s, i) => { if (ms[s.key] && ms[s.key].isElearningIcon) marked = i; });
  if (marked >= 0) return marked;
  for (let i = 0; i < STEPS.length; i++) {
    const m = ms[STEPS[i].key];
    if (m && m.status !== "completed") return i;
  }
  return -1;
}

// "20 Nov 2026" -> "20 Nov"
function shortDate(s) {
  return String(s || "").replace(/[, ]*\b(20\d{2}|25\d{2})\b/g, "").trim();
}

// ---------- ชิ้นส่วน Flex แบบ B ----------

// โลโก้ CODY + ชื่อ อยู่บนสุดของแถบแดงทุกการ์ด
function flexBrandRow(caption) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    alignItems: "center",
    contents: [
      {
        type: "box",
        layout: "vertical",
        flex: 0,
        width: "30px",
        height: "30px",
        cornerRadius: "9px",
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        contents: [{ type: "image", url: ICON_BASE + "cody-logo.png", size: "26px", aspectMode: "fit" }]
      },
      {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: BOT_NAME, size: "sm", weight: "bold", color: "#FFFFFF" },
          { type: "text", text: caption, size: "xxs", color: "#FFFFFF", wrap: true }
        ]
      }
    ]
  };
}

// แถบแดงด้านบน: โลโก้ ตัวเลขใหญ่ และบรรทัดย่อย
function flexHero(caption, bigNumber, bigLabel, sub) {
  const contents = [
    flexBrandRow(caption),
    {
      type: "box",
      layout: "baseline",
      spacing: "md",
      margin: "lg",
      contents: [
        { type: "text", text: String(bigNumber), size: "5xl", weight: "bold", color: "#FFFFFF", flex: 0 },
        { type: "text", text: bigLabel, size: "lg", weight: "bold", color: "#FFFFFF", wrap: true }
      ]
    }
  ];
  if (sub) contents.push({ type: "text", text: sub, size: "xs", color: "#FFFFFF", margin: "sm", wrap: true });
  return { type: "box", layout: "vertical", backgroundColor: UI.red, paddingAll: "20px", paddingBottom: "22px", contents: contents };
}

// แถบหัวที่เป็นชื่อ (project, คน, Partner)
function flexTitleHero(caption, title, sub, color) {
  const contents = [
    flexBrandRow(caption),
    { type: "text", text: title, size: "xl", weight: "bold", color: "#FFFFFF", margin: "lg", wrap: true }
  ];
  if (sub) contents.push({ type: "text", text: sub, size: "xs", color: "#FFFFFF", margin: "sm", wrap: true });
  return { type: "box", layout: "vertical", backgroundColor: color || UI.red, paddingAll: "20px", contents: contents };
}

// ไอคอนในกล่องสี (สี่เหลี่ยมมนหรือวงกลม)
function flexIconTile(name, iconColor, bg, size, round) {
  const px = size || 28;
  return {
    type: "box",
    layout: "vertical",
    flex: 0,
    width: px + "px",
    height: px + "px",
    cornerRadius: round ? Math.round(px / 2) + "px" : Math.round(px / 3.5) + "px",
    backgroundColor: bg,
    justifyContent: "center",
    alignItems: "center",
    contents: [{ type: "image", url: iconUrl(name, iconColor), size: Math.round(px * 0.6) + "px", aspectMode: "fit" }]
  };
}

// แถวข้อมูล: ไอคอน ชื่อ และค่าทางขวา
function flexInfoRow(icon, label, value, valueColor) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    alignItems: "center",
    contents: [
      flexIconTile(icon, "ink", UI.surface, 28, false),
      { type: "text", text: label, size: "sm", color: UI.soft, flex: 3 },
      { type: "text", text: value, size: "sm", weight: "bold", color: valueColor || UI.ink, align: "end", flex: 2 }
    ]
  };
}

// ป้ายสถานะแบบเม็ดยา
function flexPill(text, color, bg) {
  return {
    type: "box",
    layout: "vertical",
    flex: 0,
    backgroundColor: bg,
    cornerRadius: "999px",
    paddingTop: "4px",
    paddingBottom: "4px",
    paddingStart: "10px",
    paddingEnd: "10px",
    contents: [{ type: "text", text: text, size: "xs", weight: "bold", color: color }]
  };
}

// แถบสัดส่วนตาม Partner
function flexPartnerBar(groups) {
  return {
    type: "box",
    layout: "horizontal",
    height: "12px",
    cornerRadius: "6px",
    spacing: "xs",
    contents: groups.map(g => ({
      type: "box",
      layout: "vertical",
      flex: g.items.length,
      backgroundColor: g.partner.color,
      contents: [{ type: "filler" }]
    }))
  };
}

// แถว Partner: สี ชื่อ Channel ย่อย และจำนวน
function flexPartnerRow(g, total) {
  const channels = Object.keys(g.channels).map(c => c + " " + g.channels[c]).join(" · ");
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    alignItems: "center",
    contents: [
      flexIconTile("partner", "white", g.partner.color, 30, false),
      {
        type: "box",
        layout: "vertical",
        flex: 4,
        contents: [
          { type: "text", text: g.partner.name, size: "sm", weight: "bold", color: UI.ink },
          { type: "text", text: channels, size: "xxs", color: UI.soft, wrap: true }
        ]
      },
      {
        type: "text",
        text: g.items.length + (total ? " · " + Math.round((g.items.length / total) * 100) + "%" : ""),
        size: "sm",
        weight: "bold",
        color: UI.ink,
        align: "end",
        flex: 2
      }
    ]
  };
}

function flexButton(label, action, primary) {
  return primary
    ? { type: "button", style: "primary", color: UI.red, height: "sm", action: Object.assign({ label: label }, action) }
    : { type: "button", style: "secondary", color: UI.surface, height: "sm", action: Object.assign({ label: label }, action) };
}

function flexBubble(header, bodyContents, footerContents) {
  const bubble = {
    type: "bubble",
    size: "mega",
    header: header,
    body: { type: "box", layout: "vertical", paddingAll: "20px", spacing: "lg", backgroundColor: "#FFFFFF", contents: bodyContents },
    styles: { header: { backgroundColor: UI.red } }
  };
  if (footerContents && footerContents.length) {
    bubble.footer = { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", paddingTop: "0px", contents: footerContents };
  }
  return bubble;
}

// 0. HTTP GET Endpoint (สำหรับ Web Cron เช่น cron-job.org หรือเปิดเช็กสถานะ)
function doGet(e) {
  // หากมีพารามิเตอร์ ?action=send_monday&key=<CRON_SECRET> จะสั่งส่งสรุปวันจันทร์ทันที
  if (e && e.parameter && e.parameter.action === "send_monday") {
    if (!CRON_SECRET || e.parameter.key !== CRON_SECRET) {
      return ContentService.createTextOutput("Forbidden").setMimeType(ContentService.MimeType.TEXT);
    }
    sendMondayMorningSummary();
    return ContentService.createTextOutput("Monday summary triggered successfully!").setMimeType(ContentService.MimeType.TEXT);
  }

  // ?action=process_announcements&key=<CRON_SECRET> ส่งประกาศที่ถึงเวลา
  // (ให้ระบบภายนอกเรียกทุก 5 นาที แทน Trigger ของ GAS)
  if (e && e.parameter && e.parameter.action === "process_announcements") {
    if (!CRON_SECRET || e.parameter.key !== CRON_SECRET) {
      return ContentService.createTextOutput("Forbidden").setMimeType(ContentService.MimeType.TEXT);
    }
    processAnnouncementQueue();
    return ContentService.createTextOutput("Announcement queue processed").setMimeType(ContentService.MimeType.TEXT);
  }
  return ContentService.createTextOutput("CD-Notify Webhook is Active!").setMimeType(ContentService.MimeType.TEXT);
}

// 1. Webhook Entry Point (Strict Anti-Spam Gate)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    const data = JSON.parse(e.postData.contents);
    const events = data.events || [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const replyToken = ev.replyToken;
      const groupId = (ev.source && (ev.source.groupId || ev.source.roomId)) || "";

      // Postback Action (ผู้ใช้กดปุ่มจากการ์ด)
      if (ev.type === "postback") {
        const postData = ev.postback.data || "";
        handlePostback(replyToken, postData, groupId);
        continue;
      }

      // Message Action (ผู้ใช้พิมพ์ข้อความ)
      if (ev.type === "message" && ev.message.type === "text") {
        const rawText = ev.message.text.trim();

        // 🛡️ กันสแปม: ตอบเฉพาะข้อความที่ขึ้นต้นด้วยชื่อบอท "CODY" / "โคดี้" (หรือ "CD" แบบเดิม)
        const isStrictCd = BOT_PREFIX.test(rawText);

        if (!isStrictCd) {
          continue; // ข้ามทันที ไม่ตอบ ไม่ประมวลผล
        }

        // ส่งข้อความไปวิเคราะห์ด้วย Smart NLP Router
        handleSmartCdCommand(replyToken, rawText, groupId);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log("doPost Error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. Postback Action Handler
function handlePostback(replyToken, postData, groupId) {
  if (groupId) saveGroupIdToSupabase(groupId);

  if (postData === "action=view_chart") {
    replyChannelChart(replyToken);
  } else if (postData === "action=ask_search") {
    replyQuickSearchMenu(replyToken);
  } else if (postData.indexOf("action=view_proj&name=") === 0) {
    const projName = decodeURIComponent(postData.replace("action=view_proj&name=", ""));
    replyProjectTimeline(replyToken, projName);
  }
}

// 3. Smart NLP Router: วิเคราะห์เจตนาของประโยคหลังคำว่า CD
function handleSmartCdCommand(replyToken, rawText, groupId) {
  if (groupId) saveGroupIdToSupabase(groupId);

  let query = rawText.replace(BOT_PREFIX_STRIP, "").trim();

  // A. พิมพ์ "CD" เฉยๆ หรือพิมพ์ว่า "เมนู" -> แสดง SlipOK Main Menu
  if (!query || query.toLowerCase() === "menu" || query === "เมนู") {
    replySlipOkMainMenu(replyToken, groupId);
    return;
  }

  const cleanQuery = query.toLowerCase();

  // A2. วิธีใช้
  if (cleanQuery === "help" || cleanQuery.includes("ช่วย") || cleanQuery.includes("วิธีใช้") || cleanQuery.includes("ทำอะไรได้")) {
    replyHelp(replyToken, "", getNormalizedTimelineData().items);
    return;
  }

  // B. ขอรูป Timeline: เช่น "CD รูป", "CD ขอภาพหน่อย", "CD ดู timeline"
  if (cleanQuery.includes("รูป") || cleanQuery.includes("ภาพ") || cleanQuery.includes("timeline") || cleanQuery.includes("image")) {
    replyTimelineImages(replyToken);
    return;
  }

  // C. ขอสรุปช่องทาง: เช่น "CD chart", "CD สรุปช่องทาง", "CD กราฟ"
  if (cleanQuery.includes("chart") || cleanQuery.includes("กราฟ") || cleanQuery.includes("ช่องทาง") || cleanQuery.includes("สรุป") || cleanQuery.includes("partner")) {
    replyChannelChart(replyToken);
    return;
  }

  // D. ระบบยืนยันสิทธิ์ห้อง Lead: "CD auth <PIN>"
  if (cleanQuery.startsWith("auth")) {
    const parts = query.split(/\s+/);
    const pin = parts[1] || "";
    if (MANAGER_PIN && pin === MANAGER_PIN) {
      if (groupId) {
        addLeadRoomToSupabase(groupId);
        replyLineText(replyToken, "✅ ยืนยันสิทธิ์ห้อง Lead สำเร็จ!\nห้องนี้สามารถดูโหลดงานรายคนได้แล้วครับ พิมพ์ CD เพื่อดูเมนูได้เลย");
      } else {
        replyLineText(replyToken, "⚠️ กรุณาใช้คำสั่ง CODY auth ในกลุ่มห้องทำงานครับ");
      }
    } else {
      replyLineText(replyToken, "❌ รหัส PIN ไม่ถูกต้องครับ");
    }
    return;
  }

  // E. ภาระงานทีม: "CD workload" หรือ "CD ภาระงาน"
  if (cleanQuery.includes("workload") || cleanQuery.includes("ภาระงาน") || cleanQuery.includes("โหลดงาน")) {
    const leadRooms = getLeadRoomsFromSupabase();
    if (!leadRooms.includes(groupId)) {
      replyLineText(replyToken, "🔒 เมนูนี้เฉพาะห้อง Lead เท่านั้น\nติดต่อหัวหน้าทีมเพื่อขอ PIN ยืนยันห้องครับ");
      return;
    }
    replyTeamWorkload(replyToken);
    return;
  }

  const dataStore = getNormalizedTimelineData();
  const items = dataStore.items;

  if (items.length === 0) {
    replyLineText(replyToken, "ℹ️ ยังไม่มีโปรเจกต์ในเดือน " + dataStore.activeMonth + " ครับ");
    return;
  }

  // F. ตรวจสอบ Partner หรือ Channel จากรายการในหน้า Partners (ชื่อยาวก่อน เช่น "ttb touch" ก่อน "ttb")
  const targets = [];
  getPartners().forEach(p => {
    targets.push({ label: normName(p.name), partner: p, channel: "" });
    (p.channels || []).forEach(c => {
      if (normName(c) !== normName(p.name)) targets.push({ label: normName(c), partner: p, channel: c });
    });
  });
  targets.sort((x, y) => y.label.length - x.label.length);
  const matchedTarget = targets.filter(t => t.label && cleanQuery.includes(t.label))[0];
  if (matchedTarget) {
    replyChannelProjects(replyToken, matchedTarget, items, dataStore.activeMonth);
    return;
  }

  // G. ตรวจสอบชื่อคนรับผิดชอบ
  const matchedByOwner = items.filter(it => it.owner && cleanQuery.includes(it.owner.toLowerCase().trim()));
  if (matchedByOwner.length > 0) {
    replyOwnerProjects(replyToken, matchedByOwner[0].owner, matchedByOwner, dataStore.activeMonth);
    return;
  }

  // H. ตรวจสอบชื่อโปรเจกต์
  const matchedByProj = items.filter(it => it.name && cleanQuery.includes(it.name.toLowerCase().trim()));
  if (matchedByProj.length > 0) {
    replyProjectTimeline(replyToken, matchedByProj[0].name);
    return;
  }

  // I. ค้นหาแบบกว้าง (Partial match)
  const generalMatches = items.filter(it => {
    return (it.name && it.name.toLowerCase().includes(cleanQuery)) ||
           (it.broker && it.broker.toLowerCase().includes(cleanQuery)) ||
           (it.owner && it.owner.toLowerCase().includes(cleanQuery));
  });

  if (generalMatches.length === 1) {
    replyProjectTimeline(replyToken, generalMatches[0].name);
    return;
  } else if (generalMatches.length > 1) {
    replyMultipleMatches(replyToken, cleanQuery, generalMatches);
    return;
  }

  // J. ถ้าหาไม่เจอ -> แนะนำคำค้นหา
  replyHelp(replyToken, query, items);
}

// 4. Flex Message: เมนูหลัก (แบบ B: แถบแดง ตัวเลขใหญ่ สถานะ และสัดส่วนตาม Partner)
function replySlipOkMainMenu(replyToken, groupId) {
  const dataStore = getNormalizedTimelineData();
  const leadRooms = getLeadRoomsFromSupabase();
  const isLead = leadRooms.includes(groupId);
  const flexMessage = buildSlipOkFlexCard(dataStore, isLead);
  replyLineMessages(replyToken, [flexMessage]);
}

// การ์ดสรุปเดือนนี้ ใช้ทั้งเมนูหลักและข้อความวันจันทร์
function buildSlipOkFlexCard(dataStore, isLead) {
  const activeMonth = dataStore.activeMonth;
  const items = dataStore.items;
  const total = items.length;
  const completed = items.filter(it => isProjectCompleted(it, activeMonth)).length;
  const groups = groupByPartner(items, getPartners());

  const body = [
    {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        flexPill(completed + " Completed", UI.done, UI.doneSoft),
        flexPill((total - completed) + " In progress", UI.redInk, UI.redSoft),
        { type: "filler" }
      ]
    },
    flexInfoRow("product", "New Product", String(dataStore.products.length)),
    flexInfoRow("wrench", "Enhancement", String(dataStore.enhancements.length))
  ];

  if (groups.length > 0) {
    body.push({ type: "separator", color: UI.line });
    body.push({ type: "text", text: "Projects by partner", size: "sm", weight: "bold", color: UI.ink });
    body.push(flexPartnerBar(groups));
    body.push({ type: "box", layout: "vertical", spacing: "md", contents: groups.slice(0, 6).map(g => flexPartnerRow(g, 0)) });
  }

  const footer = [
    flexButton("ดูรูป Timeline", { type: "message", text: "CODY รูป" }, true),
    {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        Object.assign(flexButton("By partner", { type: "postback", data: "action=view_chart" }, false), { flex: 1 }),
        Object.assign(flexButton("เปิดเว็บ", { type: "uri", uri: DASHBOARD_WEB_URL }, false), { flex: 1 })
      ]
    }
  ];
  if (isLead) {
    footer.push({ type: "button", style: "link", color: UI.redInk, height: "sm", action: { type: "message", label: "Team workload (Lead)", text: "CODY workload" } });
  }

  return {
    type: "flex",
    altText: "CODY · " + activeMonth + " · " + total + " projects",
    contents: flexBubble(
      flexHero("CD Team Timeline · " + activeMonth, total, "Projects", "Last updated · " + (dataStore.asOfText || "ล่าสุด")),
      body,
      footer
    )
  };
}

// 5. Flex Message: สรุปตาม Partner (เดือนนี้)
function replyChannelChart(replyToken) {
  const dataStore = getNormalizedTimelineData();
  const activeMonth = dataStore.activeMonth;
  const items = dataStore.items;

  if (items.length === 0) {
    replyLineText(replyToken, "ℹ️ ยังไม่มี project ในเดือน " + activeMonth + " ครับ");
    return;
  }

  const total = items.length;
  const groups = groupByPartner(items, getPartners());
  const rows = [];
  groups.forEach((g, i) => {
    if (i > 0) rows.push({ type: "separator", color: UI.line });
    rows.push(flexPartnerRow(g, total));
  });

  const flex = {
    type: "flex",
    altText: "Projects by partner · " + activeMonth,
    contents: flexBubble(
      flexHero("Projects by partner · " + activeMonth, total, "Projects", groups.length + " partners"),
      [flexPartnerBar(groups), { type: "box", layout: "vertical", spacing: "md", contents: rows }],
      [flexButton("เปิดเว็บ Dashboard", { type: "uri", uri: DASHBOARD_WEB_URL }, false)]
    )
  };

  replyLineMessages(replyToken, [flex]);
}

// 6. Flex Message: สถานะ project ทีละขั้น
function replyProjectTimeline(replyToken, projectName) {
  const dataStore = getNormalizedTimelineData();
  const items = dataStore.items;

  const matched = items.filter(it => it.name && it.name.toLowerCase() === projectName.toLowerCase());
  const item = matched.length > 0 ? matched[0] : (items.length > 0 ? items[0] : null);

  if (!item) {
    replyLineText(replyToken, "⚠️ ไม่พบข้อมูล project \"" + projectName + "\"");
    return;
  }

  const ms = item.milestones || {};
  const current = currentStepIndex(item, dataStore.activeMonth);
  const finished = current < 0 && isProjectCompleted(item, dataStore.activeMonth);
  const partner = partnerOf(item.broker, getPartners());

  const stepRows = STEPS.map((s, i) => {
    const m = ms[s.key];
    let kind;
    if (finished || current < 0) kind = m ? "done" : "skip";
    else if (i === current) kind = "now";
    else if (i < current) kind = m ? "done" : "skip";
    else kind = "todo";

    const look = {
      done: { icon: "check", iconColor: "white", bg: UI.done, label: UI.ink, tag: "Completed", tagColor: UI.done },
      now: { icon: s.icon, iconColor: "white", bg: UI.red, label: UI.redInk, tag: "Current", tagColor: UI.redInk },
      todo: { icon: s.icon, iconColor: "grey", bg: UI.surface, label: UI.soft, tag: "Upcoming", tagColor: UI.soft },
      skip: { icon: s.icon, iconColor: "grey", bg: UI.surface, label: UI.soft, tag: "Skipped", tagColor: UI.soft }
    }[kind];

    return {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      alignItems: "center",
      contents: [
        flexIconTile(look.icon, look.iconColor, look.bg, kind === "now" ? 32 : 28, true),
        {
          type: "box",
          layout: "vertical",
          flex: 4,
          contents: [
            { type: "text", text: s.label, size: "sm", weight: kind === "now" ? "bold" : "regular", color: look.label, wrap: true },
            { type: "text", text: look.tag + (m && m.date ? " · " + shortDate(m.date) : ""), size: "xxs", color: look.tagColor }
          ]
        }
      ]
    };
  });

  const launch = shortDate(item.commercialDate) || "TBC";
  const body = [
    {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        flexPill(partner.name + " · " + (item.broker || "-"), "#FFFFFF", partner.color),
        { type: "filler" }
      ]
    },
    { type: "box", layout: "vertical", spacing: "md", contents: stepRows },
    { type: "separator", color: UI.line },
    flexInfoRow("launch", "Target Launch", launch, launch === "TBC" ? UI.soft : UI.redInk),
    flexInfoRow("calendar", "Internal", shortDate(item.internalDate) || "TBC")
  ];

  const status = finished ? "Completed" : current >= 0 ? "Current: " + STEPS[current].label : "In progress";
  const card = {
    type: "flex",
    altText: "Project: " + item.name,
    contents: flexBubble(
      flexTitleHero("Project · " + status, item.name, "Owner · " + (item.owner || "-")),
      body,
      [flexButton("เปิดเว็บ Dashboard", { type: "uri", uri: DASHBOARD_WEB_URL }, false)]
    )
  };

  replyLineMessages(replyToken, [card]);
}

// รายการ project แบบสั้น ใช้ร่วมกันในการ์ด Partner และการ์ดรายคน
function flexProjectRows(list, activeMonth, partners) {
  const rows = [];
  list.forEach((it, i) => {
    if (i > 0) rows.push({ type: "separator", color: UI.line });
    const current = currentStepIndex(it, activeMonth);
    const done = current < 0 && isProjectCompleted(it, activeMonth);
    const p = partnerOf(it.broker, partners);
    rows.push({
      type: "box",
      layout: "horizontal",
      spacing: "md",
      alignItems: "center",
      action: { type: "postback", label: "ดู", data: "action=view_proj&name=" + encodeURIComponent(it.name) },
      contents: [
        flexIconTile("partner", "white", p.color, 28, false),
        {
          type: "box",
          layout: "vertical",
          flex: 5,
          contents: [
            { type: "text", text: it.name, size: "sm", weight: "bold", color: UI.ink, wrap: true },
            {
              type: "text",
              text: (it.broker || "-") + " · " + (done ? "Completed" : current >= 0 ? "Current: " + STEPS[current].label : "In progress"),
              size: "xxs",
              color: done ? UI.done : UI.redInk,
              wrap: true
            }
          ]
        },
        { type: "text", text: shortDate(it.commercialDate) || "TBC", size: "xs", weight: "bold", color: UI.ink, align: "end", flex: 2 }
      ]
    });
  });
  return rows;
}

// 7. Flex Message: project ของ Partner (หรือ Channel) ที่ถาม
function replyChannelProjects(replyToken, target, allItems, activeMonth) {
  const partners = getPartners();
  const filtered = allItems.filter(it =>
    target.channel
      ? normName(it.broker) === normName(target.channel)
      : partnerOf(it.broker, partners).id === target.partner.id
  );
  const label = target.channel || target.partner.name;

  if (filtered.length === 0) {
    replyLineText(replyToken, "ℹ️ ยังไม่มี project ของ " + label + " ในเดือน " + activeMonth + " ครับ");
    return;
  }

  const card = {
    type: "flex",
    altText: "Projects · " + label,
    contents: flexBubble(
      flexTitleHero(
        (target.channel ? "Channel · " + target.partner.name : "Partner") + " · " + activeMonth,
        label,
        filtered.length + " projects · กดชื่อเพื่อดูทีละขั้น",
        target.partner.color
      ),
      [{ type: "box", layout: "vertical", spacing: "md", contents: flexProjectRows(filtered.slice(0, 12), activeMonth, partners) }],
      []
    )
  };
  card.contents.styles = { header: { backgroundColor: target.partner.color } };

  replyLineMessages(replyToken, [card]);
}

// 8. Flex Message: project ของแต่ละคน
function replyOwnerProjects(replyToken, ownerName, ownerItems, activeMonth) {
  const card = {
    type: "flex",
    altText: "Projects of " + ownerName,
    contents: flexBubble(
      flexTitleHero("Owner · " + activeMonth, ownerName, ownerItems.length + " projects · กดชื่อเพื่อดูทีละขั้น"),
      [{ type: "box", layout: "vertical", spacing: "md", contents: flexProjectRows(ownerItems.slice(0, 12), activeMonth, getPartners()) }],
      []
    )
  };

  replyLineMessages(replyToken, [card]);
}

// วิธีคุยกับ CODY (พิมพ์ CODY help หรือเมื่อหาไม่เจอ)
function replyHelp(replyToken, query, items) {
  const tips = [
    ["timeline", "CODY", "เมนูหลักของเดือนนี้"],
    ["chart", "CODY รูป", "รูป Timeline ล่าสุด"],
    ["partner", "CODY สรุป", "จำนวนงานแยกตาม Partner"],
    ["partner", "CODY ttb", "งานของ Partner หรือ Channel"],
    ["user", "CODY Surakit", "งานของแต่ละคน"],
    ["search", "CODY ชื่อ project", "ดูสถานะทีละขั้น"]
  ];
  const rows = tips.map(t => ({
    type: "box",
    layout: "horizontal",
    spacing: "md",
    alignItems: "center",
    contents: [
      flexIconTile(t[0], "red", UI.redSoft, 28, false),
      {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: t[1], size: "sm", weight: "bold", color: UI.ink },
          { type: "text", text: t[2], size: "xxs", color: UI.soft, wrap: true }
        ]
      }
    ]
  }));
  const sample = (items || []).slice(0, 2).map(it =>
    flexButton(it.name.length > 20 ? it.name.substring(0, 18) + ".." : it.name, { type: "postback", data: "action=view_proj&name=" + encodeURIComponent(it.name) }, false)
  );
  const card = {
    type: "flex",
    altText: query ? "CODY: ไม่พบ \"" + query + "\"" : "วิธีใช้ CODY",
    contents: flexBubble(
      flexTitleHero(
        query ? "ไม่พบ \"" + query + "\"" : "วิธีใช้",
        query ? "ลองพิมพ์แบบนี้ได้เลย" : "คุยกับ CODY",
        "พิมพ์ CODY หรือ โคดี้ แล้วเว้นวรรคตามด้วยสิ่งที่อยากรู้"
      ),
      [{ type: "box", layout: "vertical", spacing: "md", contents: rows }],
      sample
    )
  };
  replyLineMessages(replyToken, [card]);
}

// 9. Flex Message: เจอหลายรายการ ให้เลือก
function replyMultipleMatches(replyToken, query, matchedItems) {
  const buttons = matchedItems.slice(0, 4).map(it =>
    flexButton(it.name.length > 20 ? it.name.substring(0, 18) + ".." : it.name, { type: "postback", data: "action=view_proj&name=" + encodeURIComponent(it.name) }, false)
  );

  const card = {
    type: "flex",
    altText: "พบ " + matchedItems.length + " รายการที่เกี่ยวข้อง",
    contents: flexBubble(
      flexTitleHero("Search", "\"" + query + "\"", "พบ " + matchedItems.length + " รายการ กดเลือกดูรายละเอียดได้เลยครับ"),
      buttons,
      []
    )
  };

  replyLineMessages(replyToken, [card]);
}

// 10. Flex Message: เมนูค้นหา project
function replyQuickSearchMenu(replyToken) {
  const dataStore = getNormalizedTimelineData();
  const buttons = dataStore.items.slice(0, 4).map(it =>
    flexButton(it.name.length > 20 ? it.name.substring(0, 18) + ".." : it.name, { type: "postback", data: "action=view_proj&name=" + encodeURIComponent(it.name) }, false)
  );

  const card = {
    type: "flex",
    altText: "ค้นหา project CD",
    contents: flexBubble(
      flexTitleHero("Search", "ค้นหา project", "กดเลือกด้านล่าง หรือพิมพ์ CODY ตามด้วยชื่อ project ได้ทันทีครับ"),
      buttons.length > 0 ? buttons : [{ type: "text", text: "ยังไม่มีรายการ project", size: "sm", color: UI.soft }],
      []
    )
  };

  replyLineMessages(replyToken, [card]);
}

// 11. Timeline Images Handler
function replyTimelineImages(replyToken) {
  const imgData = getLatestImagesFromSupabase();

  if (!imgData || !imgData.product_image_url) {
    replyLineText(replyToken, "⚠️ ยังไม่พบภาพ Timeline ในระบบ\nเปิดเว็บ Dashboard แล้วกดปุ่ม [ 📤 ส่งรูปเข้า LINE ] ได้เลยครับ");
    return;
  }

  const messages = [
    {
      type: "text",
      text: "📊 ภาพสรุป Timeline เดือน " + (imgData.month || "ล่าสุด") + "\n(" + (imgData.as_of_text || "ล่าสุด") + ")"
    },
    {
      type: "image",
      originalContentUrl: imgData.product_image_url,
      previewImageUrl: imgData.product_image_url
    }
  ];

  if (imgData.enhancement_image_url) {
    messages.push({
      type: "image",
      originalContentUrl: imgData.enhancement_image_url,
      previewImageUrl: imgData.enhancement_image_url
    });
  }

  if (imgData.channel_summary_image_url) {
    messages.push({
      type: "image",
      originalContentUrl: imgData.channel_summary_image_url,
      previewImageUrl: imgData.channel_summary_image_url
    });
  }

  replyLineMessages(replyToken, messages);
}

// 12. Lead Workload Handler
function replyTeamWorkload(replyToken) {
  const dataStore = getNormalizedTimelineData();
  const items = dataStore.items;

  if (items.length === 0) {
    replyLineText(replyToken, "⚠️ ไม่พบข้อมูลโปรเจกต์ในเดือนนี้");
    return;
  }

  const workloadMap = {};
  items.forEach(it => {
    const lead = it.owner || "ไม่ระบุ";
    if (!workloadMap[lead]) workloadMap[lead] = 0;
    workloadMap[lead]++;
  });

  let text = "👥 สรุปภาระงานทีม CD (" + dataStore.activeMonth + ")\n------------------------\n";
  for (const member in workloadMap) {
    text += "• " + member + ": " + workloadMap[member] + " งาน\n";
  }

  replyLineText(replyToken, text);
}

// 13. Normalizer & Supabase Helpers (รองรับงานค้างข้ามเดือน ไม่หลุดเป็น 0)
const MONTH_KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// "OCT 2026" -> ตัวเลขที่เรียงลำดับได้ (-1 ถ้าอ่านไม่ออก)
function monthKeyValue(key) {
  const parts = String(key || "").trim().split(/\s+/);
  const idx = MONTH_KEYS.indexOf((parts[0] || "").toUpperCase());
  const year = parseInt(parts[1], 10);
  return idx < 0 || isNaN(year) ? -1 : year * 12 + idx;
}

// บอทใช้เดือนปัจจุบันตามปฏิทิน (เวลาไทย) เสมอ ไม่ขึ้นกับเดือนที่ Admin เปิดดูบนเว็บ
function getCurrentMonthKey() {
  return Utilities.formatDate(new Date(), "Asia/Bangkok", "MMM yyyy").toUpperCase();
}

// "2 Oct 2026" / "Oct 2026" ตรงกับเดือนเป้าหมาย "OCT 2026" หรือไม่ (เหมือน matchesTargetMonth บนเว็บ)
function matchesTargetMonth(dateStr, targetMonth) {
  if (!dateStr) return false;
  const cleanStr = String(dateStr).trim().toLowerCase();
  if (cleanStr.indexOf("tbc") >= 0) return false;
  const parts = String(targetMonth).trim().toLowerCase().split(" ");
  const hasMonth = cleanStr.indexOf(parts[0].slice(0, 3)) >= 0;
  const hasYear = parts[1] ? cleanStr.indexOf(parts[1]) >= 0 : true;
  return hasMonth && hasYear;
}

// วัน Commercial ผ่านไปแล้วก่อนเดือนเป้าหมายหรือยัง (เหมือน hasLaunchedInPast บนเว็บ)
function hasLaunchedBefore(item, targetMonth) {
  if (item.milestones && item.milestones["launch"] && item.milestones["launch"].status === "completed") return true;
  if (!item.commercialDate || String(item.commercialDate).toLowerCase().indexOf("tbc") >= 0) return false;
  const target = monthKeyValue(targetMonth);
  const cClean = String(item.commercialDate).toLowerCase();
  for (let i = 0; i < MONTH_KEYS.length; i++) {
    if (cClean.indexOf(MONTH_KEYS[i].toLowerCase()) >= 0) {
      const yMatch = cClean.match(/\b(20\d{2}|25\d{2})\b/);
      const year = yMatch ? parseInt(yMatch[0], 10) : Math.floor(target / 12);
      return year * 12 + i < target;
    }
  }
  return false;
}

// สถานะหยุดชั่วคราว ณ เดือนเป้าหมาย: เหตุการณ์ หยุด/ทำต่อ ล่าสุดที่ไม่เกินเดือนนั้น
function isPausedAt(allMonths, id, targetMonth) {
  const target = monthKeyValue(targetMonth);
  let latest = null;
  for (const mName in allMonths) {
    const v = monthKeyValue(mName);
    if (v < 0 || v > target) continue;
    const mData = allMonths[mName] || {};
    const copy = (mData.products || []).concat(mData.enhancements || []).filter(it => it && it.id === id && it.pauseState)[0];
    if (copy && (!latest || v > latest.v)) latest = { v: v, state: copy.pauseState };
  }
  return !!latest && latest.state === "paused";
}

// งานของเดือนเป้าหมาย ด้วยกติกาเดียวกับหน้าเว็บ (getItemsForMonth):
// งานของเดือนนั้นเอง + งานจากเดือนอื่นที่วันตรงกับเดือนนี้ + งานค้างจากเดือนก่อนที่ยังไม่ Launch
// ใช้สำเนาล่าสุดของแต่ละงาน และไม่นับงานที่ถูกลบหรือหยุดชั่วคราว
function collectActiveItems(allMonths, targetMonth, listKey) {
  const target = monthKeyValue(targetMonth);
  const monthData = allMonths[targetMonth] || {};
  const rawNative = monthData[listKey] || [];
  const nativeIds = {};
  rawNative.forEach(it => { nativeIds[it.id] = true; });
  const result = rawNative.filter(it => !it.isDeleted);

  const cross = {};
  for (const mName in allMonths) {
    if (mName.toUpperCase() === String(targetMonth).toUpperCase()) continue;
    const v = monthKeyValue(mName);
    const isPriorMonth = v >= 0 && v < target;

    ((allMonths[mName] || {})[listKey] || []).forEach(it => {
      if (it.isDeleted || nativeIds[it.id]) return;
      const isMatch =
        matchesTargetMonth(it.commercialDate, targetMonth) ||
        matchesTargetMonth(it.internalDate, targetMonth) ||
        matchesTargetMonth(it.customRightLabel, targetMonth) ||
        (isPriorMonth && !hasLaunchedBefore(it, targetMonth));
      if (isMatch && (!cross[it.id] || v > cross[it.id].v)) cross[it.id] = { v: v, item: it };
    });
  }
  for (const id in cross) result.push(cross[id].item);

  return result.filter(it => !isPausedAt(allMonths, it.id, targetMonth));
}

function getNormalizedTimelineData() {
  const result = {
    activeMonth: getCurrentMonthKey(),
    asOfText: "as of ล่าสุด",
    products: [],
    enhancements: [],
    items: []
  };

  try {
    const url = SUPABASE_URL + "/rest/v1/timeline_store?id=eq.current&select=data";
    const resp = UrlFetchApp.fetch(url, {
      headers: { "apikey": SUPABASE_SECRET_KEY, "Authorization": "Bearer " + SUPABASE_SECRET_KEY },
      muteHttpExceptions: true
    });
    const rows = JSON.parse(resp.getContentText());
    if (rows && rows.length > 0 && rows[0].data) {
      const allMonths = rows[0].data;
      const currentMonthData = allMonths[result.activeMonth] || {};

      result.products = collectActiveItems(allMonths, result.activeMonth, "products");
      result.enhancements = collectActiveItems(allMonths, result.activeMonth, "enhancements");
      result.items = result.products.concat(result.enhancements);
      if (currentMonthData.asOfText) result.asOfText = currentMonthData.asOfText;
    }
  } catch (e) {
    Logger.log("getNormalizedTimelineData Error: " + e.message);
  }

  return result;
}

function getLatestImagesFromSupabase() {
  try {
    const url = SUPABASE_URL + "/rest/v1/timeline_store?id=eq.latest_image&select=data";
    const resp = UrlFetchApp.fetch(url, {
      headers: { "apikey": SUPABASE_SECRET_KEY, "Authorization": "Bearer " + SUPABASE_SECRET_KEY },
      muteHttpExceptions: true
    });
    const rows = JSON.parse(resp.getContentText());
    return (rows && rows.length > 0) ? rows[0].data : null;
  } catch (e) {
    return null;
  }
}

function saveGroupIdToSupabase(groupId) {
  try {
    UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/timeline_store", {
      method: "post",
      headers: {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: JSON.stringify({ id: "line_group_info", data: { groupId: groupId, updated_at: new Date().toISOString() } }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

function getLeadRoomsFromSupabase() {
  try {
    const url = SUPABASE_URL + "/rest/v1/timeline_store?id=eq.line_lead_rooms&select=data";
    const resp = UrlFetchApp.fetch(url, {
      headers: { "apikey": SUPABASE_SECRET_KEY, "Authorization": "Bearer " + SUPABASE_SECRET_KEY },
      muteHttpExceptions: true
    });
    const rows = JSON.parse(resp.getContentText());
    return (rows && rows.length > 0 && rows[0].data && rows[0].data.roomIds) ? rows[0].data.roomIds : [];
  } catch (e) {
    return [];
  }
}

function addLeadRoomToSupabase(groupId) {
  try {
    const current = getLeadRoomsFromSupabase();
    if (!current.includes(groupId)) {
      current.push(groupId);
      UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/timeline_store", {
        method: "post",
        headers: {
          "apikey": SUPABASE_SECRET_KEY,
          "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify({ id: "line_lead_rooms", data: { roomIds: current, updated_at: new Date().toISOString() } }),
        muteHttpExceptions: true
      });
    }
  } catch (e) {}
}

function replyLineText(replyToken, text) {
  return replyLineMessages(replyToken, [{ type: "text", text: text }]);
}

function replyLineMessages(replyToken, messages) {
  try {
    const resp = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
      muteHttpExceptions: true
    });
    return resp.getResponseCode() === 200;
  } catch (e) {
    return false;
  }
}

// =========================================================================
// 14. Monday Morning Auto-Broadcast (ส่ง Flex Card สวยงาม + รูป Timeline)
// =========================================================================
function sendMondayMorningSummary() {
  try {
    const groupUrl = SUPABASE_URL + "/rest/v1/timeline_store?id=eq.line_group_info&select=data";
    const gResp = UrlFetchApp.fetch(groupUrl, {
      headers: { "apikey": SUPABASE_SECRET_KEY, "Authorization": "Bearer " + SUPABASE_SECRET_KEY },
      muteHttpExceptions: true
    });
    const gRows = JSON.parse(gResp.getContentText());
    if (!gRows || gRows.length === 0 || !gRows[0].data || !gRows[0].data.groupId) {
      Logger.log("No groupId registered in Supabase");
      return;
    }

    const groupId = gRows[0].data.groupId;
    const dataStore = getNormalizedTimelineData();
    const imgData = getLatestImagesFromSupabase();

    // 1. สร้างการ์ด SlipOK Flex Card
    const flexCard = buildSlipOkFlexCard(dataStore, false);

    const messages = [
      flexCard
    ];

    // 2. แนบรูป New Product Timeline
    if (imgData && imgData.product_image_url) {
      messages.push({
        type: "image",
        originalContentUrl: imgData.product_image_url,
        previewImageUrl: imgData.product_image_url
      });
    }

    // 3. แนบรูป Enhancement Timeline
    if (imgData && imgData.enhancement_image_url) {
      messages.push({
        type: "image",
        originalContentUrl: imgData.enhancement_image_url,
        previewImageUrl: imgData.enhancement_image_url
      });
    }

    // 4. แนบรูปสรุปช่องทาง (Channel Summary)
    if (imgData && imgData.channel_summary_image_url) {
      messages.push({
        type: "image",
        originalContentUrl: imgData.channel_summary_image_url,
        previewImageUrl: imgData.channel_summary_image_url
      });
    }

    const resp = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify({ to: groupId, messages: messages }),
      muteHttpExceptions: true
    });

    Logger.log("Monday summary sent status: " + resp.getResponseCode());
  } catch (e) {
    Logger.log("sendMondayMorningSummary Error: " + e.message);
  }
}

// 15. Helper สำหรับตั้งค่า Trigger วันจันทร์แบบแม่นยำ (รันฟังก์ชันนี้ 1 ครั้งใน Script Editor)
function setupMondayWeeklyTrigger() {
  // ลบ Trigger เก่าที่ซ้ำซ้อนออกทั้งหมด
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sendMondayMorningSummary") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // สร้าง Trigger ใหม่: ทุกวันจันทร์ เวลา 08:30 - 09:00 น.
  ScriptApp.newTrigger("sendMondayMorningSummary")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8) // เริ่มต้นตั้งแต่ 8:00 - 9:00 น.
    .nearMinute(30)
    .create();

  Logger.log("✅ ตั้งค่า Trigger ส่งทุกวันจันทร์ เรียบร้อยแล้ว!");
}

// 17. ส่งประกาศจากหน้าเว็บเข้ากลุ่ม LINE
// หน้าเว็บบันทึกประกาศเป็น status "pending" (มี queuedAt) แล้วฟังก์ชันนี้ส่งเมื่อถึงเวลา
// ตั้ง Trigger ทุก 5 นาทีด้วย setupAnnouncementQueueTrigger() (รันครั้งเดียว)
// =========================================================================
function getTimelineStoreRow(id) {
  const resp = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/timeline_store?id=eq." + encodeURIComponent(id) + "&select=data", {
    headers: { "apikey": SUPABASE_SECRET_KEY, "Authorization": "Bearer " + SUPABASE_SECRET_KEY },
    muteHttpExceptions: true
  });
  const rows = JSON.parse(resp.getContentText());
  return rows && rows.length > 0 ? rows[0] : null;
}

function pushLineMessages(to, messages) {
  const resp = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify({ to: to, messages: messages }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code === 200) return { ok: true };

  let detail = resp.getContentText();
  try {
    detail = JSON.parse(detail).message || detail;
  } catch (e) {}
  if (code === 429) detail = "โควตาข้อความ LINE ของเดือนนี้เต็มแล้ว (" + detail + ")";
  return { ok: false, error: "LINE ตอบกลับ " + code + ": " + detail };
}

function buildAnnouncementFlex(item) {
  const title = String(item.title || "ประกาศ");
  const content = String(item.content || "").slice(0, 1500);
  const bubble = {
    type: "bubble",
    header: flexTitleHero("Announcement · ประกาศจากทีม CD", title, ""),
    styles: { header: { backgroundColor: UI.red } },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        { type: "text", text: content || " ", size: "sm", wrap: true, color: UI.ink },
        { type: "text", text: "โดย " + (item.author || "ทีม CD"), size: "xxs", color: UI.soft }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "link",
          height: "sm",
          color: UI.redInk,
          action: { type: "uri", label: "ดูประกาศทั้งหมด", uri: DASHBOARD_WEB_URL + "announcements" }
        }
      ]
    }
  };

  if (item.imageUrl && /^https:\/\//.test(item.imageUrl)) {
    bubble.hero = { type: "image", url: item.imageUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" };
  }

  return { type: "flex", altText: ("📢 " + title).slice(0, 400), contents: bubble };
}

function processAnnouncementQueue() {
  // กันการรันซ้อนกัน ถ้าใช้ LockService ไม่ได้ก็ทำงานต่อ (เรียกห่างกัน 5 นาทีอยู่แล้ว)
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;
  } catch (e) {
    lock = null;
  }

  try {
    const row = getTimelineStoreRow("announcements");
    const items = row && row.data && Array.isArray(row.data.items) ? row.data.items : [];
    const now = Date.now();
    const results = {};

    let groupId = "";
    const groupRow = getTimelineStoreRow("line_group_info");
    if (groupRow && groupRow.data && groupRow.data.groupId) groupId = groupRow.data.groupId;

    items.forEach(item => {
      if (item.status !== "pending" || !item.queuedAt) return;
      const due = new Date(item.scheduledAt).getTime();
      if (isNaN(due) || due > now) return;

      const res = groupId
        ? pushLineMessages(groupId, [buildAnnouncementFlex(item)])
        : { ok: false, error: "บอทยังไม่รู้จักกลุ่ม LINE: พิมพ์ CODY ในกลุ่มหนึ่งครั้งแล้วกดส่งใหม่" };
      results[item.id] = { queuedAt: item.queuedAt, ok: res.ok, error: res.error || "" };
      Logger.log("Announcement " + item.id + ": " + (res.ok ? "sent" : res.error));
    });

    if (Object.keys(results).length === 0) return;

    // อ่านใหม่ก่อนเขียน เพื่อไม่ทับประกาศที่หน้าเว็บเพิ่งบันทึกระหว่างที่บอทกำลังส่ง
    const fresh = getTimelineStoreRow("announcements");
    const freshData = (fresh && fresh.data) || { items: [] };
    const nowIso = new Date().toISOString();
    freshData.items = (freshData.items || []).map(item => {
      const r = results[item.id];
      if (!r || item.queuedAt !== r.queuedAt) return item;
      const updated = Object.assign({}, item, { status: r.ok ? "sent" : "failed", processedQueuedAt: r.queuedAt });
      if (r.ok) {
        updated.sentAt = nowIso;
        delete updated.sendError;
      } else {
        updated.sendError = r.error;
      }
      return updated;
    });
    freshData.updated_at = nowIso;

    UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/timeline_store?id=eq.announcements", {
      method: "patch",
      headers: {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({ data: freshData, updated_at: nowIso, updated_by: "cd_notify_bot" }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("processAnnouncementQueue Error: " + e.message);
  } finally {
    if (lock) lock.releaseLock();
  }
}

// รันครั้งเดียวใน Script Editor: ให้บอทเช็คคิวประกาศทุก 5 นาที (ไม่กระทบ Trigger วันจันทร์)
function setupAnnouncementQueueTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processAnnouncementQueue") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("processAnnouncementQueue").timeBased().everyMinutes(5).create();
  Logger.log("✅ ตั้งค่า Trigger ส่งประกาศทุก 5 นาที เรียบร้อยแล้ว!");
}

// 16. ตรวจว่า Script Properties ตั้งค่าครบ (รันใน Script Editor หนึ่งครั้งหลังตั้งค่า)
function checkScriptProperties() {
  const required = ["LINE_CHANNEL_ACCESS_TOKEN", "SUPABASE_SECRET_KEY", "MANAGER_PIN", "CRON_SECRET"];
  const missing = required.filter(function (k) { return !SCRIPT_PROPS.getProperty(k); });
  Logger.log(missing.length ? "❌ ยังไม่ได้ตั้งค่า: " + missing.join(", ") : "✅ Script Properties ครบแล้ว");
}

// 16. Rich Menu ของ CODY (ขึ้นเฉพาะแชตส่วนตัวกับ CODY, LINE ไม่แสดงในกลุ่ม)
// รันฟังก์ชันนี้ 1 ครั้งใน Script Editor หลังเว็บ deploy แล้ว (รูปอยู่ที่ public/cody/rich-menu.png)
// กดปุ่มแล้ว = ผู้ใช้พิมพ์ "CODY timeline" / "CODY partner" / "CODY help" ซึ่ง CODY ตอบกลับ (ไม่นับโควตา)
const RICH_MENU_NAME = "CODY menu";

function setupRichMenu() {
  const headers = { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN };

  // ลบเมนู CODY เดิม (ถ้ามี) เพื่อไม่ให้ซ้ำ
  const listResp = UrlFetchApp.fetch("https://api.line.me/v2/bot/richmenu/list", { headers: headers, muteHttpExceptions: true });
  const existing = (JSON.parse(listResp.getContentText()).richmenus || []).filter(function (m) { return m.name === RICH_MENU_NAME; });
  existing.forEach(function (m) {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/richmenu/" + m.richMenuId, { method: "delete", headers: headers, muteHttpExceptions: true });
  });

  // สร้างเมนู 3 ช่อง ขนาดรูป 2500 x 843
  const area = function (x, width, text) {
    return { bounds: { x: x, y: 0, width: width, height: 843 }, action: { type: "message", label: text, text: text } };
  };
  const createResp = UrlFetchApp.fetch("https://api.line.me/v2/bot/richmenu", {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify({
      size: { width: 2500, height: 843 },
      selected: true,
      name: RICH_MENU_NAME,
      chatBarText: "เมนู CODY",
      areas: [area(0, 833, "CODY timeline"), area(833, 834, "CODY partner"), area(1667, 833, "CODY help")]
    }),
    muteHttpExceptions: true
  });
  if (createResp.getResponseCode() !== 200) {
    Logger.log("❌ สร้างเมนูไม่สำเร็จ: " + createResp.getContentText());
    return;
  }
  const richMenuId = JSON.parse(createResp.getContentText()).richMenuId;

  // อัปโหลดรูปเมนูจากเว็บ
  const image = UrlFetchApp.fetch(DASHBOARD_WEB_URL + "cody/rich-menu.png").getBlob();
  const uploadResp = UrlFetchApp.fetch("https://api-data.line.me/v2/bot/richmenu/" + richMenuId + "/content", {
    method: "post",
    contentType: "image/png",
    headers: headers,
    payload: image.getBytes(),
    muteHttpExceptions: true
  });
  if (uploadResp.getResponseCode() !== 200) {
    Logger.log("❌ อัปโหลดรูปเมนูไม่สำเร็จ: " + uploadResp.getContentText());
    return;
  }

  // ตั้งเป็นเมนูหลักให้ทุกคนที่แชตกับ CODY
  const defaultResp = UrlFetchApp.fetch("https://api.line.me/v2/bot/user/all/richmenu/" + richMenuId, {
    method: "post",
    headers: headers,
    muteHttpExceptions: true
  });
  Logger.log(defaultResp.getResponseCode() === 200 ? "✅ ตั้ง Rich Menu แล้ว: " + richMenuId : "❌ ตั้งเป็นเมนูหลักไม่สำเร็จ: " + defaultResp.getContentText());
}
