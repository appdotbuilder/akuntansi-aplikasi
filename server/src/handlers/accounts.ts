import { db } from '../db';
import { accountsTable, transactionDetailsTable } from '../db/schema';
import { type CreateAccountInput, type Account, accountTypeEnum } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

// Get all accounts with hierarchical structure
export async function getAccounts(): Promise<Account[]> {
  try {
    const results = await db.select()
      .from(accountsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(account => ({
      ...account,
      saldo_awal: parseFloat(account.saldo_awal)
    }));
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    throw error;
  }
}

// Get account by ID
export async function getAccountById(id: number): Promise<Account | null> {
  try {
    const results = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const account = results[0];
    return {
      ...account,
      saldo_awal: parseFloat(account.saldo_awal)
    };
  } catch (error) {
    console.error('Failed to fetch account by ID:', error);
    throw error;
  }
}

// Get accounts by type (ASET, KEWAJIBAN, etc.)
export async function getAccountsByType(tipe: string): Promise<Account[]> {
  try {
    // Validate that the type is one of the allowed enum values
    const parsedType = accountTypeEnum.parse(tipe);

    const results = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.tipe, parsedType))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(account => ({
      ...account,
      saldo_awal: parseFloat(account.saldo_awal)
    }));
  } catch (error) {
    console.error('Failed to fetch accounts by type:', error);
    throw error;
  }
}

// Create new account
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  try {
    // Validate parent_id exists if provided
    if (input.parent_id) {
      const parentExists = await db.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, input.parent_id))
        .execute();

      if (parentExists.length === 0) {
        throw new Error(`Parent account with ID ${input.parent_id} does not exist`);
      }
    }

    // Insert account record
    const result = await db.insert(accountsTable)
      .values({
        kode: input.kode,
        nama: input.nama,
        tipe: input.tipe,
        parent_id: input.parent_id,
        saldo_awal: input.saldo_awal.toString(), // Convert number to string for numeric column
        is_active: input.is_active
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const account = result[0];
    return {
      ...account,
      saldo_awal: parseFloat(account.saldo_awal)
    };
  } catch (error) {
    console.error('Account creation failed:', error);
    throw error;
  }
}

// Update account
export async function updateAccount(id: number, input: Partial<CreateAccountInput>): Promise<Account> {
  try {
    // Check if account exists
    const existingAccount = await getAccountById(id);
    if (!existingAccount) {
      throw new Error(`Account with ID ${id} does not exist`);
    }

    // Validate parent_id exists if provided
    if (input.parent_id) {
      const parentExists = await db.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, input.parent_id))
        .execute();

      if (parentExists.length === 0) {
        throw new Error(`Parent account with ID ${input.parent_id} does not exist`);
      }

      // Prevent circular reference (account cannot be its own parent)
      if (input.parent_id === id) {
        throw new Error('Account cannot be its own parent');
      }
    }

    // Build update values, only including provided fields
    const updateValues: any = {};
    
    if (input.kode !== undefined) updateValues.kode = input.kode;
    if (input.nama !== undefined) updateValues.nama = input.nama;
    if (input.tipe !== undefined) updateValues.tipe = input.tipe;
    if (input.parent_id !== undefined) updateValues.parent_id = input.parent_id;
    if (input.saldo_awal !== undefined) updateValues.saldo_awal = input.saldo_awal.toString();
    if (input.is_active !== undefined) updateValues.is_active = input.is_active;

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update account record
    const result = await db.update(accountsTable)
      .set(updateValues)
      .where(eq(accountsTable.id, id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const account = result[0];
    return {
      ...account,
      saldo_awal: parseFloat(account.saldo_awal)
    };
  } catch (error) {
    console.error('Account update failed:', error);
    throw error;
  }
}

// Delete account
export async function deleteAccount(id: number): Promise<boolean> {
  try {
    // Check if account exists
    const existingAccount = await getAccountById(id);
    if (!existingAccount) {
      throw new Error(`Account with ID ${id} does not exist`);
    }

    // Check if account has child accounts
    const childAccounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.parent_id, id))
      .execute();

    if (childAccounts.length > 0) {
      throw new Error('Cannot delete account that has child accounts');
    }

    // Check if account has transaction details
    const transactionDetails = await db.select()
      .from(transactionDetailsTable)
      .where(eq(transactionDetailsTable.account_id, id))
      .execute();

    if (transactionDetails.length > 0) {
      throw new Error('Cannot delete account that has transaction records');
    }

    // Delete account record
    const result = await db.delete(accountsTable)
      .where(eq(accountsTable.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Account deletion failed:', error);
    throw error;
  }
}