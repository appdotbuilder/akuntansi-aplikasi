import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Users, Phone, Mail, MapPin } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Relation, CreateRelationInput } from '../../../../server/src/schema';

const DataRelasiManager: React.FC = () => {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const [formData, setFormData] = useState<CreateRelationInput>({
    kode: '',
    nama: '',
    tipe: 'PELANGGAN',
    alamat: null,
    telepon: null,
    email: null,
    npwp: null,
    kontak_person: null,
    is_active: true
  });

  const loadRelations = useCallback(async () => {
    try {
      const result = await trpc.relations.getAll.query();
      setRelations(result);
    } catch (error) {
      console.error('Failed to load relations:', error);
    }
  }, []);

  useEffect(() => {
    loadRelations();
  }, [loadRelations]);

  const resetForm = () => {
    setFormData({
      kode: '',
      nama: '',
      tipe: 'PELANGGAN',
      alamat: null,
      telepon: null,
      email: null,
      npwp: null,
      kontak_person: null,
      is_active: true
    });
    setSelectedRelation(null);
    setIsEditing(false);
  };

  const handleEdit = (relation: Relation) => {
    setFormData({
      kode: relation.kode,
      nama: relation.nama,
      tipe: relation.tipe,
      alamat: relation.alamat,
      telepon: relation.telepon,
      email: relation.email,
      npwp: relation.npwp,
      kontak_person: relation.kontak_person,
      is_active: relation.is_active
    });
    setSelectedRelation(relation);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditing && selectedRelation) {
        await trpc.relations.update.mutate({ 
          id: selectedRelation.id, 
          data: formData 
        });
        setRelations((prev: Relation[]) => 
          prev.map(relation => 
            relation.id === selectedRelation.id 
              ? { ...relation, ...formData, updated_at: new Date() }
              : relation
          )
        );
      } else {
        const newRelation = await trpc.relations.create.mutate(formData);
        setRelations((prev: Relation[]) => [...prev, newRelation]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save relation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (relation: Relation) => {
    try {
      await trpc.relations.delete.mutate({ id: relation.id });
      setRelations((prev: Relation[]) => prev.filter(r => r.id !== relation.id));
      if (selectedRelation?.id === relation.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete relation:', error);
    }
  };

  const getRelationTypeBadge = (type: string) => {
    const colors = {
      'PELANGGAN': 'bg-blue-100 text-blue-800',
      'PEMASOK': 'bg-green-100 text-green-800',
      'KARYAWAN': 'bg-purple-100 text-purple-800',
      'LAINNYA': 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredRelations = relations.filter(relation => {
    const matchesSearch = relation.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         relation.kode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || relation.tipe === filterType;
    const matchesActive = !showActiveOnly || relation.is_active;
    
    return matchesSearch && matchesType && matchesActive;
  });

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Relations List */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Data Relasi</span>
              </CardTitle>
              <CardDescription>
                Kelola data pelanggan, pemasok, karyawan dan relasi lainnya
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
                placeholder="Cari berdasarkan kode atau nama..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select
                value={filterType}
                onValueChange={setFilterType}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Semua tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua tipe</SelectItem>
                  <SelectItem value="PELANGGAN">Pelanggan</SelectItem>
                  <SelectItem value="PEMASOK">Pemasok</SelectItem>
                  <SelectItem value="KARYAWAN">Karyawan</SelectItem>
                  <SelectItem value="LAINNYA">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showActiveOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className="whitespace-nowrap"
              >
                Aktif Saja
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-2">
            {filteredRelations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm || filterType || showActiveOnly 
                  ? 'Tidak ada relasi yang sesuai filter' 
                  : 'Belum ada data relasi'
                }
              </p>
            ) : (
              filteredRelations.map((relation: Relation) => (
                <div
                  key={relation.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedRelation?.id === relation.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedRelation(relation)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{relation.kode}</span>
                        <Badge 
                          variant="secondary" 
                          className={getRelationTypeBadge(relation.tipe)}
                        >
                          {relation.tipe}
                        </Badge>
                        {!relation.is_active && (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {relation.nama}
                      </p>
                      {relation.telepon && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {relation.telepon}
                        </p>
                      )}
                      {relation.email && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Mail className="h-3 w-3 mr-1" />
                          {relation.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEdit(relation);
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
                            <AlertDialogTitle>Hapus Data Relasi</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus relasi "{relation.nama}"? 
                              Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi transaksi terkait.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(relation)}
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

      {/* Right Panel - Relation Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Data Relasi' : 'Tambah Data Relasi Baru'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Ubah informasi relasi yang dipilih' 
              : 'Masukkan informasi untuk relasi baru'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kode">Kode Relasi *</Label>
                <Input
                  id="kode"
                  value={formData.kode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRelationInput) => ({ ...prev, kode: e.target.value }))
                  }
                  placeholder="Contoh: PLG001"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tipe">Tipe Relasi *</Label>
                <Select
                  value={formData.tipe}
                  onValueChange={(value) =>
                    setFormData((prev: CreateRelationInput) => ({ ...prev, tipe: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe relasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PELANGGAN">Pelanggan</SelectItem>
                    <SelectItem value="PEMASOK">Pemasok</SelectItem>
                    <SelectItem value="KARYAWAN">Karyawan</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateRelationInput) => ({ ...prev, nama: e.target.value }))
                }
                placeholder="Contoh: PT. ABC Indonesia"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Textarea
                id="alamat"
                value={formData.alamat || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateRelationInput) => ({ 
                    ...prev, 
                    alamat: e.target.value || null 
                  }))
                }
                placeholder="Alamat lengkap (opsional)"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  value={formData.telepon || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRelationInput) => ({ 
                      ...prev, 
                      telepon: e.target.value || null 
                    }))
                  }
                  placeholder="Contoh: 021-1234567"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRelationInput) => ({ 
                      ...prev, 
                      email: e.target.value || null 
                    }))
                  }
                  placeholder="Contoh: contact@abc.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input
                  id="npwp"
                  value={formData.npwp || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRelationInput) => ({ 
                      ...prev, 
                      npwp: e.target.value || null 
                    }))
                  }
                  placeholder="Contoh: 01.234.567.8-901.000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kontak_person">Kontak Person</Label>
                <Input
                  id="kontak_person"
                  value={formData.kontak_person || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRelationInput) => ({ 
                      ...prev, 
                      kontak_person: e.target.value || null 
                    }))
                  }
                  placeholder="Nama kontak person"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev: CreateRelationInput) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">Relasi Aktif</Label>
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

          {/* Display selected relation details */}
          {selectedRelation && !isEditing && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="font-semibold">Detail Relasi</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Kode</p>
                    <p className="font-medium">{selectedRelation.kode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipe</p>
                    <p className="font-medium">{selectedRelation.tipe}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Nama</p>
                    <p className="font-medium">{selectedRelation.nama}</p>
                  </div>
                  {selectedRelation.alamat && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Alamat
                      </p>
                      <p className="font-medium">{selectedRelation.alamat}</p>
                    </div>
                  )}
                  {selectedRelation.telepon && (
                    <div>
                      <p className="text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        Telepon
                      </p>
                      <p className="font-medium">{selectedRelation.telepon}</p>
                    </div>
                  )}
                  {selectedRelation.email && (
                    <div>
                      <p className="text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </p>
                      <p className="font-medium">{selectedRelation.email}</p>
                    </div>
                  )}
                  {selectedRelation.npwp && (
                    <div>
                      <p className="text-muted-foreground">NPWP</p>
                      <p className="font-medium">{selectedRelation.npwp}</p>
                    </div>
                  )}
                  {selectedRelation.kontak_person && (
                    <div>
                      <p className="text-muted-foreground">Kontak Person</p>
                      <p className="font-medium">{selectedRelation.kontak_person}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{selectedRelation.is_active ? 'Aktif' : 'Nonaktif'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dibuat</p>
                    <p className="font-medium">{selectedRelation.created_at.toLocaleDateString('id-ID')}</p>
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

export default DataRelasiManager;