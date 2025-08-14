import { db } from '../db';
import { 
  transactionHeadersTable,
  transactionDetailsTable,
  accountsTable,
  relationsTable,
  usersTable
} from '../db/schema';
import { 
  type CreateTransactionHeaderInput, 
  type TransactionHeader, 
  type CreateCompleteTransactionInput, 
  type CompleteTransaction,
  type TransactionDetail,
  type CreateTransactionDetailInput
} from '../schema';
import { eq, and, between, desc, asc, gte, lte, SQL } from 'drizzle-orm';

// ===== TRANSACTION HEADERS =====

// Get all transaction headers with pagination
export async function getTransactionHeaders(page: number = 1, limit: number = 50): Promise<TransactionHeader[]> {
  try {
    const offset = (page - 1) * limit;
    
    const results = await db.select()
      .from(transactionHeadersTable)
      .orderBy(desc(transactionHeadersTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results.map(result => ({
      ...result,
      total_debit: parseFloat(result.total_debit),
      total_kredit: parseFloat(result.total_kredit)
    }));
  } catch (error) {
    console.error('Failed to get transaction headers:', error);
    throw error;
  }
}

// Get transaction header by ID with details
export async function getTransactionById(id: number): Promise<CompleteTransaction | null> {
  try {
    // Get header
    const headerResults = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.id, id))
      .execute();

    if (headerResults.length === 0) {
      return null;
    }

    const headerData = headerResults[0];
    const header: TransactionHeader = {
      ...headerData,
      total_debit: parseFloat(headerData.total_debit),
      total_kredit: parseFloat(headerData.total_kredit)
    };

    // Get details
    const detailResults = await db.select()
      .from(transactionDetailsTable)
      .where(eq(transactionDetailsTable.header_id, id))
      .orderBy(asc(transactionDetailsTable.urutan))
      .execute();

    const details: TransactionDetail[] = detailResults.map(detail => ({
      ...detail,
      debit: parseFloat(detail.debit),
      kredit: parseFloat(detail.kredit)
    }));

    return { header, details };
  } catch (error) {
    console.error('Failed to get transaction by ID:', error);
    throw error;
  }
}

// Get transactions by type
export async function getTransactionsByType(tipe: string): Promise<TransactionHeader[]> {
  try {
    const results = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.tipe, tipe as any))
      .orderBy(desc(transactionHeadersTable.created_at))
      .execute();

    return results.map(result => ({
      ...result,
      total_debit: parseFloat(result.total_debit),
      total_kredit: parseFloat(result.total_kredit)
    }));
  } catch (error) {
    console.error('Failed to get transactions by type:', error);
    throw error;
  }
}

// Get transactions by date range
export async function getTransactionsByDateRange(fromDate: Date, toDate: Date): Promise<TransactionHeader[]> {
  try {
    const results = await db.select()
      .from(transactionHeadersTable)
      .where(
        and(
          gte(transactionHeadersTable.tanggal, fromDate),
          lte(transactionHeadersTable.tanggal, toDate)
        )
      )
      .orderBy(desc(transactionHeadersTable.tanggal))
      .execute();

    return results.map(result => ({
      ...result,
      total_debit: parseFloat(result.total_debit),
      total_kredit: parseFloat(result.total_kredit)
    }));
  } catch (error) {
    console.error('Failed to get transactions by date range:', error);
    throw error;
  }
}

// Get transactions by relation (customer/supplier)
export async function getTransactionsByRelation(relationId: number): Promise<TransactionHeader[]> {
  try {
    const results = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.relation_id, relationId))
      .orderBy(desc(transactionHeadersTable.created_at))
      .execute();

    return results.map(result => ({
      ...result,
      total_debit: parseFloat(result.total_debit),
      total_kredit: parseFloat(result.total_kredit)
    }));
  } catch (error) {
    console.error('Failed to get transactions by relation:', error);
    throw error;
  }
}

// Get unposted transactions
export async function getUnpostedTransactions(): Promise<TransactionHeader[]> {
  try {
    const results = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.is_posted, false))
      .orderBy(desc(transactionHeadersTable.created_at))
      .execute();

    return results.map(result => ({
      ...result,
      total_debit: parseFloat(result.total_debit),
      total_kredit: parseFloat(result.total_kredit)
    }));
  } catch (error) {
    console.error('Failed to get unposted transactions:', error);
    throw error;
  }
}

// ===== TRANSACTION CREATION =====

