import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  transactionHeadersTable,
  transactionDetailsTable,
  accountsTable,
  relationsTable,
  usersTable
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type CreateCompleteTransactionInput,
  type CreateTransactionHeaderInput,
  type CreateTransactionDetailInput
} from '../schema';
import {
  createCompleteTransaction,
  createTransactionHeader,
  addTransactionDetail,
  getTransactionHeaders,
  getTransactionById,
  getTransactionsByType,
  getTransactionsByDateRange,
  getTransactionsByRelation,
  getUnpostedTransactions,
  updateTransactionHeader,
  updateTransactionDetail,
  postTransaction,
  unpostTransaction,
  deleteTransactionDetail,
  deleteTransaction,
  generateTransactionNumber,
  validateTransactionBalance
} from '../handlers/transactions';

// Helper function to create test data
async function createTestData() {
  // Create user
  const userResult = await db.insert(usersTable)
    .values({
      username: 'testuser',
      email: 'test@example.com',
      nama_lengkap: 'Test User',
      password_hash: 'hashedpassword',
      role: 'ADMIN',
      is_active: true
    })
    .returning()
    .execute();

  // Create relation
  const relationResult = await db.insert(relationsTable)
    .values({
      kode: 'REL001',
      nama: 'Test Customer',
      tipe: 'PELANGGAN',
      alamat: 'Test Address',
      telepon: '123456789',
      is_active: true
    })
    .returning()
    .execute();

  // Create accounts
  const account1Result = await db.insert(accountsTable)
    .values({
      kode: '1001',
      nama: 'Cash Account',
      tipe: 'ASET',
      parent_id: null,
      saldo_awal: '1000000',
      is_active: true
    })
    .returning()
    .execute();

  const account2Result = await db.insert(accountsTable)
    .values({
      kode: '4001',
      nama: 'Revenue Account',
      tipe: 'PENDAPATAN',
      parent_id: null,
      saldo_awal: '0',
      is_active: true
    })
    .returning()
    .execute();

  return {
    user: userResult[0],
    relation: relationResult[0],
    account1: account1Result[0],
    account2: account2Result[0]
  };
}

// Test transaction input
function createTestTransactionInput(testData: any): CreateCompleteTransactionInput {
  return {
    header: {
      nomor_transaksi: 'TXN-202312-001',
      tanggal: new Date('2023-12-01'),
      tipe: 'JURNAL_UMUM',
      deskripsi: 'Test Transaction',
      relation_id: testData.relation.id,
      user_id: testData.user.id
    },
    details: [
      {
        header_id: 0, // Will be set by handler
        account_id: testData.account1.id,
        deskripsi: 'Debit entry',
        debit: 500000,
        kredit: 0,
        urutan: 1
      },
      {
        header_id: 0, // Will be set by handler
        account_id: testData.account2.id,
        deskripsi: 'Credit entry',
        debit: 0,
        kredit: 500000,
        urutan: 2
      }
    ]
  };
}

