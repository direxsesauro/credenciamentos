
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isDarkMode, toggleDarkMode }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'contracts', label: 'Contratos', icon: '📜' },
    { id: 'payments', label: 'Pagamentos', icon: '💸' },
    { id: 'new-payment', label: 'Novo Evento', icon: '➕' },
  ];

  return (
    <aside className="w-20 md:w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col transition-all duration-300 border-r border-slate-800/50">
      <div className="p-6 text-center border-b border-slate-800">
        <div className="bg-blue-600 rounded-full w-10 h-10 mx-auto flex items-center justify-center font-bold text-lg mb-2 shadow-lg shadow-blue-900/50">RO</div>
        <h2 className="hidden md:block text-xs font-semibold uppercase tracking-widest text-slate-400">SESAU-RO</h2>
      </div>
      <nav className="flex-1 mt-6">
        <ul className="space-y-2 px-3">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setView(item.id as ViewType)}
                className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition ${
                  currentView === item.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="hidden md:block font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="px-4 py-6 border-t border-slate-800 flex flex-col gap-4">
        <button 
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-center md:justify-start gap-4 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition"
          title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          <span className="text-xl">{isDarkMode ? '☀️' : '🌙'}</span>
          <span className="hidden md:block font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Noturno'}</span>
        </button>
        <p className="hidden md:block text-[10px] text-slate-500 text-center uppercase tracking-widest opacity-50">v1.0.5 - Rondônia</p>
      </div>
    </aside>
  );
};

export default Sidebar;
