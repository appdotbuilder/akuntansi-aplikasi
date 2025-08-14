import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, FileBarChart } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Account, CreateAccountInput } from '../../../../server/src/schema';

const DataAkunManager: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateAccountInput>({
    kode: '',
    nama: '',
    tipe: 'ASET',
    parent_id: null,
    saldo_awal: 0,
    is_active: true
  });

  const loadAccounts = useCallback(async () => {
    try {
      const result = await trpc.accounts.getAll.query();
      setAccounts(result);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const resetForm = () => {
    setFormData({
      kode: '',
      nama: '',
      tipe: 'ASET',
      parent_id: null,
      saldo_awal: 0,
      is_active: true
    });
    setSelectedAccount(null);
    setIsEditing(false);
  };

  const handleEdit = (account: Account) => {
    setFormData({
      kode: account.kode,
      nama: account.nama,
      tipe: account.tipe,
      parent_id: account.parent_id,
      saldo_awal: account.saldo_awal,
      is_active: account.is_active
    });
    setSelectedAccount(account);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditing && selectedAccount) {
        await trpc.accounts.update.mutate({ 
          id: selectedAccount.id, 
          data: formData 
        });
        setAccounts((prev: Account[]) => 
          prev.map(account => 
            account.id === selectedAccount.id 
              ? { ...account, ...formData, updated_at: new Date() }
              : account
          )
        );
      } else {
        const newAccount = await trpc.accounts.create.mutate(formData);
        setAccounts((prev: Account[]) => [...prev, newAccount]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (account: Account) => {
    try {
      await trpc.accounts.delete.mutate({ id: account.id });
      setAccounts((prev: Account[]) => prev.filter(a => a.id !== account.id));
      if (selectedAccount?.id === account.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.kode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parentAccounts = accounts.filter(account => account.parent_id === null);

  const getAccountTypeBadge = (type: string) => {
    const colors = {
      'ASET': 'bg-blue-100 text-blue-800',
      'KEWAJIBAN': 'bg-red-100 text-red-800',
      'EKUITAS': 'bg-green-100 text-green-800',
      'PENDAPATAN': 'bg-yellow-100 text-yellow-800',
      'BEBAN': 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Account List */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileBarChart className="h-5 w-5" />
                <span>Daftar Akun</span>
              </CardTitle>
              <CardDescription>
                Kelola chart of accounts untuk sistem akuntansi
              </CardDescription>
            </div>
            <Button onClick={resetForm} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan kode atau nama akun..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-2">
            {filteredAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'Tidak ada akun yang sesuai pencarian' : 'Belum ada data akun'}
              </p>
            ) : (
              filteredAccounts.map((account: Account) => (
                <div
                  key={account.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedAccount?.id === account.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedAccount(account)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{account.kode}</span>
                        <Badge 
                          variant="secondary" 
                          className={getAccountTypeBadge(account.tipe)}
                        >
                          {account.tipe}
                        </Badge>
                        {!account.is_active && (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {account.nama}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo Awal: Rp {account.saldo_awal.toLocaleString('id-ID')}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEdit(account);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Akun</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus akun "{account.nama}"? 
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(account)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Account Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Akun' : 'Tambah Akun Baru'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Ubah informasi akun yang dipilih' 
              : 'Masukkan informasi untuk akun baru'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kode">Kode Akun *</Label>
                <Input
                  id="kode"
                  value={formData.kode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateAccountInput) => ({ ...prev, kode: e.target.value }))
                  }
                  placeholder="Contoh: 1-1001"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tipe">Tipe Akun *</Label>
                <Select
                  value={formData.tipe}
                  onValueChange={(value) =>
                    setFormData((prev: CreateAccountInput) => ({ ...prev, tipe: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe akun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASET">ASET</SelectItem>
                    <SelectItem value="KEWAJIBAN">KEWAJIBAN</SelectItem>
                    <SelectItem value="EKUITAS">EKUITAS</SelectItem>
                    <SelectItem value="PENDAPATAN">PENDAPATAN</SelectItem>
                    <SelectItem value="BEBAN">BEBAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Akun *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateAccountInput) => ({ ...prev, nama: e.target.value }))
                }
                placeholder="Contoh: Kas di Bank"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Akun Induk</Label>
              <Select
                value={formData.parent_id?.toString() || ''}
                onValueChange={(value) =>
                  setFormData((prev: CreateAccountInput) => ({ 
                    ...prev, 
                    parent_id: value ? parseInt(value) : null 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun induk (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada induk</SelectItem>
                  {parentAccounts.map((account: Account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.kode} - {account.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saldo_awal">Saldo Awal</Label>
              <Input
                id="saldo_awal"
                type="number"
                value={formData.saldo_awal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateAccountInput) => ({ 
                    ...prev, 
                    saldo_awal: parseFloat(e.target.value) || 0 
                  }))
                }
                placeholder="0"
                step="0.01"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev: CreateAccountInput) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">Akun Aktif</Label>
            </div>

            <Separator />

            <div className="flex space-x-2">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Menyimpan...' : (isEditing ? 'Update' : 'Simpan')}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataAkunManager;