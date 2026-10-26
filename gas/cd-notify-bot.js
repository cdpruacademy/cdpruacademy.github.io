// =========================================================================
// CD-NOTIFY: SMART NLP ENGINE (ANTI-SPAM 100% + SLIPOK MINIMALIST DESIGN)
// Google Apps Script (GAS) Backend for CD-Notify LINE Bot
// Last Updated: October 2026
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

// Palette สีของช่องทางจำหน่าย (ตรงกับหน้า Dashboard)
const CHANNEL_COLORS = {
  "TTB": "#009FE3",
  "CIMB": "#7E1518",
  "UOB": "#0B2265",
  "AGENCY": "#ED1C24",
  "DIRECT": "#10B981",
  "SCB": "#4E2E7F",
  "OTHER": "#64748B"
};

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

        // 🛡️ กฎเหล็ก Anti-Spam 100%: ต้องขึ้นต้นด้วยคำว่า "CD" หรือ "cd" หรือ "cdครับ" เท่านั้น!
        const isStrictCd = /^cd(\s+.*)?$/i.test(rawText) || /^cdครับ/i.test(rawText) || /^@cd-notify/i.test(rawText);

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

  let query = rawText.replace(/^@cd-notify\s*/i, "").replace(/^cdครับ\s*/i, "").replace(/^cd\s*/i, "").trim();

  // A. พิมพ์ "CD" เฉยๆ หรือพิมพ์ว่า "เมนู" -> แสดง SlipOK Main Menu
  if (!query || query.toLowerCase() === "menu" || query === "เมนู") {
    replySlipOkMainMenu(replyToken, groupId);
    return;
  }

  const cleanQuery = query.toLowerCase();

  // B. ขอรูป Timeline: เช่น "CD รูป", "CD ขอภาพหน่อย", "CD ดู timeline"
  if (cleanQuery.includes("รูป") || cleanQuery.includes("ภาพ") || cleanQuery.includes("timeline") || cleanQuery.includes("image")) {
    replyTimelineImages(replyToken);
    return;
  }

  // C. ขอสรุปช่องทาง: เช่น "CD chart", "CD สรุปช่องทาง", "CD กราฟ"
  if (cleanQuery.includes("chart") || cleanQuery.includes("กราฟ") || cleanQuery.includes("ช่องทาง") || cleanQuery.includes("สรุป")) {
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
        replyLineText(replyToken, "⚠️ กรุณาใช้คำสั่ง CD auth ในกลุ่มห้องทำงานครับ");
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

  // F. ตรวจสอบช่องทางจำหน่าย (TTB, CIMB, UOB, SCB, Agency, Direct)
  const channels = ["ttb", "cimb", "uob", "agency", "direct", "scb"];
  const matchedChannel = channels.find(ch => cleanQuery.includes(ch));
  if (matchedChannel) {
    replyChannelProjects(replyToken, matchedChannel.toUpperCase(), items, dataStore.activeMonth);
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
  const sampleNames = items.slice(0, 4).map(it => "• CD " + it.name).join("\n");
  replyLineText(replyToken, "🔍 ไม่พบข้อมูลที่ตรงกับ \"" + query + "\"\n\n💡 คุณสามารถพิมพ์ค้นหาได้เช่น:\n• CD รูป (ดู Timeline)\n• CD cimb หรือ CD ttb (ดูงานแยกช่องทาง)\n• CD ตามด้วยชื่อโปรเจกต์ เช่น:\n" + sampleNames);
}

// 4. Flex Message: SlipOK Minimalist Main Menu
function replySlipOkMainMenu(replyToken, groupId) {
  const dataStore = getNormalizedTimelineData();
  const leadRooms = getLeadRoomsFromSupabase();
  const isLead = leadRooms.includes(groupId);
  const flexMessage = buildSlipOkFlexCard(dataStore, isLead);
  replyLineMessages(replyToken, [flexMessage]);
}

// Helper สร้าง Flex Card สไตล์ SlipOK Minimalist
function buildSlipOkFlexCard(dataStore, isLead) {
  const activeMonth = dataStore.activeMonth;
  const totalProjects = dataStore.items.length;
  const productCount = dataStore.products.length;
  const enhancementCount = dataStore.enhancements.length;

  let mainChannel = "-";
  if (dataStore.items.length > 0) {
    const chMap = {};
    dataStore.items.forEach(it => {
      const b = (it.broker || "Other").toUpperCase();
      chMap[b] = (chMap[b] || 0) + 1;
    });
    let maxCount = 0;
    for (const k in chMap) {
      if (chMap[k] > maxCount) {
        maxCount = chMap[k];
        const pct = Math.round((maxCount / totalProjects) * 100);
        mainChannel = k + " (" + pct + "%)";
      }
    }
  }

  const buttons = [
    {
      type: "button",
      style: "primary",
      color: "#ED1C24",
      height: "sm",
      action: {
        type: "message",
        label: "ดูภาพ Timeline ทั้งหมด",
        text: "CD รูป"
      }
    },
    {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "secondary",
          height: "sm",
          color: "#F1F5F9",
          flex: 1,
          action: {
            type: "postback",
            label: "สรุปช่องทาง",
            data: "action=view_chart"
          }
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          color: "#F1F5F9",
          flex: 1,
          action: {
            type: "uri",
            label: "เปิดเว็บ Dashboard",
            uri: DASHBOARD_WEB_URL
          }
        }
      ]
    }
  ];

  if (isLead) {
    buttons.push({
      type: "button",
      style: "link",
      color: "#ED1C24",
      height: "sm",
      action: {
        type: "message",
        label: "ภาระงานทีม (Lead View)",
        text: "CD workload"
      }
    });
  }

  return {
    type: "flex",
    altText: "CD Team Dashboard (" + activeMonth + ")",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "●  ระบบติดตามงาน CD", size: "sm", weight: "bold", color: "#0F172A", flex: 3 },
              { type: "text", text: activeMonth, size: "xs", color: "#94A3B8", align: "end", weight: "bold", flex: 2 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xl",
            spacing: "xs",
            contents: [
              { type: "text", text: "" + totalProjects, size: "4xl", weight: "bold", color: "#ED1C24", flex: 0 },
              { type: "text", text: "โปรเจกต์ที่ดำเนินงาน", size: "sm", color: "#64748B", margin: "sm", weight: "bold" }
            ]
          },
          {
            type: "text",
            text: "ข้อมูลอัปเดตล่าสุด ณ วันที่ " + (dataStore.asOfText || "ล่าสุด"),
            size: "xs",
            color: "#94A3B8",
            margin: "xs"
          },
          { type: "separator", margin: "xl", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "New Products", size: "xs", color: "#64748B", flex: 3 },
                  { type: "text", text: productCount + " งาน", size: "xs", color: "#0F172A", weight: "bold", align: "end", flex: 2 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "Enhancements", size: "xs", color: "#64748B", flex: 3 },
                  { type: "text", text: enhancementCount + " งาน", size: "xs", color: "#0F172A", weight: "bold", align: "end", flex: 2 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "ช่องทางหลัก", size: "xs", color: "#64748B", flex: 3 },
                  { type: "text", text: mainChannel, size: "xs", color: "#ED1C24", weight: "bold", align: "end", flex: 2 }
                ]
              }
            ]
          },
          { type: "separator", margin: "xl", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            margin: "xl",
            contents: buttons
          }
        ]
      }
    }
  };
}

