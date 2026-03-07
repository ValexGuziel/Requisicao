import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Users, 
  Search, 
  Filter, 
  Grid, 
  List as ListIcon,
  Edit,
  Trash2,
  CheckCircle2,
  History,
  Printer,
  X,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
  FileText,
  Menu,
  Lock,
  Unlock,
  Download
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Technician, Stats, Equipment } from './types';
import { cn } from './lib/utils';
import { exportToExcel, exportToPDF, exportOrderToPDF } from './lib/exportUtils';

// --- Components ---

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'list' | 'database'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'finished'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [finishingOrder, setFinishingOrder] = useState<Order | null>(null);
  const signatureRef = React.useRef<HTMLCanvasElement>(null);
  const [historyTag, setHistoryTag] = useState<string | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [newOrderData, setNewOrderData] = useState({
    requester: '',
    equipment_tag: '',
    equipment_name: '',
    sector: '',
    maintenance_type: 'Corretiva',
    problem_description: ''
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Lock Mechanism State
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const LOCK_PASSWORD = '720419Mastig2026';
  const LOCK_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

  const checkLockStatus = () => {
    const expiry = localStorage.getItem('mastig_unlock_expiry');
    if (expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        setIsLocked(false);
        return false;
      }
    }
    setIsLocked(true);
    return true;
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === LOCK_PASSWORD) {
      const newExpiry = Date.now() + LOCK_DURATION_MS;
      localStorage.setItem('mastig_unlock_expiry', newExpiry.toString());
      setIsLocked(false);
      setPasswordError(false);
      setPasswordInput('');
      fetchData();
    } else {
      setPasswordError(true);
    }
  };

  const fetchData = async () => {
    try {
      const [ordersRes, techsRes, statsRes, equipRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/technicians'),
        fetch('/api/stats'),
        fetch('/api/equipment')
      ]);
      const ordersData = await ordersRes.json();
      const techsData = await techsRes.json();
      const statsData = await statsRes.json();
      const equipData = await equipRes.json();
      
      setOrders(ordersData);
      setTechnicians(techsData);
      setStats(statsData);
      setEquipmentList(equipData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Expirado';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const locked = checkLockStatus();
    if (!locked) {
      fetchData();
      
      const updateTimer = () => {
        const expiry = localStorage.getItem('mastig_unlock_expiry');
        if (expiry) {
          const remaining = parseInt(expiry, 10) - Date.now();
          if (remaining > 0) {
            setTimeLeft(remaining);
          } else {
            setIsLocked(true);
          }
        }
      };
      
      updateTimer();
      const intervalId = setInterval(updateTimer, 1000);
      
      const handleClickOutside = () => setShowSuggestions(false);
      window.addEventListener('click', handleClickOutside);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('click', handleClickOutside);
      };
    } else {
      const handleClickOutside = () => setShowSuggestions(false);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, []);

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderData),
      });
      if (res.ok) {
        fetchData();
        setActiveTab('list');
        setNewOrderData({
          requester: '',
          equipment_tag: '',
          equipment_name: '',
          sector: '',
          maintenance_type: 'Corretiva',
          problem_description: ''
        });
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchData();
        setEditingOrder(null);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta ordem?')) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleFinishOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!finishingOrder) return;
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/api/orders/${finishingOrder.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          finished_at: new Date().toISOString()
        }),
      });
      if (res.ok) {
        fetchData();
        setFinishingOrder(null);
      }
    } catch (error) {
      console.error('Error finishing order:', error);
    }
  };

  const fetchHistory = async (tag: string) => {
    try {
      const res = await fetch(`/api/history/${tag}`);
      const data = await res.json();
      setHistoryOrders(data);
      setHistoryTag(tag);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) throw new Error('Falha ao baixar backup');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mastig_backup_${format(new Date(), 'yyyy-MM-dd')}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro no backup:', error);
      alert('Não foi possível realizar o backup do banco de dados.');
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Ordem de Serviço #${order.id}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: sans-serif; padding: 0; margin: 10px; color: #333; line-height: 1.3; font-size: 16px; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; color: #3b82f6; font-size: 22px; }
            .header p { margin: 2px 0 0 0; color: #666; font-weight: bold; font-size: 14px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #666; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-item { margin-bottom: 8px; }
            .label { font-weight: bold; font-size: 10px; color: #888; text-transform: uppercase; display: block; margin-bottom: 1px; }
            .value { font-size: 13px; color: #111; }
            .status { padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 10px; text-transform: uppercase; }
            .status-open { background: #dbeafe; color: #1e40af; }
            .status-finished { background: #d1fae5; color: #065f46; }
            .problem { background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb; font-style: italic; white-space: pre-wrap; font-size: 12px; }
            .footer { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; font-size: 10px; color: #999; text-align: center; }
            .signatures { margin-top: 50px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Mastig - Manutenção industrial</h1>
              <p>ORDEM DE SERVIÇO #${order.id}</p>
            </div>
            <span class="status ${order.status === 'open' ? 'status-open' : 'status-finished'}">
              ${order.status === 'open' ? 'Aberta' : 'Finalizada'}
            </span>
          </div>

          <div class="grid">
            <div class="section">
              <div class="section-title">Informações da Solicitação</div>
              <div class="info-item">
                <span class="label">Solicitante</span>
                <span class="value">${order.requester}</span>
              </div>
              <div class="info-item">
                <span class="label">Data de Abertura</span>
                <span class="value">${format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <div class="info-item">
                <span class="label">Setor</span>
                <span class="value">${order.sector}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Dados do Equipamento</div>
              <div class="info-item">
                <span class="label">Nome do Equipamento</span>
                <span class="value">${order.equipment_name}</span>
              </div>
              <div class="info-item">
                <span class="label">Tag / Identificação</span>
                <span class="value">${order.equipment_tag}</span>
              </div>
              <div class="info-item">
                <span class="label">Tipo de Manutenção</span>
                <span class="value">${order.maintenance_type}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Descrição do Problema / Solicitação</div>
            <div class="problem">
              ${order.problem_description}
            </div>
          </div>

          ${order.status === 'finished' ? `
            <div class="section" style="margin-top: 30px; border-top: 1px dashed #eee; padding-top: 15px;">
              <div class="section-title">Relatório de Execução</div>
              <div class="grid">
                <div class="info-item">
                  <span class="label">Manutentor Responsável</span>
                  <span class="value">${order.technician_name}</span>
                </div>
                <div class="info-item">
                  <span class="label">Data de Finalização</span>
                  <span class="value">${format(new Date(order.finished_at!), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              </div>
              <div class="info-item">
                <span class="label">Serviço Realizado</span>
                <div class="problem">
                  ${order.service_performed}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="section signatures">
            <div class="section-title">Assinaturas</div>
            <div class="grid" style="margin-top: 30px;">
              <div style="text-align: center;">
                <div style="border-top: 1px solid #333; width: 80%; margin: 0 auto; padding-top: 5px;">
                  <span style="font-size: 10px; text-transform: uppercase; font-weight: bold;">${order.requester}</span><br>
                  <span style="font-size: 9px; color: #666;">Assinatura do Solicitante</span>
                </div>
              </div>
              <div style="text-align: center;">
                <div style="border-top: 1px solid #333; width: 80%; margin: 0 auto; padding-top: 5px;">
                  <span style="font-size: 10px; text-transform: uppercase; font-weight: bold;">${order.status === 'finished' ? order.technician_name : 'Manutentor Responsável'}</span><br>
                  <span style="font-size: 9px; color: #666;">Assinatura do Manutentor</span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            Este documento é um registro oficial do sistema Mastig - Manutenção industrial.<br>
            Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.equipment_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sector.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (isLocked) {
    return (
      <div className="flex h-screen bg-slate-900 font-sans items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600">
              <Lock size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Sistema Bloqueado</h2>
          <p className="text-center text-slate-500 mb-8 text-sm">
            Por favor, insira a senha de acesso para liberar o uso do sistema pelos próximos 90 dias.
          </p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Senha de Acesso</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                className={cn(
                  "w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all",
                  passwordError 
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50" 
                    : "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                )}
                placeholder="Insira a senha"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-2 font-medium">Senha incorreta. Tente novamente.</p>
              )}
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <Unlock size={18} />
              Desbloquear Sistema
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-between px-4 z-40 shadow-md">
        <h1 className="text-xl font-bold tracking-tight text-blue-400 truncate">Mastig Manutenção</h1>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-400">Mastig</h1>
            <p className="text-xs text-slate-400 mt-1">Gestão de Manutenção</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              activeTab === 'dashboard' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Painel Geral</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('new'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              activeTab === 'new' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <PlusCircle size={20} />
            <span className="font-medium">Nova Ordem</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('list'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              activeTab === 'list' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <ClipboardList size={20} />
            <span className="font-medium">Listar Ordens</span>
          </button>

          <button 
            onClick={() => { setActiveTab('database'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              activeTab === 'database' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <History size={20} />
            <span className="font-medium">Banco de Dados</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-3 text-slate-400 px-2">
            <Users size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Manutentores</span>
          </div>
          <div className="space-y-1">
            {technicians.map(tech => {
              const percentage = stats?.finished && stats.finished > 0 
                ? Math.round(((tech.finished_count || 0) / stats.finished) * 100) 
                : 0;
              return (
                <div key={tech.id} className="text-sm text-slate-300 px-2 py-1 flex items-center justify-between gap-2 group">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {tech.name}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded group-hover:text-blue-400 transition-colors">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pt-16 md:pt-0 p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Painel Geral</h2>
                  <p className="text-slate-500">Visão geral das atividades de manutenção</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3">
                    {timeLeft !== null && (
                      <div className="hidden sm:flex text-[10px] text-slate-400 font-medium items-center gap-1.5 uppercase tracking-wider px-2 py-1 rounded bg-slate-200/50" title="Tempo restante para bloqueio de segurança">
                        <Lock size={10} className="text-slate-500" />
                        {formatTimeLeft(timeLeft)}
                      </div>
                    )}
                    <button 
                      onClick={() => setShowHelpModal(true)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-4 py-2 rounded-lg transition-all"
                    >
                      <HelpCircle size={20} />
                      <span>Ajuda</span>
                    </button>
                  </div>
                  {timeLeft !== null && (
                    <div className="sm:hidden text-[9px] text-slate-400 font-medium flex items-center gap-1 uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/50 mt-1">
                      <Lock size={8} />
                      {formatTimeLeft(timeLeft)}
                    </div>
                  )}
                </div>
              </header>

{/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total de Ordens</p>
                  <p className="text-4xl font-bold text-slate-900 mt-2">{stats?.total || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Ordens Abertas</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">{stats?.open || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Ordens Finalizadas</p>
                  <p className="text-4xl font-bold text-emerald-600 mt-2">{stats?.finished || 0}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Setores</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.sectors || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats?.sectors.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 3 Equipamentos</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.equipment || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label
                        >
                          {stats?.equipment.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'new' && (
            <motion.div 
              key="new"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-slate-300">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Nova Ordem de Serviço</h2>
                <form onSubmit={handleCreateOrder} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Solicitante</label>
                      <input 
                        required 
                        value={newOrderData.requester}
                        onChange={(e) => setNewOrderData({...newOrderData, requester: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                      />
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tag do Equipamento</label>
                      <input 
                        required 
                        autoComplete="off"
                        value={newOrderData.equipment_tag}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewOrderData({...newOrderData, equipment_tag: val});
                          setShowSuggestions(val.length > 0);
                        }}
                        onFocus={(e) => {
                          e.stopPropagation();
                          setShowSuggestions(newOrderData.equipment_tag.length > 0);
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                      />
                      {showSuggestions && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {equipmentList
                            .filter(eq => 
                              eq.tag.toLowerCase().includes(newOrderData.equipment_tag.toLowerCase()) ||
                              eq.name.toLowerCase().includes(newOrderData.equipment_tag.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((eq, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setNewOrderData({
                                    ...newOrderData,
                                    equipment_tag: eq.tag,
                                    equipment_name: eq.name,
                                    sector: eq.sector
                                  });
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                              >
                                <div className="font-bold text-sm text-slate-900">{eq.tag} - {eq.name}</div>
                                <div className="text-xs text-slate-500">{eq.sector}</div>
                              </button>
                            ))
                          }
                          {equipmentList.filter(eq => 
                            eq.tag.toLowerCase().includes(newOrderData.equipment_tag.toLowerCase()) ||
                            eq.name.toLowerCase().includes(newOrderData.equipment_tag.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-2 text-sm text-slate-500 italic">Nenhum equipamento encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Equipamento</label>
                      <input 
                        required 
                        value={newOrderData.equipment_name}
                        onChange={(e) => setNewOrderData({...newOrderData, equipment_name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Setor</label>
                      <input 
                        required 
                        value={newOrderData.sector}
                        onChange={(e) => setNewOrderData({...newOrderData, sector: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Manutenção</label>
                    <select 
                      required 
                      value={newOrderData.maintenance_type}
                      onChange={(e) => setNewOrderData({...newOrderData, maintenance_type: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="Corretiva">Corretiva</option>
                      <option value="Preventiva">Preventiva</option>
                      <option value="Preditiva">Preditiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
                    <textarea 
                      required 
                      value={newOrderData.problem_description}
                      onChange={(e) => setNewOrderData({...newOrderData, problem_description: e.target.value})}
                      rows={4} 
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20">
                    Emitir Ordem de Serviço
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Ordens de Serviço</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setViewMode('card')}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'card' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
                  >
                    <Grid size={20} />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
                  >
                    <ListIcon size={20} />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  <button 
                    onClick={() => exportToExcel(filteredOrders)}
                    className="flex items-center gap-2 px-3 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all font-medium text-sm border border-emerald-200"
                    title="Exportar para Excel"
                  >
                    <FileSpreadsheet size={18} />
                    <span className="hidden md:inline">Excel</span>
                  </button>
                  <button 
                    onClick={() => exportToPDF(filteredOrders)}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all font-medium text-sm border border-red-200"
                    title="Exportar para PDF"
                  >
                    <FileText size={18} />
                    <span className="hidden md:inline">PDF</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por tag, equipamento ou setor..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Todas</option>
                    <option value="open">Abertas</option>
                    <option value="finished">Finalizadas</option>
                  </select>
                </div>
              </div>

              {/* Orders View */}
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden flex flex-col">
                      <div className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider text-white", order.status === 'open' ? "bg-blue-500" : "bg-emerald-500")}>
                        {order.status === 'open' ? 'Aberta' : 'Finalizada'}
                      </div>
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-900">{order.equipment_name}</h4>
                            <p className="text-sm text-slate-500">{order.equipment_tag}</p>
                          </div>
                          <button onClick={() => fetchHistory(order.equipment_tag)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all">
                            <History size={18} />
                          </button>
                          <button onClick={() => handlePrint(order)} className="text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-all">
                            <Printer size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 text-sm mb-6">
                          <p><span className="text-slate-400 font-medium">Setor:</span> {order.sector}</p>
                          <p><span className="text-slate-400 font-medium">Tipo:</span> {order.maintenance_type}</p>
                          <p><span className="text-slate-400 font-medium">Data:</span> {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-slate-700 italic">
                            "{order.problem_description}"
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => setEditingOrder(order)}
                            className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                          {order.status === 'open' && (
                            <button 
                              onClick={() => setFinishingOrder(order)}
                              className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={18} /> Finalizar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tag</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Equipamento</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Setor</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-medium text-slate-900">{order.equipment_tag}</td>
                          <td className="px-6 py-4 text-slate-700">{order.equipment_name}</td>
                          <td className="px-6 py-4 text-slate-700">{order.sector}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", order.status === 'open' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600")}>
                              {order.status === 'open' ? 'Aberta' : 'Finalizada'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setEditingOrder(order)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg"><Edit size={18} /></button>
                              <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                              {order.status === 'open' && (
                                <button onClick={() => setFinishingOrder(order)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={18} /></button>
                              )}
                              <button onClick={() => handlePrint(order)} className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg"><Printer size={18} /></button>
                              <button onClick={() => fetchHistory(order.equipment_tag)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><History size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div 
              key="database"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Estrutura do Banco de Dados</h2>
                  <p className="text-slate-500">Visualização técnica das tabelas e dados brutos</p>
                </div>
                <button 
                  onClick={handleBackupDatabase}
                  className="flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                >
                  <Download size={20} />
                  <span>Fazer Backup (.db)</span>
                </button>
              </header>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Tabela: orders</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-2 border">ID</th>
                          <th className="p-2 border">Solicitante</th>
                          <th className="p-2 border">Tag</th>
                          <th className="p-2 border">Equipamento</th>
                          <th className="p-2 border">Setor</th>
                          <th className="p-2 border">Status</th>
                          <th className="p-2 border">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="p-2 border">{o.id}</td>
                            <td className="p-2 border">{o.requester}</td>
                            <td className="p-2 border">{o.equipment_tag}</td>
                            <td className="p-2 border">{o.equipment_name}</td>
                            <td className="p-2 border">{o.sector}</td>
                            <td className="p-2 border">{o.status}</td>
                            <td className="p-2 border">{o.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Tabela: technicians</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-2 border">ID</th>
                          <th className="p-2 border">Nome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicians.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-2 border">{t.id}</td>
                            <td className="p-2 border">{t.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* Edit Modal */}
        {editingOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white mx-4 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-slate-800">Editar Ordem #{editingOrder.id}</h3>
                <button onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleUpdateOrder} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Solicitante</label>
                    <input required name="requester" defaultValue={editingOrder.requester} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tag</label>
                    <input required name="equipment_tag" defaultValue={editingOrder.equipment_tag} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipamento</label>
                    <input required name="equipment_name" defaultValue={editingOrder.equipment_name} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setor</label>
                    <input required name="sector" defaultValue={editingOrder.sector} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Manutenção</label>
                  <select required name="maintenance_type" defaultValue={editingOrder.maintenance_type} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Corretiva">Corretiva</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Preditiva">Preditiva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                  <textarea required name="problem_description" defaultValue={editingOrder.problem_description} rows={3} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all">
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Finish Modal */}
        {finishingOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white mx-4 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-slate-800">Finalizar Ordem #{finishingOrder.id}</h3>
                <button onClick={() => setFinishingOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleFinishOrder} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Manutentor Responsável</label>
                  <select required name="technician_name" className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione um manutentor</option>
                    {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Serviço Realizado</label>
                  <textarea required name="service_performed" rows={4} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Descreva o que foi feito..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assinatura do Manutentor (Digital)</label>
                  <div className="border border-slate-200 rounded-lg bg-slate-50 p-1 overflow-hidden">
                    <canvas 
                      ref={signatureRef}
                      className="w-full h-[120px] cursor-crosshair touch-none bg-white rounded"
                      onMouseDown={(e) => {
                        const canvas = signatureRef.current;
                        if (!canvas) return;
                        
                        // Set actual canvas resolution if not set yet
                        if (canvas.width !== canvas.offsetWidth) {
                          canvas.width = canvas.offsetWidth;
                          canvas.height = canvas.offsetHeight;
                        }
                        
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.beginPath();
                        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                        (canvas as any).isDrawing = true;
                      }}
                      onMouseMove={(e) => {
                        const canvas = signatureRef.current;
                        if (!canvas || !(canvas as any).isDrawing) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                        ctx.stroke();
                      }}
                      onMouseUp={() => {
                        if (signatureRef.current) (signatureRef.current as any).isDrawing = false;
                      }}
                      onMouseLeave={() => {
                        if (signatureRef.current) (signatureRef.current as any).isDrawing = false;
                      }}
                      onTouchStart={(e) => {
                        const canvas = signatureRef.current;
                        if (!canvas) return;
                        
                        // Set actual canvas resolution if not set yet
                        if (canvas.width !== canvas.offsetWidth) {
                          canvas.width = canvas.offsetWidth;
                          canvas.height = canvas.offsetHeight;
                        }
                        
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        ctx.beginPath();
                        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                        (canvas as any).isDrawing = true;
                      }}
                      onTouchMove={(e) => {
                        const canvas = signatureRef.current;
                        if (!canvas || !(canvas as any).isDrawing) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                        ctx.stroke();
                        e.preventDefault();
                      }}
                      onTouchEnd={() => {
                        if (signatureRef.current) (signatureRef.current as any).isDrawing = false;
                      }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const canvas = signatureRef.current;
                      if (canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                      }
                    }}
                    className="text-[10px] text-slate-400 hover:text-red-500 mt-1 uppercase font-bold"
                  >
                    Limpar Assinatura
                  </button>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all">
                  Confirmar Finalização
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* History Modal */}
        {historyTag && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white mx-4 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 sticky top-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Histórico de Manutenção</h3>
                  <p className="text-sm text-slate-500">Equipamento: {historyTag}</p>
                </div>
                <button onClick={() => setHistoryTag(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {historyOrders.map((order, idx) => (
                  <div key={order.id} className="relative pl-8 border-l-2 border-slate-100 pb-2">
                    <div className={cn("absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white", order.status === 'open' ? "bg-blue-500" : "bg-emerald-500")} />
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", order.status === 'open' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600")}>
                          {order.status === 'open' ? 'Aberta' : 'Finalizada'}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">{order.maintenance_type}</p>
                      <p className="text-sm text-slate-600 mt-1">{order.problem_description}</p>
                      {order.status === 'finished' && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Serviço Realizado por {order.technician_name}:</p>
                          <p className="text-sm text-slate-700 italic">{order.service_performed}</p>
                          <p className="text-[10px] text-slate-400 mt-2">Finalizado em: {format(new Date(order.finished_at!), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white mx-4 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <HelpCircle size={24} />
                  <h3 className="text-xl font-bold">Instruções do Sistema</h3>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="text-white/80 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8">
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                    <PlusCircle size={18} className="text-blue-600" />
                    Como cadastrar uma Ordem de Serviço
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Clique em <strong>"Nova Ordem"</strong> no menu lateral. Preencha o nome do solicitante e comece a digitar a <strong>Tag do Equipamento</strong>. O sistema sugerirá equipamentos cadastrados no arquivo Consulta.csv. Ao selecionar um, o nome e o setor serão preenchidos automaticamente. Descreva o problema e clique em "Emitir Ordem de Serviço".
                  </p>
                </section>

                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                    <Printer size={18} className="text-blue-600" />
                    Como imprimir uma Ordem de Serviço
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Na aba <strong>"Listar Ordens"</strong>, localize a ordem desejada e clique no ícone da impressora <Printer size={14} className="inline mx-1" /> no canto superior direito do card ou na linha da tabela. Uma nova janela se abrirá com o documento formatado em A4 pronto para impressão ou salvamento em PDF.
                  </p>
                </section>

                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                    <Grid size={18} className="text-blue-600" />
                    Como mudar a visualização (Lista vs Card)
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Na aba <strong>"Listar Ordens"</strong>, no topo da página ao lado do título, você encontrará dois ícones: <Grid size={14} className="inline mx-1" /> para visualização em <strong>Cards</strong> (ideal para tablets) e <ListIcon size={14} className="inline mx-1" /> para visualização em <strong>Lista</strong> (ideal para computadores e busca rápida).
                  </p>
                </section>

                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                    <History size={18} className="text-blue-600" />
                    Como acessar o histórico do equipamento
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Em qualquer ordem de serviço listada, clique no ícone de relógio <History size={14} className="inline mx-1" />. Isso abrirá uma linha do tempo mostrando todas as manutenções anteriores realizadas especificamente naquele equipamento (baseado na Tag).
                  </p>
                </section>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-900 transition-all"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
