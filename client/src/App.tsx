import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Building, 
  Users, 
  Package, 
  FileText, 
  TrendingUp, 
  Search, 
  Settings,
  User,
  Database,
  Layers,
  ShoppingCart,
  UserCheck,
  FileBarChart,
  ArrowUpDown,
  BarChart3,
  Receipt,
  BookOpen,
  CreditCard,
  Banknote,
  PieChart,
  Calculator,
  DollarSign,
  TrendingDown
} from 'lucide-react';

// Import Master Data components
import DataAkunManager from '@/components/master/DataAkunManager';
import KelompokPersediaanManager from '@/components/master/KelompokPersediaanManager';
import DataPersediaanManager from '@/components/master/DataPersediaanManager';
import DataRelasiManager from '@/components/master/DataRelasiManager';
import DataUserManager from '@/components/master/DataUserManager';
import DataPerusahaanManager from '@/components/master/DataPerusahaanManager';

// Define menu structure
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'master-data',
    label: 'Master Data',
    icon: <Database className="h-4 w-4" />,
    children: [
      { id: 'data-akun', label: 'Data Akun', icon: <FileBarChart className="h-4 w-4" /> },
      { id: 'kelompok-persediaan', label: 'Kelompok Persediaan', icon: <Layers className="h-4 w-4" /> },
      { id: 'data-persediaan', label: 'Data Persediaan', icon: <Package className="h-4 w-4" /> },
      { id: 'hubungan-relasi', label: 'Hubungan Relasi', icon: <UserCheck className="h-4 w-4" /> },
      { id: 'data-relasi', label: 'Data Relasi', icon: <Users className="h-4 w-4" /> },
      { id: 'data-user', label: 'Data User', icon: <User className="h-4 w-4" /> },
      { id: 'data-perusahaan', label: 'Data Perusahaan', icon: <Building className="h-4 w-4" /> },
    ]
  },
  {
    id: 'transaksi',
    label: 'Transaksi',
    icon: <ArrowUpDown className="h-4 w-4" />,
    children: [
      { id: 'penerimaan-dana', label: 'Penerimaan Dana', icon: <TrendingUp className="h-4 w-4" /> },
      { id: 'pengeluaran-dana', label: 'Pengeluaran Dana', icon: <TrendingDown className="h-4 w-4" /> },
      { id: 'pemindah-bukuan', label: 'Pemindah Bukuan', icon: <ArrowUpDown className="h-4 w-4" /> },
      { id: 'jurnal-umum', label: 'Jurnal Umum', icon: <BookOpen className="h-4 w-4" /> },
      { id: 'jurnal-koreksi', label: 'Jurnal Koreksi', icon: <FileText className="h-4 w-4" /> },
    ]
  },
  {
    id: 'view-transaksi',
    label: 'View Transaksi',
    icon: <Search className="h-4 w-4" />,
    children: [
      { id: 'view-by-transaksi', label: 'Berdasarkan Transaksi', icon: <Receipt className="h-4 w-4" /> },
      { id: 'view-by-akun', label: 'Berdasarkan Akun', icon: <FileBarChart className="h-4 w-4" /> },
    ]
  },
  {
    id: 'pelaporan',
    label: 'Pelaporan',
    icon: <BarChart3 className="h-4 w-4" />,
    children: [
      { id: 'laporan-posisi-keuangan', label: 'Laporan Posisi Keuangan', icon: <PieChart className="h-4 w-4" /> },
      { id: 'laporan-laba-rugi', label: 'Laporan Laba Rugi', icon: <DollarSign className="h-4 w-4" /> },
      { id: 'laporan-perubahan-ekuitas', label: 'Laporan Perubahan Ekuitas', icon: <Calculator className="h-4 w-4" /> },
      { id: 'laporan-arus-kas', label: 'Laporan Arus Kas', icon: <Banknote className="h-4 w-4" /> },
      { id: 'daftar-jurnal', label: 'Daftar Jurnal', icon: <BookOpen className="h-4 w-4" /> },
      { id: 'buku-besar', label: 'Buku Besar', icon: <FileText className="h-4 w-4" /> },
      { id: 'daftar-piutang', label: 'Daftar Piutang', icon: <CreditCard className="h-4 w-4" /> },
      { id: 'daftar-hutang', label: 'Daftar Hutang', icon: <ShoppingCart className="h-4 w-4" /> },
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: <Settings className="h-4 w-4" />,
  }
];

function App() {
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['master-data']));
  const [activeUser] = useState('Admin User'); // This would come from authentication

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isExpanded = expandedMenus.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeMenu === item.id;

    return (
      <div key={item.id} className="w-full">
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={`w-full justify-start text-left h-auto py-2 px-3 ${
            level > 0 ? 'ml-4 text-sm' : ''
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleMenu(item.id);
            } else {
              setActiveMenu(item.id);
            }
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {hasChildren && (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </Button>
        
        {hasChildren && isExpanded && (
          <div className="ml-2 space-y-1 mt-1">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'data-akun':
        return <DataAkunManager />;
      case 'kelompok-persediaan':
        return <KelompokPersediaanManager />;
      case 'data-persediaan':
        return <DataPersediaanManager />;
      case 'data-relasi':
        return <DataRelasiManager />;
      case 'data-user':
        return <DataUserManager />;
      case 'data-perusahaan':
        return <DataPerusahaanManager />;
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Selamat datang di Sistem Akuntansi - ringkasan aktivitas terkini
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Akun</CardTitle>
                  <FileBarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Akun aktif dalam sistem
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Persediaan</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Item persediaan terdaftar
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transaksi Bulan Ini</CardTitle>
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Total transaksi periode berjalan
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Kas</CardTitle>
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rp 0</div>
                  <p className="text-xs text-muted-foreground">
                    Posisi kas saat ini
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Transaksi Terkini</CardTitle>
                <CardDescription>
                  Transaksi yang belum diposting ke dalam jurnal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Belum ada transaksi yang perlu diproses
                </p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {menuItems.find(item => 
                  item.id === activeMenu || 
                  item.children?.some(child => child.id === activeMenu)
                )?.label || activeMenu.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h1>
              <p className="text-muted-foreground">
                Halaman ini sedang dalam pengembangan
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Fitur untuk menu "{activeMenu}" akan segera tersedia
                </p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <Calculator className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">Sistem Akuntansi</h2>
          </div>
        </div>
        
        <Separator />
        
        <div className="p-4">
          <Button
            variant={activeMenu === 'dashboard' ? "secondary" : "ghost"}
            className="w-full justify-start mb-4"
            onClick={() => setActiveMenu('dashboard')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <div className="space-y-1">
            {menuItems.map(item => renderMenuItem(item))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-card border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">
                {activeMenu === 'dashboard' ? 'Dashboard' : 
                 menuItems.find(item => 
                   item.id === activeMenu || 
                   item.children?.some(child => child.id === activeMenu)
                 )?.children?.find(child => child.id === activeMenu)?.label ||
                 menuItems.find(item => item.id === activeMenu)?.label ||
                 activeMenu.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                }
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{activeUser}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;