// 5. Flex Message: Channel Summary Chart
function replyChannelChart(replyToken) {
  const dataStore = getNormalizedTimelineData();
  const activeMonth = dataStore.activeMonth;
  const items = dataStore.items;

  if (items.length === 0) {
    replyLineText(replyToken, "ℹ️ ยังไม่มีโปรเจกต์ในเดือน " + activeMonth + " ครับ");
    return;
  }

  const channelMap = {};
  items.forEach(it => {
    const ch = (it.broker || "Other").toUpperCase();
    channelMap[ch] = (channelMap[ch] || 0) + 1;
  });

  const total = items.length;
  const channelBoxes = [];
  const channelCountUnique = Object.keys(channelMap).length;

  for (const ch in channelMap) {
    const count = channelMap[ch];
    const pct = Math.max(5, Math.round((count / total) * 100));
    const col = CHANNEL_COLORS[ch] || CHANNEL_COLORS["OTHER"];

    channelBoxes.push({
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: ch, size: "xs", weight: "bold", color: "#0F172A", flex: 3 },
            { type: "text", text: count + " งาน (" + Math.round((count / total) * 100) + "%)", size: "xs", color: "#64748B", align: "end", flex: 2 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#F1F5F9",
          cornerRadius: "4px",
          height: "6px",
          margin: "sm",
          contents: [
            {
              type: "box",
              layout: "vertical",
              backgroundColor: col,
              cornerRadius: "4px",
              width: pct + "%",
              height: "6px",
              contents: [{ type: "filler" }]
            }
          ]
        }
      ]
    });
  }

  const flex = {
    type: "flex",
    altText: "สรุปช่องทางจำหน่าย CD Team",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "●  สัดส่วนตามช่องทาง", size: "sm", weight: "bold", color: "#0F172A", flex: 3 },
              { type: "text", text: activeMonth, size: "xs", color: "#94A3B8", align: "end", weight: "bold", flex: 2 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xl",
            spacing: "xs",
            contents: [
              { type: "text", text: "" + channelCountUnique, size: "4xl", weight: "bold", color: "#0F172A", flex: 0 },
              { type: "text", text: "ช่องทางที่เปิดขาย", size: "sm", color: "#64748B", margin: "sm", weight: "bold" }
            ]
          },
          { type: "text", text: "รวมงานทั้งหมด " + total + " รายการ", size: "xs", color: "#94A3B8", margin: "xs" },
          { type: "separator", margin: "xl", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "md",
            contents: channelBoxes
          }
        ]
      }
    }
  };

  replyLineMessages(replyToken, [flex]);
}

