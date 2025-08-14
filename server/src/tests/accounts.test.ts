import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accountsTable, transactionHeadersTable, transactionDetailsTable, usersTable } from '../db/schema';
import { type CreateAccountInput, type Account } from '../schema';
import { 
  getAccounts, 
  getAccountById, 
  getAccountsByType, 
  createAccount, 
  updateAccount, 
  deleteAccount 
} from '../handlers/accounts';
import { eq } from 'drizzle-orm';

// Test data
const testAccountInput: CreateAccountInput = {
  kode: 'A001',
  nama: 'Kas',
  tipe: 'ASET',
  parent_id: null,
  saldo_awal: 1000000,
  is_active: true
};

const parentAccountInput: CreateAccountInput = {
  kode: 'A100',
  nama: 'Aktiva Lancar',
  tipe: 'ASET',
  parent_id: null,
  saldo_awal: 0,
  is_active: true
};

const childAccountInput: CreateAccountInput = {
  kode: 'A101',
  nama: 'Kas di Tangan',
  tipe: 'ASET',
  parent_id: 1, // Will be updated with actual parent ID
  saldo_awal: 500000,
  is_active: true
};

describe('accounts handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createAccount', () => {
    it('should create an account successfully', async () => {
      const result = await createAccount(testAccountInput);

      // Basic field validation
      expect(result.kode).toEqual('A001');
      expect(result.nama).toEqual('Kas');
      expect(result.tipe).toEqual('ASET');
      expect(result.parent_id).toBeNull();
      expect(result.saldo_awal).toEqual(1000000);
      expect(typeof result.saldo_awal).toBe('number');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save account to database', async () => {
      const result = await createAccount(testAccountInput);

      const accounts = await db.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, result.id))
        .execute();

      expect(accounts).toHaveLength(1);
      expect(accounts[0].kode).toEqual('A001');
      expect(accounts[0].nama).toEqual('Kas');
      expect(accounts[0].tipe).toEqual('ASET');
      expect(parseFloat(accounts[0].saldo_awal)).toEqual(1000000);
    });

    it('should create account with parent relationship', async () => {
      // Create parent account first
      const parent = await createAccount(parentAccountInput);

      // Create child account
      const childInput = { ...childAccountInput, parent_id: parent.id };
      const child = await createAccount(childInput);

      expect(child.parent_id).toEqual(parent.id);
      expect(child.kode).toEqual('A101');
      expect(child.nama).toEqual('Kas di Tangan');
    });

    it('should throw error for non-existent parent account', async () => {
      const invalidInput = { ...testAccountInput, parent_id: 999 };

      await expect(createAccount(invalidInput)).rejects.toThrow(/Parent account with ID 999 does not exist/i);
    });

    it('should handle different account types', async () => {
      const liabilityAccount: CreateAccountInput = {
        kode: 'L001',
        nama: 'Utang Usaha',
        tipe: 'KEWAJIBAN',
        parent_id: null,
        saldo_awal: 2000000,
        is_active: true
      };

      const result = await createAccount(liabilityAccount);

      expect(result.tipe).toEqual('KEWAJIBAN');
      expect(result.saldo_awal).toEqual(2000000);
    });
  });

  describe('getAccounts', () => {
    it('should return empty array when no accounts exist', async () => {
      const result = await getAccounts();
      expect(result).toEqual([]);
    });

    it('should return all accounts', async () => {
      // Create test accounts
      await createAccount(testAccountInput);
      await createAccount({ ...testAccountInput, kode: 'A002', nama: 'Bank' });

      const result = await getAccounts();

      expect(result).toHaveLength(2);
      expect(result[0].kode).toEqual('A001');
      expect(result[1].kode).toEqual('A002');
      expect(typeof result[0].saldo_awal).toBe('number');
    });

    it('should return accounts with proper numeric conversion', async () => {
      await createAccount(testAccountInput);

      const result = await getAccounts();

      expect(result).toHaveLength(1);
      expect(typeof result[0].saldo_awal).toBe('number');
      expect(result[0].saldo_awal).toEqual(1000000);
    });
  });

  describe('getAccountById', () => {
    it('should return null for non-existent account', async () => {
      const result = await getAccountById(999);
      expect(result).toBeNull();
    });

    it('should return account by ID', async () => {
      const created = await createAccount(testAccountInput);
      const result = await getAccountById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.kode).toEqual('A001');
      expect(result!.nama).toEqual('Kas');
      expect(typeof result!.saldo_awal).toBe('number');
      expect(result!.saldo_awal).toEqual(1000000);
    });
  });

  describe('getAccountsByType', () => {
    it('should return empty array for type with no accounts', async () => {
      const result = await getAccountsByType('PENDAPATAN');
      expect(result).toEqual([]);
    });

    it('should return accounts filtered by type', async () => {
      // Create accounts of different types
      await createAccount(testAccountInput); // ASET
      await createAccount({
        kode: 'L001',
        nama: 'Utang Usaha',
        tipe: 'KEWAJIBAN',
        parent_id: null,
        saldo_awal: 1000000,
        is_active: true
      }); // KEWAJIBAN

      const assetAccounts = await getAccountsByType('ASET');
      const liabilityAccounts = await getAccountsByType('KEWAJIBAN');

      expect(assetAccounts).toHaveLength(1);
      expect(assetAccounts[0].tipe).toEqual('ASET');
      expect(assetAccounts[0].kode).toEqual('A001');

      expect(liabilityAccounts).toHaveLength(1);
      expect(liabilityAccounts[0].tipe).toEqual('KEWAJIBAN');
      expect(liabilityAccounts[0].kode).toEqual('L001');
    });

    it('should throw error for invalid account type', async () => {
      await expect(getAccountsByType('INVALID_TYPE')).rejects.toThrow();
    });
  });

  describe('updateAccount', () => {
    it('should throw error for non-existent account', async () => {
      await expect(updateAccount(999, { nama: 'Updated' })).rejects.toThrow(/Account with ID 999 does not exist/i);
    });

    it('should update account fields', async () => {
      const created = await createAccount(testAccountInput);

      const updateData = {
        nama: 'Kas Besar',
        saldo_awal: 2000000,
        is_active: false
      };

      const result = await updateAccount(created.id, updateData);

      expect(result.id).toEqual(created.id);
      expect(result.nama).toEqual('Kas Besar');
      expect(result.saldo_awal).toEqual(2000000);
      expect(result.is_active).toBe(false);
      expect(result.kode).toEqual('A001'); // Unchanged field
      expect(typeof result.saldo_awal).toBe('number');
    });

    it('should update only provided fields', async () => {
      const created = await createAccount(testAccountInput);

      const result = await updateAccount(created.id, { nama: 'Updated Name' });

      expect(result.nama).toEqual('Updated Name');
      expect(result.kode).toEqual('A001'); // Should remain unchanged
      expect(result.saldo_awal).toEqual(1000000); // Should remain unchanged
    });

    it('should prevent circular parent reference', async () => {
      const created = await createAccount(testAccountInput);

      await expect(updateAccount(created.id, { parent_id: created.id }))
        .rejects.toThrow(/Account cannot be its own parent/i);
    });

    it('should throw error for non-existent parent', async () => {
      const created = await createAccount(testAccountInput);

      await expect(updateAccount(created.id, { parent_id: 999 }))
        .rejects.toThrow(/Parent account with ID 999 does not exist/i);
    });
  });

  describe('deleteAccount', () => {
    it('should throw error for non-existent account', async () => {
      await expect(deleteAccount(999)).rejects.toThrow(/Account with ID 999 does not exist/i);
    });

    it('should delete account successfully', async () => {
      const created = await createAccount(testAccountInput);

      const result = await deleteAccount(created.id);
      expect(result).toBe(true);

      // Verify account is deleted
      const deleted = await getAccountById(created.id);
      expect(deleted).toBeNull();
    });

    it('should prevent deletion of account with child accounts', async () => {
      // Create parent account
      const parent = await createAccount(parentAccountInput);
      
      // Create child account
      const childInput = { ...childAccountInput, parent_id: parent.id };
      await createAccount(childInput);

      await expect(deleteAccount(parent.id))
        .rejects.toThrow(/Cannot delete account that has child accounts/i);
    });

    it('should prevent deletion of account with transactions', async () => {
      // Create test user first
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          email: 'test@example.com',
          nama_lengkap: 'Test User',
          password_hash: 'hashed_password',
          role: 'ADMIN'
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Create account
      const account = await createAccount(testAccountInput);

      // Create transaction header
      const headerResult = await db.insert(transactionHeadersTable)
        .values({
          nomor_transaksi: 'TRX001',
          tanggal: new Date(),
          tipe: 'JURNAL_UMUM',
          deskripsi: 'Test transaction',
          user_id: userId
        })
        .returning()
        .execute();

      // Create transaction detail using the account
      await db.insert(transactionDetailsTable)
        .values({
          header_id: headerResult[0].id,
          account_id: account.id,
          deskripsi: 'Test detail',
          debit: '1000',
          kredit: '0',
          urutan: 1
        })
        .execute();

      await expect(deleteAccount(account.id))
        .rejects.toThrow(/Cannot delete account that has transaction records/i);
    });
  });
});