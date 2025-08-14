import { db } from '../db';
import { relationsTable, transactionHeadersTable } from '../db/schema';
import { type CreateRelationInput, type Relation } from '../schema';
import { eq } from 'drizzle-orm';

// Get all relations (customers, suppliers, employees, etc.)
export async function getRelations(): Promise<Relation[]> {
  try {
    const results = await db.select()
      .from(relationsTable)
      .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to get relations:', error);
    throw error;
  }
}

// Get relation by ID
export async function getRelationById(id: number): Promise<Relation | null> {
  try {
    const results = await db.select()
      .from(relationsTable)
      .where(eq(relationsTable.id, id))
      .execute();
    
    return results[0] || null;
  } catch (error) {
    console.error('Failed to get relation by ID:', error);
    throw error;
  }
}

// Get relations by type (PELANGGAN, PEMASOK, KARYAWAN, LAINNYA)
export async function getRelationsByType(tipe: string): Promise<Relation[]> {
  try {
    const results = await db.select()
      .from(relationsTable)
      .where(eq(relationsTable.tipe, tipe as any))
      .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to get relations by type:', error);
    throw error;
  }
}

// Get active relations only
export async function getActiveRelations(): Promise<Relation[]> {
  try {
    const results = await db.select()
      .from(relationsTable)
      .where(eq(relationsTable.is_active, true))
      .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to get active relations:', error);
    throw error;
  }
}

// Create new relation
export async function createRelation(input: CreateRelationInput): Promise<Relation> {
  try {
    const result = await db.insert(relationsTable)
      .values({
        kode: input.kode,
        nama: input.nama,
        tipe: input.tipe,
        alamat: input.alamat,
        telepon: input.telepon,
        email: input.email,
        npwp: input.npwp,
        kontak_person: input.kontak_person,
        is_active: input.is_active
      })
      .returning()
      .execute();
    
    return result[0];
  } catch (error) {
    console.error('Failed to create relation:', error);
    throw error;
  }
}

// Update relation
export async function updateRelation(id: number, input: Partial<CreateRelationInput>): Promise<Relation> {
  try {
    const result = await db.update(relationsTable)
      .set({
        ...input,
        updated_at: new Date()
      })
      .where(eq(relationsTable.id, id))
      .returning()
      .execute();
    
    if (result.length === 0) {
      throw new Error(`Relation with ID ${id} not found`);
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to update relation:', error);
    throw error;
  }
}

// Delete relation
export async function deleteRelation(id: number): Promise<boolean> {
  try {
    // Check if relation has any associated transactions
    const existingTransactions = await db.select()
      .from(transactionHeadersTable)
      .where(eq(transactionHeadersTable.relation_id, id))
      .execute();
    
    if (existingTransactions.length > 0) {
      throw new Error(`Cannot delete relation with ID ${id}: it has associated transactions`);
    }
    
    const result = await db.delete(relationsTable)
      .where(eq(relationsTable.id, id))
      .returning()
      .execute();
    
    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete relation:', error);
    throw error;
  }
}