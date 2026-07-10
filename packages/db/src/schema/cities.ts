import { boolean, pgTable, real, text } from 'drizzle-orm/pg-core'

/** Cities available as user home locations and trip origins/destinations. */
export const cities = pgTable('cities', {
  id: text().primaryKey(),
  name: text().notNull(),
  province: text().notNull(),
  latitude: real().notNull(),
  longitude: real().notNull(),
  isPopular: boolean('is_popular').notNull().default(false),
})
