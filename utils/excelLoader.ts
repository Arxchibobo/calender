import * as XLSX from 'xlsx';
import { CalendarPageData, DEFAULT_DATA } from '../types';

export const parseExcelFile = async (file: File): Promise<CalendarPageData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // cellDates: true helps with date formats
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with headers
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (!rawData || rawData.length === 0) {
            reject("No data found in spreadsheet");
            return;
        }

        // Map rows to CalendarPageData
        const parsedData: CalendarPageData[] = rawData.map((row, index) => {
            // Helper to find key case-insensitively
            const getVal = (keys: string[]) => {
                for (const k of keys) {
                    // check exact match
                    if (row[k] !== undefined) return row[k];
                    // check lowercase match
                    const lowerKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                    if (lowerKey) return row[lowerKey];
                }
                return undefined;
            };

            // Date parsing logic
            const rawDate = getVal(['date', '日期', 'day', 'gregorian']);
            let dateObj = new Date();
            
            if (rawDate instanceof Date) {
                dateObj = rawDate;
            } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) dateObj = d;
                else dateObj = new Date(2026, 0, 1); // Fallback
            } else {
                dateObj = new Date(2026, 0, 1); // Fallback
            }

            const quote = getVal(['quote', 'content', 'text', '文案', '金句', 'quote_cn']) || DEFAULT_DATA.content.quote_cn;
            const authorName = getVal(['author', 'author_name', 'name', '作者', '姓名', 'author_cn']) || DEFAULT_DATA.author.name_cn;
            const authorBio = getVal(['bio', 'author_bio', 'description', '简介', 'bio_cn']) || DEFAULT_DATA.author.bio_cn;
            const authorAvatar = getVal(['avatar', 'avatar_url', 'headshot', '头像', 'author_img']) || DEFAULT_DATA.author.avatar_url;
            const mainImage = getVal(['image', 'image_url', 'main_image', '图片', 'center_image', 'pic']) || DEFAULT_DATA.image.main_url;
            const brandLeft = getVal(['brand', 'brand_name', 'logo_text', '品牌', 'left_brand']) || DEFAULT_DATA.branding.left_brand;
            
            // Explicitly parse lunar date
            const lunar = getVal(['lunar', 'nongli', '农历', 'lunar_cn', 'lunar_date']);

            return {
                ...DEFAULT_DATA,
                page_id: `batch-${index}-${dateObj.toISOString().split('T')[0]}`,
                date_gregorian: dateObj.toISOString().split('T')[0],
                month: dateObj.getMonth() + 1,
                day: dateObj.getDate(),
                // Basic check for weekend to guess weekday
                weekday_cn: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][dateObj.getDay()], 
                lunar_cn: lunar ? String(lunar) : DEFAULT_DATA.lunar_cn, 
                is_holiday: !!getVal(['is_holiday', 'holiday', '节日']),
                content: {
                    ...DEFAULT_DATA.content,
                    quote_cn: String(quote)
                },
                author: {
                    ...DEFAULT_DATA.author,
                    name_cn: String(authorName),
                    bio_cn: String(authorBio),
                    avatar_url: String(authorAvatar)
                },
                image: {
                    ...DEFAULT_DATA.image,
                    main_url: String(mainImage)
                },
                branding: {
                    ...DEFAULT_DATA.branding,
                    left_brand: String(brandLeft)
                }
            };
        });

        resolve(parsedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};