import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_DATA, CalendarPageData, TemplateID, Layer } from './types';
import LayoutRenderer from './components/LayoutRenderer';
import { SmartShape, SmartText, SmartImage } from './components/SmartInputs';
import CalendarPicker from './components/CalendarPicker';
import { selectTemplate } from './utils/templateSelector';
import { generateCalendarData, generateImage, editImage } from './services/geminiService';
import { parseExcelFile } from './utils/excelLoader';
import { getLunarDate, getWeekday } from './utils/lunarHelper';
import { Wand2, Image as ImageIcon, Download, Loader2, Edit3, ImagePlus, ChevronLeft, ChevronRight, FileJson, Upload, LayoutTemplate, Palette, Calendar as CalendarIcon, FileSpreadsheet, Images, Crop, FileDown, FileImage, MousePointer2, Square, Circle, Type, Trash2, Undo2, Redo2, ZoomIn, User, AlignLeft, Minus, Plus, Hand, Save, StickyNote, CornerUpLeft, Type as TypeIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Types for Custom Templates
interface CustomTemplate {
    id: string;
    name: string;
    baseTemplate: TemplateID;
    overrides: Record<string, React.CSSProperties>;
    layers: Layer[];
    theme: CalendarPageData['theme'];
}

const App: React.FC = () => {
  // Batch State
  const [batchData, setBatchData] = useState<CalendarPageData[]>([DEFAULT_DATA]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // History State
  const [history, setHistory] = useState<CalendarPageData[][]>([[DEFAULT_DATA]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Template State
  const [templateMode, setTemplateMode] = useState<'Auto' | TemplateID>('Auto');
  const [activeTemplateId, setActiveTemplateId] = useState<TemplateID>('A');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  // View State
  const [autoScale, setAutoScale] = useState(0.4);
  const [manualZoom, setManualZoom] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingCurrent, setIsExportingCurrent] = useState(false);
  const [prompt, setPrompt] = useState("");
  
  // Canvas / Selection State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLayerColor, setSelectedLayerColor] = useState('#000000');
  const [selectedFontSize, setSelectedFontSize] = useState<number>(16);
  
  // Tool State
  const [activeTool, setActiveTool] = useState<'select' | 'hand'>('select');
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewOffsetStartRef = useRef({ x: 0, y: 0 });

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>("3:4");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const batchImageInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  // Current Data Helper
  const data = batchData[currentIndex];

  // --- History Management ---
  const pushHistory = useCallback((newData: CalendarPageData[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newData);
      if (newHistory.length > 50) newHistory.shift();
      else setHistoryIndex(newHistory.length - 1);
      setHistory(newHistory);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
      if (historyIndex > 0) {
          setHistoryIndex(prev => prev - 1);
          setBatchData(history[historyIndex - 1]);
      }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(prev => prev + 1);
          setBatchData(history[historyIndex + 1]);
      }
  }, [history, historyIndex]);

  const updateCurrentData = (newData: Partial<CalendarPageData>, addToHistory = true) => {
    const newBatch = [...batchData];
    newBatch[currentIndex] = { ...newBatch[currentIndex], ...newData };
    setBatchData(newBatch);
    if (addToHistory) pushHistory(newBatch);
  };

  // --- Style Overrides & Nudge ---
  const handleOverrideStyle = useCallback((id: string, style: React.CSSProperties) => {
      setBatchData(prevBatch => {
          const newBatch = [...prevBatch];
          const currentItem = { ...newBatch[currentIndex] };
          
          if (id.startsWith('layer_')) {
              const newLayers = (currentItem.layers || []).map(l => {
                  if (l.id === id) return { ...l, style: { ...l.style, ...style } };
                  return l;
              });
              currentItem.layers = newLayers;
          } else {
              const currentOverrides = currentItem.overrides || {};
              const existingStyle = currentOverrides[id] || {};
              currentItem.overrides = {
                  ...currentOverrides,
                  [id]: { ...existingStyle, ...style }
              };
          }
          
          newBatch[currentIndex] = currentItem;
          return newBatch;
      });
  }, [currentIndex]);

  const handleDeleteLayer = useCallback(() => {
      if (!selectedId) return;
      
      if (selectedId.startsWith('layer_')) {
          const newLayers = (data.layers || []).filter(l => l.id !== selectedId);
          updateCurrentData({ layers: newLayers });
          setSelectedId(null);
      } else {
          setBatchData(prev => {
              const newBatch = [...prev];
              const overrides = newBatch[currentIndex].overrides || {};
              newBatch[currentIndex].overrides = { ...overrides, [selectedId]: { ...overrides[selectedId], display: 'none' } };
              pushHistory(newBatch);
              return newBatch;
          });
          setSelectedId(null);
      }
  }, [selectedId, data.layers, currentIndex, pushHistory]);

  const handleNudge = useCallback((dx: number, dy: number) => {
      if (!selectedId) return;

      setBatchData(prevBatch => {
          const newBatch = [...prevBatch];
          const currentItem = { ...newBatch[currentIndex] };
          let currentTransform = '';
          
          if (selectedId.startsWith('layer_')) {
               const layer = (currentItem.layers || []).find(l => l.id === selectedId);
               currentTransform = layer?.style?.transform || '';
          } else {
               currentTransform = currentItem.overrides?.[selectedId]?.transform || '';
          }

          let x = 0, y = 0;
          const match = currentTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
          if (match) { x = parseFloat(match[1]); y = parseFloat(match[2]); }

          const newTransform = `translate(${x + dx}px, ${y + dy}px)`;
          
          if (selectedId.startsWith('layer_')) {
              currentItem.layers = (currentItem.layers || []).map(l => l.id === selectedId ? { ...l, style: { ...l.style, transform: newTransform } } : l);
          } else {
              currentItem.overrides = { ...currentItem.overrides, [selectedId]: { ...currentItem.overrides?.[selectedId], transform: newTransform } };
          }

          newBatch[currentIndex] = currentItem;
          return newBatch;
      });
  }, [selectedId, currentIndex]);

  // Sync properties panel with selected item
  useEffect(() => {
      if (!selectedId) return;
      
      const currentItem = batchData[currentIndex];
      let style: React.CSSProperties | undefined;
      
      if (selectedId.startsWith('layer_')) {
          const layer = currentItem.layers?.find(l => l.id === selectedId);
          style = layer?.style;
      } else {
          style = currentItem.overrides?.[selectedId];
      }
      
      if (style) {
          if (style.color) setSelectedLayerColor(String(style.color));
          else if (style.backgroundColor) setSelectedLayerColor(String(style.backgroundColor));
          
          if (style.fontSize) {
              const fs = parseFloat(String(style.fontSize));
              if (!isNaN(fs)) setSelectedFontSize(fs);
          }
      }
  }, [selectedId, currentIndex, batchData]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.shiftKey) handleRedo(); else handleUndo(); e.preventDefault(); return;
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'y') { handleRedo(); e.preventDefault(); return; }
          if (e.code === 'Space' && !e.repeat) { if(activeTool !== 'hand') e.preventDefault(); }
          
          // Delete shortcut
          if (e.key === 'Delete' || e.key === 'Backspace') {
             if (selectedId) handleDeleteLayer();
          }

          if (selectedId) {
              const step = e.shiftKey ? 10 : 1;
              let dx = 0, dy = 0;
              if (e.key === 'ArrowUp') dy = -step;
              if (e.key === 'ArrowDown') dy = step;
              if (e.key === 'ArrowLeft') dx = -step;
              if (e.key === 'ArrowRight') dx = step;
              if (dx !== 0 || dy !== 0) { e.preventDefault(); handleNudge(dx, dy); }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [selectedId, handleUndo, handleRedo, handleNudge, activeTool, handleDeleteLayer]);

  // --- Custom Templates ---
  const handleSaveTemplate = () => {
      const name = prompt("Enter a name for this custom template:");
      if (!name) return;
      const newTemplate: CustomTemplate = {
          id: `custom_${Date.now()}`,
          name,
          baseTemplate: activeTemplateId,
          overrides: data.overrides || {},
          layers: data.layers || [],
          theme: data.theme
      };
      setCustomTemplates([...customTemplates, newTemplate]);
      alert("Template saved!");
  };

  const handleApplyCustomTemplate = (t: CustomTemplate) => {
      updateCurrentData({
          overrides: t.overrides,
          layers: t.layers,
          theme: t.theme
      });
  };

  // --- Canvas Logic ---
  const handleAddLayer = (type: Layer['type']) => {
      const newLayer: Layer = {
          id: `layer_${Date.now()}`,
          type,
          x: 100, y: 100, width: type === 'text' ? 300 : 200, height: type === 'text' ? 100 : 200,
          fill: type === 'text' ? 'transparent' : '#3b82f6',
          text: type === 'text' ? 'New Text' : undefined,
          style: {
              position: 'absolute', top: 0, left: 0,
              transform: 'translate(100px, 100px)',
              width: type === 'text' ? '300px' : '200px',
              height: type === 'text' ? 'auto' : '200px',
              fontSize: type === 'text' ? '48px' : undefined,
              color: '#000000',
              backgroundColor: type === 'rect' ? '#000000' : undefined,
              borderRadius: type === 'circle' ? '50%' : '0px'
          }
      };
      updateCurrentData({ layers: [...(data.layers || []), newLayer] });
      setSelectedId(newLayer.id);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (activeTool === 'hand' || e.button === 1) {
          setIsPanning(true);
          panStartRef.current = { x: e.clientX, y: e.clientY };
          viewOffsetStartRef.current = { ...viewOffset };
          e.preventDefault();
      } else { setSelectedId(null); }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
      if (isPanning) {
          const dx = e.clientX - panStartRef.current.x;
          const dy = e.clientY - panStartRef.current.y;
          setViewOffset({ x: viewOffsetStartRef.current.x + dx, y: viewOffsetStartRef.current.y + dy });
      }
  };
  const handleCanvasMouseUp = () => { setIsPanning(false); };

  const renderExtraLayers = (isExport: boolean) => {
      return (data.layers || []).map(layer => {
          const commonProps = {
              key: layer.id, id: layer.id,
              isSelected: !isExport && selectedId === layer.id,
              onSelect: setSelectedId,
              overrideStyle: layer.style,
              onChangeStyle: (id: string, s: React.CSSProperties) => updateCurrentData(
                   { layers: (data.layers || []).map(l => l.id === id ? { ...l, style: { ...l.style, ...s } } : l) }, false
              ),
              readOnly: isExport,
              className: "absolute z-50 pointer-events-auto",
              style: layer.style
          };
          if (layer.type === 'text') return <SmartText {...commonProps} value={layer.text || 'Text'} multiline onSave={(val) => updateCurrentData({ layers: (data.layers || []).map(l => l.id === layer.id ? { ...l, text: val } : l) })} />;
          
          if (layer.type === 'rect' || layer.type === 'circle') {
             const { backgroundColor, ...wrapperStyle } = layer.style || {};
             
             return <SmartShape 
                {...commonProps} 
                overrideStyle={wrapperStyle}
                type={layer.type} 
                fill={layer.style?.backgroundColor || layer.fill} 
             />;
          }
          return null;
      });
  };

  // --- Handlers ---
  const handleCanvasUpdate = (fieldPath: string, value: any) => { 
      const newBatch = [...batchData];
      const currentItem = { ...newBatch[currentIndex] };
      const keys = fieldPath.split('.');
      let target: any = currentItem;
      for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]]) target[keys[i]] = {};
          target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      newBatch[currentIndex] = currentItem;
      setBatchData(newBatch);
      pushHistory(newBatch);
  };

  useEffect(() => { setActiveTemplateId(templateMode === 'Auto' ? selectTemplate(data) : templateMode); }, [data, templateMode]);
  
  useEffect(() => { 
      const handleResize = () => { if (containerRef.current) { const { width, height } = containerRef.current.getBoundingClientRect(); setAutoScale(Math.min((width-100)/1080, (height-100)/1620, 0.55)); } };
      window.addEventListener('resize', handleResize); handleResize(); return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDateSelect = (year: number, month: number, day: number) => { 
     const targetDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
     const existingIndex = batchData.findIndex(d => d.date_gregorian === targetDateStr);
     if (existingIndex !== -1) setCurrentIndex(existingIndex);
     else {
         const current = batchData[currentIndex];
         const newData: CalendarPageData = { ...DEFAULT_DATA, date_gregorian: targetDateStr, month, day, lunar_cn: getLunarDate(year, month, day), weekday_cn: getWeekday(year, month, day), author: current.author, branding: current.branding, theme: current.theme };
         const newBatch = [...batchData, newData];
         setBatchData(newBatch);
         pushHistory(newBatch);
         setCurrentIndex(batchData.length);
     }
  };

  // ... (Keep existing generation/upload handlers) ...
  const handleGenerateData = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateCalendarData(prompt, { year: 2026, month: data.month, day: data.day });
      updateCurrentData({ ...data, ...generated, branding: { ...data.branding, ...generated.branding }, author: { ...data.author, ...generated.author }, content: { ...data.content, ...generated.content }, image: { ...data.image, ...generated.image } });
    } catch (e) { alert("Failed to generate data."); } finally { setIsGenerating(false); }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsProcessingImage(true);
    try {
      const newImageUrl = await generateImage(imagePrompt, aspectRatio);
      updateCurrentData({ image: { ...data.image, main_url: newImageUrl } });
    } catch (e) { alert("Failed to generate image."); } finally { setIsProcessingImage(false); }
  };

  const handleAssetUpload = (type: 'main' | 'avatar' | 'brand', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        if (type === 'main') updateCurrentData({ image: { ...data.image, main_url: url } });
        else if (type === 'avatar') updateCurrentData({ author: { ...data.author, avatar_url: url } });
        else if (type === 'brand') updateCurrentData({ branding: { ...data.branding, left_icon_url: url } });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              try {
                  const json = JSON.parse(ev.target?.result as string);
                  if (Array.isArray(json)) {
                       setBatchData(json);
                       pushHistory(json);
                       setCurrentIndex(0);
                  }
              } catch (e) { alert("Invalid JSON"); }
          };
          reader.readAsText(file);
      }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { try { const parsed = await parseExcelFile(file); setBatchData(parsed); pushHistory(parsed); setCurrentIndex(0); } catch (e) { alert("Error parsing"); } }
  };

  const handleBatchImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const newBatch = [...batchData];
        files.forEach((file, i) => {
            const targetIndex = currentIndex + i;
            if (targetIndex < newBatch.length) {
                const url = URL.createObjectURL(file as File);
                newBatch[targetIndex] = { ...newBatch[targetIndex], image: { ...newBatch[targetIndex].image, main_url: url } };
            }
        });
        setBatchData(newBatch);
        pushHistory(newBatch);
        alert(`Mapped ${files.length} images.`);
    }
  };

  const handleDownloadCurrent = async () => {
    setIsExportingCurrent(true);
    setTimeout(async () => {
        try {
            if (!exportContainerRef.current) return;
            const element = exportContainerRef.current.firstElementChild as HTMLElement;
            if (!element) return;
            const images = Array.from(element.querySelectorAll('img'));
            await Promise.all(images.map(img => {
               if (img.complete) return Promise.resolve();
               return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
            }));
            await document.fonts.ready;
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
            const link = document.createElement('a');
            link.download = `calendar_${data.date_gregorian}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) { console.error(e); alert("Export failed."); } 
        finally { setIsExportingCurrent(false); }
    }, 1000);
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    setTimeout(async () => {
        try {
            if (!exportContainerRef.current) return;
            const pdf = new jsPDF('p', 'pt', [595, 842]);
            const elements = Array.from(exportContainerRef.current.children) as HTMLElement[];
            const targetHeight = 842;
            const targetWidth = 561.33;
            const xOffset = (595 - targetWidth) / 2;
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const images = Array.from(el.querySelectorAll('img'));
                await Promise.all(images.map(img => {
                  if (img.complete) return Promise.resolve();
                  return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
                }));
                await document.fonts.ready;
                const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, logging: false });
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', xOffset, 0, targetWidth, targetHeight);
            }
            pdf.save(`calendar_batch_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) { console.error(e); alert("Export PDF failed."); } 
        finally { setIsExportingPDF(false); }
    }, 2000);
  };

  const exportDataList = isExportingCurrent ? [data] : (isExportingPDF ? [...batchData].sort((a,b) => a.date_gregorian.localeCompare(b.date_gregorian)) : []);
  const scale = autoScale * manualZoom;

  return (
    <div className="flex h-screen w-full bg-zinc-900 text-gray-100 font-sans overflow-hidden">
      <div className="fixed left-[-9999px] top-0 flex flex-col gap-10" ref={exportContainerRef}>
          {(isExportingPDF || isExportingCurrent) && exportDataList.map((d, idx) => (
             <div key={idx} style={{ width: '1080px', height: '1620px', position: 'relative' }}><LayoutRenderer templateId={templateMode === 'Auto' ? selectTemplate(d) : templateMode} data={d} scale={1} />{/* Layers */}</div>
          ))}
      </div>

      <div className="w-[440px] bg-white text-gray-900 border-r border-gray-200 flex flex-col h-full overflow-y-auto shadow-2xl z-20">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-900"><LayoutTemplate className="w-6 h-6 text-indigo-600" /> CalendarGen</h1>
            <button onClick={handleSaveTemplate} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors" title="Save current layout as template">
                <Save className="w-4 h-4" />
            </button>
        </div>
        
        {/* Batch Control */}
        <div className="p-4 bg-indigo-50 border-b border-indigo-100">
          <div className="flex justify-between items-center mb-3">
             <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1"><FileJson className="w-3 h-3"/> Database</label>
             <span className="text-xs font-mono bg-white px-2 py-1 rounded text-indigo-600 border border-indigo-200">{currentIndex + 1} / {batchData.length}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
             <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="p-2 bg-white rounded border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"><ChevronLeft className="w-4 h-4 text-indigo-700"/></button>
             <div className="flex-1 h-2 bg-indigo-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentIndex + 1) / batchData.length) * 100}%` }}></div></div>
             <button onClick={() => setCurrentIndex(Math.min(batchData.length - 1, currentIndex + 1))} disabled={currentIndex === batchData.length - 1} className="p-2 bg-white rounded border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"><ChevronRight className="w-4 h-4 text-indigo-700"/></button>
          </div>
          <div className="flex gap-2">
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors flex justify-center items-center gap-1"><Upload className="w-3 h-3" /> JSON</button>
             <button onClick={() => excelInputRef.current?.click()} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition-colors flex justify-center items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> Excel</button>
             <button onClick={() => batchImageInputRef.current?.click()} className="flex-1 py-2 bg-pink-600 text-white text-xs font-bold rounded hover:bg-pink-700 transition-colors flex justify-center items-center gap-1"><Images className="w-3 h-3" /> Imgs</button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleBatchUpload} />
             <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleExcelUpload} />
             <input type="file" ref={batchImageInputRef} className="hidden" multiple accept="image/*" onChange={handleBatchImageUpload} />
          </div>
        </div>

        <div className="p-6 space-y-6 pb-20">
            {/* Theme Configuration */}
            <div className="space-y-3">
                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Palette className="w-4 h-4" /> Theme & Colors</label>
                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="text-xs text-gray-500 font-medium mb-1 block">Page Background</label>
                         <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1.5 bg-white">
                             <input type="color" className="w-6 h-6 border-none p-0 rounded cursor-pointer" value={data.theme?.background_color || '#FFFFFF'} onChange={e => updateCurrentData({ theme: { ...data.theme, background_color: e.target.value } })} />
                             <span className="text-xs font-mono text-gray-600">{data.theme?.background_color || '#FFFFFF'}</span>
                         </div>
                     </div>
                     <div>
                         <label className="text-xs text-gray-500 font-medium mb-1 block">Primary Accent</label>
                         <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1.5 bg-white">
                             <input type="color" className="w-6 h-6 border-none p-0 rounded cursor-pointer" value={data.theme?.primary_color || '#000000'} onChange={e => updateCurrentData({ theme: { ...data.theme, primary_color: e.target.value } })} />
                             <span className="text-xs font-mono text-gray-600">{data.theme?.primary_color || '#000000'}</span>
                         </div>
                     </div>
                 </div>
            </div>
            
            <hr className="border-gray-100" />
            
            {/* Custom Templates */}
            {customTemplates.length > 0 && (
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><StickyNote className="w-4 h-4" /> My Templates</label>
                    <div className="grid grid-cols-2 gap-2">
                        {customTemplates.map(t => (
                            <button key={t.id} onClick={() => handleApplyCustomTemplate(t)} className="text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-indigo-50 hover:border-indigo-200 text-xs font-medium text-gray-700 truncate">
                                {t.name}
                            </button>
                        ))}
                    </div>
                    <hr className="border-gray-100" />
                </div>
            )}

            <div className="space-y-4"><label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Date & Template</label>
               <CalendarPicker onSelectDate={handleDateSelect} selectedMonth={data.month} selectedDay={data.day} markedDates={batchData.map(d => d.date_gregorian)} />
               <div className="grid grid-cols-5 gap-1 bg-gray-100 p-1 rounded-lg mt-2">
                  {(['Auto', 'A', 'B', 'C', 'D'] as const).map(mode => (<button key={mode} onClick={() => setTemplateMode(mode)} className={`py-1.5 text-xs font-bold rounded-md transition-all ${templateMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{mode}</button>))}
               </div>
            </div>
            
            <hr className="border-gray-100" />

            <div className="space-y-4">
               <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><User className="w-4 h-4" /> Content & Assets</label>
               <div className="space-y-3">
                   {/* Author Name */}
                   <div>
                       <label className="text-xs text-gray-500 font-medium mb-1 block">Author Name</label>
                       <input 
                         type="text" 
                         value={data.author.name_cn}
                         onChange={(e) => updateCurrentData({ author: { ...data.author, name_cn: e.target.value } })}
                         className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                       />
                   </div>
                   {/* Author Bio */}
                   <div>
                       <label className="text-xs text-gray-500 font-medium mb-1 block">Author Bio</label>
                       <input 
                         type="text" 
                         value={data.author.bio_cn}
                         onChange={(e) => updateCurrentData({ author: { ...data.author, bio_cn: e.target.value } })}
                         className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                       />
                   </div>
                   {/* Quote */}
                   <div>
                       <label className="text-xs text-gray-500 font-medium mb-1 block">Quote / Copy</label>
                       <textarea 
                         rows={2}
                         value={data.content.quote_cn}
                         onChange={(e) => updateCurrentData({ content: { ...data.content, quote_cn: e.target.value } })}
                         className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                       />
                   </div>
                   
                   {/* Asset Uploads */}
                   <div className="grid grid-cols-2 gap-3 pt-2">
                       <div className="space-y-1">
                           <label className="text-xs text-gray-500 font-medium block">Avatar</label>
                           <button 
                             onClick={() => avatarInputRef.current?.click()}
                             className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-50 hover:border-indigo-400 transition-colors group relative overflow-hidden"
                           >
                               {data.author.avatar_url ? (
                                   <img src={data.author.avatar_url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30" />
                               ) : null}
                               <Upload className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 z-10" />
                               <span className="text-[10px] text-gray-400 group-hover:text-indigo-600 z-10">Upload</span>
                           </button>
                           <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleAssetUpload('avatar', e)} />
                       </div>
                       
                       <div className="space-y-1">
                           <label className="text-xs text-gray-500 font-medium block">Main Image</label>
                           <button 
                             onClick={() => mainImageInputRef.current?.click()}
                             className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-50 hover:border-indigo-400 transition-colors group relative overflow-hidden"
                           >
                               {data.image.main_url ? (
                                   <img src={data.image.main_url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30" />
                               ) : null}
                               <ImagePlus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 z-10" />
                               <span className="text-[10px] text-gray-400 group-hover:text-indigo-600 z-10">Upload</span>
                           </button>
                            <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => handleAssetUpload('main', e)} />
                       </div>
                   </div>
               </div>
            </div>

            <hr className="border-gray-100" />
            
            <div className="space-y-3"><label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Wand2 className="w-4 h-4" /> AI Generation</label>
                <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900" placeholder="Topic..." value={prompt} onChange={e => setPrompt(e.target.value)} /><button onClick={handleGenerateData} disabled={isGenerating || !prompt} className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}</button></div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 pt-2"><ImagePlus className="w-4 h-4" /> Image Studio</label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                   <div className="flex justify-between items-center"><div className="flex gap-1">{['center', 'top', 'bottom'].map(f => (<button key={f} onClick={() => updateCurrentData({ image: { ...data.image, focal: f as any } })} className={`px-1.5 py-0.5 text-[9px] rounded capitalize ${data.image.focal === f ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500 bg-white border'}`}>{f}</button>))}</div></div>
                   <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs outline-none text-gray-900" placeholder="Image prompt..." value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} />
                   <div className="flex gap-2"><button onClick={handleGenerateImage} disabled={isProcessingImage || !imagePrompt} className="flex-1 py-1.5 bg-white border border-gray-300 rounded text-[10px] font-bold hover:bg-gray-50 flex items-center justify-center gap-1">{isProcessingImage ? <Loader2 className="w-3 h-3 animate-spin"/> : "Gen Image"}</button></div>
                </div>
            </div>
        </div>
      </div>

      <div 
        className="flex-1 relative overflow-hidden bg-[#1e1e1e]" 
        ref={containerRef} 
        onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
        style={{ cursor: activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
      >
         <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

         <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center z-20">
             <div className="flex gap-1 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full shadow-2xl items-center">
                <div className="flex bg-zinc-900 rounded-lg p-1 mr-4 border border-zinc-700">
                    <button onClick={() => setActiveTool('select')} className={`p-1.5 rounded ${activeTool === 'select' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><MousePointer2 className="w-4 h-4"/></button>
                    <button onClick={() => setActiveTool('hand')} className={`p-1.5 rounded ${activeTool === 'hand' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Hand className="w-4 h-4"/></button>
                </div>
                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1 hover:bg-zinc-700 rounded text-zinc-300 disabled:opacity-30"><Undo2 className="w-4 h-4"/></button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1 hover:bg-zinc-700 rounded text-zinc-300 disabled:opacity-30"><Redo2 className="w-4 h-4"/></button>
                <div className="w-px h-4 bg-zinc-600 mx-2"></div>
                <button onClick={() => handleAddLayer('rect')} className="p-1 hover:bg-zinc-700 rounded text-zinc-300"><Square className="w-4 h-4"/></button>
                <button onClick={() => handleAddLayer('circle')} className="p-1 hover:bg-zinc-700 rounded text-zinc-300"><Circle className="w-4 h-4"/></button>
                <button onClick={() => handleAddLayer('text')} className="p-1 hover:bg-zinc-700 rounded text-zinc-300"><Type className="w-4 h-4"/></button>
                <div className="w-px h-4 bg-zinc-600 mx-2"></div>
                <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1" onClick={handleDownloadCurrent} disabled={isExportingCurrent}>{isExportingCurrent ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileImage className="w-3 h-3"/>}</button>
                <button className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1" onClick={handleExportPDF} disabled={isExportingPDF}>{isExportingPDF ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileDown className="w-3 h-3"/>}</button>
             </div>
             
             {/* Selected Item Properties Bar */}
             {selectedId && (
                 <div className="flex gap-4 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full shadow-xl animate-in fade-in slide-in-from-top-4 items-center">
                     <span className="text-[10px] text-zinc-500 font-mono">ID: {selectedId.slice(0, 8)}</span>
                     <div className="h-4 w-px bg-zinc-600"></div>
                     <div className="flex items-center gap-2">
                         <label className="text-[10px] text-zinc-400">Color</label>
                         <input 
                           type="color" 
                           className="w-5 h-5 rounded cursor-pointer border-none bg-transparent p-0" 
                           value={selectedLayerColor} 
                           onChange={(e) => { 
                               setSelectedLayerColor(e.target.value); 
                               const isLayer = selectedId.startsWith('layer_');
                               let isText = false;
                               if (isLayer) {
                                   const l = data.layers?.find(x => x.id === selectedId);
                                   if (l?.type === 'text') isText = true;
                               } else {
                                   // Heuristic: Check ID name or if component is SmartText
                                   // But safer to check if handleOverrideStyle handles color vs backgroundColor
                                   // We do logic inside onChange here:
                                   if (selectedId.match(/text|name|bio|number|quote|date|year|month|day/)) isText = true;
                               }
                               if (isText) handleOverrideStyle(selectedId, { color: e.target.value });
                               else handleOverrideStyle(selectedId, { backgroundColor: e.target.value });
                           }} 
                         />
                     </div>
                     <div className="h-4 w-px bg-zinc-600"></div>
                     
                     {/* Font Size for Text Elements */}
                     {(selectedId.match(/text|name|bio|number|quote|date|year|month|day/) || data.layers?.find(l => l.id === selectedId && l.type === 'text')) && (
                        <>
                             <div className="flex items-center gap-1">
                                <span className="text-[10px] text-zinc-400"><TypeIcon className="w-3 h-3"/></span>
                                <input type="number" className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 text-xs text-zinc-200" placeholder="px" 
                                value={selectedFontSize}
                                onChange={e => {
                                    const v = parseFloat(e.target.value);
                                    setSelectedFontSize(v);
                                    handleOverrideStyle(selectedId, { fontSize: `${v}px` });
                                }}
                                />
                             </div>
                             <div className="h-4 w-px bg-zinc-600"></div>
                        </>
                     )}

                     {/* Width / Height Inputs */}
                     <div className="flex items-center gap-1">
                         <span className="text-[10px] text-zinc-400">W</span>
                         <input type="number" className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 text-xs text-zinc-200" placeholder="px" 
                           onChange={e => handleOverrideStyle(selectedId, { width: `${e.target.value}px` })}
                         />
                     </div>
                     <div className="flex items-center gap-1">
                         <span className="text-[10px] text-zinc-400">H</span>
                         <input type="number" className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 text-xs text-zinc-200" placeholder="px" 
                           onChange={e => handleOverrideStyle(selectedId, { height: `${e.target.value}px` })}
                         />
                     </div>
                     <div className="h-4 w-px bg-zinc-600"></div>
                     {/* Border Radius Input */}
                     <div className="flex items-center gap-1">
                         <span className="text-[10px] text-zinc-400">R</span>
                         <input type="number" className="w-10 bg-zinc-900 border border-zinc-700 rounded px-1 text-xs text-zinc-200" placeholder="px" 
                           onChange={e => handleOverrideStyle(selectedId, { borderRadius: `${e.target.value}px` })}
                         />
                     </div>
                     <div className="h-4 w-px bg-zinc-600"></div>
                     <button onClick={handleDeleteLayer} className="text-red-400 hover:bg-red-900/30 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                 </div>
             )}
         </div>

         <div 
             style={{ 
                 transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, 
                 width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: isPanning ? 'none' : 'transform 0.1s ease-out'
             }}
         >
             <div className={`transition-transform duration-200 ease-out z-10 box-content border-[20px] border-zinc-900 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative ${activeTool === 'hand' ? 'pointer-events-none' : ''}`} style={{ width: 1080 * scale, height: 1620 * scale }}>
                <div style={{ transformOrigin: 'top left', transform: `scale(1)` }}>
                     <LayoutRenderer templateId={activeTemplateId} data={data} scale={scale} onUpdate={handleCanvasUpdate} selectedId={selectedId} onSelect={setSelectedId} onOverrideStyle={handleOverrideStyle} />
                     <div className="absolute inset-0 pointer-events-none" style={{ width: 1080, height: 1620, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                         <div className="w-full h-full relative">{renderExtraLayers(false)}</div>
                     </div>
                </div>
             </div>
         </div>
         
         <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-full shadow-lg z-20">
             <button onClick={() => setManualZoom(z => Math.max(0.5, z - 0.1))} className="text-zinc-400 hover:text-white"><Minus className="w-3 h-3" /></button>
             <input type="range" min="0.5" max="2.0" step="0.1" value={manualZoom} onChange={e => setManualZoom(parseFloat(e.target.value))} className="w-24 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
             <button onClick={() => setManualZoom(z => Math.min(2.0, z + 0.1))} className="text-zinc-400 hover:text-white"><Plus className="w-3 h-3" /></button>
             <div className="w-px h-3 bg-zinc-600 mx-1"></div>
             <span className="text-xs text-zinc-300 font-mono w-10 text-center">{(scale * 100).toFixed(0)}%</span>
         </div>
      </div>
    </div>
  );
};

export default App;