// 6. Flex Message: Project Stepper Detail
function replyProjectTimeline(replyToken, projectName) {
  const dataStore = getNormalizedTimelineData();
  const items = dataStore.items;

  const matched = items.filter(it => it.name && it.name.toLowerCase() === projectName.toLowerCase());
  const item = matched.length > 0 ? matched[0] : (items.length > 0 ? items[0] : null);

  if (!item) {
    replyLineText(replyToken, "⚠️ ไม่พบข้อมูลโปรเจกต์ \"" + projectName + "\"");
    return;
  }

  const ms = item.milestones || {};
  const stages = [
    { label: "1. Kick-off", status: ms["kick-off"] ? ms["kick-off"].status : "pending" },
    { label: "2. First Draft", status: ms["first-draft"] ? ms["first-draft"].status : "pending" },
    { label: "3. Final Approval", status: ms["final-approval"] ? ms["final-approval"].status : "pending" },
    { label: "4. Target Launch", status: ms["launch"] ? ms["launch"].status : "pending" }
  ];

  const stageRows = stages.map(s => {
    let badgeText = "รอดำเนินการ";
    let badgeColor = "#94A3B8";
    if (s.status === "completed") { badgeText = "เสร็จสิ้น"; badgeColor = "#10B981"; }
    else if (s.status === "in_progress") { badgeText = "กำลังทำ"; badgeColor = "#ED1C24"; }
    else if (s.status === "delayed") { badgeText = "ล่าช้า"; badgeColor = "#F59E0B"; }

    return {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: s.label, size: "xs", color: "#64748B", flex: 3 },
        { type: "text", text: badgeText, size: "xs", color: badgeColor, weight: "bold", align: "end", flex: 2 }
      ]
    };
  });

  const bKey = (item.broker || "OTHER").toUpperCase();
  const bColor = CHANNEL_COLORS[bKey] || CHANNEL_COLORS["OTHER"];

  const card = {
    type: "flex",
    altText: "สถานะโปรเจกต์: " + item.name,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "●  สถานะโปรเจกต์", size: "sm", weight: "bold", color: "#0F172A", flex: 3 },
              { type: "text", text: bKey, size: "xs", color: bColor, align: "end", weight: "bold", flex: 2 }
            ]
          },
          {
            type: "text",
            text: item.name,
            size: "2xl",
            weight: "bold",
            color: "#0F172A",
            margin: "lg",
            wrap: true
          },
          {
            type: "text",
            text: "ผู้รับผิดชอบ: " + (item.owner || "ไม่ระบุ") + " | Target Launch: " + (item.commercialDate || item.internalDate || "-"),
            size: "xs",
            color: "#94A3B8",
            margin: "xs"
          },
          { type: "separator", margin: "xl", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "md",
            contents: stageRows
          }
        ]
      }
    }
  };

  replyLineMessages(replyToken, [card]);
}

