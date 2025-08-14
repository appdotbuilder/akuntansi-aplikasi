import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { companiesTable } from '../db/schema';
import { type CreateCompanyInput } from '../schema';
import { 
  getCompanies, 
  getCompanyById, 
  createCompany, 
  updateCompany, 
  deleteCompany 
} from '../handlers/companies';
import { eq } from 'drizzle-orm';

// Test input data
const testCompanyInput: CreateCompanyInput = {
  nama: 'PT Test Company',
  alamat: 'Jl. Test No. 123',
  telepon: '021-1234567',
  email: 'test@company.com',
  npwp: '01.234.567.8-901.000'
};

const minimalCompanyInput: CreateCompanyInput = {
  nama: 'Minimal Company',
  alamat: null,
  telepon: null,
  email: null,
  npwp: null
};

describe('Companies Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCompany', () => {
    it('should create a company with all fields', async () => {
      const result = await createCompany(testCompanyInput);

      expect(result.nama).toEqual('PT Test Company');
      expect(result.alamat).toEqual('Jl. Test No. 123');
      expect(result.telepon).toEqual('021-1234567');
      expect(result.email).toEqual('test@company.com');
      expect(result.npwp).toEqual('01.234.567.8-901.000');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a company with minimal fields', async () => {
      const result = await createCompany(minimalCompanyInput);

      expect(result.nama).toEqual('Minimal Company');
      expect(result.alamat).toBeNull();
      expect(result.telepon).toBeNull();
      expect(result.email).toBeNull();
      expect(result.npwp).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save company to database', async () => {
      const result = await createCompany(testCompanyInput);

      const companies = await db.select()
        .from(companiesTable)
        .where(eq(companiesTable.id, result.id))
        .execute();

      expect(companies).toHaveLength(1);
      expect(companies[0].nama).toEqual('PT Test Company');
      expect(companies[0].alamat).toEqual('Jl. Test No. 123');
      expect(companies[0].email).toEqual('test@company.com');
      expect(companies[0].created_at).toBeInstanceOf(Date);
      expect(companies[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getCompanies', () => {
    it('should return empty array when no companies exist', async () => {
      const result = await getCompanies();
      expect(result).toEqual([]);
    });

    it('should return all companies', async () => {
      // Create test companies
      const company1 = await createCompany(testCompanyInput);
      const company2 = await createCompany({
        ...minimalCompanyInput,
        nama: 'Second Company'
      });

      const result = await getCompanies();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toContain(company1.id);
      expect(result.map(c => c.id)).toContain(company2.id);
      expect(result.map(c => c.nama)).toContain('PT Test Company');
      expect(result.map(c => c.nama)).toContain('Second Company');
    });

    it('should return companies with correct data types', async () => {
      await createCompany(testCompanyInput);
      
      const result = await getCompanies();

      expect(result).toHaveLength(1);
      const company = result[0];
      expect(typeof company.id).toBe('number');
      expect(typeof company.nama).toBe('string');
      expect(company.created_at).toBeInstanceOf(Date);
      expect(company.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getCompanyById', () => {
    it('should return null for non-existent company', async () => {
      const result = await getCompanyById(999);
      expect(result).toBeNull();
    });

    it('should return company by ID', async () => {
      const createdCompany = await createCompany(testCompanyInput);

      const result = await getCompanyById(createdCompany.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdCompany.id);
      expect(result!.nama).toEqual('PT Test Company');
      expect(result!.alamat).toEqual('Jl. Test No. 123');
      expect(result!.telepon).toEqual('021-1234567');
      expect(result!.email).toEqual('test@company.com');
      expect(result!.npwp).toEqual('01.234.567.8-901.000');
    });

    it('should return company with correct data types', async () => {
      const createdCompany = await createCompany(testCompanyInput);

      const result = await getCompanyById(createdCompany.id);

      expect(result).not.toBeNull();
      expect(typeof result!.id).toBe('number');
      expect(typeof result!.nama).toBe('string');
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('updateCompany', () => {
    it('should update all company fields', async () => {
      const createdCompany = await createCompany(testCompanyInput);

      const updateData = {
        nama: 'Updated Company Name',
        alamat: 'Updated Address',
        telepon: '021-9876543',
        email: 'updated@company.com',
        npwp: '99.888.777.6-555.000'
      };

      const result = await updateCompany(createdCompany.id, updateData);

      expect(result.id).toEqual(createdCompany.id);
      expect(result.nama).toEqual('Updated Company Name');
      expect(result.alamat).toEqual('Updated Address');
      expect(result.telepon).toEqual('021-9876543');
      expect(result.email).toEqual('updated@company.com');
      expect(result.npwp).toEqual('99.888.777.6-555.000');
      expect(result.updated_at.getTime()).toBeGreaterThan(createdCompany.updated_at.getTime());
    });

    it('should update partial company fields', async () => {
      const createdCompany = await createCompany(testCompanyInput);

      const updateData = {
        nama: 'Partially Updated Company',
        telepon: '021-5555555'
      };

      const result = await updateCompany(createdCompany.id, updateData);

      expect(result.id).toEqual(createdCompany.id);
      expect(result.nama).toEqual('Partially Updated Company');
      expect(result.alamat).toEqual('Jl. Test No. 123'); // Unchanged
      expect(result.telepon).toEqual('021-5555555');
      expect(result.email).toEqual('test@company.com'); // Unchanged
      expect(result.npwp).toEqual('01.234.567.8-901.000'); // Unchanged
    });

    it('should save updated company to database', async () => {
      const createdCompany = await createCompany(testCompanyInput);

      const updateData = {
        nama: 'Database Updated Company',
        email: 'db-updated@company.com'
      };

      await updateCompany(createdCompany.id, updateData);

      const companies = await db.select()
        .from(companiesTable)
        .where(eq(companiesTable.id, createdCompany.id))
        .execute();

      expect(companies).toHaveLength(1);
      expect(companies[0].nama).toEqual('Database Updated Company');
      expect(companies[0].email).toEqual('db-updated@company.com');
      expect(companies[0].alamat).toEqual('Jl. Test No. 123'); // Unchanged
    });

    it('should throw error for non-existent company', async () => {
      await expect(updateCompany(999, { nama: 'Non-existent' }))
        .rejects.toThrow(/Company with id 999 not found/);
    });
  });

  describe('deleteCompany', () => {
    it('should delete existing company', async () => {
      const createdCompany = await createCompany(testCompanyInput);

      const result = await deleteCompany(createdCompany.id);

      expect(result).toBe(true);

      // Verify company is deleted from database
      const companies = await db.select()
        .from(companiesTable)
        .where(eq(companiesTable.id, createdCompany.id))
        .execute();

      expect(companies).toHaveLength(0);
    });

    it('should return false for non-existent company', async () => {
      const result = await deleteCompany(999);
      expect(result).toBe(false);
    });

    it('should not affect other companies when deleting', async () => {
      const company1 = await createCompany(testCompanyInput);
      const company2 = await createCompany({
        ...minimalCompanyInput,
        nama: 'Keep This Company'
      });

      const result = await deleteCompany(company1.id);

      expect(result).toBe(true);

      // Verify only the targeted company was deleted
      const remainingCompanies = await getCompanies();
      expect(remainingCompanies).toHaveLength(1);
      expect(remainingCompanies[0].id).toEqual(company2.id);
      expect(remainingCompanies[0].nama).toEqual('Keep This Company');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete CRUD operations', async () => {
      // Create
      const company = await createCompany(testCompanyInput);
      expect(company.nama).toEqual('PT Test Company');

      // Read
      const fetchedCompany = await getCompanyById(company.id);
      expect(fetchedCompany!.nama).toEqual('PT Test Company');

      // Update
      const updatedCompany = await updateCompany(company.id, {
        nama: 'Updated Company'
      });
      expect(updatedCompany.nama).toEqual('Updated Company');

      // Read again
      const refetchedCompany = await getCompanyById(company.id);
      expect(refetchedCompany!.nama).toEqual('Updated Company');

      // Delete
      const deleteResult = await deleteCompany(company.id);
      expect(deleteResult).toBe(true);

      // Verify deletion
      const deletedCompany = await getCompanyById(company.id);
      expect(deletedCompany).toBeNull();
    });

    it('should handle multiple companies correctly', async () => {
      // Create multiple companies
      const companies = await Promise.all([
        createCompany({ ...testCompanyInput, nama: 'Company 1' }),
        createCompany({ ...testCompanyInput, nama: 'Company 2' }),
        createCompany({ ...testCompanyInput, nama: 'Company 3' })
      ]);

      // Verify all were created
      const allCompanies = await getCompanies();
      expect(allCompanies).toHaveLength(3);

      // Delete one
      await deleteCompany(companies[1].id);

      // Verify remaining companies
      const remainingCompanies = await getCompanies();
      expect(remainingCompanies).toHaveLength(2);
      expect(remainingCompanies.map(c => c.nama)).toContain('Company 1');
      expect(remainingCompanies.map(c => c.nama)).toContain('Company 3');
      expect(remainingCompanies.map(c => c.nama)).not.toContain('Company 2');
    });
  });
});