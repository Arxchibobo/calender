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

const TemplateB: React.FC<Props> = (props) => {
  const { data, isExport, onUpdate } = props;
  const bgStyle = { backgroundColor: data.theme?.background_color || '#F3C5D6' };

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

  const monthEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][data.month - 1];

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ ...bgStyle, aspectRatio: '1080/1620' }}>
      
      {/* Top Brand */}
      <div className="absolute top-[80px] w-full flex justify-center items-center gap-3">
         <div className="w-[40px] h-[40px]">
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
            style={{ fontSize: '32px', fontWeight: '900', color: '#111' }}
         />
      </div>

      {/* Main Image - Center Square-ish */}
      <div className="absolute top-[220px] left-[140px] w-[800px] h-[800px] rounded-[40px] overflow-hidden shadow-xl bg-gray-800">
         <SmartImage 
            {...bind('main_image')}
            src={data.image.main_url}
            focal={data.image.focal}
            onUpload={(f) => handleImageUpload('main', f)}
            isText={false}
         />
      </div>

      {/* Bottom Grid Layout */}
      <div className="absolute bottom-[0px] left-0 w-full h-[500px] px-[100px] flex">
         
         {/* Left Col: Big Number */}
         <div className="w-[300px] relative">
             <SmartText 
                {...bind('month_number')}
                value={String(data.month)}
                onSave={(v) => onUpdate('month', parseInt(v))}
                style={{ fontSize: '500px', fontWeight: '900', color: '#111', lineHeight: '1', position: 'absolute', bottom: '80px', left: '-20px', letterSpacing: '-0.05em' }}
             />
         </div>

         {/* Middle Col: Date Meta */}
         <div className="w-[200px] flex flex-col justify-end pb-[140px]">
             <SmartText 
                 {...bind('year_text')}
                 value="2026"
                 onSave={() => {}}
                 style={{ fontSize: '48px', fontWeight: '300', color: '#333' }}
             />
             <SmartText 
                 {...bind('month_text')}
                 value={monthEn}
                 onSave={() => {}}
                 style={{ fontSize: '40px', fontWeight: '300', color: '#333' }}
             />
         </div>

         {/* Right Col: Author & Text */}
         <div className="flex-1 flex flex-col justify-end pb-[100px] pl-[20px] border-l border-black/10">
              <div className="flex items-center gap-4 mb-6">
                  <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-gray-200">
                      <SmartImage 
                        {...bind('author_avatar')}
                        src={data.author.avatar_url}
                        onUpload={(f) => handleImageUpload('avatar', f)}
                        isText={false}
                      />
                  </div>
                  <div className="flex flex-col">
                      <SmartText 
                        {...bind('author_name')}
                        value={data.author.name_cn}
                        onSave={(v) => onUpdate('author.name_cn', v)}
                        style={{ fontSize: '28px', fontWeight: 'bold', color: '#111' }}
                      />
                      <SmartText 
                        {...bind('author_bio')}
                        value={data.author.bio_cn}
                        onSave={(v) => onUpdate('author.bio_cn', v)}
                        style={{ fontSize: '20px', fontWeight: '400', color: '#555', width: '240px' }}
                      />
                  </div>
              </div>
              
              <SmartText 
                {...bind('main_quote')}
                value={data.content.quote_cn}
                onSave={(v) => onUpdate('content.quote_cn', v)}
                multiline
                style={{ fontSize: '32px', fontWeight: '800', color: '#111', lineHeight: '1.3' }}
              />
         </div>

      </div>

    </div>
  );
};

export default TemplateB;