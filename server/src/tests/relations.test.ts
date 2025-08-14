import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { relationsTable, transactionHeadersTable, usersTable } from '../db/schema';
import { type CreateRelationInput } from '../schema';
import { 
  getRelations, 
  getRelationById, 
  getRelationsByType, 
  getActiveRelations,
  createRelation, 
  updateRelation, 
  deleteRelation 
} from '../handlers/relations';
import { eq } from 'drizzle-orm';

// Test input data
const testRelationInput: CreateRelationInput = {
  kode: 'REL001',
  nama: 'PT Test Relation',
  tipe: 'PELANGGAN',
  alamat: 'Jl. Test No. 123',
  telepon: '021-12345678',
  email: 'test@relation.com',
  npwp: '12.345.678.9-012.345',
  kontak_person: 'John Doe',
  is_active: true
};

const testSupplierInput: CreateRelationInput = {
  kode: 'REL002',
  nama: 'CV Supplier Test',
  tipe: 'PEMASOK',
  alamat: 'Jl. Supplier No. 456',
  telepon: '021-87654321',
  email: 'supplier@test.com',
  npwp: '98.765.432.1-987.654',
  kontak_person: 'Jane Smith',
  is_active: true
};

const testInactiveInput: CreateRelationInput = {
  kode: 'REL003',
  nama: 'Inactive Relation',
  tipe: 'LAINNYA',
  alamat: null,
  telepon: null,
  email: null,
  npwp: null,
  kontak_person: null,
  is_active: false
};

