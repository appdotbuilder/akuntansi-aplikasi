import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Layers } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { InventoryGroup, CreateInventoryGroupInput } from '../../../../server/src/schema';

const KelompokPersediaanManager: React.FC = () => {
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<InventoryGroup | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateInventoryGroupInput>({
    kode: '',
    nama: '',
    deskripsi: null
  });

  const loadGroups = useCallback(async () => {
    try {
      const result = await trpc.inventory.groups.getAll.query();
      setGroups(result);
    } catch (error) {
      console.error('Failed to load inventory groups:', error);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const resetForm = () => {
    setFormData({
      kode: '',
      nama: '',
      deskripsi: null
    });
    setSelectedGroup(null);
    setIsEditing(false);
  };

  const handleEdit = (group: InventoryGroup) => {
    setFormData({
      kode: group.kode,
      nama: group.nama,
      deskripsi: group.deskripsi
    });
    setSelectedGroup(group);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditing && selectedGroup) {
        await trpc.inventory.groups.update.mutate({ 
          id: selectedGroup.id, 
          data: formData 
        });
        setGroups((prev: InventoryGroup[]) => 
          prev.map(group => 
            group.id === selectedGroup.id 
              ? { ...group, ...formData, updated_at: new Date() }
              : group
          )
        );
      } else {
        const newGroup = await trpc.inventory.groups.create.mutate(formData);
        setGroups((prev: InventoryGroup[]) => [...prev, newGroup]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save inventory group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (group: InventoryGroup) => {
    try {
      await trpc.inventory.groups.delete.mutate({ id: group.id });
      setGroups((prev: InventoryGroup[]) => prev.filter(g => g.id !== group.id));
      if (selectedGroup?.id === group.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete inventory group:', error);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.kode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Groups List */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="h-5 w-5" />
                <span>Kelompok Persediaan</span>
              </CardTitle>
              <CardDescription>
                Kelola kategori untuk mengelompokkan item persediaan
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
              placeholder="Cari berdasarkan kode atau nama kelompok..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-2">
            {filteredGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'Tidak ada kelompok yang sesuai pencarian' : 'Belum ada data kelompok persediaan'}
              </p>
            ) : (
              filteredGroups.map((group: InventoryGroup) => (
                <div
                  key={group.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedGroup?.id === group.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{group.kode}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.nama}
                      </p>
                      {group.deskripsi && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {group.deskripsi}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Dibuat: {group.created_at.toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEdit(group);
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
                            <AlertDialogTitle>Hapus Kelompok Persediaan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus kelompok "{group.nama}"? 
                              Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi semua item persediaan dalam kelompok ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(group)}
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

      {/* Right Panel - Group Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Kelompok Persediaan' : 'Tambah Kelompok Persediaan Baru'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Ubah informasi kelompok persediaan yang dipilih' 
              : 'Masukkan informasi untuk kelompok persediaan baru'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kode">Kode Kelompok *</Label>
              <Input
                id="kode"
                value={formData.kode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInventoryGroupInput) => ({ ...prev, kode: e.target.value }))
                }
                placeholder="Contoh: BRG001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Kelompok *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInventoryGroupInput) => ({ ...prev, nama: e.target.value }))
                }
                placeholder="Contoh: Bahan Baku"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateInventoryGroupInput) => ({ 
                    ...prev, 
                    deskripsi: e.target.value || null 
                  }))
                }
                placeholder="Deskripsi kelompok persediaan (opsional)"
                rows={3}
              />
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

          {/* Display selected group details */}
          {selectedGroup && !isEditing && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="font-semibold">Detail Kelompok</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Kode</p>
                    <p className="font-medium">{selectedGroup.kode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nama</p>
                    <p className="font-medium">{selectedGroup.nama}</p>
                  </div>
                  {selectedGroup.deskripsi && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Deskripsi</p>
                      <p className="font-medium">{selectedGroup.deskripsi}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Dibuat</p>
                    <p className="font-medium">{selectedGroup.created_at.toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Diupdate</p>
                    <p className="font-medium">{selectedGroup.updated_at.toLocaleDateString('id-ID')}</p>
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

export default KelompokPersediaanManager;