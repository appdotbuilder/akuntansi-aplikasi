import { db } from '../db';
import { usersTable, transactionHeadersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
// Use Bun's built-in password hashing
const hashPassword = async (password: string): Promise<string> => {
  return await Bun.password.hash(password);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await Bun.password.verify(password, hash);
};

// Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      nama_lengkap: usersTable.nama_lengkap,
      role: usersTable.role,
      is_active: usersTable.is_active,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get users:', error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      nama_lengkap: usersTable.nama_lengkap,
      role: usersTable.role,
      is_active: usersTable.is_active,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
}

// Get user by username (includes password hash for authentication)
export async function getUserByUsername(username: string): Promise<(User & { password_hash: string }) | null> {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      nama_lengkap: usersTable.nama_lengkap,
      role: usersTable.role,
      is_active: usersTable.is_active,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
      password_hash: usersTable.password_hash
    })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get user by username:', error);
    throw error;
  }
}

// Get active users only
export async function getActiveUsers(): Promise<User[]> {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      nama_lengkap: usersTable.nama_lengkap,
      role: usersTable.role,
      is_active: usersTable.is_active,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.is_active, true))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get active users:', error);
    throw error;
  }
}

// Create new user
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password
    const passwordHash = await hashPassword(input.password);

    const results = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        nama_lengkap: input.nama_lengkap,
        password_hash: passwordHash,
        role: input.role,
        is_active: input.is_active
      })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        nama_lengkap: usersTable.nama_lengkap,
        role: usersTable.role,
        is_active: usersTable.is_active,
        last_login: usersTable.last_login,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      })
      .execute();

    return results[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

// Update user
export async function updateUser(id: number, input: Partial<CreateUserInput>): Promise<User> {
  try {
    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.username !== undefined) updateValues.username = input.username;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.nama_lengkap !== undefined) updateValues.nama_lengkap = input.nama_lengkap;
    if (input.role !== undefined) updateValues.role = input.role;
    if (input.is_active !== undefined) updateValues.is_active = input.is_active;

    // Hash password if provided
    if (input.password !== undefined) {
      updateValues.password_hash = await hashPassword(input.password);
    }

    const results = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        nama_lengkap: usersTable.nama_lengkap,
        role: usersTable.role,
        is_active: usersTable.is_active,
        last_login: usersTable.last_login,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      })
      .execute();

    if (results.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

// Update user last login
export async function updateUserLastLogin(id: number): Promise<User> {
  try {
    const results = await db.update(usersTable)
      .set({
        last_login: new Date(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        nama_lengkap: usersTable.nama_lengkap,
        role: usersTable.role,
        is_active: usersTable.is_active,
        last_login: usersTable.last_login,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      })
      .execute();

    if (results.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('User last login update failed:', error);
    throw error;
  }
}

// Change user password
export async function changeUserPassword(id: number, oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    // First, get the user with password hash
    const userResults = await db.select({
      password_hash: usersTable.password_hash
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .execute();

    if (userResults.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    // Verify old password
    const isOldPasswordValid = await verifyPassword(oldPassword, userResults[0].password_hash);
    if (!isOldPasswordValid) {
      throw new Error('Old password is incorrect');
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    
    await db.update(usersTable)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Password change failed:', error);
    throw error;
  }
}

// Delete user (soft delete - set is_active to false)
export async function deleteUser(id: number): Promise<boolean> {
  try {
    // Check if user has existing transactions
    const transactionResults = await db.select()
    .from(transactionHeadersTable)
    .where(eq(transactionHeadersTable.user_id, id))
    .execute();

    if (transactionResults.length > 0) {
      throw new Error('Cannot delete user with existing transactions. User can only be deactivated.');
    }

    // Check if user exists first
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (userExists.length === 0) {
      return false; // User doesn't exist
    }

    // Soft delete by setting is_active to false
    await db.update(usersTable)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}