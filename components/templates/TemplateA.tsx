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

const TemplateA: React.FC<Props> = (props) => {
  const { data, isExport, onUpdate } = props;
  const bgStyle = { backgroundColor: data.theme?.background_color || '#FFFFFF' };

  const bind = (id: string) => ({
      id,
      isSelected: props.selectedId === id,
      onSelect: props.onSelect,
      overrideStyle: data.overrides?.[id],
      onChangeStyle: props.onOverrideStyle,
      readOnly: isExport,
      isText: true // Default for text binding
  });
  
  const handleImageUpload = (type: 'main' | 'avatar' | 'icon_left', file: File) => {
      const url = URL.createObjectURL(file);
      if (type === 'main') onUpdate('image.main_url', url);
      if (type === 'avatar') onUpdate('author.avatar_url', url);
      if (type === 'icon_left') onUpdate('branding.left_icon_url', url);
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ ...bgStyle, aspectRatio: '1080/1620' }}>
      
      {/* Header Section: Number left, Date right */}
      <div className="absolute top-[120px] left-[80px] w-[800px] h-[300px] flex justify-between items-end pb-4 border-b-[6px] border-black">
         {/* Huge Number */}
         <div className="w-[400px]">
             <SmartText 
                {...bind('date_number')}
                value={String(data.day).padStart(2, '0')} 
                onSave={(v) => onUpdate('day', parseInt(v))}
                style={{ fontSize: '320px', fontWeight: '900', lineHeight: '0.8', letterSpacing: '-0.05em', color: '#111' }}
             />
         </div>
         
         {/* Meta Data */}
         <div className="flex flex-col items-end text-right pb-4 gap-2">
            <SmartText 
                {...bind('lunar_text')}
                value={data.lunar_cn} 
                onSave={(v) => onUpdate('lunar_cn', v)}
                style={{ fontSize: '48px', fontWeight: 'bold', color: '#111' }}
            />
            <div className="flex flex-col items-end">
                <SmartText 
                    {...bind('year_month')}
                    value={`2026.${String(data.month).padStart(2, '0')}`} 
                    onSave={() => {}} 
                    style={{ fontSize: '42px', fontWeight: '400', color: '#333' }}
                />
                <SmartText 
                    {...bind('weekday_text')}
                    value={data.weekday_cn} 
                    onSave={(v) => onUpdate('weekday_cn', v)}
                    style={{ fontSize: '42px', fontWeight: '800', color: '#111' }}
                />
            </div>
         </div>
      </div>

      {/* Author Section */}
      <div className="absolute top-[440px] left-[80px] flex items-center gap-6">
          <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-gray-200">
             <SmartImage 
                {...bind('author_avatar')}
                src={data.author.avatar_url}
                onUpload={(f) => handleImageUpload('avatar', f)}
                isText={false}
             />
          </div>
          <div className="flex flex-col gap-1">
             <SmartText 
                {...bind('author_name')}
                value={data.author.name_cn}
                onSave={(v) => onUpdate('author.name_cn', v)}
                style={{ fontSize: '36px', fontWeight: 'bold', color: '#000' }}
             />
             <SmartText 
                {...bind('author_bio')}
                value={data.author.bio_cn}
                onSave={(v) => onUpdate('author.bio_cn', v)}
                style={{ fontSize: '24px', fontWeight: '400', color: '#666', width: '600px' }}
             />
          </div>
      </div>

      {/* Main Image */}
      <div className="absolute top-[600px] left-[80px] w-[920px] h-[820px] rounded-[40px] overflow-hidden bg-gray-100 shadow-sm">
         <SmartImage 
            {...bind('main_image')}
            src={data.image.main_url}
            focal={data.image.focal}
            onUpload={(f) => handleImageUpload('main', f)}
            isText={false}
         />
      </div>

      {/* Quote */}
      <div className="absolute bottom-[140px] left-[80px] w-[920px]">
          <SmartText 
            {...bind('main_quote')}
            value={data.content.quote_cn}
            onSave={(v) => onUpdate('content.quote_cn', v)}
            multiline
            style={{ fontSize: '42px', fontWeight: '700', color: '#111', lineHeight: '1.4' }}
          />
      </div>

      {/* Brand Footer */}
      <div className="absolute bottom-[60px] left-[80px] flex items-center gap-3">
         <div className="w-[32px] h-[32px]">
            <SmartImage 
                {...bind('brand_icon')}
                src={data.branding.left_icon_url || ''}
                onUpload={(f) => handleImageUpload('icon_left', f)}
                isText={false}
            />
         </div>
         <SmartText 
            {...bind('brand_text')}
            value={data.branding.left_brand}
            onSave={(v) => onUpdate('branding.left_brand', v)}
            style={{ fontSize: '24px', fontWeight: '800', color: '#000' }}
        />
      </div>

    </div>
  );
};

export default TemplateA;