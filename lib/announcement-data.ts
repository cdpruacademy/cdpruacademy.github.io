// pending = waiting for the LINE bot (GAS checks every 5 minutes); sent / failed are set by the bot
export type AnnouncementStatus = "sent" | "pending" | "draft" | "failed";

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
  queuedAt?: string; // Set by the website each time the item is (re)queued for sending
  processedQueuedAt?: string; // Set by the bot: the queuedAt it has sent or failed
  sendError?: string; // Set by the bot when sending failed
}

/**
 * The bot updates status in the same cloud row the website saves, so before saving keep the
 * bot's result for every item whose current queue request it has already processed.
 */
export function mergeBotResults(
  local: AnnouncementItem[],
  cloud: AnnouncementItem[]
): AnnouncementItem[] {
  const cloudById = new Map(cloud.map((c) => [c.id, c]));
  return local.map((item) => {
    const c = cloudById.get(item.id);
    if (!c || !c.processedQueuedAt || c.processedQueuedAt !== item.queuedAt) return item;
    return {
      ...item,
      status: c.status,
      sentAt: c.sentAt,
      sendError: c.sendError,
      processedQueuedAt: c.processedQueuedAt,
    };
  });
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

