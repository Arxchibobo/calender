import React, { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';

// --- Shared Types & Helpers ---
interface InteractableProps {
  id?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  overrideStyle?: React.CSSProperties;
  onChangeStyle?: (id: string, style: React.CSSProperties) => void;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onDoubleClick?: () => void;
}

const ResizeHandle = ({ onDrag, position }: { onDrag: (dx: number, dy: number) => void, position: string }) => {
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        const startX = e.clientX;
        const startY = e.clientY;
        const moveHandler = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            onDrag(moveEvent.clientX - startX, moveEvent.clientY - startY);
        };
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    };

    let cursor = 'nwse-resize';
    if (position === 'tr' || position === 'bl') cursor = 'nesw-resize';

    return (
        <div 
            className={`absolute w-4 h-4 bg-white border-2 border-blue-600 rounded-full z-50 hover:scale-125 transition-transform shadow-sm`} 
            style={{ cursor, [position.includes('t') ? 'top' : 'bottom']: -8, [position.includes('l') ? 'left' : 'right']: -8 }}
            onMouseDown={handleMouseDown}
        />
    );
};

export const InteractableWrapper: React.FC<InteractableProps> = ({
  id, isSelected, onSelect, overrideStyle, onChangeStyle, readOnly, className, style, children, onDoubleClick
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
    const dragStartRef = useRef<{x: number, y: number} | null>(null);

    // Merge styles
    const combinedStyle: React.CSSProperties = {
        ...style,
        ...overrideStyle,
        position: overrideStyle?.position || style?.position || 'relative',
        cursor: readOnly ? 'default' : (isDragging ? 'grabbing' : (isSelected ? 'move' : 'pointer')),
        outline: isSelected ? '2px solid #2563eb' : 'none',
        zIndex: isSelected ? 50 : (style?.zIndex || 'auto'),
        userSelect: 'none', // Important for dragging
        WebkitUserSelect: 'none',
        pointerEvents: readOnly ? 'none' : 'auto' // CRITICAL: Ensure interactions work even in pointer-events-none containers
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly || !id) return;
        // Do not stop propagation immediately, let inputs handle their own focus
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        
        e.preventDefault(); 
        e.stopPropagation(); // CRITICAL: Prevent container from receiving click and deselecting
        if (onSelect) onSelect(id);
        
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setDragDelta({ x: 0, y: 0 });
    };

    useEffect(() => {
        if (!id || !onChangeStyle) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            
            // Only start dragging if moved more than 5px (threshold)
            if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                setIsDragging(true);
            }

            if (isDragging) {
                const currentTransform = overrideStyle?.transform || 'translate(0px, 0px)';
                const match = currentTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                let curX = 0, curY = 0;
                if (match) {
                    curX = parseFloat(match[1]);
                    curY = parseFloat(match[2]);
                }

                onChangeStyle(id, {
                    ...overrideStyle,
                    transform: `translate(${curX + dx}px, ${curY + dy}px)`
                });
                
                // Track delta for display
                setDragDelta(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                
                // Update start ref to avoid "flying" objects, we process delta incrementally
                dragStartRef.current = { x: e.clientX, y: e.clientY };
            }
        };

        const handleMouseUp = () => {
            dragStartRef.current = null;
            setIsDragging(false);
            setDragDelta({ x: 0, y: 0 });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, id, onChangeStyle, overrideStyle]);

    // Resizing Logic
    const handleResize = (dx: number, dy: number) => {
        if (!id || !onChangeStyle) return;
        
        // Check if text based on child type prop
        const isText = (children as any)?.type?.name === 'SmartText' || (children as any)?.props?.isText;
        
        if (isText) {
            const currentSize = parseFloat(String(overrideStyle?.fontSize || style?.fontSize || '16'));
            const scale = 1 + (dx + dy) / 200; 
            onChangeStyle(id, { ...overrideStyle, fontSize: `${Math.max(8, currentSize * scale)}px` });
        } else {
            const currentW = ref.current?.offsetWidth || 100;
            const currentH = ref.current?.offsetHeight || 100;
            onChangeStyle(id, { 
                ...overrideStyle, 
                width: `${currentW + dx}px`, 
                height: `${currentH + dy}px`,
                maxWidth: 'none',
                maxHeight: 'none'
            });
        }
    };

    return (
        <div 
            ref={ref}
            className={`${className} transition-none`} 
            style={combinedStyle}
            onMouseDown={handleMouseDown}
            onDoubleClick={(e) => {
                if (readOnly) return;
                e.stopPropagation();
                onDoubleClick?.();
            }}
        >
            {children}
            {/* Drag Tooltip - Enhanced visibility */}
            {isDragging && (
                <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-base font-bold px-4 py-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-[100] font-mono flex gap-4 border border-white/20">
                    <span>X: {dragDelta.x > 0 ? '+' : ''}{Math.round(dragDelta.x)}</span>
                    <span>Y: {dragDelta.y > 0 ? '+' : ''}{Math.round(dragDelta.y)}</span>
                </div>
            )}
            {isSelected && !readOnly && !isDragging && (
                <ResizeHandle position="br" onDrag={(dx, dy) => handleResize(dx, dy)} />
            )}
        </div>
    );
};

