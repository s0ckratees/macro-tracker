"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SERIES_MAP: any = {
  USA: { headline: "CPIAUCSL", fixing: "SOFR", name: "United States", official: "3.50%" },
  UK: { headline: "GBRCPIALLMINMEI", fixing: "SONIA", name: "United Kingdom", official: "3.75%" },
  SouthAfrica: { headline: "ZAFCPIALLMINMEI", fixing: "JIBAR 3M", name: "South Africa", official: "6.75%" },
  Eurozone: { headline: "CP0000EZ19M086NEST", fixing: "€STR", name: "Eurozone", official: "2.15%" }
};

export default function FinancialTracker() {
  const [activeTab, setActiveTab] = useState("macro");
  const [selectedCountry, setSelectedCountry] = useState("USA");
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const ids = SERIES_MAP[selectedCountry];
        const res = await fetch(`/api/fred?series_id=${ids.headline}`);
        const data = await res.json();
        
        const latestDate = new Date(data.observations[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const chartSeries = data.observations.map((obs: any) => ({
          m: new Date(obs.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          h: parseFloat(obs.value).toFixed(2)
        })).reverse();

        setLiveData({ headline: chartSeries[chartSeries.length-1].h, series: chartSeries, asOf: latestDate });
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetchAllData();
  }, [selectedCountry]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-white italic">QUANT<span className="text-indigo-500">MACRO</span></h1>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            {Object.keys(SERIES_MAP).map(c => (
              <button key={c} onClick={() => setSelectedCountry(c)} className={`px-4 py-2 text-[10px] font-bold rounded-lg ${selectedCountry === c ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{c}</button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Latest CPI Index</p>
            <p className="text-4xl font-mono font-bold text-white">{loading ? '...' : liveData?.headline}%</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Interbank {SERIES_MAP[selectedCountry].fixing}</p>
            <p className="text-2xl font-mono font-bold text-white">{SERIES_MAP[selectedCountry].official}</p>
            <p className="text-[10px] text-slate-600 italic mt-1 font-bold tracking-tight">Latest Fixing: {liveData?.asOf}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liveData?.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="m" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="h" stroke="#6366f1" strokeWidth={4} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}