import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  accountsTable, 
  usersTable, 
  transactionHeadersTable, 
  transactionDetailsTable 
} from '../db/schema';
import { type ReportFilter } from '../schema';
import { getFinancialPositionReport } from '../handlers/reports';

// Test data
const testUsers = [
  {
    username: 'admin',
    email: 'admin@test.com',
    nama_lengkap: 'Administrator',
    password_hash: 'hashed_password',
    role: 'ADMIN' as const,
    is_active: true
  }
];

const testAccounts = [
  {
    kode: '1100',
    nama: 'Kas',
    tipe: 'ASET' as const,
    parent_id: null,
    saldo_awal: '10000.00',
    is_active: true
  },
  {
    kode: '1200',
    nama: 'Piutang Usaha',
    tipe: 'ASET' as const,
    parent_id: null,
    saldo_awal: '5000.00',
    is_active: true
  },
  {
    kode: '2100',
    nama: 'Hutang Usaha',
    tipe: 'KEWAJIBAN' as const,
    parent_id: null,
    saldo_awal: '3000.00',
    is_active: true
  },
  {
    kode: '3100',
    nama: 'Modal',
    tipe: 'EKUITAS' as const,
    parent_id: null,
    saldo_awal: '12000.00',
    is_active: true
  },
  {
    kode: '4100',
    nama: 'Pendapatan Jasa',
    tipe: 'PENDAPATAN' as const,
    parent_id: null,
    saldo_awal: '0.00',
    is_active: true
  },
  {
    kode: '1150',
    nama: 'Bank BCA',
    tipe: 'ASET' as const,
    parent_id: null,
    saldo_awal: '0.00',
    is_active: false // Inactive account - should not appear in report
  }
];

const testFilter: ReportFilter = {
  dari_tanggal: new Date('2024-01-01'),
  sampai_tanggal: new Date('2024-01-31')
};

