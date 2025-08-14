import { z } from 'zod';

// Enum definitions
export const accountTypeEnum = z.enum(['ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN']);
export const transactionTypeEnum = z.enum(['PENERIMAAN_DANA', 'PENGELUARAN_DANA', 'PEMINDAH_BUKUAN', 'JURNAL_UMUM', 'JURNAL_KOREKSI']);
export const relationTypeEnum = z.enum(['PELANGGAN', 'PEMASOK', 'KARYAWAN', 'LAINNYA']);
export const userRoleEnum = z.enum(['ADMIN', 'OPERATOR', 'VIEWER']);

// Company schema
export const companySchema = z.object({
  id: z.number(),
  nama: z.string(),
  alamat: z.string().nullable(),
  telepon: z.string().nullable(),
  email: z.string().nullable(),
  npwp: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Company = z.infer<typeof companySchema>;

export const createCompanyInputSchema = z.object({
  nama: z.string(),
  alamat: z.string().nullable(),
  telepon: z.string().nullable(),
  email: z.string().email().nullable(),
  npwp: z.string().nullable()
});

export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

// Account schema (Data Akun)
export const accountSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  tipe: accountTypeEnum,
  parent_id: z.number().nullable(),
  saldo_awal: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Account = z.infer<typeof accountSchema>;

export const createAccountInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  tipe: accountTypeEnum,
  parent_id: z.number().nullable(),
  saldo_awal: z.number(),
  is_active: z.boolean().default(true)
});

export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

// Inventory Group schema (Kelompok Persediaan)
export const inventoryGroupSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  deskripsi: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type InventoryGroup = z.infer<typeof inventoryGroupSchema>;

export const createInventoryGroupInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  deskripsi: z.string().nullable()
});

export type CreateInventoryGroupInput = z.infer<typeof createInventoryGroupInputSchema>;

// Inventory schema (Data Persediaan)
export const inventorySchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  kelompok_id: z.number(),
  satuan: z.string(),
  harga_beli: z.number(),
  harga_jual: z.number(),
  stok: z.number().int(),
  min_stok: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Inventory = z.infer<typeof inventorySchema>;

export const createInventoryInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  kelompok_id: z.number(),
  satuan: z.string(),
  harga_beli: z.number().positive(),
  harga_jual: z.number().positive(),
  stok: z.number().int().nonnegative(),
  min_stok: z.number().int().nonnegative(),
  is_active: z.boolean().default(true)
});

export type CreateInventoryInput = z.infer<typeof createInventoryInputSchema>;

// Relation Type schema (Hubungan Relasi)
export const relationTypeSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  deskripsi: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type RelationType = z.infer<typeof relationTypeSchema>;

// Relation schema (Data Relasi)
export const relationSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  tipe: relationTypeEnum,
  alamat: z.string().nullable(),
  telepon: z.string().nullable(),
  email: z.string().nullable(),
  npwp: z.string().nullable(),
  kontak_person: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Relation = z.infer<typeof relationSchema>;

export const createRelationInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  tipe: relationTypeEnum,
  alamat: z.string().nullable(),
  telepon: z.string().nullable(),
  email: z.string().email().nullable(),
  npwp: z.string().nullable(),
  kontak_person: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export type CreateRelationInput = z.infer<typeof createRelationInputSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  nama_lengkap: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  last_login: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  nama_lengkap: z.string(),
  password: z.string().min(6),
  role: userRoleEnum,
  is_active: z.boolean().default(true)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Transaction Header schema
export const transactionHeaderSchema = z.object({
  id: z.number(),
  nomor_transaksi: z.string(),
  tanggal: z.coerce.date(),
  tipe: transactionTypeEnum,
  deskripsi: z.string(),
  total_debit: z.number(),
  total_kredit: z.number(),
  relation_id: z.number().nullable(),
  user_id: z.number(),
  is_posted: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TransactionHeader = z.infer<typeof transactionHeaderSchema>;

export const createTransactionHeaderInputSchema = z.object({
  nomor_transaksi: z.string(),
  tanggal: z.coerce.date(),
  tipe: transactionTypeEnum,
  deskripsi: z.string(),
  relation_id: z.number().nullable(),
  user_id: z.number()
});

export type CreateTransactionHeaderInput = z.infer<typeof createTransactionHeaderInputSchema>;

// Transaction Detail schema
export const transactionDetailSchema = z.object({
  id: z.number(),
  header_id: z.number(),
  account_id: z.number(),
  deskripsi: z.string(),
  debit: z.number(),
  kredit: z.number(),
  urutan: z.number().int(),
  created_at: z.coerce.date()
});

export type TransactionDetail = z.infer<typeof transactionDetailSchema>;

export const createTransactionDetailInputSchema = z.object({
  header_id: z.number(),
  account_id: z.number(),
  deskripsi: z.string(),
  debit: z.number().nonnegative(),
  kredit: z.number().nonnegative(),
  urutan: z.number().int()
});

export type CreateTransactionDetailInput = z.infer<typeof createTransactionDetailInputSchema>;

// Balance schema (for reports)
export const balanceSchema = z.object({
  account_id: z.number(),
  account_kode: z.string(),
  account_nama: z.string(),
  account_tipe: accountTypeEnum,
  saldo_awal: z.number(),
  debit: z.number(),
  kredit: z.number(),
  saldo_akhir: z.number()
});

export type Balance = z.infer<typeof balanceSchema>;

// Report filters
export const reportFilterSchema = z.object({
  dari_tanggal: z.coerce.date(),
  sampai_tanggal: z.coerce.date(),
  account_id: z.number().optional(),
  relation_id: z.number().optional()
});

export type ReportFilter = z.infer<typeof reportFilterSchema>;

// Complete transaction with details
export const completeTransactionSchema = z.object({
  header: transactionHeaderSchema,
  details: z.array(transactionDetailSchema)
});

export type CompleteTransaction = z.infer<typeof completeTransactionSchema>;

export const createCompleteTransactionInputSchema = z.object({
  header: createTransactionHeaderInputSchema,
  details: z.array(createTransactionDetailInputSchema)
});

export type CreateCompleteTransactionInput = z.infer<typeof createCompleteTransactionInputSchema>;