// Create complete transaction (header + details in one operation)
export async function createCompleteTransaction(input: CreateCompleteTransactionInput): Promise<CompleteTransaction> {
  try {
    // Validate that debits equal credits
    const totalDebit = input.details.reduce((sum, detail) => sum + detail.debit, 0);
    const totalKredit = input.details.reduce((sum, detail) => sum + detail.kredit, 0);
    
    if (Math.abs(totalDebit - totalKredit) > 0.01) {
      throw new Error('Total debit must equal total kredit');
    }

    // Verify that user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.header.user_id))
      .execute();
    
    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Verify that relation exists if provided
    if (input.header.relation_id) {
      const relationExists = await db.select()
        .from(relationsTable)
        .where(eq(relationsTable.id, input.header.relation_id))
        .execute();
      
      if (relationExists.length === 0) {
        throw new Error('Relation not found');
      }
    }

    // Verify all accounts exist
    for (const detail of input.details) {
      const accountExists = await db.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, detail.account_id))
        .execute();
      
      if (accountExists.length === 0) {
        throw new Error(`Account with ID ${detail.account_id} not found`);
      }
    }

    // Create header
    const headerResult = await db.insert(transactionHeadersTable)
      .values({
        nomor_transaksi: input.header.nomor_transaksi,
        tanggal: input.header.tanggal,
        tipe: input.header.tipe,
        deskripsi: input.header.deskripsi,
        total_debit: totalDebit.toString(),
        total_kredit: totalKredit.toString(),
        relation_id: input.header.relation_id,
        user_id: input.header.user_id,
        is_posted: false
      })
      .returning()
      .execute();

    const createdHeader = headerResult[0];

    // Create details
    const detailResults = await db.insert(transactionDetailsTable)
      .values(
        input.details.map(detail => ({
          header_id: createdHeader.id,
          account_id: detail.account_id,
          deskripsi: detail.deskripsi,
          debit: detail.debit.toString(),
          kredit: detail.kredit.toString(),
          urutan: detail.urutan
        }))
      )
      .returning()
      .execute();

    return {
      header: {
        ...createdHeader,
        total_debit: parseFloat(createdHeader.total_debit),
        total_kredit: parseFloat(createdHeader.total_kredit)
      },
      details: detailResults.map(detail => ({
        ...detail,
        debit: parseFloat(detail.debit),
        kredit: parseFloat(detail.kredit)
      }))
    };
  } catch (error) {
    console.error('Failed to create complete transaction:', error);
    throw error;
  }
}

// Create transaction header only
export async function createTransactionHeader(input: CreateTransactionHeaderInput): Promise<TransactionHeader> {
  try {
    // Verify that user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Verify that relation exists if provided
    if (input.relation_id) {
      const relationExists = await db.select()
        .from(relationsTable)
        .where(eq(relationsTable.id, input.relation_id))
        .execute();
      
      if (relationExists.length === 0) {
        throw new Error('Relation not found');
      }
    }

    const result = await db.insert(transactionHeadersTable)
      .values({
        nomor_transaksi: input.nomor_transaksi,
        tanggal: input.tanggal,
        tipe: input.tipe,
        deskripsi: input.deskripsi,
        total_debit: '0',
        total_kredit: '0',
        relation_id: input.relation_id,
        user_id: input.user_id,
        is_posted: false
      })
      .returning()
      .execute();

    const created = result[0];
    return {
      ...created,
      total_debit: parseFloat(created.total_debit),
      total_kredit: parseFloat(created.total_kredit)
    };
  } catch (error) {
    console.error('Failed to create transaction header:', error);
    throw error;
  }
}

// Add transaction detail to existing header
export async function addTransactionDetail(input: CreateTransactionDetailInput): Promise<TransactionDetail> {
  try {
    // Verify header exists and is not posted
    const headerExists = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.id, input.header_id))
      .execute();
    
    if (headerExists.length === 0) {
      throw new Error('Transaction header not found');
    }
    
    if (headerExists[0].is_posted) {
      throw new Error('Cannot add detail to posted transaction');
    }

    // Verify account exists
    const accountExists = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, input.account_id))
      .execute();
    
    if (accountExists.length === 0) {
      throw new Error('Account not found');
    }

    // Create detail
    const result = await db.insert(transactionDetailsTable)
      .values({
        header_id: input.header_id,
        account_id: input.account_id,
        deskripsi: input.deskripsi,
        debit: input.debit.toString(),
        kredit: input.kredit.toString(),
        urutan: input.urutan
      })
      .returning()
      .execute();

    // Update header totals
    await updateHeaderTotals(input.header_id);

    const created = result[0];
    return {
      ...created,
      debit: parseFloat(created.debit),
      kredit: parseFloat(created.kredit)
    };
  } catch (error) {
    console.error('Failed to add transaction detail:', error);
    throw error;
  }
}

