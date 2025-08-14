import { db } from '../db';
import { companiesTable } from '../db/schema';
import { type CreateCompanyInput, type Company } from '../schema';
import { eq } from 'drizzle-orm';

// Get all companies
export async function getCompanies(): Promise<Company[]> {
  try {
    const results = await db.select()
      .from(companiesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    throw error;
  }
}

// Get company by ID
export async function getCompanyById(id: number): Promise<Company | null> {
  try {
    const results = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch company by ID:', error);
    throw error;
  }
}

// Create new company
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  try {
    const results = await db.insert(companiesTable)
      .values({
        nama: input.nama,
        alamat: input.alamat,
        telepon: input.telepon,
        email: input.email,
        npwp: input.npwp
      })
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Company creation failed:', error);
    throw error;
  }
}

// Update company
export async function updateCompany(id: number, input: Partial<CreateCompanyInput>): Promise<Company> {
  try {
    // First check if company exists
    const existingCompany = await getCompanyById(id);
    if (!existingCompany) {
      throw new Error(`Company with id ${id} not found`);
    }

    const results = await db.update(companiesTable)
      .set({
        ...input,
        updated_at: new Date()
      })
      .where(eq(companiesTable.id, id))
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Company update failed:', error);
    throw error;
  }
}

// Delete company
export async function deleteCompany(id: number): Promise<boolean> {
  try {
    // First check if company exists
    const existingCompany = await getCompanyById(id);
    if (!existingCompany) {
      return false;
    }

    await db.delete(companiesTable)
      .where(eq(companiesTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Company deletion failed:', error);
    throw error;
  }
}