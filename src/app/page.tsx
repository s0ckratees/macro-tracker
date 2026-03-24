"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SERIES_MAP: any = {
  USA: { headline: "CPIAUCSL", rate: "FEDFUNDS", fixing: "SOFR", name: "United States", official: "3.75%" },
  UK: { headline: "GBRCPIALLMINMEI", rate: "INTDSRGBM193N", fixing: "SONIA", name: "United Kingdom", official: "3.75%" },
  SouthAfrica: { headline: "ZAFCPIALLMINMEI", rate: "INTDSRZAM193N", fixing: "JIBAR 3M", name: "South Africa", official: "6.75%" },
  Eurozone: { headline: "CP0000EZ19M086NEST", rate: "ECBMRRST", fixing: "€STR", name: "Eurozone", official: "2.15%" }
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
  const [fxData, setFxData] = useState<any>(null);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const ids = SERIES_MAP[selectedCountry];
        const rangeObj = TIME_RANGES.find(r => r.label === timeRange);
        
        let observationStart = "";
        if (rangeObj && rangeObj.months > 0) {
          const date = new Date();
          // Fetch extra 12 months to calculate YoY for the first visible point
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
          
          // Match policy rate date to CPI date
          const matchingRate = rateObs.find((r: any) => r.date === obs.date);
          
          return {
            m: new Date(obs.date).toLocaleDateString('en-US', 
              timeRange === "1Y" ? { month: 'short' } : { year: '2-digit', month: 'short' }
            ),
            h: ((currentVal / prevYearVal - 1) * 100).toFixed(2),
            policy: matchingRate ? parseFloat(matchingRate.value).toFixed(2) : null
          };
        });

        setLiveData({
          headline: chartSeries[0]?.h || "0.0",
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
            {/* Country Selector */}
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
{/* --- DYNAMIC CONTENT AREA --- */}
<div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 min-h-[450px]">
  {loading ? (
    <div className="h-[400px] flex items-center justify-center text-slate-600 animate-pulse font-bold uppercase tracking-widest">Loading Market Data...</div>
  ) : activeTab === "charts" ? (
    <div className="h-[400px] w-full animate-in fade-in duration-500">
      <ResponsiveContainer width="100%" height="100%">
        {/* Fixed: Only one LineChart tag with the key and data */}
        <LineChart key={timeRange} data={liveData?.series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="m"  /* Fixed from className="m" to dataKey="m" */
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
            itemStyle={{ color: '#6366f1' }}
          />
          <Line 
            name="Inflation" 
            type="monotone" 
            dataKey="h" 
            stroke="#6366f1" 
            strokeWidth={4} 
            dot={timeRange === "1Y" ? { r: 4, fill: '#6366f1', strokeWidth: 0 } : false} 
            activeDot={{ r: 6 }}
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
           <span className="text-white font-mono font-bold text-xl">{SERIES_MAP[selectedCountry].official}</span>
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
        {/* --- DYNAMIC CONTENT AREA --- */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 min-h-[450px]">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-slate-600 animate-pulse font-bold uppercase tracking-widest">Loading Market Data...</div>
          ) : activeTab === "charts" ? (
            <div className="h-[400px] w-full animate-in fade-in duration-500">
              <ResponsiveContainer width="100%" height="100%">
                {/* ADD THE KEY HERE 👇 */}
                <LineChart key={timeRange} data={liveData?.series}></LineChart>                
                <LineChart data={liveData?.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    className="m" 
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
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Line 
                    name="Inflation" 
                    type="monotone" 
                    dataKey="h" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={timeRange === "1Y" ? { r: 4, fill: '#6366f1', strokeWidth: 0 } : false} 
                    activeDot={{ r: 6 }}
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
                   <span className="text-white font-mono font-bold text-xl">{SERIES_MAP[selectedCountry].official}</span>
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