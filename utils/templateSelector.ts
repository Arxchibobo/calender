import { CalendarPageData, TemplateID } from '../types';

export const selectTemplate = (data: CalendarPageData): TemplateID => {
  // 1. Priority: Holiday or Festival Badge -> Template C
  if (data.festival_badge?.enabled || data.is_holiday) {
    return 'C';
  }

  // 2. Priority: "Manifesto/IP" style content or Monthly Magazine style -> Template B
  // Keywords indicating manifesto/call to action
  const manifestoKeywords = ["让我们", "一起", "成为", "加入", "打造", "目标", "相信", "力量"];
  const isManifesto = manifestoKeywords.some(keyword => data.content.quote_cn.includes(keyword));
  
  // Also check if canvas implies a specific monthly magazine format (usually purely vertical and designated)
  // For now, we trust the quote logic mostly.
  if (isManifesto) {
    return 'B';
  }

  // 3. Priority: Illustration/Art/Poster style -> Template D
  const artTags = ["插画", "海报", "艺术", "绘画", "Illustration", "Art", "Poster", "Design"];
  const isArt = data.content.tags.some(tag => artTags.some(t => tag.toLowerCase().includes(t.toLowerCase())));
  
  if (isArt) {
    return 'D';
  }

  // 4. Default -> Template A
  return 'A';
};