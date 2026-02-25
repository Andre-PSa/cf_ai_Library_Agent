import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';


export const libraryUsers = sqliteTable('Library Users', {
  userID: integer('User ID').primaryKey({ autoIncrement: true }),
  name: text('Name').notNull(),
  borrowedBooks: integer('Amount Borrowed').default(0)
});

export const bookRegistry = sqliteTable('Book Registry', {
  bookID: integer('Book ID').primaryKey({ autoIncrement: true }),
  title: text('Title').notNull().unique(),
  author: text('Author').notNull(),
  volumes: integer('Volumes').notNull().default(1),
  borrowed: integer('Borrowed').default(0)
});

export const requests = sqliteTable('Requests', {
  requestID: integer('Request ID').primaryKey({ autoIncrement: true }),
  userID: integer('User ID').notNull(),
  bookID: integer('Book ID').notNull(),
  requestDate: text('Request Date'),
  returnDate: text('Return Date'),
});