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
import { Plus, Edit, Trash2, Search, User, Shield, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User as UserType, CreateUserInput } from '../../../../server/src/schema';

const DataUserManager: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    nama_lengkap: '',
    password: '',
    role: 'VIEWER',
    is_active: true
  });

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.users.getAll.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      nama_lengkap: '',
      password: '',
      role: 'VIEWER',
      is_active: true
    });
    setSelectedUser(null);
    setIsEditing(false);
  };

  const handleEdit = (user: UserType) => {
    setFormData({
      username: user.username,
      email: user.email,
      nama_lengkap: user.nama_lengkap,
      password: '', // Don't pre-fill password for security
      role: user.role,
      is_active: user.is_active
    });
    setSelectedUser(user);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isEditing && selectedUser) {
        // For editing, password is optional
        const updateData = { ...formData };
        if (!updateData.password) {
          delete (updateData as any).password;
        }
        
        await trpc.users.update.mutate({ 
          id: selectedUser.id, 
          data: updateData as Partial<CreateUserInput>
        });
        setUsers((prev: UserType[]) => 
          prev.map(user => 
            user.id === selectedUser.id 
              ? { ...user, ...formData, updated_at: new Date() }
              : user
          )
        );
      } else {
        const newUser = await trpc.users.create.mutate(formData);
        setUsers((prev: UserType[]) => [...prev, newUser]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (user: UserType) => {
    try {
      await trpc.users.delete.mutate({ id: user.id });
      setUsers((prev: UserType[]) => prev.filter(u => u.id !== user.id));
      if (selectedUser?.id === user.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'ADMIN': 'bg-red-100 text-red-800',
      'OPERATOR': 'bg-blue-100 text-blue-800',
      'VIEWER': 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      'ADMIN': 'Administrator',
      'OPERATOR': 'Operator',
      'VIEWER': 'Viewer'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesActive = !showActiveOnly || user.is_active;
    
    return matchesSearch && matchesRole && matchesActive;
  });

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Users List */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Data User</span>
              </CardTitle>
              <CardDescription>
                Kelola pengguna sistem dan hak akses mereka
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
                placeholder="Cari berdasarkan nama, username, atau email..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select
                value={filterRole}
                onValueChange={setFilterRole}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Semua role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua role</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
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
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm || filterRole || showActiveOnly 
                  ? 'Tidak ada user yang sesuai filter' 
                  : 'Belum ada data user'
                }
              </p>
            ) : (
              filteredUsers.map((user: UserType) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedUser?.id === user.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{user.username}</span>
                        <Badge 
                          variant="secondary" 
                          className={`${getRoleBadge(user.role)} flex items-center space-x-1`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>{getRoleLabel(user.role)}</span>
                        </Badge>
                        {!user.is_active && (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {user.nama_lengkap}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                      {user.last_login && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Login terakhir: {user.last_login.toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEdit(user);
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
                            <AlertDialogTitle>Hapus User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus user "{user.nama_lengkap}"? 
                              Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi semua aktivitas yang terkait dengan user ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user)}
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

      {/* Right Panel - User Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit User' : 'Tambah User Baru'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Ubah informasi user yang dipilih' 
              : 'Masukkan informasi untuk user baru'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                }
                placeholder="Contoh: john.doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap *</Label>
              <Input
                id="nama_lengkap"
                value={formData.nama_lengkap}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, nama_lengkap: e.target.value }))
                }
                placeholder="Contoh: John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Contoh: john.doe@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {isEditing ? '(Kosongkan jika tidak ingin mengubah)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Minimum 6 karakter"
                required={!isEditing}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, role: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Administrator</p>
                        <p className="text-xs text-muted-foreground">Akses penuh ke semua fitur</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="OPERATOR">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Operator</p>
                        <p className="text-xs text-muted-foreground">Dapat melakukan transaksi dan input data</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Viewer</p>
                        <p className="text-xs text-muted-foreground">Hanya dapat melihat laporan</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">User Aktif</Label>
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

          {/* Display selected user details */}
          {selectedUser && !isEditing && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="font-semibold">Detail User</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Username</p>
                    <p className="font-medium">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role</p>
                    <p className="font-medium">{getRoleLabel(selectedUser.role)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Nama Lengkap</p>
                    <p className="font-medium">{selectedUser.nama_lengkap}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{selectedUser.is_active ? 'Aktif' : 'Nonaktif'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Login Terakhir</p>
                    <p className="font-medium">
                      {selectedUser.last_login 
                        ? selectedUser.last_login.toLocaleDateString('id-ID')
                        : 'Belum pernah login'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dibuat</p>
                    <p className="font-medium">{selectedUser.created_at.toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Diupdate</p>
                    <p className="font-medium">{selectedUser.updated_at.toLocaleDateString('id-ID')}</p>
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

export default DataUserManager;