import { Solar } from 'lunar-javascript';

export const getLunarDate = (year: number, month: number, day: number): string => {
  try {
    const solar = Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();
    return `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  } catch (e) {
    console.error("Lunar conversion error", e);
    return "";
  }
};

export const getWeekday = (year: number, month: number, day: number): string => {
  const date = new Date(year, month - 1, day);
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return days[date.getDay()];
};