// ===== TRANSACTION UPDATES =====

// Update transaction header
export async function updateTransactionHeader(id: number, input: Partial<CreateTransactionHeaderInput>): Promise<TransactionHeader> {
  try {
    // Check if transaction exists and is not posted
    const existing = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.id, id))
      .execute();
    
    if (existing.length === 0) {
      throw new Error('Transaction not found');
    }
    
    if (existing[0].is_posted) {
      throw new Error('Cannot update posted transaction');
    }

    // Verify user exists if updating user_id
    if (input.user_id) {
      const userExists = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();
      
      if (userExists.length === 0) {
        throw new Error('User not found');
      }
    }

    // Verify relation exists if updating relation_id
    if (input.relation_id) {
      const relationExists = await db.select()
        .from(relationsTable)
        .where(eq(relationsTable.id, input.relation_id))
        .execute();
      
      if (relationExists.length === 0) {
        throw new Error('Relation not found');
      }
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (input.nomor_transaksi !== undefined) updateData.nomor_transaksi = input.nomor_transaksi;
    if (input.tanggal !== undefined) updateData.tanggal = input.tanggal;
    if (input.tipe !== undefined) updateData.tipe = input.tipe;
    if (input.deskripsi !== undefined) updateData.deskripsi = input.deskripsi;
    if (input.relation_id !== undefined) updateData.relation_id = input.relation_id;
    if (input.user_id !== undefined) updateData.user_id = input.user_id;

    const result = await db.update(transactionHeadersTable)
      .set(updateData)
      .where(eq(transactionHeadersTable.id, id))
      .returning()
      .execute();

    const updated = result[0];
    return {
      ...updated,
      total_debit: parseFloat(updated.total_debit),
      total_kredit: parseFloat(updated.total_kredit)
    };
  } catch (error) {
    console.error('Failed to update transaction header:', error);
    throw error;
  }
}

// Update transaction detail
export async function updateTransactionDetail(id: number, input: Partial<CreateTransactionDetailInput>): Promise<TransactionDetail> {
  try {
    // Check if detail exists
    const existing = await db.select()
      .from(transactionDetailsTable)
      .innerJoin(transactionHeadersTable, eq(transactionDetailsTable.header_id, transactionHeadersTable.id))
      .where(eq(transactionDetailsTable.id, id))
      .execute();
    
    if (existing.length === 0) {
      throw new Error('Transaction detail not found');
    }
    
    if (existing[0].transaction_headers.is_posted) {
      throw new Error('Cannot update detail of posted transaction');
    }

    // Verify account exists if updating account_id
    if (input.account_id) {
      const accountExists = await db.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, input.account_id))
        .execute();
      
      if (accountExists.length === 0) {
        throw new Error('Account not found');
      }
    }

    const updateData: any = {};
    if (input.account_id !== undefined) updateData.account_id = input.account_id;
    if (input.deskripsi !== undefined) updateData.deskripsi = input.deskripsi;
    if (input.debit !== undefined) updateData.debit = input.debit.toString();
    if (input.kredit !== undefined) updateData.kredit = input.kredit.toString();
    if (input.urutan !== undefined) updateData.urutan = input.urutan;

    const result = await db.update(transactionDetailsTable)
      .set(updateData)
      .where(eq(transactionDetailsTable.id, id))
      .returning()
      .execute();

    // Update header totals
    const headerId = existing[0].transaction_details.header_id;
    await updateHeaderTotals(headerId);

    const updated = result[0];
    return {
      ...updated,
      debit: parseFloat(updated.debit),
      kredit: parseFloat(updated.kredit)
    };
  } catch (error) {
    console.error('Failed to update transaction detail:', error);
    throw error;
  }
}

// ===== TRANSACTION POSTING =====

