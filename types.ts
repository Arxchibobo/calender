import React from 'react';

export type TemplateID = 'A' | 'B' | 'C' | 'D';

export interface Layer {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text?: string; // For text layers
  src?: string;  // For image layers
  rotation?: number;
  zIndex?: number;
  style?: React.CSSProperties;
}

export interface CalendarPageData {
  page_id: string;
  date_gregorian: string;
  month: number;
  day: number;
  weekday_cn: string;
  lunar_cn: string;
  is_holiday: boolean;
  holiday_name_cn?: string;
  festival_badge?: {
    enabled: boolean;
    type?: string;
    label_cn?: string;
  };
  author: {
    name_cn: string;
    handle?: string;
    bio_cn: string;
    avatar_url: string;
  };
  content: {
    quote_cn: string;
    tags: string[];
  };
  image: {
    main_url: string;
    main_alt?: string;
    focal?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    safe_area?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  branding: {
    left_brand: string;
    left_icon_url?: string;
    right_brand?: string;
    right_icon_url?: string;
  };
  theme?: {
    background_color?: string;
    primary_color?: string;
    text_color?: string;
  };
  // NEW: Canvas Editing Features
  overrides?: Record<string, React.CSSProperties>; // Keyed by element ID
  layers?: Layer[]; // Extra added elements
  output?: {
    canvas_px?: { width: number; height: number };
    dpi?: number;
    format?: string;
  };
}

export const DEFAULT_DATA: CalendarPageData = {
  page_id: "2026-01-03",
  date_gregorian: "2026-01-03",
  month: 1,
  day: 3,
  weekday_cn: "星期五",
  lunar_cn: "腊月初四",
  is_holiday: false,
  holiday_name_cn: "",
  festival_badge: {
    enabled: false,
    label_cn: ""
  },
  author: {
    name_cn: "张宇轩Apollo",
    bio_cn: "INTJ 5w6 摩羯座",
    avatar_url: "https://picsum.photos/100/100",
    handle: ""
  },
  content: {
    quote_cn: "天空没有鸟的痕迹，但我已飞过",
    tags: ["通往AGI之路"]
  },
  image: {
    main_url: "https://picsum.photos/800/800",
    main_alt: "Cyberpunk robot",
    focal: "center",
    safe_area: {
      top: 0.1,
      bottom: 0.2,
      left: 0.05,
      right: 0.05
    }
  },
  branding: {
    left_brand: "通往AGI之路",
    left_icon_url: "",
    right_brand: "",
    right_icon_url: ""
  },
  theme: {
    background_color: "#FFFFFF",
    primary_color: "#D13429",
    text_color: "#000000"
  },
  overrides: {},
  layers: []
};