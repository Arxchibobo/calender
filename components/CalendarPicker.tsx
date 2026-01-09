import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  onSelectDate: (year: number, month: number, day: number) => void;
  selectedMonth?: number;
  selectedDay?: number;
  markedDates?: string[]; // Array of "YYYY-MM-DD" strings that have data
}

const CalendarPicker: React.FC<Props> = ({ onSelectDate, selectedMonth = 1, selectedDay = 1, markedDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedMonth - 1); // 0-indexed for JS Date
  const year = 2026;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
  const firstDay = new Date(year, currentMonth, 1).getDay(); // 0 = Sunday

  const handlePrevMonth = () => {
    setCurrentMonth(prev => (prev === 0 ? 11 : prev - 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(prev => (prev === 11 ? 0 : prev + 1));
  };

  const days = [];
  // Padding
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`pad-${i}`} className="w-8 h-8"></div>);
  }
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = (currentMonth + 1) === selectedMonth && d === selectedDay;
    const dateStr = `${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasData = markedDates.includes(dateStr);

    days.push(
      <button
        key={d}
        onClick={() => onSelectDate(year, currentMonth + 1, d)}
        className={`w-8 h-8 text-xs font-medium rounded-full flex items-center justify-center transition-colors relative
          ${isSelected 
            ? 'bg-indigo-600 text-white shadow-md' 
            : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        {d}
        {hasData && !isSelected && (
          <span className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full"></span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 w-full shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
           <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-gray-800">
          {year} {monthNames[currentMonth]}
        </span>
        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
           <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-[10px] text-gray-400 font-bold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {days}
      </div>
    </div>
  );
};

export default CalendarPicker;