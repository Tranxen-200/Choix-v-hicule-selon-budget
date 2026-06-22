import React, { useState, useEffect } from "react";
import { 
  Car, 
  Coins, 
  Compass, 
  MapPin, 
  Fuel, 
  Users, 
  Zap, 
  Heart, 
  Sparkle, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Info, 
  Send, 
  MessageSquare,
  ShieldCheck,
  TrendingDown,
  Gauge,
  Printer,
  X,
  CreditCard,
  Check,
  ArrowRight,
  Menu,
  Trophy
} from "lucide-react";
import { QuestionnaireState, Recommendation, BudgetType, ChatMessage } from "./types";

const INITIAL_STATE: QuestionnaireState = {
  budgetType: "cash",
  budgetAmount: 18000,
  condition: "any",
  vehicleType: "any",
  usage: "commute_city",
  fuel: "any",
  seats: 5,
  transmission: "any",
  priority: "reliability"
};

const PRIORITY_LABELS: Record<string, string> = {
  reliability: "Fiabilité mécanique & Entretien minimal",
  ecology: "Économie de carburant",
  comfort: "Confort suprême",
  resale: "Facilité de revente",
};

export default function App() {
  const [step, setStep] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [resultsMobileTab, setResultsMobileTab] = useState<"podium" | "details">("podium");
  const [formData, setFormData] = useState<QuestionnaireState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<"advisor" | "guide" | "favorites">("advisor");
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [selectedCar, setSelectedCar] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<Recommendation[]>(() => {
    const saved = localStorage.getItem("automatch_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Chat conversation state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Comparison State
  const [comparedCars, setComparedCars] = useState<Recommendation[]>([]);

  // Simulator parameters for selected car
  const [kilometersPerYear, setKilometersPerYear] = useState<number>(15000);
  const [fuelPrice, setFuelPrice] = useState<number>(1.85);

  useEffect(() => {
    localStorage.setItem("automatch_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Restart advisor wizard
  const resetWizard = () => {
    setFormData(INITIAL_STATE);
    setStep(1);
    setResults(null);
    setSelectedCar(null);
    setChatHistory([]);
    setErrorMsg(null);
  };

  const handleBudgetQuickSelect = (amount: number) => {
    setFormData(prev => ({ ...prev, budgetAmount: amount }));
  };

  const toggleFavorite = (car: Recommendation) => {
    const key = `${car.brand}-${car.model}`;
    const exists = favorites.some(f => `${f.brand}-${f.model}` === key);
    if (exists) {
      setFavorites(favorites.filter(f => `${f.brand}-${f.model}` !== key));
    } else {
      setFavorites([...favorites, car]);
    }
  };

  const isFavorite = (car: Recommendation) => {
    return favorites.some(f => `${f.brand}-${f.model}` === `${car.brand}-${car.model}`);
  };

  const toggleComparison = (car: Recommendation) => {
    const key = `${car.brand}-${car.model}`;
    const exists = comparedCars.some(c => `${c.brand}-${c.model}` === key);
    if (exists) {
      setComparedCars(comparedCars.filter(c => `${c.brand}-${c.model}` !== key));
    } else {
      if (comparedCars.length >= 3) {
        alert("Vous pouvez comparer au maximum 3 véhicules simultanément.");
        return;
      }
      setComparedCars([...comparedCars, car]);
    }
  };

  const submitQuery = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error("Le serveur de recommandation a renvoyé une erreur.");
      }
      const data = await response.json();
      setResults(data.recommendations || []);
      if (data.recommendations && data.recommendations.length > 0) {
        setSelectedCar(data.recommendations[0]);
        // Set initial chat messages specific to selected car
        initCarChat(data.recommendations[0]);
      }
      setStep(8); // Show results screen
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de joindre le conseiller virtuel.");
    } finally {
      setLoading(false);
    }
  };

  const initCarChat = (car: Recommendation) => {
    setChatHistory([
      {
        id: "1",
        sender: "advisor",
        text: `Bonjour ! Je suis votre conseiller automobile virtuel. Je vois que l'étude de la **${car.brand} ${car.model}** vous intéresse. C'est un choix remarquable ! Avez-vous des questions sur sa fiabilité réelle, son coût annuel d'assurance ou sa facilité de revente en France ?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Switch inspected car and reset chat
  const handleSelectCarForDetails = (car: Recommendation) => {
    setSelectedCar(car);
    initCarChat(car);
    setResultsMobileTab("details");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedCar) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatHistory, userMsg],
          selectedCar: selectedCar
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      setChatHistory(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: "advisor",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      setChatHistory(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: "advisor",
        text: "Désolé, je rencontre des difficultés temporaires de communication. Mais rassurez-vous, ce véhicule reste un choix optimal pour votre budget !",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Interactive simulations
  const calculateYearlyFuelCost = (car: Recommendation) => {
    // extract digits from "4.8 L / 100km" or "15.2 kWh / 100km"
    const cleaned = car.consumption.replace(",", ".").replace(/[^\d.]/g, "");
    const consVal = parseFloat(cleaned) || 5.5;
    
    const isElectric = car.fuelType.toLowerCase().includes("électri") || car.fuelType.toLowerCase().includes("electric");
    const electricityKwhCost = 0.25; // standard FR cost
    
    if (isElectric) {
      return Math.round((kilometersPerYear / 100) * consVal * electricityKwhCost);
    }
    
    // combustion or hybrid
    return Math.round((kilometersPerYear / 100) * consVal * fuelPrice);
  };

  const getStepProgress = () => {
    return Math.min(((step) / 7) * 100, 100);
  };

  const formatEstimatedPrice = (priceStr: string, textStyle: string = "text-2xl font-black text-[#2563EB]", alignClass: string = "items-end text-right") => {
    if (!priceStr) return null;
    const parenIndex = priceStr.indexOf("(");
    if (parenIndex !== -1) {
      const mainPrice = priceStr.substring(0, parenIndex).trim();
      const extraPart = priceStr.substring(parenIndex).trim();
      return (
        <div className={`flex flex-col ${alignClass}`}>
          <span className={textStyle}>{mainPrice}</span>
          <span className="text-[10px] font-semibold text-slate-500 bg-blue-50/70 border border-blue-100/50 px-2 py-0.5 rounded-lg mt-0.5 inline-block whitespace-normal max-w-[180px] leading-tight">
            {extraPart}
          </span>
        </div>
      );
    }
    return <span className={textStyle}>{priceStr}</span>;
  };

  return (
    <div id="automatch-app" className="flex w-full h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      
      {/* Mobile Sidebar Backdrop overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - AutoMatch AI */}
      <aside 
        id="sidebar-panel" 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1E3A8A] flex flex-col border-r border-[#1E3A8A]/10 shrink-0 transform transition-transform duration-300 md:static md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#06B6D4] rounded-lg shadow-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl tracking-tight block">AutoMatch AI</span>
            </div>
          </div>
          
          {/* Close button inside sidebar on mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sidebar */}
        <nav className="mt-4 flex-1 px-4 space-y-2">
          <button 
            id="nav-advisor"
            onClick={() => { setActiveTab("advisor"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-left ${activeTab === "advisor" ? "bg-[#2563EB] text-white shadow-md shadow-blue-800/10" : "text-blue-100 hover:bg-white/5"}`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span>Assistant Achat</span>
          </button>

          <button 
            id="nav-guide"
            onClick={() => { setActiveTab("guide"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-left ${activeTab === "guide" ? "bg-[#2563EB] text-white shadow-md shadow-blue-800/10" : "text-blue-100 hover:bg-white/5"}`}
          >
            <Info className="w-5 h-5 shrink-0" />
            <span>Guide Pratique</span>
          </button>

          <button 
            id="nav-favorites"
            onClick={() => { setActiveTab("favorites"); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-left ${activeTab === "favorites" ? "bg-[#2563EB] text-white shadow-md" : "text-blue-100 hover:bg-white/5"}`}
          >
            <Heart className="w-5 h-5 shrink-0" />
            <div className="flex justify-between items-center w-full">
              <span>Favoris</span>
              {favorites.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </div>
          </button>
        </nav>

        {/* Brand Bottom Promo Card */}
        <div className="p-4 m-4 bg-blue-900/40 rounded-2xl border border-blue-400/10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse"></span>
            <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">Mode Premium Activé</p>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed font-light">
            Base de données France actualisée quotidiennement avec Crit'Air & cotes de revente d'occasion.
          </p>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F1F5F9] overflow-hidden">
        
        {/* Header Bar */}
        <header id="header-bar" className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center rounded-lg hover:bg-slate-50"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="min-w-0">
              {activeTab === "advisor" && step <= 7 && (
                <h2 className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                  Étape {step} sur 7 <span className="hidden sm:inline">• {step === 1 ? "État du véhicule" : step === 2 ? "Budget & Financement" : step === 3 ? "Silhouette" : step === 4 ? "Usage quotidien" : step === 5 ? "Motorisation" : step === 6 ? "Gabarit & Options" : "Votre Priorité"}</span>
                  <span className="sm:hidden">• {step === 1 ? "État" : step === 2 ? "Budget" : step === 3 ? "Style" : step === 4 ? "Usage" : step === 5 ? "Moteur" : step === 6 ? "Gabarit" : "Priorité"}</span>
                </h2>
              )}
              {activeTab === "advisor" && step === 8 && (
                <h2 className="text-[11px] sm:text-xs font-bold text-[#06B6D4] uppercase tracking-widest flex items-center gap-1.5 truncate">
                  <Sparkle className="w-3.5 h-3.5 animate-spin shrink-0 text-[#2563EB]" />
                  <span>Analyse IA Terminée</span>
                </h2>
              )}
              {activeTab === "guide" && (
                <h2 className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                  Guide d'Expert <span className="hidden sm:inline">• Achat automobile</span>
                </h2>
              )}
              {activeTab === "favorites" && (
                <h2 className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                  Mon Espace <span className="hidden sm:inline">• Véhicules Sauvegardés</span>
                </h2>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-100 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs text-slate-600 font-semibold flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:inline">Marché FR</span> 2026
            </div>
            
            <div className="w-8 h-8 rounded-full bg-[#06B6D4] border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">IA</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* TAB 1: ADVISOR & QUESTIONNAIRE WIZARD */}
          {activeTab === "advisor" && (
            <div className="max-w-6xl mx-auto flex flex-col h-full">
              
              {/* Progress Line */}
              {step <= 7 && (
                <div id="progress-container" className="w-full bg-slate-200 h-1.5 rounded-full mb-8 shrink-0">
                  <div 
                    className="bg-gradient-to-r from-[#2563EB] to-[#06B6D4] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${getStepProgress()}%` }}
                  ></div>
                </div>
              )}

              {/* Step Display Area */}
              {step <= 7 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* Left Column: Form Question Card */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* STEP 1: ÉTAT DU VÉHICULE (NEUF / OCCASION) */}
                    {step === 1 && (
                      <div id="step-card-0" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-[#ECFDF5] text-[#059669] text-xs font-bold rounded-full">STATUT</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Recherchez-vous un véhicule neuf ou d'occasion ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Sélectionnez l'état souhaité pour adapter notre catalogue et les types de financement proposés.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, condition: "new" })}
                            className={`p-4 sm:p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 sm:gap-3 ${formData.condition === "new" ? "border-[#2563EB] bg-blue-50/50 text-[#1E3A8A]" : "border-slate-100 hover:border-slate-200 text-slate-700"}`}
                          >
                            <span className="text-3xl sm:text-4xl">✨</span>
                            <span className="font-bold text-sm sm:text-base">Véhicule Neuf</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400">Kilométrage nul ou démonstration, garanties constructeur maximales.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                condition: "used", 
                                budgetType: "cash", 
                                budgetAmount: formData.budgetType === "leasing" ? 18000 : formData.budgetAmount 
                              });
                            }}
                            className={`p-4 sm:p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 sm:gap-3 ${formData.condition === "used" ? "border-[#2563EB] bg-blue-50/50 text-[#1E3A8A]" : "border-slate-100 hover:border-slate-200 text-slate-700"}`}
                          >
                            <span className="text-3xl sm:text-4xl">🚗</span>
                            <span className="font-bold text-sm sm:text-base">Véhicule d'Occasion</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400">Idéal pour éviter la décote initiale. Les offres de LOA ou LLD ne sont pas disponibles pour l'occasion.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, condition: "any" })}
                            className={`p-4 sm:p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 sm:gap-3 ${formData.condition === "any" ? "border-[#2563EB] bg-blue-50/50 text-[#1E3A8A]" : "border-slate-100 hover:border-slate-200 text-slate-700"}`}
                          >
                            <span className="text-3xl sm:text-4xl">💡</span>
                            <span className="font-bold text-sm sm:text-base">Peu Importe</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400">Laissez l'IA trouver la meilleure opportunité ou faire des suggestions mixtes.</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: BUDGET & FINANCEMENT */}
                    {step === 2 && (
                      <div id="step-card-1" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-blue-105 text-[#2563EB] text-xs font-bold rounded-full bg-blue-50">FINANCEMENT</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Quel est votre budget d'achat ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Choisissez votre mode de financement principal (Comptant/Crédit classique ou LOA/LLD) pour affiner les simulations.
                          </p>
                        </div>

                        {/* Budget Type Buttons */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <button 
                            id="budget-type-cash"
                            type="button"
                            onClick={() => setFormData({ ...formData, budgetType: "cash", budgetAmount: 18000 })}
                            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 sm:gap-2 text-center ${formData.budgetType === "cash" ? "border-[#2563EB] bg-blue-50/50 text-[#1E3A8A]" : "border-slate-100 hover:border-slate-200 text-slate-700"}`}
                          >
                            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB]" />
                            <span className="font-bold text-[11px] sm:text-sm">Comptant / Crédit</span>
                            <span className="text-[10px] text-slate-400 hidden xs:inline">Globale (en €)</span>
                          </button>

                          <button 
                            id="budget-type-leasing"
                            type="button"
                            disabled={formData.condition === "used"}
                            onClick={() => {
                              if (formData.condition !== "used") {
                                setFormData({ ...formData, budgetType: "leasing", budgetAmount: 250 });
                              }
                            }}
                            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 sm:gap-2 text-center ${formData.condition === "used" ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400" : formData.budgetType === "leasing" ? "border-[#2563EB] bg-blue-50/50 text-[#1E3A8A]" : "border-slate-100 hover:border-slate-200 text-slate-700"}`}
                          >
                            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-[#06B6D4]" />
                            <span className="font-bold text-[11px] sm:text-sm">Leasing / LOA / LLD</span>
                            <span className="text-[10px] text-slate-400 hidden xs:inline">Mensuel (en €/mois)</span>
                            {formData.condition === "used" && (
                              <span className="text-[9px] text-rose-500 font-semibold mt-0.5">Pour le Neuf uniquement</span>
                            )}
                          </button>
                        </div>

                        {/* Slider section */}
                        <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                            <div>
                              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Votre budget cible</span>
                              <div className="text-3xl sm:text-4xl font-extrabold text-[#1E3A8A] mt-1">
                                {formData.budgetAmount.toLocaleString("fr-FR")}{" "}
                                <span className="text-sm sm:text-lg font-medium text-[#2563EB]">{formData.budgetType === "cash" ? "€" : "€ / mois"}</span>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block">Catégorie visée</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-700">
                                {formData.budgetType === "cash" 
                                  ? (formData.budgetAmount < 12000 ? "Occasion budget serré" : formData.budgetAmount <= 28000 ? "Occasion récente" : "Premium ou Neuf")
                                  : (formData.budgetAmount < 180 ? "Citadines d'entrée" : formData.budgetAmount <= 350 ? "SUV & Hybrides récents" : "Berlines Premium")
                                }
                              </span>
                            </div>
                          </div>

                          {/* HTML Slider Input */}
                          <div className="py-2">
                            <input 
                              type="range"
                              min={formData.budgetType === "cash" ? 4000 : 80}
                              max={formData.budgetType === "cash" ? 75000 : 900}
                              step={formData.budgetType === "cash" ? 500 : 10}
                              value={formData.budgetAmount}
                              onChange={(e) => setFormData({ ...formData, budgetAmount: parseInt(e.target.value) })}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                            />
                            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-1">
                              <span>{formData.budgetType === "cash" ? "4k €" : "80 €/m"}</span>
                              <span>{formData.budgetType === "cash" ? "25k €" : "300 €/m"}</span>
                              <span>{formData.budgetType === "cash" ? "50k €" : "600 €/m"}</span>
                              <span>{formData.budgetType === "cash" ? "75k €" : "900 €/m"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Preset Tiles */}
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sélection rapide de forfait</span>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() => handleBudgetQuickSelect(formData.budgetType === "cash" ? 9500 : 130)}
                              className={`p-2 sm:p-3 border rounded-xl text-left hover:border-[#2563EB] hover:bg-slate-50 transition-all ${formData.budgetAmount === (formData.budgetType === "cash" ? 9500 : 130) ? "border-[#2563EB] bg-blue-50/20" : "border-slate-100"}`}
                            >
                              <div className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">Budget futé</div>
                              <div className="text-xs sm:text-sm font-extrabold text-[#1E3A8A]">{formData.budgetType === "cash" ? "9 500 €" : "130 €/m"}</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBudgetQuickSelect(formData.budgetType === "cash" ? 22000 : 280)}
                              className={`p-2 sm:p-3 border rounded-xl text-left hover:border-[#2563EB] hover:bg-slate-50 transition-all ${formData.budgetAmount === (formData.budgetType === "cash" ? 22000 : 280) ? "border-[#2563EB] bg-blue-50/20" : "border-slate-100"}`}
                            >
                              <div className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">Intermédiaire</div>
                              <div className="text-xs sm:text-sm font-extrabold text-[#1E3A8A]">{formData.budgetType === "cash" ? "22 000 €" : "280 €/m"}</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBudgetQuickSelect(formData.budgetType === "cash" ? 45000 : 490)}
                              className={`p-2 sm:p-3 border rounded-xl text-left hover:border-[#2563EB] hover:bg-slate-50 transition-all ${formData.budgetAmount === (formData.budgetType === "cash" ? 45000 : 490) ? "border-[#2563EB] bg-blue-50/20" : "border-slate-100"}`}
                            >
                              <div className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">Haut de gamme</div>
                              <div className="text-xs sm:text-sm font-extrabold text-[#1E3A8A]">{formData.budgetType === "cash" ? "45 000 €" : "490 €/m"}</div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* STEP 3: SILHOUETTE VARIATIONS */}
                    {step === 3 && (
                      <div id="step-card-2" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-cyan-100 text-[#06B6D4] text-xs font-bold rounded-full">DESIGN</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Quelle silhouette convient à votre style de vie ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            La morphologie définit l'habitabilité de coffre, le confort en hauteur et l'empreinte au sol lors des stationnements.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                          {[
                            { id: "any", label: "Peu importe", desc: "Laisser l'IA décider de la forme", icon: "🚗" },
                            { id: "citadine", label: "Citadine", desc: "Compacte pour se faufiler en ville", icon: "🚙" },
                            { id: "compacte", label: "Compacte polyvalente", desc: "Le compromis idéal route/ville", icon: "🚗" },
                            { id: "berline", label: "Berline classique", desc: "Lignes fluides pour les trajets", icon: "🏎️" },
                            { id: "suv", label: "SUV / Crossover", desc: "Assise haute et robustesse", icon: "🚙" },
                            { id: "monospace", label: "Monospace", desc: "Espace maximal de vie", icon: "🚐" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, vehicleType: item.id })}
                              className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-1 sm:gap-1.5 ${formData.vehicleType === item.id ? "border-[#2563EB] bg-blue-50/30 ring-2 ring-[#2563EB]/10" : "border-slate-100 hover:border-slate-200"}`}
                            >
                              <div className="text-xl sm:text-2xl">{item.icon}</div>
                              <div className="font-bold text-[11px] sm:text-xs text-slate-800">{item.label}</div>
                              <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight block">{item.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* STEP 4: CONTEXT OF USAGE */}
                    {step === 4 && (
                      <div id="step-card-3" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-indigo-50 text-[#1E3A8A] text-xs font-bold rounded-full">UTILISATION</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Quel sera l'usage principal de ce véhicule ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Cette question permet de dimensionner l'électrification optimale (l'électrique adore la ville, le diesel préfère l'autoroute).
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          {[
                            { id: "commute_city", label: "Trajets urbains quotidiens (Domicile - Travail)", desc: "Beaucoup de démarrages, bouchons fréquents, faibles distances quotidiennes.", icon: MapPin },
                            { id: "commute_highway", label: "Autoroute et voies express régulières", desc: "Vitesse stabilisée à 110 ou 130 km/h, trajet de plus de 40 km par jour.", icon: Compass },
                            { id: "family", label: "Voiture à tout faire de famille & longs trajets", desc: "Vacances chargées, usage ultra-polyvalent, coffre rempli.", icon: Users },
                            { id: "occasional", label: "Usage loisirs & week-end uniquement", desc: "Le véhicule roule peu la semaine, de grandes distances ponctuelles.", icon: Sparkle },
                            { id: "rugged", label: "Milieu rural, chemins rocailleux ou montagne", desc: "Besoin d'une excellente motricité (boue, neige) et de garde au sol.", icon: MapPin },
                          ].map((item) => {
                            const IconComponent = item.icon;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, usage: item.id })}
                                className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 sm:gap-4 ${formData.usage === item.id ? "border-[#2563EB] bg-blue-50/30" : "border-slate-100 hover:border-slate-200"}`}
                              >
                                <div className={`p-2 rounded-lg shrink-0 ${formData.usage === item.id ? "bg-[#2563EB] text-white" : "bg-slate-50 text-slate-500"}`}>
                                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold text-[11px] sm:text-xs text-slate-800 truncate sm:whitespace-normal">{item.label}</div>
                                  <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    {/* STEP 5: CARBURANT & ENERGIE */}
                    {step === 5 && (
                      <div id="step-card-4" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-teal-50 text-[#06B6D4] text-xs font-bold rounded-full">ÉNERGIE</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Avez-vous une préférence de carburant ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            La taxation, les contraintes écologiques des ZFE (Zones à Faibles Émissions) et le mode de recharge à domicile influencent ce choix.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                          {[
                            { id: "any", label: "Peu importe", desc: "Laisser l'IA recommander le meilleur choix", icon: "💡" },
                            { id: "hybride", label: "Hybride", desc: "Idéal pour réduire la conso urbaine sans prise", icon: "🔄" },
                            { id: "electric", label: "Électrique (100%)", desc: "Crit'Air 0 - Idéal si recharge à domicile", icon: "⚡" },
                            { id: "essence", label: "Essence", desc: "Achat accessible, entretien mécanique standard", icon: "⛽" },
                            { id: "diesel", label: "Diesel", desc: "Rentable uniquement pour plus de 20 000 km/an", icon: "🚜" },
                            { id: "gpl", label: "GPL", desc: "Bi-carburation économique sous 1€ le litre", icon: "🍃" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, fuel: item.id })}
                              className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-1 sm:gap-1.5 ${formData.fuel === item.id ? "border-[#2563EB] bg-blue-50/20" : "border-slate-100 hover:border-slate-200"}`}
                            >
                              <div className="text-xl">{item.icon}</div>
                              <div className="font-bold text-[11px] sm:text-xs text-slate-800">{item.label}</div>
                              <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight block">{item.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* STEP 6: TRANSMISSION AND CAPACITY */}
                    {step === 6 && (
                      <div id="step-card-5" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full">SPÉCIFICATIONS</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Quels sont vos critères de gabarit ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Précisez le type de transmission et le nombre minimum de places requises à bord de votre futur véhicule.
                          </p>
                        </div>

                        {/* Transmission Options */}
                        <div className="space-y-3">
                          <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">Boîte de vitesses</label>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, transmission: "any" })}
                              className={`p-2.5 sm:p-4 border-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all ${formData.transmission === "any" ? "border-[#2563EB] bg-blue-50/40 text-[#2563EB]" : "border-slate-100 text-slate-700"}`}
                            >
                              Peu importe
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, transmission: "auto" })}
                              className={`p-2.5 sm:p-4 border-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all ${formData.transmission === "auto" ? "border-[#2563EB] bg-blue-50/40 text-[#2563EB]" : "border-slate-100 text-slate-700"}`}
                            >
                              Automatique
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, transmission: "manual" })}
                              className={`p-2.5 sm:p-4 border-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all ${formData.transmission === "manual" ? "border-[#2563EB] bg-blue-50/40 text-[#2563EB]" : "border-slate-100 text-slate-700"}`}
                            >
                              Manuelle
                            </button>
                          </div>
                        </div>

                        {/* Seats Capacity */}
                        <div className="space-y-3 pt-2">
                          <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">Nombre de places requis</label>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, seats: 2 })}
                              className={`p-2.5 sm:p-4 border-2 rounded-xl text-center transition-all ${formData.seats === 2 ? "border-[#2563EB] bg-blue-50/40 text-[#2563EB]" : "border-slate-100"}`}
                            >
                              <div className="text-base">👤👤</div>
                              <div className="text-[10px] sm:text-xs font-bold mt-1">2 places</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, seats: 5 })}
                              className={`p-2.5 sm:p-4 border-2 rounded-xl text-center transition-all ${formData.seats === 5 ? "border-[#2563EB] bg-blue-50/40 text-[#2563EB]" : "border-slate-100"}`}
                            >
                              <div className="text-base">🚗🤵🤵</div>
                              <div className="text-[10px] sm:text-xs font-bold mt-1">4 à 5 places</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, seats: 7 })}
                              className={`p-2.5 sm:p-4 border-2 rounded-xl text-center transition-all ${formData.seats === 7 ? "border-[#2563EB] bg-blue-50/40 text-[#2563EB]" : "border-slate-100"}`}
                            >
                              <div className="text-base">🚌🚐🤵</div>
                              <div className="text-[10px] sm:text-xs font-bold mt-1">7 pl. et +</div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* STEP 7: PRIORITÉ ABSOLUE */}
                    {step === 7 && (
                      <div id="step-card-6" className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full">PRIORITÉ</span>
                          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A]">Quelle est votre priorité numéro un ?</h1>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Chaque voiture a sa spécialité : nous optimisons le classement selon votre critère d'exigence privilégié.
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          {[
                            { id: "reliability", label: "Fiabilité mécanique & Entretien minimal", desc: "Vous voulez un modèle robuste, réputé pour n'avoir aucun défaut majeur et peu coûteux en garage.", icon: ShieldCheck, color: "text-emerald-500" },
                            { id: "ecology", label: "Économie de carburant & Faible Impact écologique", desc: "Vignette réglementaire Crit'Air avantageuse pour parer les restrictions et consommer très peu au quotidien.", icon: Zap, color: "text-[#06B6D4]" },
                            { id: "comfort", label: "Confort suprême, Sécurité et Technologie moderne", desc: "Insonorisation soignée, aides à la conduite complètes (Autopilot, écran géant, caméra 360°).", icon: Sparkle, color: "text-purple-500" },
                            { id: "resale", label: "Facilité de revente & Décote minimale", desc: "Modèle plébiscité en occasion : vous gardez le contrôle de votre capital financier lors de la revente.", icon: Coins, color: "text-amber-500" },
                          ].map((item) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, priority: item.id })}
                                className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 sm:gap-4 ${formData.priority === item.id ? "border-[#2563EB] bg-blue-50/20" : "border-slate-100 hover:border-slate-200"}`}
                              >
                                <div className={`p-2 rounded-lg shrink-0 ${formData.priority === item.id ? "bg-[#2563EB] text-white" : "bg-slate-50 " + item.color}`}>
                                  <IconComp className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-[11px] sm:text-xs text-slate-800">{item.label}</div>
                                  <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    {/* Action buttons footer */}
                    <div className="flex justify-between items-center pt-4">
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={() => setStep(step - 1)}
                          className="px-6 py-3 border border-slate-200 text-[#1E3A8A] font-semibold hover:bg-slate-50 rounded-2xl transition-all flex items-center gap-2 text-sm"
                        >
                          <ChevronLeft className="w-4 h-4" /> Précédent
                        </button>
                      ) : (
                        <div></div>
                      )}

                      {step === 7 ? (
                        <button
                          type="button"
                          id="btn-trigger-recommendation"
                          onClick={submitQuery}
                          className="px-8 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 text-sm"
                        >
                          Générer mes recommandations
                          <ArrowRight className="w-5 h-5 text-cyan-400" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStep(step + 1)}
                          className="px-8 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 text-sm ml-auto"
                        >
                          Continuer
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: AI Live Diagnostic Sidebar */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                      <h3 className="text-sm font-bold text-[#1E3A8A] mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse"></span>
                        Analyse Diagnostique
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0">
                            <Sparkle className="w-4.5 h-4.5 text-[#06B6D4]" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">État recherché</p>
                            <p className="text-xs font-bold text-[#1E3A8A]">
                              {formData.condition === "new" ? "✨ Neuf" : formData.condition === "used" ? "🚗 Occasion" : "🔮 Tout état"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0">
                            <Coins className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Budget ciblé</p>
                            <p className="text-xs font-bold text-slate-700">
                              {formData.budgetAmount.toLocaleString("fr-FR")} {formData.budgetType === "cash" ? "€ global" : "€ / mois"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0">
                            <Car className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Silhouette cible</p>
                            <p className="text-xs font-bold text-slate-700 capitalize">{formData.vehicleType === "any" ? "Peu importe (Optimale)" : formData.vehicleType}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0">
                            <MapPin className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Profil d'usage</p>
                            <p className="text-xs font-bold text-slate-700">
                              {formData.usage === "commute_city" ? "Urbain fréquent" :
                               formData.usage === "commute_highway" ? "Autoroutier régulier" :
                               formData.usage === "family" ? "Grand voyageur / Famille" :
                               formData.usage === "occasional" ? "Loisirs & Weekend" : "Tous-chemins & Montagne"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0">
                            <Compass className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vitesse / Transmission</p>
                            <p className="text-xs font-bold text-slate-700 capitalize">
                              {formData.transmission === "any" ? "Peu importe" : formData.transmission === "auto" ? "Automatique requise" : "Manuelle"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-5 border-t border-slate-100">
                        <p className="text-xs leading-relaxed text-slate-500">
                          <span className="text-[#06B6D4] font-bold italic">IA Suggestion :</span> 
                          {formData.budgetAmount < 10000 && formData.budgetType === "cash" 
                            ? " Nous explorons les citadines françaises d'occasion à faible kilométrage (Crit'Air 1) pour assurer une excellente fiabilité." 
                            : " Nous ciblons de l'hybride dynamique ou de l'électrique récent, maximisant le confort de suspension sans décote."}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#06B6D4] to-[#2563EB] rounded-3xl p-6 text-white shadow-lg space-y-2">
                       <p className="text-[10px] uppercase font-extrabold tracking-wider opacity-85">Candidats admissibles</p>
                       <div className="text-3xl font-black">1 420 +</div>
                       <p className="text-xs leading-snug font-light opacity-90">
                         Modèles du marché passés en revue à chaque modification en temps réel.
                       </p>
                    </div>
                  </div>

                </div>
              ) : (

                /* STEP 7: RESULTS DISPLAY AT MASTER SCALE */
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Results Header block */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-[#1E3A8A]">Voici votre podium idéal</h1>
                      <p className="text-slate-500 text-sm">
                        Sélection de {results?.length} voitures ajustées d'après votre budget de{" "}
                        <span className="font-bold text-[#2563EB]">{formData.budgetAmount.toLocaleString("fr-FR")} {formData.budgetType === "cash" ? "€" : "€/mois"}</span>{" "}
                        et priorité <span className="font-bold text-[#06B6D4]">"{PRIORITY_LABELS[formData.priority] || formData.priority}"</span>.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={resetWizard}
                        className="px-5 py-2.5 bg-[#f1f5f9] text-[#1E3A8A] font-semibold rounded-xl text-xs hover:bg-[#e2e8f0] transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4.5 h-4.5" /> Recommencer le test
                      </button>
                    </div>
                  </div>

                  {/* Errors in results */}
                  {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-sm">
                      Une anomalie est survenue : {errorMsg}. Nous avons chargé notre catalogue local de secours pour vous garantir des résultats pertinents.
                    </div>
                  )}

                  {/* Tab Selector below xl */}
                  <div id="results-toggle-tabs" className="xl:hidden flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                    <button
                      onClick={() => setResultsMobileTab("podium")}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${resultsMobileTab === "podium" ? "bg-white text-[#1E3A8A] shadow-md" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      <Trophy className="w-4 h-4 text-[#06B6D4]" /> Podium d'Essais ({results?.length || 0})
                    </button>
                    <button
                      onClick={() => setResultsMobileTab("details")}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${resultsMobileTab === "details" ? "bg-white text-[#1E3A8A] shadow-md" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      <Car className="w-4 h-4 text-[#2563EB]" /> {selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : "Fiche Détails"}
                    </button>
                  </div>

                  {/* Main Grid: Recommended Vehicles Map (Left) & Deep Inspection Card (Right) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Grid: Small cards with direct indicators */}
                    <div className={`lg:col-span-12 xl:col-span-7 space-y-4 ${resultsMobileTab === "podium" ? "block" : "hidden xl:block"}`}>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Le classement optimal</span>
                        <span className="text-xs text-slate-400">Cliquez sur un modèle pour l'inspecter de près ou chatter</span>
                      </div>

                      {results && results.length > 0 ? (
                        results.map((car, index) => {
                          const isActive = selectedCar && `${selectedCar.brand}-${selectedCar.model}` === `${car.brand}-${car.model}`;
                          return (
                            <div 
                              key={`${car.brand}-${car.model}`}
                              onClick={() => handleSelectCarForDetails(car)}
                              className={`p-5 rounded-3xl cursor-pointer transition-all border ${isActive ? "border-2 border-[#2563EB] bg-blue-50/20 shadow-lg" : "border-slate-100 bg-white hover:border-slate-200 shadow-sm"} relative`}
                            >
                              {/* Index Tag */}
                              <div className="absolute top-4 left-4 w-7 h-7 bg-[#1E3A8A] text-white font-extrabold rounded-lg flex items-center justify-center text-xs">
                                #{index + 1}
                              </div>

                              <div className="pl-9 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1 my-0.5">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-lg text-[#1E3A8A]">{car.brand} <span className="text-slate-800">{car.model}</span></h3>
                                    
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                                      <ShieldCheck className="w-3 h-3" /> Favorable
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-500 font-light max-w-lg">{car.whyMatch}</p>

                                  {/* Direct Badge Values */}
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Années: {car.years}</span>
                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Km moyen: {car.averageMileage}</span>
                                    <span className="text-[11px] font-semibold text-[#06B6D4] bg-teal-50 px-2 py-0.5 rounded">Moteur: {car.fuelType}</span>
                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{car.transmission}</span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 flex flex-col items-end gap-1 w-full md:w-auto">
                                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cote constatée</div>
                                  {formatEstimatedPrice(car.estimatedPrice, "text-2xl font-black text-[#2563EB]")}
                                  
                                  {/* Compatibility radial score */}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-xs text-slate-400 font-medium">Affinité :</span>
                                    <span className="text-sm font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">{car.score}%</span>
                                  </div>

                                  <div className="flex gap-2 mt-3 w-full justify-end">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(car); }}
                                      className={`p-2 rounded-xl transition-all ${isFavorite(car) ? "bg-red-50 text-red-505 text-red-500" : "bg-slate-50 hover:bg-slate-100 text-slate-400"}`}
                                      title="Ajouter aux favoris"
                                    >
                                      <Heart className="w-4 h-4 fill-current" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleComparison(car); }}
                                      className={`px-3 py-1 text-[11px] font-semibold rounded-xl transition-all border ${comparedCars.some(c => `${c.brand}-${c.model}` === `${car.brand}-${car.model}`) ? "bg-cyan-50 border-cyan-300 text-[#06B6D4]" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"}`}
                                    >
                                      {comparedCars.some(c => `${c.brand}-${c.model}` === `${car.brand}-${car.model}`) ? "✓ Comparer" : "+ Comparer"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="bg-white p-8 rounded-3xl text-center text-slate-500 border border-slate-100">
                          Aucun véhicule trouvé. Essayez d'augmenter légèrement votre budget d'achat ou d'élargir la silhouette.
                        </div>
                      )}

                      {/* Display table of comparison side-by-side if compared vehicles present */}
                      {comparedCars.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-1.5">
                              <RefreshCw className="w-4 h-4 animate-spin text-[#06B6D4]" /> Comparateur de Caractéristiques ({comparedCars.length}/3)
                            </h3>
                            <button 
                              onClick={() => setComparedCars([])}
                              className="text-xs text-red-500 hover:underline font-semibold"
                            >
                              Réinitialiser la comparaison
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            <div className="hidden md:block py-2 font-bold text-slate-400 uppercase space-y-6">
                              <div>Spécification</div>
                              <div>Budget Estimé</div>
                              <div>Moteur / Vitesse</div>
                              <div>Consommation</div>
                              <div>Crit'Air</div>
                              <div>Avis Malin</div>
                            </div>
                            
                            {comparedCars.map(car => (
                              <div key={`${car.brand}-${car.model}`} className="border border-slate-100 p-4 rounded-xl space-y-3 bg-slate-50 relative">
                                <button 
                                  onClick={() => toggleComparison(car)}
                                  className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                
                                <div className="font-extrabold text-[#1E3A8A]">{car.brand} {car.model}</div>
                                
                                <div>
                                  <span className="md:hidden font-bold text-slate-400 block">Cote :</span>
                                  {formatEstimatedPrice(car.estimatedPrice, "font-extrabold text-[#2563EB] text-sm", "items-start text-left")}
                                </div>

                                <div>
                                  <span className="md:hidden font-bold text-slate-400 block font-light">Moteur :</span>
                                  <span>{car.fuelType} ({car.power})<br/>{car.transmission}</span>
                                </div>

                                <div>
                                  <span className="md:hidden font-bold text-slate-400 block">Consommation :</span>
                                  <span>{car.consumption}</span>
                                </div>

                                <div>
                                  <span className="md:hidden font-bold text-slate-400 block">Crit'Air :</span>
                                  <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 font-bold rounded text-[10px]">
                                    {car.critAir}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-500 italic block leading-snug">
                                  "{car.marketSituation.substring(0, 85)}..."
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>


                    {/* Right Grid Column: Deep Inspection Details Pane & Interactive IA Chat Box */}
                    {selectedCar && (
                      <div className={`lg:col-span-12 xl:col-span-5 space-y-6 ${resultsMobileTab === "details" ? "block" : "hidden xl:block"}`}>
                        
                        {/* Deep Features Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                Analyse Approfondie
                              </span>
                              <h2 className="text-2xl font-black text-[#1E3A8A] mt-1.5">{selectedCar.brand} {selectedCar.model}</h2>
                              <p className="text-xs text-slate-400 font-medium">Recommandation d'années : {selectedCar.years}</p>
                            </div>

                            <button 
                              onClick={() => {
                                window.print();
                              }}
                              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-[#1E3A8A] rounded-xl transition-all border border-slate-100"
                              title="Imprimer cette fiche expert"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Matching criteria bars */}
                          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 space-y-4">
                            <h4 className="text-xs font-extrabold text-[#1E3A8A] uppercase tracking-wider">Fiche Technique</h4>
                            
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-slate-400 block">Autonomie / Énergie</span>
                                <span className="font-bold text-slate-700">{selectedCar.fuelType}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Puissance</span>
                                <span className="font-bold text-slate-700">{selectedCar.power}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Vignette réglementaire</span>
                                <span className="font-bold text-[#06B6D4]">{selectedCar.critAir}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Coût d'usage annuel</span>
                                <span className="font-bold text-emerald-600">{selectedCar.annualCost}</span>
                              </div>
                            </div>
                          </div>

                          {/* Highlights List */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Points forts pour cet acheteur</h4>
                            <div className="space-y-1.5">
                              {selectedCar.highlights.map((h, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Drawbacks / Warnings List */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Points de vigilance / Faiblesses</h4>
                            <div className="space-y-1.5">
                              {selectedCar.drawbacks.map((d, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                  <XCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                                  <span>{d}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Interactive Cost Simulation calculator */}
                          <div className="border-t border-slate-100 pt-5 space-y-3">
                            <h4 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider flex items-center justify-between">
                              <span>Simulateur Budget Usage</span>
                              <span className="text-[10px] text-emerald-500 font-bold lowercase capitalize">Calculateur automatique</span>
                            </h4>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="text-slate-400 block mb-1">Kilométrage annuel</label>
                                <select 
                                  value={kilometersPerYear}
                                  onChange={(e) => setKilometersPerYear(parseInt(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-700 font-semibold"
                                >
                                  <option value={5000}>5 000 km / an</option>
                                  <option value={10000}>10 000 km / an</option>
                                  <option value={15000}>15 000 km / an</option>
                                  <option value={20000}>20 000 km / an</option>
                                  <option value={25000}>25 000 km / an</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-slate-400 block mb-1">Prix moyen carburant</label>
                                <input 
                                  type="number"
                                  step="0.05"
                                  value={fuelPrice}
                                  onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 1.85)}
                                  className="w-full bg-slate-50 border border-slate-100 p-1.5 rounded-lg text-slate-700 font-semibold text-center"
                                />
                              </div>
                            </div>

                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-semibold text-slate-500 block">Consommation réelle d'usage</span>
                                <span className="font-extrabold text-slate-700">{selectedCar.consumption}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-emerald-700 block">Carburant estimé</span>
                                <span className="font-extrabold text-emerald-600 text-lg">
                                  {calculateYearlyFuelCost(selectedCar).toLocaleString("fr-FR")} € / an
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Advice from Expert block */}
                          <div className="bg-[#1E3A8A]/5 p-4 rounded-2xl border border-[#1E3A8A]/10 text-xs text-slate-700 space-y-1">
                            <span className="font-black text-[#1E3A8A] block uppercase text-[10px] tracking-wider">Avis Malin de l'Expert</span>
                            <p className="leading-relaxed italic">{selectedCar.marketSituation}</p>
                          </div>
                        </div>

                        {/* Advisor Conversation Box dedicated */}
                        <div id="ask-advisor-chat-box" className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#06B6D4] text-white rounded-2xl flex items-center justify-center shadow-md">
                              <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm">Discuter avec l'expert IA</h3>
                              <p className="text-[10px] text-slate-400 font-medium">Posez vos questions sur la {selectedCar.brand} {selectedCar.model}</p>
                            </div>
                          </div>

                          {/* Live Chat History */}
                          <div className="h-56 bg-slate-50 border border-slate-100 p-4 rounded-2xl overflow-y-auto space-y-3 flex flex-col">
                            {chatHistory.map((msg) => (
                              <div 
                                key={msg.id}
                                className={`p-3 max-w-[85%] rounded-2xl text-xs space-y-1 ${msg.sender === "user" ? "bg-[#2563EB] text-white self-end rounded-tr-none" : "bg-white text-slate-700 self-start rounded-tl-none border border-slate-100 shadow-sm"}`}
                              >
                                <p className="leading-normal font-light">{msg.text}</p>
                                <span className={`text-[9px] block text-right font-semibold ${msg.sender === "user" ? "text-blue-200" : "text-slate-400"}`}>
                                  {msg.timestamp}
                                </span>
                              </div>
                            ))}

                            {chatLoading && (
                              <div className="bg-white text-slate-500 self-start rounded-2xl rounded-tl-none p-3 border border-slate-100 shadow-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full animate-bounce delay-200"></span>
                                <span className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full animate-bounce delay-300"></span>
                                <span className="text-[10px] font-semibold text-slate-400">Analyse en cours...</span>
                              </div>
                            )}
                          </div>

                          {/* Entry Input Form */}
                          <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input 
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder={`Ex: Est-elle adaptée aux trajets de montage ou chère d'assurance ?`}
                              className="flex-1 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:bg-white transition-all"
                            />
                            
                            <button 
                              type="submit"
                              disabled={chatLoading || !chatInput.trim()}
                              className="p-3 bg-[#1E3A8A] text-white hover:bg-[#2563EB] disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center"
                            >
                              <Send className="w-4.5 h-4.5" />
                            </button>
                          </form>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* Loader fullscreen or container loader overlay */}
              {loading && (
                <div className="fixed inset-0 bg-[#1E3A8A]/50 backdrop-blur-md flex items-center justify-center z-50">
                  <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2563EB] via-[#06B6D4] to-[#1E3A8A] animate-pulse"></div>
                    
                    <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-full flex items-center justify-center mx-auto animate-spin">
                      <RefreshCw className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-extrabold text-lg text-[#1E3A8A]">Consultation de l'IA en cours</h3>
                      <p className="text-xs text-slate-500 leading-normal font-light">
                        Nous pesons actuellement la fiabilité mécanique, la décote du marché d'occasion et la vignette d'émission Crit'Air de chaque modèle pour vous construire le podium optimal.
                      </p>
                    </div>

                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#06B6D4] animate-pulse w-3/4 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}


          {/* TAB 2: GUIDE PRATIQUE COMPREHENSIVE */}
          {activeTab === "guide" && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                <div className="space-y-2">
                  <span className="px-3 py-1 bg-cyan-50 text-[#06B6D4] text-xs font-bold rounded-full">GUIDE EXPERT</span>
                  <h1 className="text-3xl font-bold text-[#1E3A8A]">Combien investir dans son automobile ?</h1>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Acheter un véhicule n'est pas uniquement une opération comptable. C'est l'un des postes de dépenses les plus lourds d'un foyer. Voici la règle des experts pour ne pas vous mettre en danger financièrement.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-1.5">
                      <Coins className="w-4.5 h-4.5 text-[#2563EB]" /> La règle d'achat Comptant : 35 %
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Un véhicule acheté au comptant ne doit jamais excéder <strong>35% de vos revenus annuels nets de foyer</strong>. Si votre ménage gagne 40 000€ nets annuels cumulés, votre budget d'achat maximum conseillé s'élève à 14 000€. Au-delà, l'impact sur vos capacités d'épargne est trop critique.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-bold text-[#1E3A8A] text-sm flex items-center gap-1.5">
                      <CreditCard className="w-4.5 h-4.5 text-[#06B6D4]" /> La règle du Mensuel : 15 %
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Si vous optez pour le crédit ou le LOA/LLD (Leasing), la somme de vos mensualités associées à l'automobile (frais de leasing, assurances et carburant compris) ne devrait pas dépasser <strong>15% de vos revenus mensuels nets</strong>. Pour un salaire de 2 000€/mois, le loyer idéal est de 200€ à 250€/mois.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-[#1E3A8A]">Astuces pour réduire vos frais d'entretien :</h3>
                  
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex gap-2.5 items-start">
                      <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p>
                        <strong>La vignette réglementaire Crit'Air :</strong> Privilégiez systématiquement une vignette Crit'Air 1 ou 0. Les grandes agglomérations françaises durcissent leurs restrictions régulières. Un modèle Crit'Air 2 se revendra moins bien dans 3 ans.
                      </p>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p>
                        <strong>Attention au courroies de distribution :</strong> Les versions moteurs essence récents (notamment le 1.2 PureTech Stellantis ou certains moteurs EcoBoost Ford) nécessitent un contrôle scrupuleux de l'intervalle et de l'historique d'huile moteur. Privilégiez des motorisations à chaîne ou à technologie hybride éprouvées (Toyota, Honda).
                      </p>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p>
                        <strong>L'assurance automobile en ligne :</strong> N'hésitez pas à demander un audit de carnet d'entretien numérique officiel avec HistoVec. C'est l'outil officiel gratuit du gouvernement français pour tracer les anciens propriétaires et les kilométrages réels enregistrés lors des contrôles techniques.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-center">
                  <button 
                    onClick={() => setActiveTab("advisor")}
                    className="px-6 py-3 bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-800/10"
                  >
                    Lancer mon diagnostic budget
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* TAB 3: FAVORITES AND REMEMBERED CARS */}
          {activeTab === "favorites" && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E3A8A]">Vos Véhicules Sauvegardés</h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Retrouvez ici les modèles d'intérêts que vous avez marqués d'un cœur pour étude ultérieure.
                  </p>
                </div>

                {favorites.length > 0 && (
                  <button 
                    onClick={() => {
                      if (confirm("Voulez-vous vider tous vos favoris ?")) {
                        setFavorites([]);
                      }
                    }}
                    className="text-xs text-red-500 font-semibold hover:underline bg-red-50 px-3 py-1.5 rounded-lg"
                  >
                    Vider les favoris
                  </button>
                )}
              </div>

              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favorites.map((car) => (
                    <div 
                      key={`${car.brand}-${car.model}`}
                      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-slate-300 transition-all cursor-pointer relative"
                      onClick={() => {
                        setActiveTab("advisor");
                        setStep(8);
                        setSelectedCar(car);
                      }}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(car); }}
                        className="absolute top-4 right-4 text-red-500 hover:text-slate-400 p-2"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>

                      <div>
                        <h3 className="font-extrabold text-[#1E3A8A] text-lg">{car.brand} {car.model}</h3>
                        <div className="mt-0.5">
                          {formatEstimatedPrice(car.estimatedPrice, "text-xs text-[#2563EB] font-bold", "items-start text-left")}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 leading-relaxed font-light">
                        {car.whyMatch}
                      </div>

                      <div className="border-t border-slate-50 pt-3 flex justify-between items-center text-xs">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">Crit'Air : {car.critAir}</span>
                        <span className="text-[#06B6D4] font-bold flex items-center gap-1">
                          Voir la fiche expert <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-3xl text-center text-slate-400 border border-slate-100 space-y-4">
                  <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto">
                    <Heart className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Aucun véhicule favori pour l'instant</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Parcourez le diagnostic questionnaire et cliquez sur le symbole cœur d'un modèle pour l'ajouter ici.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Area - Human scale compliance */}
        <footer id="footer-copyright" className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <p>© 2026 AutoMatch AI. Conseil d'Achat Automobile Indépendant.</p>
          <p className="hidden sm:inline">Données indicatives calculées par intelligence artificielle - Marché Français réglementé.</p>
        </footer>

      </main>
    </div>
  );
}
