import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Thermometer, Loader2 } from "lucide-react";
import { useCalendarStore } from "@/hooks/use-calendar-store";

interface WeatherData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
}

const WEATHER_INTERPRETATION: Record<number, { label: string; icon: any }> = {
  0: { label: "سماء صافية", icon: Sun },
  1: { label: "صافٍ غالباً", icon: Sun },
  2: { label: "غائم جزئياً", icon: Cloud },
  3: { label: "غائم", icon: Cloud },
  45: { label: "ضباب", icon: CloudFog },
  48: { label: "ضباب صقيعي", icon: CloudFog },
  51: { label: "رذاذ خفيف", icon: CloudDrizzle },
  53: { label: "رذاذ متوسط", icon: CloudDrizzle },
  55: { label: "رذاذ كثيف", icon: CloudDrizzle },
  61: { label: "مطر خفيف", icon: CloudRain },
  63: { label: "مطر متوسط", icon: CloudRain },
  65: { label: "مطر غزير", icon: CloudRain },
  71: { label: "ثلج خفيف", icon: CloudSnow },
  73: { label: "ثلج متوسط", icon: CloudSnow },
  75: { label: "ثلج كثيف", icon: CloudSnow },
  95: { label: "عواصف رعدية", icon: CloudLightning },
};

interface WeatherWidgetProps {
  compact?: boolean;
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const { settings, selectedDate } = useCalendarStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lat = settings.weatherLat || 33.9231;
  const lon = settings.weatherLon || 36.0028;
  const locationName = settings.weatherLocationName || "بيت شاما";

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        if (!response.ok) throw new Error("Failed to fetch weather");
        const data = await response.json();
        setWeather(data);
      } catch (err) {
        setError("تعذر تحميل بيانات الطقس");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [lat, lon]);

  if (loading) return (
    <Card className="mb-4 animate-pulse">
      <CardContent className="h-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
      </CardContent>
    </Card>
  );
  if (error || !weather) return null;

  const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  // If in compact mode and a date is selected, find the weather for that date if it's within the next 7 days
  let displayDays = weather.daily.time.slice(0, 5);
  let isSingleDay = false;

  if (compact && selectedDate) {
    const selectedDateStr = selectedDate.toISOString().split("T")[0];
    const dayIndex = weather.daily.time.findIndex(t => t === selectedDateStr);
    
    if (dayIndex !== -1) {
      displayDays = [weather.daily.time[dayIndex]];
      isSingleDay = true;
    }
  }

  if (isSingleDay) {
    const i = weather.daily.time.findIndex(t => t === displayDays[0]);
    const code = weather.daily.weathercode[i];
    const interpretation = WEATHER_INTERPRETATION[code] || { label: "غير معروف", icon: Cloud };
    const WeatherIcon = interpretation.icon;

    return (
      <Card className="mb-4 overflow-hidden border-primary/20 bg-card" data-testid="weather-widget-compact">
        <CardContent className="p-3">
          <div className="flex flex-row-reverse items-center justify-between">
            <div className="flex flex-row-reverse items-center gap-3">
              <WeatherIcon className="h-8 w-8 text-primary" />
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">{interpretation.label}</p>
                <p className="text-[10px] text-muted-foreground">{locationName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground leading-none">
                {Math.round(weather.daily.temperature_2m_max[i])}°
              </p>
              <p className="text-[10px] text-muted-foreground">
                الصغرى {Math.round(weather.daily.temperature_2m_min[i])}°
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-background to-accent/10" data-testid="weather-widget">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold flex flex-row-reverse items-center gap-2">
          <Sun className="h-4 w-4 text-orange-500" />
          توقعات الطقس - {locationName}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <div className="flex flex-row-reverse justify-between gap-1">
          {displayDays.map((time) => {
            const i = weather.daily.time.indexOf(time);
            const date = new Date(time);
            const today = new Date().toISOString().split("T")[0];
            const dayName = time === today ? "اليوم" : dayNames[date.getDay()];
            const code = weather.daily.weathercode[i];
            const interpretation = WEATHER_INTERPRETATION[code] || { label: "غير معروف", icon: Cloud };
            const WeatherIcon = interpretation.icon;

            return (
              <div key={time} className="flex flex-col items-center flex-1 p-2 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <span className="text-[10px] text-muted-foreground font-medium mb-1">{dayName}</span>
                <WeatherIcon className="h-6 w-6 mb-1 text-primary" />
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-foreground leading-none">
                    {Math.round(weather.daily.temperature_2m_max[i])}°
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {Math.round(weather.daily.temperature_2m_min[i])}°
                  </span>
                </div>
                <span className="text-[8px] text-muted-foreground mt-1 text-center line-clamp-1">
                  {interpretation.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
