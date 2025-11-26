'use client';
import { useState } from 'react';

export default function Home() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const scanContract = async () => {
    if(!address) return;
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        body: JSON.stringify({ contractAddress: address }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      alert("Scan failed. Check console.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
            SENTINEL
          </h1>
          <p className="text-gray-400">Polygon Smart Contract Risk Scanner</p>
        </div>

        {/* Search Box */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Paste Contract Address (0x...)" 
            className="w-full p-4 pr-32 bg-gray-900 border border-gray-800 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button 
            onClick={scanContract}
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'SCAN'}
          </button>
        </div>

        {/* Results Card */}
        {result && (
          <div className={`p-8 rounded-2xl border-2 shadow-2xl ${
            result.riskLevel === 'High' ? 'border-red-500 bg-red-950/30' : 
            result.riskLevel === 'Medium' ? 'border-yellow-500 bg-yellow-950/30' : 
            'border-green-500 bg-green-950/30'
          }`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-1">{result.riskLevel} RISK</h2>
                <p className="text-gray-400 text-sm">Security Score</p>
              </div>
              <div className="text-4xl font-mono font-bold">{result.riskScore}/100</div>
            </div>

            <p className="text-lg mb-6 leading-relaxed text-gray-200">
              {result.summary}
            </p>

            <div className="bg-black/40 p-6 rounded-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Vulnerabilities Detected</h3>
              <ul className="space-y-3">
                {result.keyIssues?.map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`mt-1 h-2 w-2 rounded-full ${result.riskLevel === 'High' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}