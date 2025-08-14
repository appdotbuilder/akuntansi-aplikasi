import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Building, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Company, CreateCompanyInput } from '../../../../server/src/schema';

const DataPerusahaanManager: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateCompanyInput>({
    nama: '',
    alamat: null,
    telepon: null,
    email: null,
    npwp: null
  });

  const loadCompanies = useCallback(async () => {
    try {
      const result = await trpc.companies.getAll.query();
      setCompanies(result);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const resetForm = () => {
    setFormData({
      nama: '',
      alamat: null,
      telepon: null,
      email: null,
      npwp: null
    });
    setSelectedCompany(null);
    setIsEditing(false);
  };

  const handleEdit = (company: Company) => {
    setFormData({
      nama: company.nama,
      alamat: company.alamat,
      telepon: company.telepon,
      email: company.email,
      npwp: company.npwp
    });
    setSelectedCompany(company);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditing && selectedCompany) {
        await trpc.companies.update.mutate({ 
          id: selectedCompany.id, 
          data: formData 
        });
        setCompanies((prev: Company[]) => 
          prev.map(company => 
            company.id === selectedCompany.id 
              ? { ...company, ...formData, updated_at: new Date() }
              : company
          )
        );
      } else {
        const newCompany = await trpc.companies.create.mutate(formData);
        setCompanies((prev: Company[]) => [...prev, newCompany]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (company: Company) => {
    try {
      await trpc.companies.delete.mutate({ id: company.id });
      setCompanies((prev: Company[]) => prev.filter(c => c.id !== company.id));
      if (selectedCompany?.id === company.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Companies List */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Data Perusahaan</span>
              </CardTitle>
              <CardDescription>
                Kelola informasi perusahaan dalam sistem akuntansi
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
              placeholder="Cari berdasarkan nama perusahaan..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-2">
            {filteredCompanies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'Tidak ada perusahaan yang sesuai pencarian' : 'Belum ada data perusahaan'}
              </p>
            ) : (
              filteredCompanies.map((company: Company) => (
                <div
                  key={company.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedCompany?.id === company.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedCompany(company)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-base mb-2">{company.nama}</h3>
                      
                      {company.alamat && (
                        <p className="text-xs text-muted-foreground flex items-start mt-1">
                          <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{company.alamat}</span>
                        </p>
                      )}
                      
                      {company.telepon && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {company.telepon}
                        </p>
                      )}
                      
                      {company.email && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Mail className="h-3 w-3 mr-1" />
                          {company.email}
                        </p>
                      )}
                      
                      {company.npwp && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <FileText className="h-3 w-3 mr-1" />
                          NPWP: {company.npwp}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Dibuat: {company.created_at.toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEdit(company);
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
                            <AlertDialogTitle>Hapus Data Perusahaan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus perusahaan "{company.nama}"? 
                              Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi semua data terkait.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(company)}
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

      {/* Right Panel - Company Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Data Perusahaan' : 'Tambah Perusahaan Baru'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Ubah informasi perusahaan yang dipilih' 
              : 'Masukkan informasi untuk perusahaan baru'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Perusahaan *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompanyInput) => ({ ...prev, nama: e.target.value }))
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
                  setFormData((prev: CreateCompanyInput) => ({ 
                    ...prev, 
                    alamat: e.target.value || null 
                  }))
                }
                placeholder="Alamat lengkap perusahaan (opsional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  value={formData.telepon || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCompanyInput) => ({ 
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
                    setFormData((prev: CreateCompanyInput) => ({ 
                      ...prev, 
                      email: e.target.value || null 
                    }))
                  }
                  placeholder="Contoh: info@abc.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="npwp">NPWP</Label>
              <Input
                id="npwp"
                value={formData.npwp || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompanyInput) => ({ 
                    ...prev, 
                    npwp: e.target.value || null 
                  }))
                }
                placeholder="Contoh: 01.234.567.8-901.000"
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

          {/* Display selected company details */}
          {selectedCompany && !isEditing && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="font-semibold">Detail Perusahaan</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Nama Perusahaan</p>
                    <p className="font-medium text-base">{selectedCompany.nama}</p>
                  </div>
                  
                  {selectedCompany.alamat && (
                    <div>
                      <p className="text-muted-foreground flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Alamat
                      </p>
                      <p className="font-medium">{selectedCompany.alamat}</p>
                    </div>
                  )}
                  
                  {selectedCompany.telepon && (
                    <div>
                      <p className="text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        Telepon
                      </p>
                      <p className="font-medium">{selectedCompany.telepon}</p>
                    </div>
                  )}
                  
                  {selectedCompany.email && (
                    <div>
                      <p className="text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </p>
                      <p className="font-medium">{selectedCompany.email}</p>
                    </div>
                  )}
                  
                  {selectedCompany.npwp && (
                    <div>
                      <p className="text-muted-foreground flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        NPWP
                      </p>
                      <p className="font-medium">{selectedCompany.npwp}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Dibuat</p>
                      <p className="font-medium">{selectedCompany.created_at.toLocaleDateString('id-ID')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Diupdate</p>
                      <p className="font-medium">{selectedCompany.updated_at.toLocaleDateString('id-ID')}</p>
                    </div>
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

export default DataPerusahaanManager;