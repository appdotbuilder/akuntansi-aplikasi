import { db } from '../db';
import { inventoryGroupsTable, inventoryTable } from '../db/schema';
import { type CreateInventoryGroupInput, type InventoryGroup, type CreateInventoryInput, type Inventory } from '../schema';
import { eq, lte, sql } from 'drizzle-orm';

// ===== INVENTORY GROUPS (Kelompok Persediaan) =====

// Get all inventory groups
export async function getInventoryGroups(): Promise<InventoryGroup[]> {
  try {
    const results = await db.select()
      .from(inventoryGroupsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get inventory groups:', error);
    throw error;
  }
}

// Get inventory group by ID
export async function getInventoryGroupById(id: number): Promise<InventoryGroup | null> {
  try {
    const results = await db.select()
      .from(inventoryGroupsTable)
      .where(eq(inventoryGroupsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get inventory group by ID:', error);
    throw error;
  }
}

// Create new inventory group
export async function createInventoryGroup(input: CreateInventoryGroupInput): Promise<InventoryGroup> {
  try {
    const results = await db.insert(inventoryGroupsTable)
      .values({
        kode: input.kode,
        nama: input.nama,
        deskripsi: input.deskripsi
      })
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to create inventory group:', error);
    throw error;
  }
}

// Update inventory group
export async function updateInventoryGroup(id: number, input: Partial<CreateInventoryGroupInput>): Promise<InventoryGroup> {
  try {
    const updateData: any = {
      updated_at: sql`now()`
    };

    if (input.kode !== undefined) updateData.kode = input.kode;
    if (input.nama !== undefined) updateData.nama = input.nama;
    if (input.deskripsi !== undefined) updateData.deskripsi = input.deskripsi;

    const results = await db.update(inventoryGroupsTable)
      .set(updateData)
      .where(eq(inventoryGroupsTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Inventory group with ID ${id} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Failed to update inventory group:', error);
    throw error;
  }
}

// Delete inventory group
export async function deleteInventoryGroup(id: number): Promise<boolean> {
  try {
    // Check if group has inventory items
    const inventoryItems = await db.select({ count: sql<number>`count(*)` })
      .from(inventoryTable)
      .where(eq(inventoryTable.kelompok_id, id))
      .execute();

    if (inventoryItems[0].count > 0) {
      throw new Error('Cannot delete inventory group: it has inventory items');
    }

    const results = await db.delete(inventoryGroupsTable)
      .where(eq(inventoryGroupsTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Failed to delete inventory group:', error);
    throw error;
  }
}

// ===== INVENTORY ITEMS (Data Persediaan) =====

// Get all inventory items
export async function getInventory(): Promise<Inventory[]> {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .execute();

    return results.map(item => ({
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    }));
  } catch (error) {
    console.error('Failed to get inventory:', error);
    throw error;
  }
}

// Get inventory item by ID
export async function getInventoryById(id: number): Promise<Inventory | null> {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, id))
      .execute();

    if (results.length === 0) return null;

    const item = results[0];
    return {
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    };
  } catch (error) {
    console.error('Failed to get inventory by ID:', error);
    throw error;
  }
}

// Get inventory items by group
export async function getInventoryByGroup(kelompokId: number): Promise<Inventory[]> {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.kelompok_id, kelompokId))
      .execute();

    return results.map(item => ({
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    }));
  } catch (error) {
    console.error('Failed to get inventory by group:', error);
    throw error;
  }
}

// Get low stock inventory items
export async function getLowStockInventory(): Promise<Inventory[]> {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .where(lte(inventoryTable.stok, inventoryTable.min_stok))
      .execute();

    return results.map(item => ({
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    }));
  } catch (error) {
    console.error('Failed to get low stock inventory:', error);
    throw error;
  }
}

// Create new inventory item
export async function createInventory(input: CreateInventoryInput): Promise<Inventory> {
  try {
    // Verify inventory group exists
    const group = await getInventoryGroupById(input.kelompok_id);
    if (!group) {
      throw new Error(`Inventory group with ID ${input.kelompok_id} does not exist`);
    }

    const results = await db.insert(inventoryTable)
      .values({
        kode: input.kode,
        nama: input.nama,
        kelompok_id: input.kelompok_id,
        satuan: input.satuan,
        harga_beli: input.harga_beli.toString(),
        harga_jual: input.harga_jual.toString(),
        stok: input.stok,
        min_stok: input.min_stok,
        is_active: input.is_active
      })
      .returning()
      .execute();

    const item = results[0];
    return {
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    };
  } catch (error) {
    console.error('Failed to create inventory:', error);
    throw error;
  }
}

// Update inventory item
export async function updateInventory(id: number, input: Partial<CreateInventoryInput>): Promise<Inventory> {
  try {
    // Verify inventory group exists if being updated
    if (input.kelompok_id !== undefined) {
      const group = await getInventoryGroupById(input.kelompok_id);
      if (!group) {
        throw new Error(`Inventory group with ID ${input.kelompok_id} does not exist`);
      }
    }

    const updateData: any = {
      updated_at: sql`now()`
    };

    if (input.kode !== undefined) updateData.kode = input.kode;
    if (input.nama !== undefined) updateData.nama = input.nama;
    if (input.kelompok_id !== undefined) updateData.kelompok_id = input.kelompok_id;
    if (input.satuan !== undefined) updateData.satuan = input.satuan;
    if (input.harga_beli !== undefined) updateData.harga_beli = input.harga_beli.toString();
    if (input.harga_jual !== undefined) updateData.harga_jual = input.harga_jual.toString();
    if (input.stok !== undefined) updateData.stok = input.stok;
    if (input.min_stok !== undefined) updateData.min_stok = input.min_stok;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const results = await db.update(inventoryTable)
      .set(updateData)
      .where(eq(inventoryTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Inventory item with ID ${id} not found`);
    }

    const item = results[0];
    return {
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    };
  } catch (error) {
    console.error('Failed to update inventory:', error);
    throw error;
  }
}

// Update inventory stock
export async function updateInventoryStock(id: number, quantity: number): Promise<Inventory> {
  try {
    const results = await db.update(inventoryTable)
      .set({
        stok: quantity,
        updated_at: sql`now()`
      })
      .where(eq(inventoryTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Inventory item with ID ${id} not found`);
    }

    const item = results[0];
    return {
      ...item,
      harga_beli: parseFloat(item.harga_beli),
      harga_jual: parseFloat(item.harga_jual)
    };
  } catch (error) {
    console.error('Failed to update inventory stock:', error);
    throw error;
  }
}

// Delete inventory item
export async function deleteInventory(id: number): Promise<boolean> {
  try {
    const results = await db.delete(inventoryTable)
      .where(eq(inventoryTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Failed to delete inventory:', error);
    throw error;
  }
}