describe('getFinancialPositionReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate financial position report with basic accounts', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test accounts
    await db.insert(accountsTable)
      .values(testAccounts)
      .returning()
      .execute();

    const result = await getFinancialPositionReport(testFilter);

    // Should only include balance sheet accounts (ASET, KEWAJIBAN, EKUITAS)
    // and only active accounts
    expect(result).toHaveLength(4);

    // Check account types are only balance sheet accounts
    const accountTypes = result.map(r => r.account_tipe);
    expect(accountTypes.every(type => ['ASET', 'KEWAJIBAN', 'EKUITAS'].includes(type))).toBe(true);

    // Check sorting: ASET first, then KEWAJIBAN, then EKUITAS
    expect(result[0].account_tipe).toEqual('ASET');
    expect(result[0].account_kode).toEqual('1100');
    expect(result[1].account_tipe).toEqual('ASET');
    expect(result[1].account_kode).toEqual('1200');
    expect(result[2].account_tipe).toEqual('KEWAJIBAN');
    expect(result[2].account_kode).toEqual('2100');
    expect(result[3].account_tipe).toEqual('EKUITAS');
    expect(result[3].account_kode).toEqual('3100');
  });

  it('should calculate correct balances with transactions', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test accounts
    const accounts = await db.insert(accountsTable)
      .values(testAccounts)
      .returning()
      .execute();

    // Find account IDs
    const kasAccount = accounts.find(a => a.kode === '1100')!;
    const piutangAccount = accounts.find(a => a.kode === '1200')!;
    const hutangAccount = accounts.find(a => a.kode === '2100')!;

    // Create a transaction header
    const transactionHeaders = await db.insert(transactionHeadersTable)
      .values([{
        nomor_transaksi: 'TRX001',
        tanggal: new Date('2024-01-15'),
        tipe: 'JURNAL_UMUM',
        deskripsi: 'Test Transaction',
        total_debit: '1000.00',
        total_kredit: '1000.00',
        relation_id: null,
        user_id: userId,
        is_posted: true
      }])
      .returning()
      .execute();

    const headerId = transactionHeaders[0].id;

    // Create transaction details
    // Debit Kas 500, Credit Piutang 300, Credit Hutang 200
    await db.insert(transactionDetailsTable)
      .values([
        {
          header_id: headerId,
          account_id: kasAccount.id,
          deskripsi: 'Penerimaan kas',
          debit: '500.00',
          kredit: '0.00',
          urutan: 1
        },
        {
          header_id: headerId,
          account_id: piutangAccount.id,
          deskripsi: 'Pembayaran piutang',
          debit: '0.00',
          kredit: '300.00',
          urutan: 2
        },
        {
          header_id: headerId,
          account_id: hutangAccount.id,
          deskripsi: 'Penambahan hutang',
          debit: '0.00',
          kredit: '200.00',
          urutan: 3
        }
      ])
      .execute();

    const result = await getFinancialPositionReport(testFilter);

    // Find specific accounts in result
    const kasResult = result.find(r => r.account_kode === '1100')!;
    const piutangResult = result.find(r => r.account_kode === '1200')!;
    const hutangResult = result.find(r => r.account_kode === '2100')!;
    const modalResult = result.find(r => r.account_kode === '3100')!;

    // Check Kas (Asset): Opening 10000 + Debit 500 - Credit 0 = 10500
    expect(kasResult.saldo_awal).toEqual(10000);
    expect(kasResult.debit).toEqual(500);
    expect(kasResult.kredit).toEqual(0);
    expect(kasResult.saldo_akhir).toEqual(10500);

    // Check Piutang (Asset): Opening 5000 + Debit 0 - Credit 300 = 4700
    expect(piutangResult.saldo_awal).toEqual(5000);
    expect(piutangResult.debit).toEqual(0);
    expect(piutangResult.kredit).toEqual(300);
    expect(piutangResult.saldo_akhir).toEqual(4700);

    // Check Hutang (Liability): Opening 3000 + Credit 200 - Debit 0 = 3200
    expect(hutangResult.saldo_awal).toEqual(3000);
    expect(hutangResult.debit).toEqual(0);
    expect(hutangResult.kredit).toEqual(200);
    expect(hutangResult.saldo_akhir).toEqual(3200);

    // Check Modal (Equity): No transactions, should remain at opening balance
    expect(modalResult.saldo_awal).toEqual(12000);
    expect(modalResult.debit).toEqual(0);
    expect(modalResult.kredit).toEqual(0);
    expect(modalResult.saldo_akhir).toEqual(12000);
  });

  it('should exclude inactive accounts from report', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();

    // Create test accounts
    await db.insert(accountsTable)
      .values(testAccounts)
      .returning()
      .execute();

    const result = await getFinancialPositionReport(testFilter);

    // Should not include the inactive Bank BCA account
    const accountCodes = result.map(r => r.account_kode);
    expect(accountCodes).not.toContain('1150');
    
    // Should include only active balance sheet accounts
    expect(result).toHaveLength(4);
    expect(accountCodes).toContain('1100'); // Kas
    expect(accountCodes).toContain('1200'); // Piutang
    expect(accountCodes).toContain('2100'); // Hutang
    expect(accountCodes).toContain('3100'); // Modal
  });

  it('should exclude revenue and expense accounts', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();

    // Create test accounts
    await db.insert(accountsTable)
      .values(testAccounts)
      .returning()
      .execute();

    const result = await getFinancialPositionReport(testFilter);

    // Should not include PENDAPATAN account
    const accountTypes = result.map(r => r.account_tipe);
    expect(accountTypes).not.toContain('PENDAPATAN');
    expect(accountTypes).not.toContain('BEBAN');

    // Only balance sheet accounts
    expect(accountTypes.every(type => ['ASET', 'KEWAJIBAN', 'EKUITAS'].includes(type))).toBe(true);
  });

  it('should return correct data structure', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();

    // Create test accounts
    await db.insert(accountsTable)
      .values(testAccounts)
      .returning()
      .execute();

    const result = await getFinancialPositionReport(testFilter);

    expect(result.length).toBeGreaterThan(0);

    // Check data structure of first result
    const firstResult = result[0];
    expect(firstResult.account_id).toBeDefined();
    expect(typeof firstResult.account_id).toBe('number');
    expect(typeof firstResult.account_kode).toBe('string');
    expect(typeof firstResult.account_nama).toBe('string');
    expect(typeof firstResult.account_tipe).toBe('string');
    expect(typeof firstResult.saldo_awal).toBe('number');
    expect(typeof firstResult.debit).toBe('number');
    expect(typeof firstResult.kredit).toBe('number');
    expect(typeof firstResult.saldo_akhir).toBe('number');

    // Verify all required fields exist
    expect(firstResult).toHaveProperty('account_id');
    expect(firstResult).toHaveProperty('account_kode');
    expect(firstResult).toHaveProperty('account_nama');
    expect(firstResult).toHaveProperty('account_tipe');
    expect(firstResult).toHaveProperty('saldo_awal');
    expect(firstResult).toHaveProperty('debit');
    expect(firstResult).toHaveProperty('kredit');
    expect(firstResult).toHaveProperty('saldo_akhir');
  });

  it('should handle empty account list', async () => {
    // Create test users but no accounts
    await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();

    const result = await getFinancialPositionReport(testFilter);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});