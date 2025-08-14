import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const accountTypeEnum = pgEnum('account_type', ['ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN']);
export const transactionTypeEnum = pgEnum('transaction_type', ['PENERIMAAN_DANA', 'PENGELUARAN_DANA', 'PEMINDAH_BUKUAN', 'JURNAL_UMUM', 'JURNAL_KOREKSI']);
export const relationTypeEnum = pgEnum('relation_type', ['PELANGGAN', 'PEMASOK', 'KARYAWAN', 'LAINNYA']);
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'OPERATOR', 'VIEWER']);

// Company table (Data Perusahaan)
export const companiesTable = pgTable('companies', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull(),
  alamat: text('alamat'),
  telepon: text('telepon'),
  email: text('email'),
  npwp: text('npwp'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Accounts table (Data Akun)
export const accountsTable = pgTable('accounts', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  tipe: accountTypeEnum('tipe').notNull(),
  parent_id: integer('parent_id'),
  saldo_awal: numeric('saldo_awal', { precision: 15, scale: 2 }).notNull().default('0'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Inventory Groups table (Kelompok Persediaan)
export const inventoryGroupsTable = pgTable('inventory_groups', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  deskripsi: text('deskripsi'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Inventory table (Data Persediaan)
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  kelompok_id: integer('kelompok_id').notNull(),
  satuan: text('satuan').notNull(),
  harga_beli: numeric('harga_beli', { precision: 15, scale: 2 }).notNull().default('0'),
  harga_jual: numeric('harga_jual', { precision: 15, scale: 2 }).notNull().default('0'),
  stok: integer('stok').notNull().default(0),
  min_stok: integer('min_stok').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations table (Data Relasi - customers, suppliers, etc.)
export const relationsTable = pgTable('relations', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  tipe: relationTypeEnum('tipe').notNull(),
  alamat: text('alamat'),
  telepon: text('telepon'),
  email: text('email'),
  npwp: text('npwp'),
  kontak_person: text('kontak_person'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Users table (Data User)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  nama_lengkap: text('nama_lengkap').notNull(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transaction Headers table
export const transactionHeadersTable = pgTable('transaction_headers', {
  id: serial('id').primaryKey(),
  nomor_transaksi: text('nomor_transaksi').notNull().unique(),
  tanggal: timestamp('tanggal').notNull(),
  tipe: transactionTypeEnum('tipe').notNull(),
  deskripsi: text('deskripsi').notNull(),
  total_debit: numeric('total_debit', { precision: 15, scale: 2 }).notNull().default('0'),
  total_kredit: numeric('total_kredit', { precision: 15, scale: 2 }).notNull().default('0'),
  relation_id: integer('relation_id'),
  user_id: integer('user_id').notNull(),
  is_posted: boolean('is_posted').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transaction Details table
export const transactionDetailsTable = pgTable('transaction_details', {
  id: serial('id').primaryKey(),
  header_id: integer('header_id').notNull(),
  account_id: integer('account_id').notNull(),
  deskripsi: text('deskripsi').notNull(),
  debit: numeric('debit', { precision: 15, scale: 2 }).notNull().default('0'),
  kredit: numeric('kredit', { precision: 15, scale: 2 }).notNull().default('0'),
  urutan: integer('urutan').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relations
export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  parent: one(accountsTable, {
    fields: [accountsTable.parent_id],
    references: [accountsTable.id]
  }),
  children: many(accountsTable),
  transactionDetails: many(transactionDetailsTable)
}));

export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  kelompok: one(inventoryGroupsTable, {
    fields: [inventoryTable.kelompok_id],
    references: [inventoryGroupsTable.id]
  })
}));

export const inventoryGroupsRelations = relations(inventoryGroupsTable, ({ many }) => ({
  inventory: many(inventoryTable)
}));

export const transactionHeadersRelations = relations(transactionHeadersTable, ({ one, many }) => ({
  relation: one(relationsTable, {
    fields: [transactionHeadersTable.relation_id],
    references: [relationsTable.id]
  }),
  user: one(usersTable, {
    fields: [transactionHeadersTable.user_id],
    references: [usersTable.id]
  }),
  details: many(transactionDetailsTable)
}));

export const transactionDetailsRelations = relations(transactionDetailsTable, ({ one }) => ({
  header: one(transactionHeadersTable, {
    fields: [transactionDetailsTable.header_id],
    references: [transactionHeadersTable.id]
  }),
  account: one(accountsTable, {
    fields: [transactionDetailsTable.account_id],
    references: [accountsTable.id]
  })
}));

export const relationsRelations = relations(relationsTable, ({ many }) => ({
  transactions: many(transactionHeadersTable)
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionHeadersTable)
}));

// Export all tables for proper query building
export const tables = {
  companies: companiesTable,
  accounts: accountsTable,
  inventoryGroups: inventoryGroupsTable,
  inventory: inventoryTable,
  relations: relationsTable,
  users: usersTable,
  transactionHeaders: transactionHeadersTable,
  transactionDetails: transactionDetailsTable
};