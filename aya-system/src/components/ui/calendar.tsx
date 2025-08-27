import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SelectContent, SelectItem, SelectTrigger, SelectValue, Select } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onClose?: () => void;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onClose,
  ...props
}: CalendarProps) {
  // تتبع الشهر المعروض حاليًا
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    props.defaultMonth || new Date()
  );

  // تحديث الشهر الحالي عندما يتغير من props
  React.useEffect(() => {
    if (props.month) {
      setCurrentMonth(props.month);
    }
  }, [props.month]);

  // قائمة السنوات للاختيار
  const years = React.useMemo(() => {
    return Array.from(
      { length: 20 },
      (_, i) => new Date().getFullYear() - 10 + i
    ).map(String);
  }, []);
  
  // قائمة الأشهر للاختيار
  const months = React.useMemo(() => {
    return Array.from(
      { length: 12 },
      (_, i) => {
        const date = new Date();
        date.setMonth(i);
        return {
          value: i.toString(),
          label: date.toLocaleString('ar', { month: 'long', calendar: 'gregory' })
        };
      }
    );
  }, []);

  // التحكم في تغيير السنة
  const handleYearChange = (year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
    props.onMonthChange?.(newDate);
  };

  // التحكم في تغيير الشهر
  const handleMonthChange = (month: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(month);
    setCurrentMonth(newDate);
    props.onMonthChange?.(newDate);
  };
  
  // الانتقال إلى تاريخ اليوم
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    props.onMonthChange?.(today);
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      onDayClick={(day) => {
        // عند النقر على يوم، إذا كان هناك دالة إغلاق، استدعيها بعد قليل
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 100);
        }
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "hidden",
        nav: "hidden", /* إخفاء أزرار التنقل الافتراضية */
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-islamic-green hover:text-white focus:bg-islamic-green focus:text-white",
        day_today: "bg-islamic-green text-white font-bold ring-2 ring-islamic-green",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Caption: ({ displayMonth }) => (
          <div className="flex justify-center items-center gap-2 pt-1 relative w-full">
            {/* زر للإغلاق */}
            {onClose && (
              <button
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-7 w-7 p-0 rounded-full absolute left-0 hover:bg-muted"
                )}
                onClick={onClose}
                title="إغلاق"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* قائمة منسدلة للسنة */}
            <Select
              value={displayMonth.getFullYear().toString()}
              onValueChange={(year) => handleYearChange(parseInt(year))}
            >
              <SelectTrigger className="h-7 px-2 py-0 text-xs font-medium w-20">
                <SelectValue placeholder={displayMonth.getFullYear().toString()} />
              </SelectTrigger>
              <SelectContent className="max-h-40">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* قائمة منسدلة للشهر */}
            <Select
              value={displayMonth.getMonth().toString()}
              onValueChange={(month) => handleMonthChange(parseInt(month))}
            >
              <SelectTrigger className="h-7 px-2 py-0 text-xs font-medium w-28">
                <SelectValue placeholder={displayMonth.toLocaleDateString('ar', { month: 'long', calendar: 'gregory' })} />
              </SelectTrigger>
              <SelectContent className="max-h-40">
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* زر للانتقال إلى تاريخ اليوم */}
            <button
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 px-2 py-0 text-xs font-medium bg-transparent opacity-50 hover:opacity-100"
              )}
              onClick={goToToday}
              title="الانتقال إلى اليوم"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              <span>اليوم</span>
            </button>
          </div>
        ),
      }}
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
