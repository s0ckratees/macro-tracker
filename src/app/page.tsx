"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SERIES_MAP: any = {
  USA: { headline: "CPIAUCSL", rate: "FEDFUNDS", fixing: "SOFR", name: "United States", official: "3.75%" },
  UK: { headline: "GBRCPIALLMINMEI", rate: "INTDSRGBM193N", fixing: "SONIA", name: "United Kingdom", official: "3.75%" },
  SouthAfrica: { headline: "ZAFCPIALLMINMEI", rate: "INTDSRZAM193N", fixing: "JIBAR 3M", name: "South Africa", official: "6.75%" },
  Eurozone: { headline: "CP0000EZ19M086NEST", rate: "ECBMRRST", fixing: "€STR", name: "Eurozone", official: "2.15%" }
};

export default function FinancialTracker() {
  const [selectedCountry, setSelectedCountry] = useState("USA");
  const [chartView, setChartView] = useState("cpi"); 
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      console.log(`Fetching data for ${selectedCountry}...`);
      try {
        const ids = SERIES_MAP[selectedCountry];
        
        // Fetching both Inflation and Rates
        const [cpiRes, rateRes] = await Promise.all([
          fetch(`/api/fred?series_id=${ids.headline}`),
          fetch(`/api/fred?series_id=${ids.rate}`)
        ]);

        const cpiData = await cpiRes.json();
        const rateData = await rateRes.json();

        if (!cpiData.observations || !rateData.observations) {
            throw new Error("Missing observations in API response");
        }

        const cpiObs = cpiData.observations;
        const rateObs = rateData.observations;

        const chartSeries = [];
        // Loop 12 months for a full year of history
        for (let i = 0; i < 12; i++) {
          const c = parseFloat(cpiObs[i].value);
          const p = parseFloat(cpiObs[i + 12].value);
          
          chartSeries.push({
            date: new Date(cpiObs[i].date).toLocaleDateString('en-US', { month: 'short' }),
            inflation: ((c / p - 1) * 100).toFixed(2),
            policyRate: parseFloat(rateObs[i]?.value || rateObs[0].value).toFixed(2)
          });
        }

        setLiveData({
          headline: ((parseFloat(cpiObs[0].value) / parseFloat(cpiObs[12].value) - 1) * 100).toFixed(1),
          series: chartSeries.reverse()
        });
      } catch (err) { 
        console.error("Fetch Error:", err); 
      }
      setLoading(false);
    }
    fetchAllData();
  }, [selectedCountry]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">QUANT<span className="text-indigo-500">MACRO</span></h1>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            {Object.keys(SERIES_MAP).map(c => (
              <button key={c} onClick={() => setSelectedCountry(c)} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${selectedCountry === c ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{c}</button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* CPI CARD */}
          <div 
            onClick={() => { console.log("Switching to CPI"); setChartView("cpi"); }}
            className={`cursor-pointer p-6 rounded-2xl border transition-all ${chartView === 'cpi' ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
          >
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Inflation YoY</p>
            <p className="text-4xl font-mono font-bold text-white">{loading ? '...' : liveData?.headline}%</p>
            <p className="text-[9px] mt-2 font-bold text-indigo-400 uppercase tracking-tighter">{chartView === 'cpi' ? '● Active' : '○ View Chart'}</p>
          </div>

          {/* RATE CARD */}
          <div 
            onClick={() => { console.log("Switching to RATE"); setChartView("rate"); }}
            className={`cursor-pointer p-6 rounded-2xl border transition-all ${chartView === 'rate' ? 'bg-rose-900/20 border-rose-500' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
          >
            <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">{SERIES_MAP[selectedCountry].fixing}</p>
            <p className="text-4xl font-mono font-bold text-white">{SERIES_MAP[selectedCountry].official}</p>
            <p className="text-[9px] mt-2 font-bold text-rose-400 uppercase tracking-tighter">{chartView === 'rate' ? '● Active' : '○ View Chart'}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 h-[400px]">
          {loading ? (
             <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Loading Quant Data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liveData?.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                
                {chartView === "cpi" ? (
                  <Line key="inflation" type="monotone" dataKey="inflation" stroke="#6366f1" strokeWidth={4} dot={{ r: 4 }} animationDuration={400} />
                ) : (
                  <Line key="policyRate" type="stepAfter" dataKey="policyRate" stroke="#f43f5e" strokeWidth={4} dot={{ r: 4 }} animationDuration={400} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  );
}