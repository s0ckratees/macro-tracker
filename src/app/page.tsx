"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const SERIES_MAP: any = {
  USA: { 
    headline: "CPIAUCSL", 
    rate: "FEDFUNDS", 
    fixing: "Fed Funds", 
    name: "United States", 
    official: "3.75%" 
  },
  UK: { 
    headline: "GBRCPIALLMINMEI", 
    rate: "INTDSRGBM193N", // BoE Discount Rate (More historical data)
    fixing: "SONIA", 
    name: "United Kingdom", 
    official: "3.75%" 
  },
  SouthAfrica: { 
    headline: "ZAFCPIALLMINMEI", 
    rate: "INTDSRZAM193N", // SARB Discount Rate (Goes back decades)
    fixing: "JIBAR", 
    name: "South Africa", 
    official: "6.75%" 
  },
  Eurozone: { 
    headline: "CP0000EZ19M086NEST", 
    rate: "ECBMRRST", // ECB Main Refinancing Rate
    fixing: "ECB MRO", 
    name: "Eurozone", 
    official: "2.15%" 
  }
};
const TIME_RANGES = [
  { label: "1Y", months: 12 },
  { label: "5Y", months: 60 },
  { label: "10Y", months: 120 },
  { label: "MAX", months: 0 }
];

export default function FinancialTracker() {
  const [selectedCountry, setSelectedCountry] = useState("USA");
  const [timeRange, setTimeRange] = useState("1Y"); 
  const [activeTab, setActiveTab] = useState("charts");
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const ids = SERIES_MAP[selectedCountry];
        const rangeObj = TIME_RANGES.find(r => r.label === timeRange);
        
        let observationStart = "";
        if (rangeObj && rangeObj.months > 0) {
          const date = new Date();
          date.setMonth(date.getMonth() - (rangeObj.months + 12));
          observationStart = `&observation_start=${date.toISOString().split('T')[0]}`;
        }

        const [cpiRes, rateRes] = await Promise.all([
          fetch(`/api/fred?series_id=${ids.headline}${observationStart}`),
          fetch(`/api/fred?series_id=${ids.rate}${observationStart}`)
        ]);

        const cpiData = await cpiRes.json();
        const rateData = await rateRes.json();
        const cpiObs = cpiData.observations || [];
        const rateObs = rateData.observations || [];

        const chartSeries = cpiObs.slice(0, cpiObs.length - 12).map((obs: any, index: number) => {
          const currentVal = parseFloat(obs.value);
          const prevYearVal = parseFloat(cpiObs[index + 12].value);
          
          // Find the matching policy rate for this date
          const matchingRate = rateObs.find((r: any) => r.date === obs.date);
          
          return {
            m: new Date(obs.date).toLocaleDateString('en-US', 
              timeRange === "1Y" ? { month: 'short' } : { year: '2-digit', month: 'short' }
            ),
            h: ((currentVal / prevYearVal - 1) * 100).toFixed(2), // Inflation
            policy: matchingRate ? parseFloat(matchingRate.value).toFixed(2) : null // Policy Rate
          };
        });

        setLiveData({
          headline: chartSeries[0]?.h || "0.0",
          latestRate: chartSeries[0]?.policy || "0.0",
          series: chartSeries.reverse()
        });
      } catch (err) { 
        console.error("Fetch Error:", err); 
      }
      setLoading(false);
    }
    fetchAllData();
  }, [selectedCountry, timeRange]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* --- HEADER --- */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Live<span className="text-indigo-500">Macro</span></h1>
            <p className="text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase mt-1">Institutional Intelligence</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              {Object.keys(SERIES_MAP).map(country => (
                <button 
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${selectedCountry === country ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {country.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              {TIME_RANGES.map(range => (
                <button 
                  key={range.label} 
                  onClick={() => setTimeRange(range.label)} 
                  className={`px-3 py-2 text-[10px] font-bold rounded-lg transition-all ${
                    timeRange === range.label ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Inflation YoY ({timeRange})</p>
            <p className="text-4xl font-mono font-bold text-white">{loading ? '...' : `${liveData?.headline}%`}</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">{SERIES_MAP[selectedCountry].fixing} Rate</p>
            <p className="text-4xl font-mono font-bold text-emerald-400">{loading ? '...' : `${liveData?.latestRate}%`}</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm flex items-center justify-center">
             <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full">
                <button onClick={() => setActiveTab("macro")} className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-colors ${activeTab === 'macro' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>DATA</button>
                <button onClick={() => setActiveTab("charts")} className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-colors ${activeTab === 'charts' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>CHART</button>
             </div>
          </div>
        </div>

        {/* --- DYNAMIC CONTENT AREA --- */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 min-h-[450px]">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-slate-600 animate-pulse font-bold uppercase tracking-widest">Loading Market Data...</div>
          ) : activeTab === "charts" ? (
            <div className="h-[400px] w-full animate-in fade-in duration-500">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart key={timeRange} data={liveData?.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="m" 
                    stroke="#64748b" 
                    fontSize={11} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={timeRange === "1Y" ? 0 : "preserveStartEnd"}
                    minTickGap={30}
                  />
                  <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  
                  {/* Inflation Line */}
                  <Line 
                    name="Inflation YoY" 
                    type="monotone" 
                    dataKey="h" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={timeRange === "1Y" ? { r: 4, fill: '#6366f1', strokeWidth: 0 } : false} 
                  />

                  {/* Policy Rate Line (SONIA, JIBAR, etc) */}
                  <Line 
                    name="Policy Rate" 
                    type="stepAfter" 
                    dataKey="policy" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="animate-in slide-in-from-left-4 duration-500">
               <h3 className="text-xl font-bold text-white mb-6">Market Fixings: {SERIES_MAP[selectedCountry].name}</h3>
               <div className="grid gap-4">
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                   <span className="text-slate-500 text-sm font-bold uppercase tracking-tight">Current Policy Rate</span>
                   <span className="text-white font-mono font-bold text-xl">{liveData?.latestRate}%</span>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                   <div>
                     <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Interbank Benchmark</p>
                     <p className="text-indigo-400 font-bold">{SERIES_MAP[selectedCountry].fixing}</p>
                   </div>
                   <span className="text-slate-400 font-mono text-sm uppercase">Live Stream</span>
                 </div>
               </div>
             </div>
          )}
        </div>

        <footer className="mt-12">
          <p className="text-center text-[9px] text-slate-800 uppercase tracking-[0.5em]">
            Data Pipeline: FRED API Integration • Terminal Version 2.4.0
          </p>
        </footer>

      </div>
    </main>
  );
}