// Post transaction (mark as final)
export async function postTransaction(id: number): Promise<TransactionHeader> {
  try {
    // Validate transaction balance first
    const isBalanced = await validateTransactionBalance(id);
    if (!isBalanced) {
      throw new Error('Transaction is not balanced (debits ≠ credits)');
    }

    const result = await db.update(transactionHeadersTable)
      .set({
        is_posted: true,
        updated_at: new Date()
      })
      .where(eq(transactionHeadersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Transaction not found');
    }

    const updated = result[0];
    return {
      ...updated,
      total_debit: parseFloat(updated.total_debit),
      total_kredit: parseFloat(updated.total_kredit)
    };
  } catch (error) {
    console.error('Failed to post transaction:', error);
    throw error;
  }
}

// Unpost transaction (if corrections are needed)
export async function unpostTransaction(id: number): Promise<TransactionHeader> {
  try {
    const result = await db.update(transactionHeadersTable)
      .set({
        is_posted: false,
        updated_at: new Date()
      })
      .where(eq(transactionHeadersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Transaction not found');
    }

    const updated = result[0];
    return {
      ...updated,
      total_debit: parseFloat(updated.total_debit),
      total_kredit: parseFloat(updated.total_kredit)
    };
  } catch (error) {
    console.error('Failed to unpost transaction:', error);
    throw error;
  }
}

// ===== TRANSACTION DELETION =====

// Delete transaction detail
export async function deleteTransactionDetail(id: number): Promise<boolean> {
  try {
    // Check if detail exists and transaction is not posted
    const existing = await db.select()
      .from(transactionDetailsTable)
      .innerJoin(transactionHeadersTable, eq(transactionDetailsTable.header_id, transactionHeadersTable.id))
      .where(eq(transactionDetailsTable.id, id))
      .execute();
    
    if (existing.length === 0) {
      throw new Error('Transaction detail not found');
    }
    
    if (existing[0].transaction_headers.is_posted) {
      throw new Error('Cannot delete detail from posted transaction');
    }

    const headerId = existing[0].transaction_details.header_id;

    await db.delete(transactionDetailsTable)
      .where(eq(transactionDetailsTable.id, id))
      .execute();

    // Update header totals
    await updateHeaderTotals(headerId);

    return true;
  } catch (error) {
    console.error('Failed to delete transaction detail:', error);
    throw error;
  }
}

// Delete complete transaction
export async function deleteTransaction(id: number): Promise<boolean> {
  try {
    // Check if transaction exists and is not posted
    const existing = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.id, id))
      .execute();
    
    if (existing.length === 0) {
      throw new Error('Transaction not found');
    }
    
    if (existing[0].is_posted) {
      throw new Error('Cannot delete posted transaction');
    }

    // Delete details first (foreign key constraint)
    await db.delete(transactionDetailsTable)
      .where(eq(transactionDetailsTable.header_id, id))
      .execute();

    // Delete header
    await db.delete(transactionHeadersTable)
      .where(eq(transactionHeadersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
}

// ===== UTILITY FUNCTIONS =====

// Generate next transaction number
export async function generateTransactionNumber(tipe: string, tanggal: Date): Promise<string> {
  try {
    const year = tanggal.getFullYear();
    const month = (tanggal.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `${tipe}-${year}${month}`;

    // Get the highest existing number for this prefix
    const existing = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.tipe, tipe as any))
      .execute();

    // Filter by year-month and extract sequence numbers
    const sameMonthTransactions = existing.filter(t => {
      const transDate = new Date(t.tanggal);
      return transDate.getFullYear() === year && 
             transDate.getMonth() === tanggal.getMonth();
    });

    let maxSequence = 0;
    sameMonthTransactions.forEach(t => {
      const match = t.nomor_transaksi.match(/-(\d+)$/);
      if (match) {
        const sequence = parseInt(match[1]);
        maxSequence = Math.max(maxSequence, sequence);
      }
    });

    const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
    return `${prefix}-${nextSequence}`;
  } catch (error) {
    console.error('Failed to generate transaction number:', error);
    throw error;
  }
}

// Validate transaction balance (debits = credits)
export async function validateTransactionBalance(headerId: number): Promise<boolean> {
  try {
    const details = await db.select()
      .from(transactionDetailsTable)
      .where(eq(transactionDetailsTable.header_id, headerId))
      .execute();

    const totalDebit = details.reduce((sum, detail) => sum + parseFloat(detail.debit), 0);
    const totalKredit = details.reduce((sum, detail) => sum + parseFloat(detail.kredit), 0);

    // Allow for small floating point differences
    return Math.abs(totalDebit - totalKredit) < 0.01;
  } catch (error) {
    console.error('Failed to validate transaction balance:', error);
    throw error;
  }
}

// Helper function to update header totals
async function updateHeaderTotals(headerId: number): Promise<void> {
  try {
    const details = await db.select()
      .from(transactionDetailsTable)
      .where(eq(transactionDetailsTable.header_id, headerId))
      .execute();

    const totalDebit = details.reduce((sum, detail) => sum + parseFloat(detail.debit), 0);
    const totalKredit = details.reduce((sum, detail) => sum + parseFloat(detail.kredit), 0);

    await db.update(transactionHeadersTable)
      .set({
        total_debit: totalDebit.toString(),
        total_kredit: totalKredit.toString(),
        updated_at: new Date()
      })
      .where(eq(transactionHeadersTable.id, headerId))
      .execute();
  } catch (error) {
    console.error('Failed to update header totals:', error);
    throw error;
  }
}