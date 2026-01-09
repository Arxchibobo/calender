import React from 'react';
import { CalendarPageData, TemplateID } from '../types';
import TemplateA from './templates/TemplateA';
import TemplateB from './templates/TemplateB';
import TemplateC from './templates/TemplateC';
import TemplateD from './templates/TemplateD';

interface Props {
  templateId: TemplateID;
  data: CalendarPageData;
  scale?: number;
  onUpdate?: (field: string, value: any) => void;
  // New props for selection/canvas features
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onOverrideStyle?: (id: string, style: React.CSSProperties) => void;
}

const LayoutRenderer: React.FC<Props> = ({ 
    templateId, 
    data, 
    scale = 1, 
    onUpdate,
    selectedId,
    onSelect,
    onOverrideStyle
}) => {
  const width = 1080;
  const height = 1620;
  const isExportMode = scale === 1;

  // Common props for all templates
  const commonProps = {
    data,
    isExport: isExportMode,
    onUpdate: onUpdate || (() => {}),
    // Pass canvas props
    selectedId: isExportMode ? null : selectedId, // No selection in export
    onSelect: onSelect || (() => {}),
    onOverrideStyle: onOverrideStyle || (() => {}),
  };

  const getTemplate = () => {
    switch (templateId) {
      case 'A': return <TemplateA {...commonProps} />;
      case 'B': return <TemplateB {...commonProps} />;
      case 'C': return <TemplateC {...commonProps} />;
      case 'D': return <TemplateD {...commonProps} />;
      default: return <TemplateA {...commonProps} />;
    }
  };

  return (
    <div 
      className={`origin-top-left bg-white ${!isExportMode ? 'shadow-2xl' : ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: isExportMode ? 'none' : `scale(${scale})`,
        marginBottom: isExportMode ? 0 : `-${height * (1 - scale)}px`,
        marginRight: isExportMode ? 0 : `-${width * (1 - scale)}px`
      }}
    >
      {getTemplate()}
    </div>
  );
};

export default LayoutRenderer;
