import type { Express } from "express";
import * as client from "openid-client";
import { authStorage } from "./storage";
import { isAuthenticated, getOidcConfig } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Sync profile data from Replit proxy headers, OIDC claims, and userinfo endpoint
  // Called by the frontend after login to ensure name/photo are captured
  app.get("/api/auth/sync-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const claims = req.user?.claims || {};
      const headers = req.headers as Record<string, string>;
      const accessToken = req.user?.access_token;

      // Start with OIDC token claims
      let firstName: string | null =
        claims["given_name"] || claims["first_name"] || claims["name"] || null;
      let lastName: string | null =
        claims["family_name"] || claims["last_name"] || null;
      let profileImageUrl: string | null =
        claims["picture"] || claims["profile_image_url"] || null;

      // Try to fetch fuller profile from the userinfo endpoint if we have an access token
      // This is the most reliable way to get the Google profile picture via Replit OIDC
      if (accessToken && !profileImageUrl) {
        try {
          const config = await getOidcConfig();
          const userInfo = await client.fetchUserInfo(
            config,
            accessToken,
            claims["sub"]
          );
          if (userInfo.picture && !profileImageUrl)
            profileImageUrl = userInfo.picture as string;
          if (userInfo.given_name && !firstName)
            firstName = userInfo.given_name as string;
          if (userInfo.family_name && !lastName)
            lastName = userInfo.family_name as string;
          if (userInfo.name && !firstName)
            firstName = userInfo.name as string;
        } catch (err) {
          console.warn("Failed to fetch userinfo for profile sync:", err);
        }
      }

      // Fallback: Replit injects these proxy headers on every authenticated request
      const replitName = headers["x-replit-user-name"];
      const replitPic = headers["x-replit-user-profile-image"];
      if (replitName && !firstName) firstName = replitName;
      if (replitPic && !profileImageUrl) profileImageUrl = replitPic;

      // Prevent email being used as a name
      const email = claims["email"] || null;
      if (firstName && email && firstName === email) firstName = null;
      if (lastName && email && lastName === email) lastName = null;

      // If full name is in one field (e.g. "Luan Ferreira"), split it
      if (firstName && firstName.includes(" ") && !lastName) {
        const parts = firstName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }

      // Only update if we have something useful
      if (firstName || profileImageUrl) {
        const existing = await authStorage.getUser(userId);
        await authStorage.upsertUser({
          id: userId,
          email: existing?.email ?? email,
          firstName: firstName ?? existing?.firstName ?? null,
          lastName: lastName ?? existing?.lastName ?? null,
          profileImageUrl: profileImageUrl ?? existing?.profileImageUrl ?? null,
        });
      }

      const updated = await authStorage.getUser(userId);
      res.json(updated);
    } catch (error) {
      console.error("Error syncing profile:", error);
      res.status(500).json({ message: "Failed to sync profile" });
    }
  });
}

