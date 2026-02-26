import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  BookOpen, 
  PlayCircle, 
  Gift, 
  ChevronRight, 
  Download, 
  ExternalLink,
  Search,
  Layout,
  Coffee,
  ShoppingCart,
  ShieldCheck,
  Timer,
  RefreshCw,
  Leaf,
  Menu,
  X,
  User,
  LogOut,
  Sparkles,
  Bell,
  BellOff,
  MessageCircle
} from 'lucide-react';
import { TabType } from './types';
import { MATERIALS, VIDEOS, BONUSES, OFFERS } from './constants';
import { generateDailyRecipe, DailyRecipe } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const IconMap: Record<string, any> = {
  BookOpen,
  Layout,
  Coffee,
  ShoppingCart,
  ShieldCheck,
  Timer,
  RefreshCw,
  Leaf
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<string | null>(null);
  const [viewingVideo, setViewingVideo] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationsDisabledUntil, setNotificationsDisabledUntil] = useState<string | null>(null);
  const [dailyRecipe, setDailyRecipe] = useState<DailyRecipe | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('lancheirinha_user_name');
    if (savedName) {
      setUserName(savedName);
    }
    
    // Daily Recipe Logic
    const fetchDailyRecipe = async () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayString = new Date().toDateString();

      // 1. Check Local Cache first for speed
      const cachedRecipeStr = localStorage.getItem('daily_recipe');
      const cachedDate = localStorage.getItem('daily_recipe_date');

      if (cachedRecipeStr && cachedDate === todayString) {
        try {
          const parsed = JSON.parse(cachedRecipeStr);
          if (parsed && Array.isArray(parsed.benefits)) {
            setDailyRecipe(parsed);
            return;
          }
        } catch (e) {
          console.error("Local cache error", e);
        }
      }

      setIsGeneratingRecipe(true);

      try {
        // 2. Check Supabase Global Cache (if configured)
        if (isSupabaseConfigured) {
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('daily_recipes')
            .select('recipe_data')
            .eq('date', today)
            .single();

          if (supabaseData && !supabaseError) {
            const recipe = supabaseData.recipe_data as DailyRecipe;
            setDailyRecipe(recipe);
            localStorage.setItem('daily_recipe', JSON.stringify(recipe));
            localStorage.setItem('daily_recipe_date', todayString);
            setIsGeneratingRecipe(false);
            return;
          }
        }

        // 3. Generate with Gemini
        const recipe = await generateDailyRecipe();
        if (recipe) {
          setDailyRecipe(recipe);
          localStorage.setItem('daily_recipe', JSON.stringify(recipe));
          localStorage.setItem('daily_recipe_date', todayString);

          // 4. Save to Supabase for everyone else (if configured)
          if (isSupabaseConfigured) {
            await supabase
              .from('daily_recipes')
              .upsert({ date: today, recipe_data: recipe }, { onConflict: 'date' });
          }
        }
      } catch (error) {
        console.error("Supabase/Gemini error", error);
      } finally {
        setIsGeneratingRecipe(false);
      }
    };

    fetchDailyRecipe();
    
    // Check if notifications should be re-enabled (new day)
    const disabledUntil = localStorage.getItem('notifications_disabled_until');
    if (disabledUntil) {
      const disabledDate = new Date(disabledUntil);
      const today = new Date();
      if (today.toDateString() !== disabledDate.toDateString()) {
        localStorage.removeItem('notifications_disabled_until');
        setNotificationsDisabledUntil(null);
      } else {
        setNotificationsDisabledUntil(disabledUntil);
      }
    }

    // Notification interval (30 minutes)
    const interval = setInterval(() => {
      const isDisabled = localStorage.getItem('notifications_disabled_until');
      if (!isDisabled) {
        setShowNotification(true);
      }
    }, 1800000);

    // Show initial notification after 5 seconds for demo purposes if not disabled
    const timeout = setTimeout(() => {
      const isDisabled = localStorage.getItem('notifications_disabled_until');
      if (!isDisabled && !userName) { // Only if not logged in yet or just to show it works
        // Actually, better show it only if logged in
      }
    }, 5000);

    setIsLoading(false);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Show notification logic when logged in
  useEffect(() => {
    if (userName && !notificationsDisabledUntil) {
      const timeout = setTimeout(() => {
        setShowNotification(true);
      }, 3000); // Show 3 seconds after login for visibility
      return () => clearTimeout(timeout);
    }
  }, [userName, notificationsDisabledUntil]);

  const handleLogin = (name: string) => {
    localStorage.setItem('lancheirinha_user_name', name);
    setUserName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('lancheirinha_user_name');
    setUserName(null);
    setActiveTab('home');
    setShowNotification(false);
  };

  const disableNotificationsForToday = () => {
    const today = new Date().toISOString();
    localStorage.setItem('notifications_disabled_until', today);
    setNotificationsDisabledUntil(today);
    setShowNotification(false);
  };

  const handleViewMaterial = (url: string) => {
    // Ensure it's a preview link if it's Google Drive
    let previewUrl = url;
    if (url.includes('drive.google.com') && !url.endsWith('/preview')) {
      previewUrl = url.replace(/\/view.*$/, '') + '/preview';
    }
    setViewingMaterial(previewUrl);
  };

  const handleViewVideo = (youtubeId: string) => {
    setViewingVideo(youtubeId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeSection 
            userName={userName || 'Mamãe'} 
            onNavigate={setActiveTab} 
            onViewMaterial={handleViewMaterial} 
            dailyRecipe={dailyRecipe}
            isGeneratingRecipe={isGeneratingRecipe}
          />
        );
      case 'materiais':
        return <MaterialsSection onViewMaterial={handleViewMaterial} />;
      case 'aulas':
        return <VideosSection onViewVideo={handleViewVideo} />;
      case 'bonus':
        return <BonusSection onViewMaterial={handleViewMaterial} />;
      case 'especial':
        return <OffersSection />;
      default:
        return (
          <HomeSection 
            userName={userName || 'Mamãe'} 
            onNavigate={setActiveTab} 
            onViewMaterial={handleViewMaterial} 
            dailyRecipe={dailyRecipe}
            isGeneratingRecipe={isGeneratingRecipe}
          />
        );
    }
  };

  const logoUrl = "https://i.ibb.co/s9MrVrTf/PACOTE-COMPLETO-1.jpg";

  if (isLoading) return null;

  if (!userName) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-white pb-20 md:pb-0 md:pl-64">
      {/* Notifications Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100]"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-brand-orange/20 overflow-hidden">
              <div className="p-4 flex gap-4">
                <div className="w-12 h-12 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center shrink-0">
                  <Sparkles size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-brand-text">Novidades Especiais! ✨</h4>
                  <p className="text-sm text-brand-text/70">Confira as novas ofertas exclusivas na aba Especial.</p>
                  <div className="flex gap-3 mt-3">
                    <button 
                      onClick={() => { setActiveTab('especial'); setShowNotification(false); }}
                      className="text-xs font-bold text-brand-orange hover:underline"
                    >
                      Ver agora
                    </button>
                    <button 
                      onClick={() => setShowNotification(false)}
                      className="text-xs font-bold text-brand-text/40 hover:text-brand-text"
                    >
                      Depois
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowNotification(false)} className="text-brand-text/20 hover:text-brand-text">
                  <X size={18} />
                </button>
              </div>
              <button 
                onClick={disableNotificationsForToday}
                className="w-full py-2 bg-gray-50 text-[10px] font-bold text-brand-text/40 hover:text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
              >
                <BellOff size={12} /> Silenciar notificações por hoje
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
          <h1 className="font-bold text-brand-text">Lancheirinha Feliz</h1>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-brand-text">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Desktop Sidebar / Mobile Menu Overlay */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
            <div>
              <h1 className="font-bold text-lg leading-tight text-brand-text">Lancheirinha</h1>
              <p className="text-xs text-brand-orange font-medium uppercase tracking-wider">Feliz</p>
            </div>
          </div>

          <div className="space-y-2">
            <NavItem 
              icon={<Home size={20} />} 
              label="Início" 
              active={activeTab === 'home'} 
              onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }} 
            />
            <NavItem 
              icon={<BookOpen size={20} />} 
              label="Materiais" 
              active={activeTab === 'materiais'} 
              onClick={() => { setActiveTab('materiais'); setIsMenuOpen(false); }} 
            />
            <NavItem 
              icon={<PlayCircle size={20} />} 
              label="Aulas" 
              active={activeTab === 'aulas'} 
              onClick={() => { setActiveTab('aulas'); setIsMenuOpen(false); }} 
            />
            <NavItem 
              icon={<Gift size={20} />} 
              label="Bônus" 
              active={activeTab === 'bonus'} 
              onClick={() => { setActiveTab('bonus'); setIsMenuOpen(false); }} 
            />
            <NavItem 
              icon={<Sparkles size={20} />} 
              label="Especial" 
              active={activeTab === 'especial'} 
              onClick={() => { setActiveTab('especial'); setIsMenuOpen(false); }} 
            />
          </div>

          <div className="mt-10 pt-10 border-t border-gray-100">
            <div className="flex items-center gap-3 px-4 mb-4">
              <div className="w-10 h-10 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center">
                <User size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-brand-text/60 font-medium">Logado como</p>
                <p className="text-sm font-bold text-brand-text truncate">{userName}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut size={20} />
              Sair da conta
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-3 z-40">
        <MobileNavItem 
          icon={<Home size={24} />} 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
        />
        <MobileNavItem 
          icon={<BookOpen size={24} />} 
          active={activeTab === 'materiais'} 
          onClick={() => setActiveTab('materiais')} 
        />
        <MobileNavItem 
          icon={<PlayCircle size={24} />} 
          active={activeTab === 'aulas'} 
          onClick={() => setActiveTab('aulas')} 
        />
        <MobileNavItem 
          icon={<Gift size={24} />} 
          active={activeTab === 'bonus'} 
          onClick={() => setActiveTab('bonus')} 
        />
        <MobileNavItem 
          icon={<Sparkles size={24} />} 
          active={activeTab === 'especial'} 
          onClick={() => setActiveTab('especial')} 
        />
      </nav>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Material Viewer Modal */}
      <AnimatePresence>
        {viewingMaterial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-brand-text">Visualizador de Material</h3>
                <button 
                  onClick={() => setViewingMaterial(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-brand-text"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 bg-gray-50 relative">
                <iframe 
                  src={viewingMaterial} 
                  className="w-full h-full border-none"
                  title="Material Viewer"
                  allow="autoplay"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      <AnimatePresence>
        {viewingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden relative shadow-2xl"
            >
              <button 
                onClick={() => setViewingVideo(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="w-full h-full relative">
                {/* Restricted YouTube Embed */}
                <iframe
                  src={`https://www.youtube.com/embed/${viewingVideo}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3&autoplay=1`}
                  className="w-full h-full border-none"
                  title="Video Player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                
                {/* Subtle Overlay to prevent clicking title/logo - top area */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-transparent z-10 pointer-events-auto" />
                {/* Subtle Overlay to prevent clicking logo - bottom right area */}
                <div className="absolute bottom-0 right-0 w-24 h-12 bg-transparent z-10 pointer-events-auto" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${active 
          ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' 
          : 'text-brand-text/60 hover:bg-brand-green/10 hover:text-brand-green'}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 transition-colors ${active ? 'text-brand-orange' : 'text-brand-text/40'}`}
    >
      {icon}
    </button>
  );
}

function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('');
  const logoUrl = "https://i.ibb.co/s9MrVrTf/PACOTE-COMPLETO-1.jpg";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md text-center space-y-6"
      >
        <img src={logoUrl} alt="Logo" className="w-24 h-24 mx-auto rounded-3xl shadow-lg object-cover" referrerPolicy="no-referrer" />
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Bem-vinda!</h1>
          <p className="text-brand-text/60">Para começar, como podemos te chamar?</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all text-lg"
            required
          />
          <button 
            type="submit"
            className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-brand-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Entrar no App
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function HomeSection({ 
  userName, 
  onNavigate, 
  onViewMaterial,
  dailyRecipe,
  isGeneratingRecipe
}: { 
  userName: string, 
  onNavigate: (tab: TabType) => void, 
  onViewMaterial: (url: string) => void,
  dailyRecipe: DailyRecipe | null,
  isGeneratingRecipe: boolean
}) {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-brand-text">Olá, {userName}! 👋</h2>
        <p className="text-brand-text/60">Pronta para preparar a lancheirinha de hoje?</p>
      </header>

      {/* Daily AI Recipe Card */}
      <section className="glass-card overflow-hidden border-brand-orange/20">
        <div className="bg-brand-orange/10 p-4 border-b border-brand-orange/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-orange" />
            <span className="text-xs font-bold text-brand-orange uppercase tracking-wider">Sugestão do Dia (IA)</span>
          </div>
          <span className="text-[10px] font-bold text-brand-text/40 bg-white px-2 py-0.5 rounded-full">NOVO TODO DIA</span>
        </div>
        
        <div className="p-6">
          {isGeneratingRecipe ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin" />
              <p className="text-sm text-brand-text/60 font-medium">Gerando receita saudável...</p>
            </div>
          ) : dailyRecipe ? (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">Receita</p>
                <h3 className="text-xl font-bold text-brand-text">{dailyRecipe.title}</h3>
              </div>

              <div>
                <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">O que é</p>
                <p className="text-sm text-brand-text/70">{dailyRecipe.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-2">Ingredientes</p>
                  <ul className="space-y-1">
                    {dailyRecipe.ingredients?.map((ing, i) => (
                      <li key={i} className="text-sm text-brand-text/70 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-2">Benefícios</p>
                  <ul className="space-y-1">
                    {dailyRecipe.benefits?.map((benefit, i) => (
                      <li key={i} className="text-sm text-brand-text/70 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-2">Modo de preparo</p>
                <ul className="space-y-2">
                  {Array.isArray(dailyRecipe.instructions) ? dailyRecipe.instructions.map((step, i) => (
                    <li key={i} className="text-sm text-brand-text/70 flex gap-3">
                      <span className="font-bold text-brand-orange">{i + 1}.</span>
                      {step}
                    </li>
                  )) : (
                    <li className="text-sm text-brand-text/70 italic">
                      {dailyRecipe.instructions}
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex items-start gap-3 p-4 bg-brand-orange/5 rounded-2xl border border-brand-orange/10">
                <Timer size={20} className="text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Dica de Montagem</p>
                  <p className="text-sm text-brand-text/80">{dailyRecipe.quickTip}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-brand-text/40">Não foi possível carregar a receita de hoje.</p>
            </div>
          )}
        </div>
      </section>

      {/* Continue Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-brand-green p-6 rounded-3xl text-white shadow-lg shadow-brand-green/20 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Continuar de onde parou</span>
            <h3 className="text-xl font-bold mt-1 mb-4">Aulas: Salgadas - Muffins de Espinafre</h3>
            <button 
              onClick={() => onNavigate('aulas')}
              className="bg-white text-brand-green px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-brand-orange hover:text-white transition-colors"
            >
              Assistir agora <ChevronRight size={16} />
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -top-10 w-32 h-32 bg-brand-orange/20 rounded-full blur-xl" />
        </section>

        <a 
          href="https://chat.whatsapp.com/GdPV2VLWThL1ebfhPmiV41"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white p-6 rounded-3xl border border-brand-green/20 shadow-sm flex flex-col justify-between hover:border-brand-green/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-colors">
              <MessageCircle size={24} />
            </div>
            <ExternalLink size={16} className="text-brand-text/20" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-text mt-4">Comunidade VIP</h3>
            <p className="text-sm text-brand-text/60">Entre no nosso grupo do WhatsApp e troque dicas com outras mamães.</p>
          </div>
        </a>
      </div>

      {/* Featured Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-brand-text">Destaques da Semana</h3>
          <button onClick={() => onNavigate('materiais')} className="text-brand-orange text-sm font-bold">Ver tudo</button>
        </div>
        <div className="space-y-4">
          {MATERIALS.slice(0, 2).map(material => (
            <div 
              key={material.id} 
              onClick={() => onViewMaterial(material.url)}
              className="glass-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-green">
                {React.createElement(IconMap[material.icon] || BookOpen, { size: 24 })}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{material.title}</h4>
                <p className="text-xs text-brand-text/60 line-clamp-1">
                  {material.url ? material.description : 'Liberado em 7 dias'}
                </p>
              </div>
              <ChevronRight size={16} className="text-brand-text/20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MaterialsSection({ onViewMaterial }: { onViewMaterial: (url: string) => void }) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-brand-text">Materiais em PDF</h2>
        <p className="text-brand-text/60">Baixe e consulte sempre que precisar.</p>
      </header>

      <div className="space-y-4">
        {MATERIALS.map(material => (
          <div key={material.id} className="glass-card p-5 group">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-green/10 text-brand-green rounded-2xl group-hover:bg-brand-green group-hover:text-white transition-colors">
                {React.createElement(IconMap[material.icon] || BookOpen, { size: 28 })}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">{material.title}</h3>
                <p className="text-sm text-brand-text/60 mb-4">{material.description}</p>
                {material.url ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => onViewMaterial(material.url)}
                      className="flex-1 bg-brand-green text-white py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-green/90"
                    >
                      <BookOpen size={16} /> Ver Material
                    </button>
                    <a 
                      href={material.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 border border-gray-100 rounded-xl text-brand-text/40 hover:bg-gray-50 flex items-center justify-center"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ) : (
                  <div className="bg-gray-50 text-gray-400 py-2 px-4 rounded-xl font-bold text-xs text-center border border-dashed border-gray-200">
                    Liberado em 7 dias
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideosSection({ onViewVideo }: { onViewVideo: (id: string) => void }) {
  const [filter, setFilter] = useState<'Tudo' | 'Salgadas' | 'Doces' | 'Sem Glúten'>('Tudo');

  const filteredVideos = filter === 'Tudo' 
    ? VIDEOS 
    : VIDEOS.filter(v => v.category === filter);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-brand-text">Aulas em Vídeo</h2>
        <p className="text-brand-text/60">Aprenda o passo a passo das receitas.</p>
      </header>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Tudo', 'Salgadas', 'Doces', 'Sem Glúten'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat as any)}
            className={`
              whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all
              ${filter === cat 
                ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' 
                : 'bg-white text-brand-text/60 border border-gray-100 hover:border-brand-orange/30'}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredVideos.map(video => (
          <div 
            key={video.id} 
            onClick={() => onViewVideo(video.youtubeId)}
            className="group cursor-pointer"
          >
            <div className="relative aspect-video rounded-3xl overflow-hidden mb-3 shadow-sm">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center text-brand-orange shadow-lg">
                  <PlayCircle size={32} fill="currentColor" />
                </div>
              </div>
              <div className="absolute top-3 left-3">
                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-text">
                  {video.category}
                </span>
              </div>
            </div>
            <h3 className="font-bold text-brand-text group-hover:text-brand-orange transition-colors">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function BonusSection({ onViewMaterial }: { onViewMaterial: (url: string) => void }) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-brand-text">Seção de Bônus</h2>
        <p className="text-brand-text/60">Conteúdo extra para facilitar sua rotina.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {BONUSES.map(bonus => (
          <div 
            key={bonus.id} 
            onClick={() => bonus.url && onViewMaterial(bonus.url)}
            className={`glass-card p-5 flex items-center gap-5 transition-colors group ${bonus.url ? 'cursor-pointer hover:border-brand-orange/30' : 'opacity-70 cursor-not-allowed'}`}
          >
            <div className="w-14 h-14 bg-brand-orange/10 text-brand-orange rounded-2xl flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
              {React.createElement(IconMap[bonus.icon] || Gift, { size: 28 })}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{bonus.title}</h3>
              <p className="text-sm text-brand-text/60">{bonus.description}</p>
              {!bonus.url && (
                <span className="inline-block mt-2 text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Liberado em 7 dias
                </span>
              )}
            </div>
            <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-brand-text/20 group-hover:text-brand-orange group-hover:border-brand-orange/20 transition-colors">
              {bonus.url ? <ChevronRight size={20} /> : <X size={16} />}
            </div>
          </div>
        ))}
      </div>

      {/* Special Offer Card */}
      <div className="mt-10 p-8 bg-gradient-to-br from-brand-orange to-orange-400 rounded-[2rem] text-white text-center relative overflow-hidden">
        <div className="relative z-10">
          <Gift className="mx-auto mb-4 opacity-80" size={40} />
          <h3 className="text-2xl font-bold mb-2">Convite Especial!</h3>
          <p className="text-white/80 mb-6 max-w-xs mx-auto">Participe do nosso grupo VIP no WhatsApp e receba dicas diárias.</p>
          <a 
            href="https://chat.whatsapp.com/GdPV2VLWThL1ebfhPmiV41" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-white text-brand-orange px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
          >
            Entrar no Grupo
          </a>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12 blur-xl" />
      </div>
    </div>
  );
}

function OffersSection() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-brand-text uppercase tracking-tight">
          Aproveite também e leve esses cursos que vão ajudar você e seu filho
        </h2>
        <div className="w-20 h-1 bg-brand-orange mx-auto rounded-full" />
      </header>

      <div className="space-y-12">
        {OFFERS.map((offer) => (
          <div key={offer.id} className="space-y-6">
            <div className="glass-card overflow-hidden group">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={offer.image} 
                  alt={offer.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-brand-orange text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Oferta Especial
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-brand-text leading-tight">
                  {offer.title}
                </h3>
                <p className="text-brand-text/70 leading-relaxed">
                  {offer.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-sm text-brand-text/40 line-through">De {offer.oldPrice}</p>
                    <p className="text-2xl font-black text-brand-orange">Por apenas {offer.newPrice}</p>
                  </div>
                  <a 
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-green-strong text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-green-strong/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 animate-pulse-strong"
                  >
                    QUERO APROVEITAR <ChevronRight size={18} />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-1/2 h-px bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
