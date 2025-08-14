import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionHeadersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { 
  getUsers,
  getUserById,
  getUserByUsername,
  getActiveUsers,
  createUser,
  updateUser,
  updateUserLastLogin,
  changeUserPassword,
  deleteUser
} from '../handlers/users';
import { eq } from 'drizzle-orm';
// Using Bun's built-in password utilities
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await Bun.password.verify(password, hash);
};

// Test input data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  nama_lengkap: 'Test User',
  password: 'password123',
  role: 'OPERATOR',
  is_active: true
};

const testAdminInput: CreateUserInput = {
  username: 'admin',
  email: 'admin@example.com',
  nama_lengkap: 'Admin User',
  password: 'admin123',
  role: 'ADMIN',
  is_active: true
};

const testInactiveInput: CreateUserInput = {
  username: 'inactive',
  email: 'inactive@example.com',
  nama_lengkap: 'Inactive User',
  password: 'inactive123',
  role: 'VIEWER',
  is_active: false
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const result = await createUser(testUserInput);

      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.nama_lengkap).toEqual('Test User');
      expect(result.role).toEqual('OPERATOR');
      expect(result.is_active).toEqual(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.last_login).toBeNull();
    });

    it('should save user to database with hashed password', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].password_hash).toBeDefined();
      expect(users[0].password_hash).not.toEqual('password123'); // Should be hashed
      
      // Verify password is correctly hashed
      const isPasswordValid = await verifyPassword('password123', users[0].password_hash);
      expect(isPasswordValid).toBe(true);
    });

    it('should apply default values', async () => {
      const inputWithoutDefaults: CreateUserInput = {
        username: 'nodefaults',
        email: 'nodefaults@example.com',
        nama_lengkap: 'No Defaults User',
        password: 'password123',
        role: 'VIEWER',
        is_active: true // This is required in the input
      };

      const result = await createUser(inputWithoutDefaults);
      expect(result.is_active).toEqual(true);
    });

    it('should reject duplicate username', async () => {
      await createUser(testUserInput);
      
      expect(createUser(testUserInput)).rejects.toThrow();
    });

    it('should reject duplicate email', async () => {
      await createUser(testUserInput);
      
      const duplicateEmailInput: CreateUserInput = {
        ...testUserInput,
        username: 'different'
      };
      
      expect(createUser(duplicateEmailInput)).rejects.toThrow();
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const users = await getUsers();
      expect(users).toEqual([]);
    });

    it('should return all users without password hash', async () => {
      await createUser(testUserInput);
      await createUser(testAdminInput);
      await createUser(testInactiveInput);

      const users = await getUsers();
      
      expect(users).toHaveLength(3);
      users.forEach(user => {
        expect(user.username).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.role).toBeDefined();
        expect((user as any).password_hash).toBeUndefined(); // Should not include password
      });
    });

    it('should include both active and inactive users', async () => {
      await createUser(testUserInput);
      await createUser(testInactiveInput);

      const users = await getUsers();
      
      expect(users).toHaveLength(2);
      expect(users.some(u => u.is_active === true)).toBe(true);
      expect(users.some(u => u.is_active === false)).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const user = await getUserById(999);
      expect(user).toBeNull();
    });

    it('should return user by id without password hash', async () => {
      const created = await createUser(testUserInput);
      const user = await getUserById(created.id);

      expect(user).toBeDefined();
      expect(user!.id).toEqual(created.id);
      expect(user!.username).toEqual('testuser');
      expect((user as any).password_hash).toBeUndefined();
    });
  });

  describe('getUserByUsername', () => {
    it('should return null for non-existent username', async () => {
      const user = await getUserByUsername('nonexistent');
      expect(user).toBeNull();
    });

    it('should return user by username with password hash', async () => {
      await createUser(testUserInput);
      const user = await getUserByUsername('testuser');

      expect(user).toBeDefined();
      expect(user!.username).toEqual('testuser');
      expect(user!.password_hash).toBeDefined();
      expect(typeof user!.password_hash).toBe('string');
    });
  });

  describe('getActiveUsers', () => {
    it('should return only active users', async () => {
      await createUser(testUserInput);
      await createUser(testInactiveInput);

      const activeUsers = await getActiveUsers();
      
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].username).toEqual('testuser');
      expect(activeUsers[0].is_active).toBe(true);
    });

    it('should return empty array when no active users', async () => {
      await createUser(testInactiveInput);

      const activeUsers = await getActiveUsers();
      expect(activeUsers).toEqual([]);
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const created = await createUser(testUserInput);
      
      const updateData = {
        email: 'updated@example.com',
        nama_lengkap: 'Updated Name',
        role: 'ADMIN' as const
      };

      const updated = await updateUser(created.id, updateData);

      expect(updated.email).toEqual('updated@example.com');
      expect(updated.nama_lengkap).toEqual('Updated Name');
      expect(updated.role).toEqual('ADMIN');
      expect(updated.username).toEqual('testuser'); // Unchanged
      expect(updated.updated_at).not.toEqual(created.updated_at);
    });

    it('should update password with hashing', async () => {
      const created = await createUser(testUserInput);
      
      await updateUser(created.id, { password: 'newpassword123' });

      // Verify new password works
      const userWithPassword = await getUserByUsername('testuser');
      const isNewPasswordValid = await verifyPassword('newpassword123', userWithPassword!.password_hash);
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await verifyPassword('password123', userWithPassword!.password_hash);
      expect(isOldPasswordValid).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      expect(updateUser(999, { email: 'test@example.com' })).rejects.toThrow(/not found/i);
    });
  });

  describe('updateUserLastLogin', () => {
    it('should update last login timestamp', async () => {
      const created = await createUser(testUserInput);
      expect(created.last_login).toBeNull();

      const updated = await updateUserLastLogin(created.id);

      expect(updated.last_login).toBeInstanceOf(Date);
      expect(updated.last_login!.getTime()).toBeCloseTo(new Date().getTime(), -2); // Within ~10ms
    });

    it('should throw error for non-existent user', async () => {
      expect(updateUserLastLogin(999)).rejects.toThrow(/not found/i);
    });
  });

  describe('changeUserPassword', () => {
    it('should change password with correct old password', async () => {
      const created = await createUser(testUserInput);
      
      const success = await changeUserPassword(created.id, 'password123', 'newpassword456');
      expect(success).toBe(true);

      // Verify new password works
      const userWithPassword = await getUserByUsername('testuser');
      const isNewPasswordValid = await verifyPassword('newpassword456', userWithPassword!.password_hash);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should reject incorrect old password', async () => {
      const created = await createUser(testUserInput);
      
      expect(changeUserPassword(created.id, 'wrongpassword', 'newpassword456'))
        .rejects.toThrow(/old password is incorrect/i);
    });

    it('should throw error for non-existent user', async () => {
      expect(changeUserPassword(999, 'oldpass', 'newpass'))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user without transactions', async () => {
      const created = await createUser(testUserInput);
      
      const success = await deleteUser(created.id);
      expect(success).toBe(true);

      // User should still exist but be inactive
      const user = await getUserById(created.id);
      expect(user).toBeDefined();
      expect(user!.is_active).toBe(false);
    });

    it('should prevent deletion of user with transactions', async () => {
      const created = await createUser(testUserInput);

      // Create a transaction for the user
      await db.insert(transactionHeadersTable).values({
        nomor_transaksi: 'TRX001',
        tanggal: new Date(),
        tipe: 'JURNAL_UMUM',
        deskripsi: 'Test transaction',
        user_id: created.id
      }).execute();

      expect(deleteUser(created.id)).rejects.toThrow(/existing transactions/i);
    });

    it('should return false for non-existent user', async () => {
      const success = await deleteUser(999);
      expect(success).toBe(false);
    });
  });
});