// 7. Flex Message: Channel Projects List
function replyChannelProjects(replyToken, channelName, allItems, activeMonth) {
  const filtered = allItems.filter(it => it.broker && it.broker.toUpperCase() === channelName);

  if (filtered.length === 0) {
    replyLineText(replyToken, "ℹ️ ยังไม่มีโปรเจกต์ของช่องทาง " + channelName + " ในเดือน " + activeMonth + " ครับ");
    return;
  }

  const rows = filtered.map(it => {
    return {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: it.name, size: "xs", color: "#0F172A", weight: "bold", flex: 3 },
        { type: "text", text: it.owner || "ไม่ระบุ", size: "xs", color: "#64748B", align: "end", flex: 2 }
      ]
    };
  });

  const bColor = CHANNEL_COLORS[channelName] || CHANNEL_COLORS["OTHER"];

  const card = {
    type: "flex",
    altText: "โปรเจกต์ช่องทาง: " + channelName,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "●  ช่องทางจำหน่าย", size: "sm", weight: "bold", color: "#0F172A", flex: 3 },
              { type: "text", text: activeMonth, size: "xs", color: "#94A3B8", align: "end", weight: "bold", flex: 2 }
            ]
          },
          {
            type: "text",
            text: channelName,
            size: "3xl",
            weight: "bold",
            color: bColor,
            margin: "lg"
          },
          {
            type: "text",
            text: "รวมโปรเจกต์ของช่องทางนี้ " + filtered.length + " รายการ",
            size: "xs",
            color: "#94A3B8",
            margin: "xs"
          },
          { type: "separator", margin: "xl", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "md",
            contents: rows
          }
        ]
      }
    }
  };

  replyLineMessages(replyToken, [card]);
}

// 8. Flex Message: Owner Projects List
function replyOwnerProjects(replyToken, ownerName, ownerItems, activeMonth) {
  const rows = ownerItems.map(it => {
    return {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: it.name + " (" + (it.broker || "-") + ")", size: "xs", color: "#0F172A", weight: "bold", flex: 3 },
        { type: "text", text: it.commercialDate || it.internalDate || "-", size: "xs", color: "#ED1C24", weight: "bold", align: "end", flex: 2 }
      ]
    };
  });

  const card = {
    type: "flex",
    altText: "สรุปงานของ: " + ownerName,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "●  ผู้รับผิดชอบโครงการ", size: "sm", weight: "bold", color: "#0F172A", flex: 3 },
              { type: "text", text: activeMonth, size: "xs", color: "#94A3B8", align: "end", weight: "bold", flex: 2 }
            ]
          },
          {
            type: "text",
            text: ownerName,
            size: "3xl",
            weight: "bold",
            color: "#0F172A",
            margin: "lg"
          },
          {
            type: "text",
            text: "รวมงานที่ดูแลในเดือนนี้ " + ownerItems.length + " โปรเจกต์",
            size: "xs",
            color: "#94A3B8",
            margin: "xs"
          },
          { type: "separator", margin: "xl", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "md",
            contents: rows
          }
        ]
      }
    }
  };

  replyLineMessages(replyToken, [card]);
}

