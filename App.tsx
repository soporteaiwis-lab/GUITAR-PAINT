import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { 
  BodyWood, 
  NeckProfile, 
  FretboardMaterial, 
  BridgeSystem, 
  PickupConfig, 
  GuitarSpecs, 
  AnalysisResult,
  ChatMessage
} from './types';
import { 
  WOOD_CHARACTERISTICS, 
  BRIDGE_MECHANICS, 
  FRETBOARD_RESPONSE 
} from './constants';
import { 
  fileToGenerativePart, 
  analyzeGuitarImage, 
  generateLutheriePrompt, 
  generateModifiedGuitarImage,
  createLuthierChatSession
} from './services/geminiService';

// --- UI Components (Internal for simplicity within single file structure) ---

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-luthier-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-luthier-accent font-mono text-sm uppercase tracking-widest mb-4 border-b border-gray-700 pb-2">
    {children}
  </h3>
);

const SelectGroup = ({ label, value, onChange, options, description }: any) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-luthier-accent focus:border-luthier-accent block p-2.5 font-mono"
    >
      {Object.values(options).map((opt: any) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    {description && <p className="mt-1 text-xs text-gray-500 italic">{description}</p>}
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'configurator' | 'advisory'>('configurator');
  
  // Image / Simulator State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat / Advisory State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Configuration State
  const [specs, setSpecs] = useState<GuitarSpecs>({
    bodyWood: BodyWood.ALDER,
    neckProfile: NeckProfile.MODERN_C,
    fretboard: FretboardMaterial.ROSEWOOD,
    bridge: BridgeSystem.TUNE_O_MATIC,
    pickups: PickupConfig.HH,
    scaleLength: "24.75\"",
    fretboardRadius: "12\"",
    notes: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Chat Session on Mount
  useEffect(() => {
    try {
      const session = createLuthierChatSession();
      setChatSession(session);
      setChatHistory([{
        role: 'model',
        text: "I am your Digital Luthier. Ask me about tonewood physics, neck geometry, or hardware mechanics."
      }]);
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setRawFile(file);
    const base64 = await fileToGenerativePart(file);
    setOriginalImage(`data:${file.type};base64,${base64}`);
    setGeneratedImage(null);
    setGeneratedPrompt(null);
    setAnalysisResult(null);
    setError(null);
    // Switch back to configurator on upload
    setActiveTab('configurator');

    performAnalysis(base64);
  };

  const performAnalysis = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeGuitarImage(base64Data);
      setAnalysisResult(result);
    } catch (err) {
      setError("Failed to analyze image acoustics. Please check API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyFrankensteinPreset = () => {
    setSpecs(prev => ({
      ...prev,
      bridge: BridgeSystem.FLOYD_ROSE,
      pickups: PickupConfig.HSS,
      bodyWood: BodyWood.ASH,
      notes: "Custom Shop 'Frankenstein' mod. Gibson style Humbucker in bridge. Heavy relic aged Nitrocellulose finish. High performance hybrid aesthetic."
    }));
  };

  const handleSimulate = async () => {
    if (!originalImage || !specs) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setGeneratedPrompt(null);

    try {
      const base64Data = originalImage.split(',')[1];
      const philosophy = analysisResult?.detectedSpecs?.philosophy || "Standard Industry Design";
      
      const prompt = await generateLutheriePrompt(base64Data, specs, philosophy);
      setGeneratedPrompt(prompt);

      const newImage = await generateModifiedGuitarImage(prompt);
      setGeneratedImage(newImage);

    } catch (err) {
      console.error(err);
      setError("Simulation failed. Ensure you have a valid Gemini API Key enabled.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSession) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);

    try {
      const resultStream = await chatSession.sendMessageStream({ message: userMsg });
      
      let fullResponse = "";
      // Add empty model message placeholder
      setChatHistory(prev => [...prev, { role: 'model', text: "" }]);

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const text = c.text || "";
        fullResponse += text;
        
        // Update last message with accumulating text
        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
          return newHistory;
        });
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Connection to Luthier Intelligence Interrupted." }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="min-h-screen bg-luthier-dark text-slate-200 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-white">
            LUTHIER<span className="text-luthier-accent">.AI</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono tracking-widest mt-1">DIGITAL PRODUCT ARCHITECTURE</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs text-gray-500">POWERED BY GEMINI 3 & 2.5</p>
          <p className="text-xs text-luthier-accent">VISION / REASONING / GENERATION</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Controls / Chat */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-700">
             <button 
               onClick={() => setActiveTab('configurator')}
               className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${activeTab === 'configurator' ? 'text-luthier-accent border-b-2 border-luthier-accent' : 'text-gray-500 hover:text-white'}`}
             >
               VISUAL CONFIGURATOR
             </button>
             <button 
               onClick={() => setActiveTab('advisory')}
               className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${activeTab === 'advisory' ? 'text-luthier-accent border-b-2 border-luthier-accent' : 'text-gray-500 hover:text-white'}`}
             >
               LUTHIER ADVISORY
             </button>
          </div>

          {/* Configurator Mode */}
          {activeTab === 'configurator' && (
            <>
              {/* Upload Section */}
              <div className="bg-luthier-panel p-6 rounded-xl border border-gray-700 shadow-lg">
                <SectionTitle>01. Source Material</SectionTitle>
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-luthier-accent transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                  {originalImage ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded">
                      <img src={originalImage} alt="Original" className="object-cover w-full h-full" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs py-1">
                        CLICK TO REPLACE
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm text-gray-400">Upload Instrument Image</p>
                    </div>
                  )}
                </div>

                {isAnalyzing && (
                  <div className="mt-4 flex items-center text-xs text-luthier-accent animate-pulse">
                    <Spinner /> ANALYZING STRUCTURE & ACOUSTICS...
                  </div>
                )}
                
                {analysisResult && (
                  <div className="mt-4 bg-slate-900/50 p-3 rounded text-xs font-mono border-l-2 border-luthier-wood">
                    <p className="text-luthier-wood font-bold mb-1">DETECTED SPECS:</p>
                    <ul className="space-y-1 text-gray-400">
                      <li>PHILOSOPHY: <span className="text-white">{analysisResult.detectedSpecs.philosophy || "Unknown"}</span></li>
                      <li>CONSTRUCTION: {analysisResult.detectedSpecs.construction || "Unknown"}</li>
                      <li>WOOD: {analysisResult.detectedSpecs.bodyWood || "Unknown"}</li>
                      <li>BRIDGE: {analysisResult.detectedSpecs.bridge || "Unknown"}</li>
                      <li>PICKUPS: {analysisResult.detectedSpecs.pickups || "Unknown"}</li>
                    </ul>
                    <p className="mt-2 text-gray-500 italic">"{analysisResult.luthierNotes}"</p>
                  </div>
                )}
              </div>

              {/* Controls Section */}
              <div className="bg-luthier-panel p-6 rounded-xl border border-gray-700 shadow-lg">
                <SectionTitle>02. Modification Specs</SectionTitle>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quick Presets</label>
                  <button 
                    onClick={applyFrankensteinPreset}
                    className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-200 py-2 px-3 rounded flex items-center justify-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    APPLY "FRANKENSTRAT" MODE
                  </button>
                </div>

                <SelectGroup 
                  label="Body Tonewood" 
                  value={specs.bodyWood} 
                  onChange={(v: BodyWood) => setSpecs({...specs, bodyWood: v})} 
                  options={BodyWood}
                  description={WOOD_CHARACTERISTICS[specs.bodyWood]}
                />

                <div className="grid grid-cols-2 gap-4">
                  <SelectGroup 
                    label="Fretboard" 
                    value={specs.fretboard} 
                    onChange={(v: FretboardMaterial) => setSpecs({...specs, fretboard: v})} 
                    options={FretboardMaterial}
                    description={FRETBOARD_RESPONSE[specs.fretboard].split(',')[0]} 
                  />
                   <SelectGroup 
                    label="Neck Profile" 
                    value={specs.neckProfile} 
                    onChange={(v: NeckProfile) => setSpecs({...specs, neckProfile: v})} 
                    options={NeckProfile}
                  />
                </div>

                <SelectGroup 
                  label="Bridge Mechanics" 
                  value={specs.bridge} 
                  onChange={(v: BridgeSystem) => setSpecs({...specs, bridge: v})} 
                  options={BridgeSystem}
                  description={BRIDGE_MECHANICS[specs.bridge]}
                />
                 
                 <SelectGroup 
                  label="Electronics / Pickups" 
                  value={specs.pickups} 
                  onChange={(v: PickupConfig) => setSpecs({...specs, pickups: v})} 
                  options={PickupConfig}
                />

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Custom Notes</label>
                    <textarea 
                        className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-luthier-accent focus:border-luthier-accent block p-2.5 font-mono"
                        rows={2}
                        placeholder="e.g. Heavy relic finish, gold hardware..."
                        value={specs.notes}
                        onChange={(e) => setSpecs({...specs, notes: e.target.value})}
                    />
                </div>

                <button 
                  onClick={handleSimulate}
                  disabled={!originalImage || isGenerating}
                  className={`w-full py-4 rounded-lg font-bold tracking-wider uppercase transition-all flex justify-center items-center ${
                    !originalImage || isGenerating 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-luthier-wood to-yellow-700 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg shadow-amber-900/20'
                  }`}
                >
                  {isGenerating ? <><Spinner /> BUILDING MODEL...</> : 'GENERATE PROTOTYPE'}
                </button>
                
                {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
              </div>
            </>
          )}

          {/* Chat / Advisory Mode */}
          {activeTab === 'advisory' && (
             <div className="bg-luthier-panel rounded-xl border border-gray-700 shadow-lg flex flex-col h-[700px]">
                <div className="p-4 border-b border-gray-700">
                  <SectionTitle>Ask the Expert</SectionTitle>
                  <p className="text-xs text-gray-500 mt-[-10px]">Material Taxonomy & Mechanical Physics</p>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-900/40 text-blue-100 border border-blue-800' 
                          : 'bg-slate-800 text-gray-200 border border-gray-600'
                      }`}>
                        {msg.role === 'model' && <span className="text-[10px] text-luthier-wood font-mono block mb-1">LUTHIER.AI</span>}
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-gray-700 bg-slate-900/50">
                   <div className="flex gap-2">
                     <input 
                       type="text"
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder="e.g. What wood provides the best attack?"
                       className="flex-grow bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-luthier-accent focus:border-luthier-accent block p-2.5"
                     />
                     <button 
                       onClick={handleSendMessage}
                       disabled={!chatInput.trim() || isChatting}
                       className="bg-luthier-accent hover:bg-sky-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                     >
                       SEND
                     </button>
                   </div>
                </div>
             </div>
          )}

        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-luthier-panel p-6 rounded-xl border border-gray-700 shadow-lg min-h-[600px] flex flex-col">
                <SectionTitle>03. Rendered Output</SectionTitle>
                
                {/* Result Display */}
                <div className="flex-grow flex flex-col items-center justify-center bg-slate-900/50 rounded-lg overflow-hidden border border-gray-800 relative">
                   {!generatedImage && !isGenerating && (
                       <div className="text-center text-gray-500 p-12">
                           <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                           <p className="font-mono text-sm">WAITING FOR INPUT STREAM...</p>
                           <p className="text-xs mt-2 opacity-50">Configure materials in the left panel to visualize.</p>
                       </div>
                   )}

                   {isGenerating && (
                       <div className="text-center p-12 space-y-6 max-w-md">
                           <div className="w-full bg-gray-700 rounded-full h-1 mb-4 overflow-hidden">
                               <div className="bg-luthier-accent h-1 rounded-full animate-[loading_2s_ease-in-out_infinite] w-1/2 mx-auto"></div>
                           </div>
                           <p className="text-luthier-accent font-mono text-sm animate-pulse">
                               {generatedPrompt ? "RENDERING PHOTONS..." : "COMPUTING MATERIAL PHYSICS..."}
                           </p>
                           <p className="text-xs text-gray-500 font-mono">
                               Calculating light refraction on {specs.bodyWood} grain...
                           </p>
                       </div>
                   )}

                   {generatedImage && (
                       <img 
                         src={generatedImage} 
                         alt="Generated Guitar" 
                         className="w-full h-full object-contain max-h-[700px] animate-[fadeIn_1s_ease-out]"
                       />
                   )}
                </div>

                {/* Technical Prompt Log */}
                {generatedPrompt && (
                    <div className="mt-6 border-t border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-2">
                             <h4 className="text-xs font-mono text-gray-400 uppercase">System Prompt Generation Log</h4>
                             <span className="text-[10px] bg-luthier-accent/10 text-luthier-accent px-2 py-0.5 rounded border border-luthier-accent/20">GEMINI 3 PRO</span>
                        </div>
                        <div className="bg-black/40 p-4 rounded-md border border-gray-800">
                            <p className="font-mono text-xs text-green-400/90 leading-relaxed break-words">
                                <span className="text-gray-500 select-none">$ </span>
                                {generatedPrompt}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Comparison/Tech Specs Footer */}
            {generatedImage && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "SCALE LENGTH", value: specs.scaleLength },
                        { label: "RADIUS", value: specs.fretboardRadius },
                        { label: "WEIGHT RELIEF", value: specs.bodyWood === BodyWood.MAHOGANY ? "CHAMBERED" : "SOLID" },
                        { label: "SUSTAIN PROFILE", value: specs.bridge === BridgeSystem.FLOYD_ROSE ? "HIGH / DAMPED" : "MAXIMUM / DIRECT" }
                    ].map((stat) => (
                        <div key={stat.label} className="bg-luthier-panel border border-gray-700 p-4 rounded-lg text-center">
                            <div className="text-[10px] text-gray-500 font-mono mb-1">{stat.label}</div>
                            <div className="text-sm font-bold text-white">{stat.value}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Footer Credit */}
      <footer className="mt-12 border-t border-gray-800 pt-6 text-center text-xs text-gray-600 font-mono tracking-widest">
        <p>ARCHITECTED BY ARMIN SALAZAR SAN MARTIN // CEO @ AIWIS.CL</p>
      </footer>
    </div>
  );
}