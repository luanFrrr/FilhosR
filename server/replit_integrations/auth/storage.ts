import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, data: {
    displayFirstName?: string | null;
    displayLastName?: string | null;
    displayPhotoUrl?: string | null;
  }): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, data: {
    displayFirstName?: string | null;
    displayLastName?: string | null;
    displayPhotoUrl?: string | null;
  }): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        displayFirstName: data.displayFirstName,
        displayLastName: data.displayLastName,
        displayPhotoUrl: data.displayPhotoUrl,
        profileCustomized: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
}

export const authStorage = new AuthStorage();