describe('Relations Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createRelation', () => {
    it('should create a relation with all fields', async () => {
      const result = await createRelation(testRelationInput);

      expect(result.id).toBeDefined();
      expect(result.kode).toEqual('REL001');
      expect(result.nama).toEqual('PT Test Relation');
      expect(result.tipe).toEqual('PELANGGAN');
      expect(result.alamat).toEqual('Jl. Test No. 123');
      expect(result.telepon).toEqual('021-12345678');
      expect(result.email).toEqual('test@relation.com');
      expect(result.npwp).toEqual('12.345.678.9-012.345');
      expect(result.kontak_person).toEqual('John Doe');
      expect(result.is_active).toEqual(true);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a relation with nullable fields as null', async () => {
      const result = await createRelation(testInactiveInput);

      expect(result.kode).toEqual('REL003');
      expect(result.nama).toEqual('Inactive Relation');
      expect(result.tipe).toEqual('LAINNYA');
      expect(result.alamat).toBeNull();
      expect(result.telepon).toBeNull();
      expect(result.email).toBeNull();
      expect(result.npwp).toBeNull();
      expect(result.kontak_person).toBeNull();
      expect(result.is_active).toEqual(false);
    });

    it('should save relation to database', async () => {
      const result = await createRelation(testRelationInput);

      const relations = await db.select()
        .from(relationsTable)
        .where(eq(relationsTable.id, result.id))
        .execute();

      expect(relations).toHaveLength(1);
      expect(relations[0].kode).toEqual('REL001');
      expect(relations[0].nama).toEqual('PT Test Relation');
    });

    it('should reject duplicate kode', async () => {
      await createRelation(testRelationInput);

      await expect(createRelation(testRelationInput))
        .rejects.toThrow(/duplicate key/i);
    });
  });

  describe('getRelations', () => {
    it('should return empty array when no relations exist', async () => {
      const result = await getRelations();
      expect(result).toEqual([]);
    });

    it('should return all relations', async () => {
      await createRelation(testRelationInput);
      await createRelation(testSupplierInput);
      await createRelation(testInactiveInput);

      const result = await getRelations();

      expect(result).toHaveLength(3);
      expect(result.map(r => r.kode)).toContain('REL001');
      expect(result.map(r => r.kode)).toContain('REL002');
      expect(result.map(r => r.kode)).toContain('REL003');
    });
  });

  describe('getRelationById', () => {
    it('should return null when relation does not exist', async () => {
      const result = await getRelationById(999);
      expect(result).toBeNull();
    });

    it('should return relation by ID', async () => {
      const created = await createRelation(testRelationInput);
      const result = await getRelationById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.kode).toEqual('REL001');
      expect(result!.nama).toEqual('PT Test Relation');
    });
  });

  describe('getRelationsByType', () => {
    it('should return empty array when no relations of specified type exist', async () => {
      const result = await getRelationsByType('PELANGGAN');
      expect(result).toEqual([]);
    });

    it('should return relations filtered by type', async () => {
      await createRelation(testRelationInput); // PELANGGAN
      await createRelation(testSupplierInput); // PEMASOK
      await createRelation(testInactiveInput); // LAINNYA

      const customers = await getRelationsByType('PELANGGAN');
      const suppliers = await getRelationsByType('PEMASOK');
      const others = await getRelationsByType('LAINNYA');

      expect(customers).toHaveLength(1);
      expect(customers[0].tipe).toEqual('PELANGGAN');
      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].tipe).toEqual('PEMASOK');
      expect(others).toHaveLength(1);
      expect(others[0].tipe).toEqual('LAINNYA');
    });
  });

  describe('getActiveRelations', () => {
    it('should return empty array when no active relations exist', async () => {
      await createRelation(testInactiveInput); // inactive relation

      const result = await getActiveRelations();
      expect(result).toEqual([]);
    });

    it('should return only active relations', async () => {
      await createRelation(testRelationInput); // active
      await createRelation(testSupplierInput); // active
      await createRelation(testInactiveInput); // inactive

      const result = await getActiveRelations();

      expect(result).toHaveLength(2);
      result.forEach(relation => {
        expect(relation.is_active).toEqual(true);
      });
    });
  });

  describe('updateRelation', () => {
    it('should update relation fields', async () => {
      const created = await createRelation(testRelationInput);

      const updateData = {
        nama: 'Updated Relation Name',
        alamat: 'Updated Address',
        is_active: false
      };

      const result = await updateRelation(created.id, updateData);

      expect(result.id).toEqual(created.id);
      expect(result.nama).toEqual('Updated Relation Name');
      expect(result.alamat).toEqual('Updated Address');
      expect(result.is_active).toEqual(false);
      expect(result.kode).toEqual('REL001'); // unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error when relation does not exist', async () => {
      await expect(updateRelation(999, { nama: 'Test' }))
        .rejects.toThrow(/not found/i);
    });

    it('should update relation in database', async () => {
      const created = await createRelation(testRelationInput);
      await updateRelation(created.id, { nama: 'Updated Name' });

      const updated = await db.select()
        .from(relationsTable)
        .where(eq(relationsTable.id, created.id))
        .execute();

      expect(updated[0].nama).toEqual('Updated Name');
    });
  });

  describe('deleteRelation', () => {
    it('should return false when relation does not exist', async () => {
      const result = await deleteRelation(999);
      expect(result).toEqual(false);
    });

    it('should delete relation successfully', async () => {
      const created = await createRelation(testRelationInput);
      const result = await deleteRelation(created.id);

      expect(result).toEqual(true);

      // Verify deletion
      const deleted = await db.select()
        .from(relationsTable)
        .where(eq(relationsTable.id, created.id))
        .execute();

      expect(deleted).toHaveLength(0);
    });

    it('should prevent deletion when relation has associated transactions', async () => {
      // Create prerequisite user
      const user = await db.insert(usersTable)
        .values({
          username: 'testuser',
          email: 'test@user.com',
          nama_lengkap: 'Test User',
          password_hash: 'hashed_password',
          role: 'ADMIN',
          is_active: true
        })
        .returning()
        .execute();

      // Create relation
      const relation = await createRelation(testRelationInput);

      // Create transaction associated with relation
      await db.insert(transactionHeadersTable)
        .values({
          nomor_transaksi: 'TRX001',
          tanggal: new Date(),
          tipe: 'JURNAL_UMUM',
          deskripsi: 'Test transaction',
          total_debit: '1000.00',
          total_kredit: '1000.00',
          relation_id: relation.id,
          user_id: user[0].id,
          is_posted: false
        })
        .execute();

      // Attempt to delete relation
      await expect(deleteRelation(relation.id))
        .rejects.toThrow(/associated transactions/i);
    });
  });

  describe('Integration tests', () => {
    it('should handle complete CRUD operations', async () => {
      // Create
      const created = await createRelation(testRelationInput);
      expect(created.kode).toEqual('REL001');

      // Read
      const retrieved = await getRelationById(created.id);
      expect(retrieved!.nama).toEqual('PT Test Relation');

      // Update
      const updated = await updateRelation(created.id, { nama: 'Updated Name' });
      expect(updated.nama).toEqual('Updated Name');

      // Delete
      const deleted = await deleteRelation(created.id);
      expect(deleted).toEqual(true);

      // Verify deletion
      const final = await getRelationById(created.id);
      expect(final).toBeNull();
    });

    it('should maintain data consistency across operations', async () => {
      // Create multiple relations
      const customer = await createRelation(testRelationInput);
      const supplier = await createRelation(testSupplierInput);

      // Verify counts
      const allRelations = await getRelations();
      const customers = await getRelationsByType('PELANGGAN');
      const suppliers = await getRelationsByType('PEMASOK');

      expect(allRelations).toHaveLength(2);
      expect(customers).toHaveLength(1);
      expect(suppliers).toHaveLength(1);

      // Update and verify
      await updateRelation(customer.id, { is_active: false });
      const activeRelations = await getActiveRelations();
      expect(activeRelations).toHaveLength(1);
      expect(activeRelations[0].id).toEqual(supplier.id);
    });
  });
});