import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // FIX: Name this series_id to match your usage below
  const series_id = searchParams.get('series_id');

  // 1. CAPTURE THE NEW START DATE FROM THE FRONTEND
  const observation_start = searchParams.get('observation_start') || ''; 

  if (!series_id) return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });

  const apiKey = process.env.FRED_API_KEY;

  // 2. PLUG THE START DATE INTO THE FRED API CALL
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}${observation_start ? `&observation_start=${observation_start}` : ''}&api_key=${apiKey}&file_type=json&sort_order=desc`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("FRED API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch FRED data' }, { status: 500 });
  }
}