// --- Smart Text ---
interface SmartTextProps {
  id?: string;
  value: string | number;
  onSave?: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  overrideStyle?: React.CSSProperties;
  onChangeStyle?: (id: string, style: React.CSSProperties) => void;
  isText?: boolean; // Marker for resize logic
}

export const SmartText: React.FC<SmartTextProps> = (props) => {
  const { value, onSave, multiline, placeholder, readOnly, style, overrideStyle } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  useEffect(() => setTempValue(String(value)), [value]);

  if (readOnly) {
     return <div className={props.className} style={{...style, ...overrideStyle}}>{value}</div>;
  }

  if (isEditing) {
      const editStyle: React.CSSProperties = { 
          ...style, 
          ...overrideStyle, 
          width: '100%', 
          height: '100%', 
          outline: '2px solid #2563eb',
          position: 'relative', // Reset position for input to fill container
          transform: 'none',
          cursor: 'text',
          zIndex: 100
      };

      return multiline ? (
          <textarea
             autoFocus
             className="bg-white/90 text-black w-full h-full resize-none p-1 border-none rounded shadow-lg"
             style={editStyle}
             value={tempValue}
             onChange={e => setTempValue(e.target.value)}
             onBlur={() => { setIsEditing(false); onSave?.(tempValue); }}
             onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }}}
             onMouseDown={e => e.stopPropagation()} 
          />
      ) : (
          <input
             autoFocus
             className="bg-white/90 text-black w-full h-full p-1 border-none rounded shadow-lg"
             style={editStyle}
             value={tempValue}
             onChange={e => setTempValue(e.target.value)}
             onBlur={() => { setIsEditing(false); onSave?.(tempValue); }}
             onKeyDown={e => { if(e.key==='Enter') e.currentTarget.blur(); }}
             onMouseDown={e => e.stopPropagation()} 
          />
      );
  }

  return (
    <InteractableWrapper {...props} style={style} onDoubleClick={() => setIsEditing(true)}>
        <div className="w-full h-full pointer-events-none">
            {String(value) || <span className="opacity-50 italic">{placeholder}</span>}
        </div>
    </InteractableWrapper>
  );
};

// --- Smart Image ---
interface SmartImageProps {
  id?: string;
  src: string;
  onUpload?: (file: File) => void;
  className?: string;
  style?: React.CSSProperties;
  focal?: string;
  readOnly?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  overrideStyle?: React.CSSProperties;
  onChangeStyle?: (id: string, style: React.CSSProperties) => void;
}

export const SmartImage: React.FC<SmartImageProps> = (props) => {
  const { src, onUpload, focal, readOnly, className, style } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (readOnly) {
     return <img src={src} className={className} style={{ ...style, ...props.overrideStyle, objectPosition: focal }} />;
  }

  return (
    <InteractableWrapper {...props} style={style} onDoubleClick={() => fileInputRef.current?.click()}>
       <div className="w-full h-full relative group overflow-hidden" style={{ borderRadius: style?.borderRadius }}>
           <img 
            src={src} 
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: focal }}
            draggable={false}
           />
           {props.isSelected && (
               <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>
           )}
           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                if(e.target.files?.[0]) onUpload?.(e.target.files[0]);
           }} />
       </div>
    </InteractableWrapper>
  );
};

// --- Smart Shape (Extras) ---
export const SmartShape: React.FC<any> = (props) => {
    // Respect passed borderRadius for rects, force 50% for circles
    const borderRadius = props.type === 'circle' ? '50%' : (props.overrideStyle?.borderRadius || props.style?.borderRadius || '0px');
    
    return (
        <InteractableWrapper {...props}>
            <div 
                className="w-full h-full shadow-sm"
                style={{ 
                    backgroundColor: props.fill || '#ccc', 
                    borderRadius: borderRadius,
                    // Use a subtle border for visibility unless hidden
                    border: '1px solid rgba(0,0,0,0.05)',
                    // Only transition color/radius, not transform/dimensions to avoid drag lag
                    transition: 'background-color 0.2s, border-radius 0.2s' 
                }} 
            />
        </InteractableWrapper>
    );
};

// --- Smart Block (For template structure like lines/boxes) ---
interface SmartBlockProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  overrideStyle?: React.CSSProperties;
  onChangeStyle?: (id: string, style: React.CSSProperties) => void;
  children?: React.ReactNode;
}

export const SmartBlock: React.FC<SmartBlockProps> = (props) => {
  return (
    <InteractableWrapper {...props}>
       <div className="w-full h-full" style={{ backgroundColor: props.style?.backgroundColor || 'transparent' }}>
          {props.children}
       </div>
    </InteractableWrapper>
  );
};