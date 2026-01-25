import { z } from 'zod';
import { 
  insertUserSchema, 
  insertChildSchema, 
  insertGrowthRecordSchema, 
  insertVaccineSchema, 
  insertHealthRecordSchema, 
  insertMilestoneSchema, 
  insertDiaryEntrySchema,
  insertVaccineRecordSchema,
  users,
  children,
  growthRecords,
  vaccines,
  healthRecords,
  milestones,
  diaryEntries,
  gamification,
  susVaccines,
  vaccineRecords
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // Auth & User
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation, // Not authenticated
      },
    },
    gamification: {
      method: 'GET' as const,
      path: '/api/gamification',
      responses: {
        200: z.custom<typeof gamification.$inferSelect>(),
      },
    }
  },

  // Children
  children: {
    list: {
      method: 'GET' as const,
      path: '/api/children',
      responses: {
        200: z.array(z.custom<typeof children.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children',
      input: insertChildSchema,
      responses: {
        201: z.custom<typeof children.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/children/:id',
      responses: {
        200: z.custom<typeof children.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/children/:id',
      input: insertChildSchema.partial(),
      responses: {
        200: z.custom<typeof children.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/children/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Growth Records
  growth: {
    list: {
      method: 'GET' as const,
      path: '/api/children/:childId/growth',
      responses: {
        200: z.array(z.custom<typeof growthRecords.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children/:childId/growth',
      input: insertGrowthRecordSchema.omit({ childId: true }),
      responses: {
        201: z.custom<typeof growthRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // Vaccines
  vaccines: {
    list: {
      method: 'GET' as const,
      path: '/api/children/:childId/vaccines',
      responses: {
        200: z.array(z.custom<typeof vaccines.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children/:childId/vaccines',
      input: insertVaccineSchema.omit({ childId: true }),
      responses: {
        201: z.custom<typeof vaccines.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/vaccines/:id',
      input: insertVaccineSchema.partial(),
      responses: {
        200: z.custom<typeof vaccines.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Health Records
  health: {
    list: {
      method: 'GET' as const,
      path: '/api/children/:childId/health',
      responses: {
        200: z.array(z.custom<typeof healthRecords.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children/:childId/health',
      input: insertHealthRecordSchema.omit({ childId: true }),
      responses: {
        201: z.custom<typeof healthRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // Milestones
  milestones: {
    list: {
      method: 'GET' as const,
      path: '/api/children/:childId/milestones',
      responses: {
        200: z.array(z.custom<typeof milestones.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children/:childId/milestones',
      input: insertMilestoneSchema.omit({ childId: true }),
      responses: {
        201: z.custom<typeof milestones.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/children/:childId/milestones/:milestoneId',
      input: insertMilestoneSchema.omit({ childId: true }).partial(),
      responses: {
        200: z.custom<typeof milestones.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/children/:childId/milestones/:milestoneId',
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // Diary
  diary: {
    list: {
      method: 'GET' as const,
      path: '/api/children/:childId/diary',
      responses: {
        200: z.array(z.custom<typeof diaryEntries.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children/:childId/diary',
      input: insertDiaryEntrySchema.omit({ childId: true }),
      responses: {
        201: z.custom<typeof diaryEntries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // SUS Vaccines Catalog
  susVaccines: {
    list: {
      method: 'GET' as const,
      path: '/api/sus-vaccines',
      responses: {
        200: z.array(z.custom<typeof susVaccines.$inferSelect>()),
      },
    },
  },

  // Vaccine Records (Carteira Vacinal)
  vaccineRecords: {
    list: {
      method: 'GET' as const,
      path: '/api/children/:childId/vaccine-records',
      responses: {
        200: z.array(z.custom<typeof vaccineRecords.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/children/:childId/vaccine-records',
      input: insertVaccineRecordSchema.omit({ childId: true }),
      responses: {
        201: z.custom<typeof vaccineRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/vaccine-records/:id',
      input: insertVaccineRecordSchema.partial(),
      responses: {
        200: z.custom<typeof vaccineRecords.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/vaccine-records/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type InsertChild = z.infer<typeof insertChildSchema>;
export type InsertVaccineRecord = z.infer<typeof insertVaccineRecordSchema>;