describe('Transaction Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCompleteTransaction', () => {
    it('should create a complete transaction with header and details', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);

      const result = await createCompleteTransaction(input);

      // Verify header
      expect(result.header.id).toBeDefined();
      expect(result.header.nomor_transaksi).toEqual('TXN-202312-001');
      expect(result.header.deskripsi).toEqual('Test Transaction');
      expect(result.header.total_debit).toEqual(500000);
      expect(result.header.total_kredit).toEqual(500000);
      expect(result.header.relation_id).toEqual(testData.relation.id);
      expect(result.header.user_id).toEqual(testData.user.id);
      expect(result.header.is_posted).toEqual(false);
      expect(typeof result.header.total_debit).toBe('number');
      expect(typeof result.header.total_kredit).toBe('number');

      // Verify details
      expect(result.details).toHaveLength(2);
      expect(result.details[0].debit).toEqual(500000);
      expect(result.details[0].kredit).toEqual(0);
      expect(result.details[1].debit).toEqual(0);
      expect(result.details[1].kredit).toEqual(500000);
      expect(typeof result.details[0].debit).toBe('number');
      expect(typeof result.details[0].kredit).toBe('number');
    });

    it('should reject unbalanced transactions', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      // Make transaction unbalanced
      input.details[1].kredit = 400000;

      await expect(createCompleteTransaction(input)).rejects.toThrow(/Total debit must equal total kredit/i);
    });

    it('should validate foreign key constraints', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      // Invalid user ID
      input.header.user_id = 999999;
      await expect(createCompleteTransaction(input)).rejects.toThrow(/User not found/i);

      // Reset user ID and test invalid relation
      input.header.user_id = testData.user.id;
      input.header.relation_id = 999999;
      await expect(createCompleteTransaction(input)).rejects.toThrow(/Relation not found/i);

      // Reset relation and test invalid account
      input.header.relation_id = testData.relation.id;
      input.details[0].account_id = 999999;
      await expect(createCompleteTransaction(input)).rejects.toThrow(/Account with ID 999999 not found/i);
    });
  });

  describe('createTransactionHeader', () => {
    it('should create a transaction header', async () => {
      const testData = await createTestData();
      const input: CreateTransactionHeaderInput = {
        nomor_transaksi: 'HDR-001',
        tanggal: new Date('2023-12-01'),
        tipe: 'JURNAL_UMUM',
        deskripsi: 'Header only transaction',
        relation_id: testData.relation.id,
        user_id: testData.user.id
      };

      const result = await createTransactionHeader(input);

      expect(result.id).toBeDefined();
      expect(result.nomor_transaksi).toEqual('HDR-001');
      expect(result.total_debit).toEqual(0);
      expect(result.total_kredit).toEqual(0);
      expect(result.is_posted).toEqual(false);
      expect(typeof result.total_debit).toBe('number');
    });

    it('should validate user and relation existence', async () => {
      const testData = await createTestData();
      const input: CreateTransactionHeaderInput = {
        nomor_transaksi: 'HDR-001',
        tanggal: new Date('2023-12-01'),
        tipe: 'JURNAL_UMUM',
        deskripsi: 'Header only transaction',
        relation_id: null,
        user_id: 999999
      };

      await expect(createTransactionHeader(input)).rejects.toThrow(/User not found/i);
    });
  });

  describe('addTransactionDetail', () => {
    it('should add detail to existing transaction and update totals', async () => {
      const testData = await createTestData();
      
      // Create header first
      const headerInput: CreateTransactionHeaderInput = {
        nomor_transaksi: 'HDR-002',
        tanggal: new Date('2023-12-01'),
        tipe: 'JURNAL_UMUM',
        deskripsi: 'Header for detail addition',
        relation_id: null,
        user_id: testData.user.id
      };
      
      const header = await createTransactionHeader(headerInput);

      // Add detail
      const detailInput: CreateTransactionDetailInput = {
        header_id: header.id,
        account_id: testData.account1.id,
        deskripsi: 'Added detail',
        debit: 250000,
        kredit: 0,
        urutan: 1
      };

      const detail = await addTransactionDetail(detailInput);

      expect(detail.id).toBeDefined();
      expect(detail.header_id).toEqual(header.id);
      expect(detail.debit).toEqual(250000);
      expect(detail.kredit).toEqual(0);
      expect(typeof detail.debit).toBe('number');

      // Verify header totals were updated
      const updatedTransaction = await getTransactionById(header.id);
      expect(updatedTransaction?.header.total_debit).toEqual(250000);
      expect(updatedTransaction?.header.total_kredit).toEqual(0);
    });

    it('should not allow adding detail to posted transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      // Create and post transaction
      const transaction = await createCompleteTransaction(input);
      await postTransaction(transaction.header.id);

      const detailInput: CreateTransactionDetailInput = {
        header_id: transaction.header.id,
        account_id: testData.account1.id,
        deskripsi: 'Should not be added',
        debit: 100000,
        kredit: 0,
        urutan: 3
      };

      await expect(addTransactionDetail(detailInput)).rejects.toThrow(/Cannot add detail to posted transaction/i);
    });
  });

  describe('getTransactionHeaders', () => {
    it('should get transaction headers with pagination', async () => {
      const testData = await createTestData();
      
      // Create multiple transactions
      for (let i = 1; i <= 5; i++) {
        const input = createTestTransactionInput(testData);
        input.header.nomor_transaksi = `TXN-${i}`;
        await createCompleteTransaction(input);
      }

      const result = await getTransactionHeaders(1, 3);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBeDefined();
      expect(typeof result[0].total_debit).toBe('number');
      expect(typeof result[0].total_kredit).toBe('number');
    });

    it('should handle pagination correctly', async () => {
      const testData = await createTestData();
      
      // Create 2 transactions
      for (let i = 1; i <= 2; i++) {
        const input = createTestTransactionInput(testData);
        input.header.nomor_transaksi = `TXN-${i}`;
        await createCompleteTransaction(input);
      }

      const page1 = await getTransactionHeaders(1, 1);
      const page2 = await getTransactionHeaders(2, 1);

      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toEqual(page2[0].id);
    });
  });

  describe('getTransactionById', () => {
    it('should get complete transaction by ID', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      const result = await getTransactionById(created.header.id);

      expect(result).not.toBeNull();
      expect(result!.header.id).toEqual(created.header.id);
      expect(result!.details).toHaveLength(2);
      expect(typeof result!.header.total_debit).toBe('number');
      expect(typeof result!.details[0].debit).toBe('number');
    });

    it('should return null for non-existent transaction', async () => {
      const result = await getTransactionById(999999);
      expect(result).toBeNull();
    });
  });

  describe('getTransactionsByType', () => {
    it('should filter transactions by type', async () => {
      const testData = await createTestData();
      
      // Create transactions with different types
      const input1 = createTestTransactionInput(testData);
      input1.header.tipe = 'JURNAL_UMUM';
      input1.header.nomor_transaksi = 'TXN-1';
      await createCompleteTransaction(input1);

      const input2 = createTestTransactionInput(testData);
      input2.header.tipe = 'PENERIMAAN_DANA';
      input2.header.nomor_transaksi = 'TXN-2';
      await createCompleteTransaction(input2);

      const result = await getTransactionsByType('JURNAL_UMUM');

      expect(result).toHaveLength(1);
      expect(result[0].tipe).toEqual('JURNAL_UMUM');
      expect(typeof result[0].total_debit).toBe('number');
    });
  });

  describe('getTransactionsByDateRange', () => {
    it('should filter transactions by date range', async () => {
      const testData = await createTestData();
      
      // Create transactions with different dates
      const input1 = createTestTransactionInput(testData);
      input1.header.tanggal = new Date('2023-12-01');
      input1.header.nomor_transaksi = 'TXN-1';
      await createCompleteTransaction(input1);

      const input2 = createTestTransactionInput(testData);
      input2.header.tanggal = new Date('2023-12-15');
      input2.header.nomor_transaksi = 'TXN-2';
      await createCompleteTransaction(input2);

      const result = await getTransactionsByDateRange(
        new Date('2023-12-01'),
        new Date('2023-12-10')
      );

      expect(result).toHaveLength(1);
      expect(result[0].nomor_transaksi).toEqual('TXN-1');
      expect(typeof result[0].total_debit).toBe('number');
    });
  });

  describe('getTransactionsByRelation', () => {
    it('should filter transactions by relation', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      await createCompleteTransaction(input);

      const result = await getTransactionsByRelation(testData.relation.id);

      expect(result).toHaveLength(1);
      expect(result[0].relation_id).toEqual(testData.relation.id);
      expect(typeof result[0].total_debit).toBe('number');
    });
  });

  describe('getUnpostedTransactions', () => {
    it('should get only unposted transactions', async () => {
      const testData = await createTestData();
      
      // Create two transactions
      const input1 = createTestTransactionInput(testData);
      input1.header.nomor_transaksi = 'TXN-1';
      const tx1 = await createCompleteTransaction(input1);

      const input2 = createTestTransactionInput(testData);
      input2.header.nomor_transaksi = 'TXN-2';
      await createCompleteTransaction(input2);

      // Post one transaction
      await postTransaction(tx1.header.id);

      const result = await getUnpostedTransactions();

      expect(result).toHaveLength(1);
      expect(result[0].nomor_transaksi).toEqual('TXN-2');
      expect(result[0].is_posted).toEqual(false);
      expect(typeof result[0].total_debit).toBe('number');
    });
  });

  describe('updateTransactionHeader', () => {
    it('should update transaction header', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      
      const result = await updateTransactionHeader(created.header.id, {
        deskripsi: 'Updated description'
      });

      expect(result.deskripsi).toEqual('Updated description');
      expect(result.updated_at > created.header.created_at).toBe(true);
      expect(typeof result.total_debit).toBe('number');
    });

    it('should not update posted transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      await postTransaction(created.header.id);

      await expect(updateTransactionHeader(created.header.id, {
        deskripsi: 'Should not update'
      })).rejects.toThrow(/Cannot update posted transaction/i);
    });
  });

  describe('postTransaction', () => {
    it('should post a balanced transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      const result = await postTransaction(created.header.id);

      expect(result.is_posted).toBe(true);
      expect(typeof result.total_debit).toBe('number');
    });

    it('should reject unbalanced transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      
      // Make transaction unbalanced by updating a detail
      await db.update(transactionDetailsTable)
        .set({ debit: '600000' })
        .where(eq(transactionDetailsTable.header_id, created.header.id))
        .execute();

      await expect(postTransaction(created.header.id)).rejects.toThrow(/not balanced/i);
    });
  });

  describe('unpostTransaction', () => {
    it('should unpost a transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      await postTransaction(created.header.id);
      
      const result = await unpostTransaction(created.header.id);

      expect(result.is_posted).toBe(false);
      expect(typeof result.total_debit).toBe('number');
    });
  });

  describe('deleteTransactionDetail', () => {
    it('should delete transaction detail and update header totals', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      const detailId = created.details[0].id;

      const result = await deleteTransactionDetail(detailId);

      expect(result).toBe(true);

      // Verify detail was deleted
      const updated = await getTransactionById(created.header.id);
      expect(updated?.details).toHaveLength(1);
      expect(updated?.header.total_debit).toEqual(0);
      expect(updated?.header.total_kredit).toEqual(500000);
    });

    it('should not delete from posted transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      await postTransaction(created.header.id);

      await expect(deleteTransactionDetail(created.details[0].id))
        .rejects.toThrow(/Cannot delete detail from posted transaction/i);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete complete transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      const result = await deleteTransaction(created.header.id);

      expect(result).toBe(true);

      // Verify transaction was deleted
      const deleted = await getTransactionById(created.header.id);
      expect(deleted).toBeNull();
    });

    it('should not delete posted transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      await postTransaction(created.header.id);

      await expect(deleteTransaction(created.header.id))
        .rejects.toThrow(/Cannot delete posted transaction/i);
    });
  });

  describe('generateTransactionNumber', () => {
    it('should generate sequential transaction numbers', async () => {
      const testData = await createTestData();
      const date = new Date('2023-12-15');

      // Generate first number
      const number1 = await generateTransactionNumber('JURNAL_UMUM', date);
      expect(number1).toEqual('JURNAL_UMUM-202312-001');

      // Create transaction with that number
      const input = createTestTransactionInput(testData);
      input.header.nomor_transaksi = number1;
      input.header.tanggal = date;
      input.header.tipe = 'JURNAL_UMUM';
      await createCompleteTransaction(input);

      // Generate next number
      const number2 = await generateTransactionNumber('JURNAL_UMUM', date);
      expect(number2).toEqual('JURNAL_UMUM-202312-002');
    });

    it('should handle different months separately', async () => {
      const testData = await createTestData();
      
      // Create transaction in December
      const decDate = new Date('2023-12-15');
      const decNumber = await generateTransactionNumber('JURNAL_UMUM', decDate);
      expect(decNumber).toEqual('JURNAL_UMUM-202312-001');

      const decInput = createTestTransactionInput(testData);
      decInput.header.nomor_transaksi = decNumber;
      decInput.header.tanggal = decDate;
      decInput.header.tipe = 'JURNAL_UMUM';
      await createCompleteTransaction(decInput);

      // Generate number for January - should reset to 001
      const janDate = new Date('2024-01-15');
      const janNumber = await generateTransactionNumber('JURNAL_UMUM', janDate);
      expect(janNumber).toEqual('JURNAL_UMUM-202401-001');
    });
  });

  describe('validateTransactionBalance', () => {
    it('should validate balanced transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      const isBalanced = await validateTransactionBalance(created.header.id);

      expect(isBalanced).toBe(true);
    });

    it('should detect unbalanced transaction', async () => {
      const testData = await createTestData();
      const input = createTestTransactionInput(testData);
      
      const created = await createCompleteTransaction(input);
      
      // Make transaction unbalanced
      await db.update(transactionDetailsTable)
        .set({ debit: '600000' })
        .where(eq(transactionDetailsTable.header_id, created.header.id))
        .execute();

      const isBalanced = await validateTransactionBalance(created.header.id);
      expect(isBalanced).toBe(false);
    });
  });
});