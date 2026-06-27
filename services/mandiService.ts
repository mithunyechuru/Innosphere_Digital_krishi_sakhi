import { CropPrice } from '../types';

const API_KEY = "579b464db66ec23bdd000001097dd12c3b8641a04052d77f6a69712b";
const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const BASE_URL = "https://api.data.gov.in/resource/" + RESOURCE_ID;

export interface MandiRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

export const fetchMandiPrices = async (state?: string, district?: string): Promise<CropPrice[]> => {
  try {
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=100`; // Increased limit to get more variety
    
    if (state) {
      url += `&filters[state]=${encodeURIComponent(state)}`;
    }
    
    // If district is provided, try to filter by it too
    if (district) {
       url += `&filters[district]=${encodeURIComponent(district)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.records) {
      let records: MandiRecord[] = data.records;

      // Client-side strict filtering
      // API might return "Andhra Pradesh" results when querying, but sometimes strict matching fails on server side or returns broad matches.
      if (state) {
        records = records.filter(r => r.state.toLowerCase() === state.toLowerCase());
      }

      return records.map((record: MandiRecord) => ({
        crop: `${record.commodity} (${record.variety})`,
        // Safe parsing: Default to 0 if the API returns an empty string or invalid number to avoid NaN
        price: parseFloat(record.modal_price) || 0,
        minPrice: parseFloat(record.min_price) || 0,
        maxPrice: parseFloat(record.max_price) || 0,
        trend: Math.random() > 0.5 ? 'up' : 'down', // API doesn't provide trend, simulating for UI
        market: `${record.market}, ${record.district}`
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Failed to fetch mandi prices", error);
    return [];
  }
};

// Helper to extract state from address string
export const detectStateFromAddress = (address: string): string | undefined => {
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
  ];

  for (const state of indianStates) {
    if (address.toLowerCase().includes(state.toLowerCase())) {
      return state;
    }
  }
  return undefined;
};