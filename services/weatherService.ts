import { WeatherData } from '../types';

// Using a default location (Nagpur, India) if geolocation fails or for initial load
const DEFAULT_LAT = 21.1458;
const DEFAULT_LNG = 79.0882;

export const fetchWeather = async (lat: number = DEFAULT_LAT, lng: number = DEFAULT_LNG): Promise<WeatherData> => {
  try {
    // Updated to fetch comprehensive current, hourly, and daily data
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    );
    const data = await response.json();
    
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    // Parse Hourly (Next 24 hours)
    // Find the index for the current time to start the 24h slice
    const currentHourIndex = hourly.time.findIndex((t: string) => new Date(t) >= new Date(new Date().setMinutes(0,0,0)));
    const startIndex = currentHourIndex !== -1 ? currentHourIndex : 0;
    
    const next24Hours = hourly.time.slice(startIndex, startIndex + 24).map((time: string, i: number) => {
      const index = startIndex + i;
      return {
        time: time,
        temperature: hourly.temperature_2m[index],
        precipitationProbability: hourly.precipitation_probability[index],
        windSpeed: hourly.wind_speed_10m[index]
      };
    });

    // Parse Daily (Next 7 days)
    const next7Days = daily.time.map((time: string, i: number) => {
      return {
        date: time,
        maxTemp: daily.temperature_2m_max[i],
        minTemp: daily.temperature_2m_min[i],
        precipitationProbability: daily.precipitation_probability_max[i],
        condition: getWeatherConditionText(daily.weather_code[i])
      };
    });
    
    // Simple logic to determine if it's currently rainy based on WMO code
    const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
    const isRainy = rainCodes.includes(current.weather_code);

    return {
      temperature: current.temperature_2m,
      condition: getWeatherConditionText(current.weather_code),
      windSpeed: current.wind_speed_10m,
      humidity: current.relative_humidity_2m,
      isRainy: isRainy,
      hourly: next24Hours,
      daily: next7Days
    };
  } catch (error) {
    console.error("Weather fetch failed", error);
    return {
      temperature: 28,
      condition: "Sunny",
      humidity: 50,
      windSpeed: 10,
      isRainy: false,
      hourly: [],
      daily: []
    };
  }
};

const getWeatherConditionText = (code: number): string => {
  if (code === 0) return "Clear Sky";
  if (code >= 1 && code <= 3) return "Partly Cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rainy";
  if (code >= 71 && code <= 77) return "Snowy";
  if (code >= 80 && code <= 82) return "Heavy Rain";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
};