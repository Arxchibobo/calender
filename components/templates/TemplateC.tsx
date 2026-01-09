import React from 'react';
import { CalendarPageData } from '../../types';
import { SmartText, SmartImage } from '../SmartInputs';

interface Props {
  data: CalendarPageData;
  isExport: boolean;
  onUpdate: (field: string, value: any) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onOverrideStyle?: (id: string, style: React.CSSProperties) => void;
}

const TemplateC: React.FC<Props> = (props) => {
  const { data, isExport, onUpdate } = props;
  const primaryColor = data.theme?.primary_color || '#E63946'; // Red
  const bgStyle = { backgroundColor: data.theme?.background_color || '#FFFFFF' };

  const bind = (id: string) => ({
      id,
      isSelected: props.selectedId === id,
      onSelect: props.onSelect,
      overrideStyle: data.overrides?.[id],
      onChangeStyle: props.onOverrideStyle,
      readOnly: isExport,
      isText: true
  });

  const handleImageUpload = (type: 'main' | 'avatar' | 'icon_left', file: File) => {
      const url = URL.createObjectURL(file);
      if (type === 'main') onUpdate('image.main_url', url);
      if (type === 'avatar') onUpdate('author.avatar_url', url);
      if (type === 'icon_left') onUpdate('branding.left_icon_url', url);
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center" style={{ ...bgStyle, aspectRatio: '1080/1620' }}>
      
      {/* Red Pattern Border */}
      <div 
        className="absolute inset-0 border-[60px]"
        style={{ borderColor: primaryColor, borderStyle: 'solid' }} // Simulating the pattern with solid color for vector purity, ideally use border-image
      >
        <div className="absolute inset-2 border-[4px] border-[#F4A261] opacity-50"></div>
      </div>

      {/* Content Area */}
      <div className="absolute inset-[60px] flex flex-col p-[60px]" style={{ backgroundColor: bgStyle.backgroundColor }}>
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-[4px] border-black pb-8 mb-8">
              <div className="flex items-center gap-6">
                   <SmartText 
                        {...bind('date_number')}
                        value={String(data.day).padStart(2, '0')}
                        onSave={(v) => onUpdate('day', parseInt(v))}
                        style={{ fontSize: '240px', fontWeight: '900', lineHeight: '0.8', color: '#111', letterSpacing: '-0.08em' }}
                   />
                   <div className="w-[80px] h-[160px] border-[3px] flex flex-col items-center justify-center pt-2 gap-1 rounded-sm relative" style={{ borderColor: primaryColor, backgroundColor: '#FEF2F2' }}>
                        <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl" style={{ backgroundColor: primaryColor }}>
                           <SmartText {...bind('badge_text')} value={data.festival_badge?.label_cn || "福"} onSave={() => {}} style={{color: 'white', fontSize: '32px'}}/>
                        </div>
                        <div className="w-[1px] h-[30px] my-1" style={{ backgroundColor: primaryColor }}></div>
                        <span className="font-bold text-lg writing-vertical" style={{ color: primaryColor }}>元旦</span>
                   </div>
              </div>

              <div className="flex flex-col items-end pt-4 gap-2">
                   <SmartText {...bind('lunar_text')} value={data.lunar_cn} onSave={v => onUpdate('lunar_cn', v)} style={{ fontSize: '48px', fontWeight: 'bold', color: '#111' }} />
                   <SmartText {...bind('year_month')} value={`2026.${String(data.month).padStart(2, '0')}`} onSave={() => {}} style={{ fontSize: '40px', fontWeight: '400', color: '#444' }} />
                   <SmartText {...bind('weekday_text')} value={data.weekday_cn} onSave={v => onUpdate('weekday_cn', v)} style={{ fontSize: '40px', fontWeight: '800', color: '#111' }} />
              </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-5 mb-8">
              <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-gray-200">
                 <SmartImage {...bind('author_avatar')} src={data.author.avatar_url} onUpload={f => handleImageUpload('avatar', f)} isText={false} />
              </div>
              <div className="flex flex-col">
                  <SmartText {...bind('author_name')} value={data.author.name_cn} onSave={v => onUpdate('author.name_cn', v)} style={{ fontSize: '30px', fontWeight: 'bold', color: '#111' }} />
                  <SmartText {...bind('author_bio')} value={data.author.bio_cn} onSave={v => onUpdate('author.bio_cn', v)} style={{ fontSize: '22px', color: '#666' }} />
              </div>
          </div>

          {/* Main Image */}
          <div className="flex-1 rounded-[20px] overflow-hidden bg-gray-100 relative mb-8">
             <SmartImage 
                {...bind('main_image')}
                src={data.image.main_url}
                focal={data.image.focal}
                onUpload={f => handleImageUpload('main', f)}
                isText={false}
             />
             
             {/* Text Overlay Style (Optional, based on ref image it might be overlaid) */}
             <div className="absolute bottom-[60px] left-[60px] right-[60px]">
                 {/* Or keep it outside */}
             </div>
          </div>

          {/* Quote */}
          <div className="mb-10">
              <SmartText 
                {...bind('main_quote')}
                value={data.content.quote_cn}
                onSave={(v) => onUpdate('content.quote_cn', v)}
                multiline
                style={{ fontSize: '36px', fontWeight: '900', color: '#111' }}
              />
              <SmartText 
                {...bind('sub_quote')}
                value="2026 Wealth rolls in."
                onSave={() => {}}
                style={{ fontSize: '24px', fontWeight: '400', color: primaryColor, marginTop: '10px', fontFamily: 'serif' }}
              />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3">
             <div className="w-[24px] h-[24px]">
                 <SmartImage {...bind('brand_icon')} src={data.branding.left_icon_url || ''} onUpload={f => handleImageUpload('icon_left', f)} isText={false} />
             </div>
             <SmartText {...bind('brand_text')} value={data.branding.left_brand} onSave={v => onUpdate('branding.left_brand', v)} style={{ fontSize: '20px', fontWeight: '800', color: '#111' }} />
          </div>

      </div>

    </div>
  );
};

export default TemplateC;