// 9. Flex Message: Multiple Matches Choice
function replyMultipleMatches(replyToken, query, matchedItems) {
  const buttons = matchedItems.slice(0, 4).map(it => {
    return {
      type: "button",
      style: "secondary",
      height: "sm",
      color: "#F1F5F9",
      action: {
        type: "postback",
        label: it.name.length > 20 ? it.name.substring(0, 18) + ".." : it.name,
        data: "action=view_proj&name=" + encodeURIComponent(it.name)
      }
    };
  });

  const card = {
    type: "flex",
    altText: "พบ " + matchedItems.length + " รายการที่เกี่ยวข้อง",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          { type: "text", text: "●  ผลการค้นหา: \"" + query + "\"", size: "sm", weight: "bold", color: "#0F172A" },
          { type: "text", text: "พบข้อมูลที่เกี่ยวข้อง " + matchedItems.length + " รายการ กดเลือกดูรายละเอียดได้เลยครับ", size: "xs", color: "#64748B", margin: "sm", wrap: true },
          { type: "separator", margin: "lg", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            margin: "lg",
            contents: buttons
          }
        ]
      }
    }
  };

  replyLineMessages(replyToken, [card]);
}

// 10. Flex Message: Quick Search Menu
function replyQuickSearchMenu(replyToken) {
  const dataStore = getNormalizedTimelineData();
  const items = dataStore.items;

  const buttons = items.slice(0, 4).map(it => {
    return {
      type: "button",
      style: "secondary",
      height: "sm",
      color: "#F1F5F9",
      action: {
        type: "postback",
        label: it.name.length > 20 ? it.name.substring(0, 18) + ".." : it.name,
        data: "action=view_proj&name=" + encodeURIComponent(it.name)
      }
    };
  });

  const card = {
    type: "flex",
    altText: "ค้นหาโปรเจกต์ CD",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        backgroundColor: "#FFFFFF",
        contents: [
          { type: "text", text: "●  ค้นหาโปรเจกต์ CD", size: "sm", weight: "bold", color: "#0F172A" },
          { type: "text", text: "กดเลือกดูโปรเจกต์ด้านล่าง หรือพิมพ์ เช่น [ CD ตามด้วยชื่อโปรเจกต์ ] ได้ทันทีครับ", size: "xs", color: "#64748B", margin: "sm", wrap: true },
          { type: "separator", margin: "lg", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            margin: "lg",
            contents: buttons.length > 0 ? buttons : [{ type: "text", text: "ยังไม่มีรายการโปรเจกต์", size: "xs", color: "#64748B" }]
          }
        ]
      }
    }
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

// งานที่ยัง active ในเดือนเป้าหมาย: ใช้สำเนาล่าสุดของแต่ละงาน ข้ามงานที่ถูกลบ, หยุดชั่วคราว
// และงานจากเดือนก่อนที่ Launch แล้ว (กติกาเดียวกับหน้าเว็บ)
function collectActiveItems(allMonths, targetMonth, listKey) {
  const target = monthKeyValue(targetMonth);
  const latest = {};
  const pause = {};

  for (const mName in allMonths) {
    const v = monthKeyValue(mName);
    if (v < 0 || v > target) continue;
    const mData = allMonths[mName] || {};

    (mData.products || []).concat(mData.enhancements || []).forEach(it => {
      if (it && it.pauseState && (!pause[it.id] || v > pause[it.id].v)) {
        pause[it.id] = { v: v, state: it.pauseState };
      }
    });

    (mData[listKey] || []).forEach(it => {
      const id = it.id || it.name;
      if (!latest[id] || v > latest[id].v) latest[id] = { v: v, item: it };
    });
  }

  const result = [];
  for (const id in latest) {
    const entry = latest[id];
    const it = entry.item;
    if (it.isDeleted) continue;
    if (pause[id] && pause[id].state === "paused") continue;
    const launched = it.milestones && it.milestones["launch"] && it.milestones["launch"].status === "completed";
    if (entry.v < target && launched) continue;
    result.push(it);
  }
  return result;
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
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "📢 ประกาศจากทีม CD", size: "xs", color: "#ED1C24", weight: "bold" },
        { type: "text", text: title, size: "md", weight: "bold", wrap: true, color: "#1E293B" },
        { type: "text", text: content || " ", size: "sm", wrap: true, color: "#475569" },
        { type: "text", text: "โดย " + (item.author || "ทีม CD"), size: "xxs", color: "#94A3B8" }
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
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;

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
        : { ok: false, error: "บอทยังไม่รู้จักกลุ่ม LINE: พิมพ์ CD ในกลุ่มหนึ่งครั้งแล้วกดส่งใหม่" };
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
    lock.releaseLock();
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
