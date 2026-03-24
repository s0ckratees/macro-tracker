"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// 1. Keep your constants outside the component
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
  const [fxData, setFxData] = useState<any>(null); // Added missing state

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

        const chartSeries = cpiObs.slice(0, cpiObs.length - 12).map((obs: any, index: number) => {
          const currentVal = parseFloat(obs.value);
          const prevYearVal = parseFloat(cpiObs[index + 12].value);
          
          return {
            // "m" for the XAxis dataKey
            m: new Date(obs.date).toLocaleDateString('en-US', 
              timeRange === "1Y" ? { month: 'short' } : { year: '2-digit', month: 'short' }
            ),
            // "h" for the Line dataKey (Inflation)
            h: ((currentVal / prevYearVal - 1) * 100).toFixed(2),
          };
        });

        setLiveData({
          headline: chartSeries[0]?.h || "0.0",
          series: chartSeries.reverse()
        });
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetchAllData();
  }, [selectedCountry, timeRange]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        
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

            {/* --- TIME RANGE SELECTOR (PASTED HERE) --- */}
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
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Primary Benchmark</p>
            <p className="text-4xl font-mono font-bold text-indigo-400">{SERIES_MAP[selectedCountry].fixing}</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm flex items-center justify-center">
             <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full">
                <button onClick={() => setActiveTab("macro")} className={`flex-1 py-2 text-[10px] font-bold rounded-md ${activeTab === 'macro' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>DATA</button>
                <button onClick={() => setActiveTab("charts")} className={`flex-1 py-2 text-[10px] font-bold rounded-md ${activeTab === 'charts' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>CHART</button>
             </div>
          </div>
        </div>

        {/* --- DYNAMIC CONTENT AREA --- */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 min-h-[450px]">
          {activeTab === "charts" ? (
            <div className="h-[400px] w-full animate-in fade-in duration-500">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveData?.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="m" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                  <Line name="CPI Trend" type="monotone" dataKey="h" stroke="#6366f1" strokeWidth={4} dot={timeRange === "1Y"} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="animate-in slide-in-from-left-4 duration-500">
               {/* ... Your Market Fixings code ... */}
             </div>
          )}
        </div>
        {/* ... Footer ... */}
      </div>
    </main>
  );
}