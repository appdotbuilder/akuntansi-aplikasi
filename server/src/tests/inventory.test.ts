import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryGroupsTable, inventoryTable } from '../db/schema';
import { type CreateInventoryGroupInput, type CreateInventoryInput } from '../schema';
import {
  getInventoryGroups,
  getInventoryGroupById,
  createInventoryGroup,
  updateInventoryGroup,
  deleteInventoryGroup,
  getInventory,
  getInventoryById,
  getInventoryByGroup,
  getLowStockInventory,
  createInventory,
  updateInventory,
  updateInventoryStock,
  deleteInventory
} from '../handlers/inventory';
import { eq } from 'drizzle-orm';

// Test data
const testInventoryGroupInput: CreateInventoryGroupInput = {
  kode: 'GRP001',
  nama: 'Test Group',
  deskripsi: 'Test group description'
};

const testInventoryInput: CreateInventoryInput = {
  kode: 'ITM001',
  nama: 'Test Item',
  kelompok_id: 1, // Will be updated with actual group ID
  satuan: 'pcs',
  harga_beli: 10000,
  harga_jual: 15000,
  stok: 50,
  min_stok: 10,
  is_active: true
};

describe('Inventory Groups', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createInventoryGroup', () => {
    it('should create inventory group', async () => {
      const result = await createInventoryGroup(testInventoryGroupInput);

      expect(result.kode).toEqual('GRP001');
      expect(result.nama).toEqual('Test Group');
      expect(result.deskripsi).toEqual('Test group description');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save inventory group to database', async () => {
      const result = await createInventoryGroup(testInventoryGroupInput);

      const groups = await db.select()
        .from(inventoryGroupsTable)
        .where(eq(inventoryGroupsTable.id, result.id))
        .execute();

      expect(groups).toHaveLength(1);
      expect(groups[0].kode).toEqual('GRP001');
      expect(groups[0].nama).toEqual('Test Group');
      expect(groups[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getInventoryGroups', () => {
    it('should return empty array when no groups exist', async () => {
      const result = await getInventoryGroups();
      expect(result).toEqual([]);
    });

    it('should return all inventory groups', async () => {
      await createInventoryGroup(testInventoryGroupInput);
      await createInventoryGroup({
        kode: 'GRP002',
        nama: 'Second Group',
        deskripsi: null
      });

      const result = await getInventoryGroups();

      expect(result).toHaveLength(2);
      expect(result[0].kode).toEqual('GRP001');
      expect(result[1].kode).toEqual('GRP002');
    });
  });

  describe('getInventoryGroupById', () => {
    it('should return null when group does not exist', async () => {
      const result = await getInventoryGroupById(999);
      expect(result).toBeNull();
    });

    it('should return inventory group by ID', async () => {
      const created = await createInventoryGroup(testInventoryGroupInput);
      const result = await getInventoryGroupById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.kode).toEqual('GRP001');
      expect(result!.nama).toEqual('Test Group');
    });
  });

  describe('updateInventoryGroup', () => {
    it('should update inventory group', async () => {
      const created = await createInventoryGroup(testInventoryGroupInput);

      const result = await updateInventoryGroup(created.id, {
        nama: 'Updated Group Name',
        deskripsi: 'Updated description'
      });

      expect(result.id).toEqual(created.id);
      expect(result.kode).toEqual('GRP001'); // unchanged
      expect(result.nama).toEqual('Updated Group Name');
      expect(result.deskripsi).toEqual('Updated description');
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should throw error when group does not exist', async () => {
      await expect(updateInventoryGroup(999, { nama: 'Test' }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteInventoryGroup', () => {
    it('should delete inventory group', async () => {
      const created = await createInventoryGroup(testInventoryGroupInput);
      const result = await deleteInventoryGroup(created.id);

      expect(result).toBe(true);

      const groups = await db.select()
        .from(inventoryGroupsTable)
        .where(eq(inventoryGroupsTable.id, created.id))
        .execute();

      expect(groups).toHaveLength(0);
    });

    it('should return false when group does not exist', async () => {
      const result = await deleteInventoryGroup(999);
      expect(result).toBe(false);
    });

    it('should prevent deletion when group has inventory items', async () => {
      const group = await createInventoryGroup(testInventoryGroupInput);
      const inventoryInput = { ...testInventoryInput, kelompok_id: group.id };
      await createInventory(inventoryInput);

      await expect(deleteInventoryGroup(group.id))
        .rejects.toThrow(/has inventory items/i);
    });
  });
});

describe('Inventory Items', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testGroup: any;

  beforeEach(async () => {
    testGroup = await createInventoryGroup(testInventoryGroupInput);
  });

  describe('createInventory', () => {
    it('should create inventory item', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const result = await createInventory(input);

      expect(result.kode).toEqual('ITM001');
      expect(result.nama).toEqual('Test Item');
      expect(result.kelompok_id).toEqual(testGroup.id);
      expect(result.satuan).toEqual('pcs');
      expect(result.harga_beli).toEqual(10000);
      expect(typeof result.harga_beli).toBe('number');
      expect(result.harga_jual).toEqual(15000);
      expect(typeof result.harga_jual).toBe('number');
      expect(result.stok).toEqual(50);
      expect(result.min_stok).toEqual(10);
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save inventory item to database', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const result = await createInventory(input);

      const items = await db.select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, result.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].kode).toEqual('ITM001');
      expect(parseFloat(items[0].harga_beli)).toEqual(10000);
      expect(parseFloat(items[0].harga_jual)).toEqual(15000);
    });

    it('should throw error when group does not exist', async () => {
      const input = { ...testInventoryInput, kelompok_id: 999 };
      await expect(createInventory(input)).rejects.toThrow(/does not exist/i);
    });
  });

  describe('getInventory', () => {
    it('should return empty array when no items exist', async () => {
      const result = await getInventory();
      expect(result).toEqual([]);
    });

    it('should return all inventory items', async () => {
      const input1 = { ...testInventoryInput, kelompok_id: testGroup.id };
      const input2 = { 
        ...testInventoryInput, 
        kode: 'ITM002', 
        nama: 'Second Item',
        kelompok_id: testGroup.id 
      };

      await createInventory(input1);
      await createInventory(input2);

      const result = await getInventory();

      expect(result).toHaveLength(2);
      expect(result[0].kode).toEqual('ITM001');
      expect(result[1].kode).toEqual('ITM002');
      expect(typeof result[0].harga_beli).toBe('number');
      expect(typeof result[0].harga_jual).toBe('number');
    });
  });

  describe('getInventoryById', () => {
    it('should return null when item does not exist', async () => {
      const result = await getInventoryById(999);
      expect(result).toBeNull();
    });

    it('should return inventory item by ID', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const created = await createInventory(input);
      const result = await getInventoryById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.kode).toEqual('ITM001');
      expect(typeof result!.harga_beli).toBe('number');
      expect(result!.harga_beli).toEqual(10000);
    });
  });

  describe('getInventoryByGroup', () => {
    it('should return empty array when group has no items', async () => {
      const result = await getInventoryByGroup(testGroup.id);
      expect(result).toEqual([]);
    });

    it('should return inventory items by group', async () => {
      const secondGroup = await createInventoryGroup({
        kode: 'GRP002',
        nama: 'Second Group',
        deskripsi: null
      });

      const input1 = { ...testInventoryInput, kelompok_id: testGroup.id };
      const input2 = { 
        ...testInventoryInput, 
        kode: 'ITM002', 
        kelompok_id: secondGroup.id 
      };

      await createInventory(input1);
      await createInventory(input2);

      const result = await getInventoryByGroup(testGroup.id);

      expect(result).toHaveLength(1);
      expect(result[0].kode).toEqual('ITM001');
      expect(result[0].kelompok_id).toEqual(testGroup.id);
    });
  });

  describe('getLowStockInventory', () => {
    it('should return items with low stock', async () => {
      const lowStockInput = { 
        ...testInventoryInput, 
        kelompok_id: testGroup.id,
        stok: 5, // Below min_stok of 10
        min_stok: 10 
      };
      const normalStockInput = { 
        ...testInventoryInput, 
        kode: 'ITM002',
        kelompok_id: testGroup.id,
        stok: 20, // Above min_stok
        min_stok: 10 
      };

      await createInventory(lowStockInput);
      await createInventory(normalStockInput);

      const result = await getLowStockInventory();

      expect(result).toHaveLength(1);
      expect(result[0].kode).toEqual('ITM001');
      expect(result[0].stok).toEqual(5);
      expect(result[0].min_stok).toEqual(10);
    });

    it('should return items with stock equal to min_stok', async () => {
      const equalStockInput = { 
        ...testInventoryInput, 
        kelompok_id: testGroup.id,
        stok: 10, // Equal to min_stok
        min_stok: 10 
      };

      await createInventory(equalStockInput);

      const result = await getLowStockInventory();

      expect(result).toHaveLength(1);
      expect(result[0].stok).toEqual(10);
      expect(result[0].min_stok).toEqual(10);
    });
  });

  describe('updateInventory', () => {
    it('should update inventory item', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const created = await createInventory(input);

      const result = await updateInventory(created.id, {
        nama: 'Updated Item',
        harga_jual: 20000,
        stok: 75
      });

      expect(result.id).toEqual(created.id);
      expect(result.nama).toEqual('Updated Item');
      expect(result.harga_beli).toEqual(10000); // unchanged
      expect(result.harga_jual).toEqual(20000); // updated
      expect(result.stok).toEqual(75); // updated
      expect(typeof result.harga_jual).toBe('number');
    });

    it('should throw error when item does not exist', async () => {
      await expect(updateInventory(999, { nama: 'Test' }))
        .rejects.toThrow(/not found/i);
    });

    it('should throw error when updating to non-existent group', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const created = await createInventory(input);

      await expect(updateInventory(created.id, { kelompok_id: 999 }))
        .rejects.toThrow(/does not exist/i);
    });
  });

  describe('updateInventoryStock', () => {
    it('should update inventory stock', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const created = await createInventory(input);

      const result = await updateInventoryStock(created.id, 100);

      expect(result.id).toEqual(created.id);
      expect(result.stok).toEqual(100);
      expect(result.nama).toEqual('Test Item'); // other fields unchanged
    });

    it('should throw error when item does not exist', async () => {
      await expect(updateInventoryStock(999, 100))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteInventory', () => {
    it('should delete inventory item', async () => {
      const input = { ...testInventoryInput, kelompok_id: testGroup.id };
      const created = await createInventory(input);

      const result = await deleteInventory(created.id);

      expect(result).toBe(true);

      const items = await db.select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, created.id))
        .execute();

      expect(items).toHaveLength(0);
    });

    it('should return false when item does not exist', async () => {
      const result = await deleteInventory(999);
      expect(result).toBe(false);
    });
  });
});