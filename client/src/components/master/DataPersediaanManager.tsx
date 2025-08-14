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
import { Plus, Edit, Trash2, Search, Package, AlertTriangle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Inventory, InventoryGroup, CreateInventoryInput } from '../../../../server/src/schema';

const DataPersediaanManager: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [showLowStock, setShowLowStock] = useState(false);

  const [formData, setFormData] = useState<CreateInventoryInput>({
    kode: '',
    nama: '',
    kelompok_id: 0,
    satuan: '',
    harga_beli: 0,
    harga_jual: 0,
    stok: 0,
    min_stok: 0,
    is_active: true
  });

  const loadInventory = useCallback(async () => {
    try {
      const result = await trpc.inventory.items.getAll.query();
      setInventory(result);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const result = await trpc.inventory.groups.getAll.query();
      setGroups(result);
    } catch (error) {
      console.error('Failed to load inventory groups:', error);
    }
  }, []);

  useEffect(() => {
    loadInventory();
    loadGroups();
  }, [loadInventory, loadGroups]);

  const resetForm = () => {
    setFormData({
      kode: '',
      nama: '',
      kelompok_id: 0,
      satuan: '',
      harga_beli: 0,
      harga_jual: 0,
      stok: 0,
      min_stok: 0,
      is_active: true
    });
    setSelectedItem(null);
    setIsEditing(false);
  };

  const handleEdit = (item: Inventory) => {
    setFormData({
      kode: item.kode,
      nama: item.nama,
      kelompok_id: item.kelompok_id,
      satuan: item.satuan,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      stok: item.stok,
      min_stok: item.min_stok,
      is_active: item.is_active
    });
    setSelectedItem(item);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditing && selectedItem) {
        await trpc.inventory.items.update.mutate({ 
          id: selectedItem.id, 
          data: formData 
        });
        setInventory((prev: Inventory[]) => 
          prev.map(item => 
            item.id === selectedItem.id 
              ? { ...item, ...formData, updated_at: new Date() }
              : item
          )
        );
      } else {
        const newItem = await trpc.inventory.items.create.mutate(formData);
        setInventory((prev: Inventory[]) => [...prev, newItem]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save inventory item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: Inventory) => {
    try {
      await trpc.inventory.items.delete.mutate({ id: item.id });
      setInventory((prev: Inventory[]) => prev.filter(i => i.id !== item.id));
      if (selectedItem?.id === item.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
    }
  };

  const getGroupName = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.nama : 'Unknown Group';
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.kode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !filterGroup || item.kelompok_id.toString() === filterGroup;
    const matchesLowStock = !showLowStock || item.stok <= item.min_stok;
    
    return matchesSearch && matchesGroup && matchesLowStock;
  });

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Inventory List */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Data Persediaan</span>
              </CardTitle>
              <CardDescription>
                Kelola item persediaan dan stok barang
              </CardDescription>
            </div>
            <Button onClick={resetForm} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan kode atau nama item..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select
                value={filterGroup}
                onValueChange={setFilterGroup}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Semua kelompok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua kelompok</SelectItem>
                  {groups.map((group: InventoryGroup) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant={showLowStock ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLowStock(!showLowStock)}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Stok Rendah
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-2">
            {filteredInventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm || filterGroup || showLowStock 
                  ? 'Tidak ada item yang sesuai filter' 
                  : 'Belum ada data persediaan'
                }
              </p>
            ) : (
              filteredInventory.map((item: Inventory) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedItem?.id === item.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.kode}</span>
                        {item.stok <= item.min_stok && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Stok Rendah
                          </Badge>
                        )}
                        {!item.is_active && (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.nama}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kelompok: {getGroupName(item.kelompok_id)}
                      </p>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Stok: {item.stok} {item.satuan}</span>
                        <span>Harga Jual: Rp {item.harga_jual.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEdit(item);
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
                            <AlertDialogTitle>Hapus Item Persediaan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus item "{item.nama}"? 
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item)}
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

      {/* Right Panel - Inventory Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Item Persediaan' : 'Tambah Item Persediaan Baru'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Ubah informasi item persediaan yang dipilih' 
              : 'Masukkan informasi untuk item persediaan baru'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kode">Kode Item *</Label>
                <Input
                  id="kode"
                  value={formData.kode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateInventoryInput) => ({ ...prev, kode: e.target.value }))
                  }
                  placeholder="Contoh: ITM001"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kelompok_id">Kelompok *</Label>
                <Select
                  value={formData.kelompok_id ? formData.kelompok_id.toString() : ''}
                  onValueChange={(value) =>
                    setFormData((prev: CreateInventoryInput) => ({ 
                      ...prev, 
                      kelompok_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelompok" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group: InventoryGroup) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Item *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInventoryInput) => ({ ...prev, nama: e.target.value }))
                }
                placeholder="Contoh: Kertas A4"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="satuan">Satuan *</Label>
              <Input
                id="satuan"
                value={formData.satuan}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInventoryInput) => ({ ...prev, satuan: e.target.value }))
                }
                placeholder="Contoh: Rim, Buah, Kg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="harga_beli">Harga Beli *</Label>
                <Input
                  id="harga_beli"
                  type="number"
                  value={formData.harga_beli}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateInventoryInput) => ({ 
                      ...prev, 
                      harga_beli: parseFloat(e.target.value) || 0 
                    }))
                  }
                  placeholder="0"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="harga_jual">Harga Jual *</Label>
                <Input
                  id="harga_jual"
                  type="number"
                  value={formData.harga_jual}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateInventoryInput) => ({ 
                      ...prev, 
                      harga_jual: parseFloat(e.target.value) || 0 
                    }))
                  }
                  placeholder="0"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stok">Stok Awal</Label>
                <Input
                  id="stok"
                  type="number"
                  value={formData.stok}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateInventoryInput) => ({ 
                      ...prev, 
                      stok: parseInt(e.target.value) || 0 
                    }))
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min_stok">Minimum Stok</Label>
                <Input
                  id="min_stok"
                  type="number"
                  value={formData.min_stok}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateInventoryInput) => ({ 
                      ...prev, 
                      min_stok: parseInt(e.target.value) || 0 
                    }))
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev: CreateInventoryInput) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">Item Aktif</Label>
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

          {/* Display selected item details */}
          {selectedItem && !isEditing && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="font-semibold">Detail Item</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Kode</p>
                    <p className="font-medium">{selectedItem.kode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nama</p>
                    <p className="font-medium">{selectedItem.nama}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kelompok</p>
                    <p className="font-medium">{getGroupName(selectedItem.kelompok_id)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Satuan</p>
                    <p className="font-medium">{selectedItem.satuan}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Harga Beli</p>
                    <p className="font-medium">Rp {selectedItem.harga_beli.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Harga Jual</p>
                    <p className="font-medium">Rp {selectedItem.harga_jual.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stok Saat Ini</p>
                    <p className={`font-medium ${selectedItem.stok <= selectedItem.min_stok ? 'text-destructive' : ''}`}>
                      {selectedItem.stok} {selectedItem.satuan}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Minimum Stok</p>
                    <p className="font-medium">{selectedItem.min_stok} {selectedItem.satuan}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{selectedItem.is_active ? 'Aktif' : 'Nonaktif'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dibuat</p>
                    <p className="font-medium">{selectedItem.created_at.toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataPersediaanManager;