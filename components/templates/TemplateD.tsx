import React from 'react';
import { CalendarPageData } from '../../types';
import { SmartText, SmartImage, SmartBlock } from '../SmartInputs';

interface Props {
  data: CalendarPageData;
  isExport: boolean;
  onUpdate: (field: string, value: any) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onOverrideStyle?: (id: string, style: React.CSSProperties) => void;
}

const TemplateD: React.FC<Props> = (props) => {
  const { data, isExport, onUpdate } = props;
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

  const bindBlock = (id: string) => ({
      id,
      isSelected: props.selectedId === id,
      onSelect: props.onSelect,
      overrideStyle: data.overrides?.[id],
      onChangeStyle: props.onOverrideStyle,
      readOnly: isExport,
  });

  const handleImageUpload = (type: 'main' | 'avatar' | 'icon_left', file: File) => {
      const url = URL.createObjectURL(file);
      if (type === 'main') onUpdate('image.main_url', url);
      if (type === 'avatar') onUpdate('author.avatar_url', url);
      if (type === 'icon_left') onUpdate('branding.left_icon_url', url);
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ ...bgStyle, aspectRatio: '1080/1620' }}>
      
      {/* Header Container */}
      <div className="absolute top-[100px] left-[80px] w-[920px] pb-6 flex justify-between items-end">
         <SmartText 
            {...bind('date_number')}
            value={String(data.day).padStart(2, '0')}
            onSave={(v) => onUpdate('day', parseInt(v))}
            style={{ fontSize: '320px', fontWeight: '900', lineHeight: '0.8', letterSpacing: '-0.05em', color: '#111' }}
         />
         
         <div className="flex flex-col items-end pb-4 gap-1">
             <SmartText {...bind('lunar_text')} value={data.lunar_cn} onSave={v => onUpdate('lunar_cn', v)} style={{ fontSize: '56px', fontWeight: 'bold', color: '#111' }} />
             <SmartText {...bind('year_text')} value={`2026.${String(data.month).padStart(2, '0')}`} onSave={() => {}} style={{ fontSize: '48px', fontWeight: '400', color: '#333' }} />
             <SmartText {...bind('weekday_text')} value={data.weekday_cn} onSave={v => onUpdate('weekday_cn', v)} style={{ fontSize: '48px', fontWeight: '800', color: '#111' }} />
         </div>
      </div>

      {/* Editable Separator Line - Made interactable wrapper height distinct */}
      <div className="absolute top-[380px] left-[80px]">
          <SmartBlock 
            {...bindBlock('separator_line')}
            style={{ width: '920px', height: '8px', backgroundColor: '#000000' }}
          />
      </div>

      {/* Author - Different Position (Left aligned under line) */}
      <div className="absolute top-[440px] left-[80px] flex items-center gap-5">
          <div className="w-[90px] h-[90px] rounded-full overflow-hidden bg-gray-200">
             <SmartImage {...bind('author_avatar')} src={data.author.avatar_url} onUpload={f => handleImageUpload('avatar', f)} isText={false} />
          </div>
          <div className="flex flex-col">
              <SmartText {...bind('author_name')} value={data.author.name_cn} onSave={v => onUpdate('author.name_cn', v)} style={{ fontSize: '34px', fontWeight: 'bold', color: '#111' }} />
              <SmartText {...bind('author_bio')} value={data.author.bio_cn} onSave={v => onUpdate('author.bio_cn', v)} style={{ fontSize: '24px', fontWeight: '400', color: '#777' }} />
          </div>
      </div>

      {/* Main Image - Massive */}
      <div className="absolute top-[580px] left-[60px] w-[960px] h-[860px] rounded-[30px] overflow-hidden bg-black">
         <SmartImage 
            {...bind('main_image')}
            src={data.image.main_url}
            focal={data.image.focal}
            onUpload={(f) => handleImageUpload('main', f)}
            isText={false}
         />
      </div>

      {/* Quote - Bottom Centered/Left */}
      <div className="absolute bottom-[100px] left-[80px] flex items-center gap-4">
          <SmartText 
            {...bind('main_quote')}
            value={data.content.quote_cn}
            onSave={(v) => onUpdate('content.quote_cn', v)}
            multiline
            style={{ fontSize: '40px', fontWeight: '900', color: '#111' }}
          />
          <span className="text-[40px]">🌹</span>
      </div>

      {/* Footer Brand */}
      <div className="absolute bottom-[40px] left-[80px] flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[24px] h-[24px] bg-gradient-to-tr from-orange-400 to-purple-500 rounded-sm"></div>
            <SmartText {...bind('brand_left')} value={data.branding.left_brand} onSave={v => onUpdate('branding.left_brand', v)} style={{ fontSize: '20px', fontWeight: '800' }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[24px] h-[24px] border-2 border-blue-500 rounded-full flex items-center justify-center text-[10px] text-blue-500 font-bold">N</div>
            <SmartText {...bind('brand_right')} value={"纳米AI搜索"} onSave={() => {}} style={{ fontSize: '20px', fontWeight: '800' }} />
          </div>
      </div>

    </div>
  );
};

export default TemplateD;