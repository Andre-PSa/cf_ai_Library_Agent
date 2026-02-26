import { z } from "zod";
import { tool } from "ai";
import { bookRegistry, libraryUsers, requests } from "./databaseSchema";
import { eq, like, or, and, isNull, sql } from 'drizzle-orm';
import {Filter} from 'bad-words';
import type { drizzle } from "drizzle-orm/d1";
const profanityFilter = new Filter();

export async function queryUsers(db: ReturnType<typeof drizzle>, searchQuery?: string) {
    try {
        let foundUsers;
        if (searchQuery) {
            foundUsers = await db.select()
                .from(libraryUsers)
                .where(like(libraryUsers.name, `%${searchQuery}%`));
        } else {
            foundUsers = await db.select().from(libraryUsers);
        }
        return foundUsers;
    } catch (error) {
        console.error("Database query failed:", error);
        throw new Error("Failed to query the database.");
    }
}

export async function deleteDatabase(db: ReturnType<typeof drizzle>) {
    try {
        await db.delete(requests).execute();
        await db.delete(bookRegistry).execute();
        await db.delete(libraryUsers).execute();
        return { success: true, message: "Database cleared successfully." };
    } catch (error) {
        console.error("Failed to clear the database:", error);
        return { success: false, error: "Failed to clear the database." };
    }
}

export async function createDatabase(db: ReturnType<typeof drizzle>) {
    try {
        await db.run(sql`CREATE TABLE "Book Registry"(
            "Book ID" INTEGER,
            "Title" TEXT UNIQUE,
            "Author" TEXT,
            "Volumes" INTEGER,
            "Borrowed" INTEGER NOT NULL,
            PRIMARY KEY ("Book ID")
            )`
        );
        await db.run(sql`CREATE TABLE "Library Users"(
            "User ID" INTEGER NOT NULL,
            "Name" TEXT NOT NULL,
            "Amount Borrowed" INTEGER,
            PRIMARY KEY ("User ID")
            )`
        );
        await db.run(sql`CREATE TABLE "Requests"(
            "Request ID" INTEGER NOT NULL,
            "User ID" INTEGER NOT NULL,
            "Book ID" INTEGER NOT NULL,
            "Request Date" TEXT,
            "Return Date" TEXT,
            PRIMARY KEY ("Request ID")
            )`
        );
        return { success: true, message: "Database created successfully." };
    } catch (error) {
        console.error("Failed to create the database:", error);
        return { success: false, error: "Failed to create the database." };
    }
}

export function buildAgentTools(isAdmin: boolean, db: ReturnType<typeof drizzle>) {
  
  const baseTools = {
    addUser: tool({
        description: 
        "Add a user to the database with their name.",
        inputSchema: z.object({
        name: z.string()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters")
            .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces") 
            .refine((name) => !profanityFilter.isProfane(name), "Name contains inappropriate language")
            .describe("The name of the user to add"),
            
        }),
        needsApproval:true,
        execute: async ({ name }) => {
        const result = await db.insert(libraryUsers).values({
            name,
        }).returning();
        return { success: true, userId: result[0].userID };
        }
    }),

    getUsers: tool({
      description: "Get a list of users from the database. You can optionally search for specific names or partial matches.",
      inputSchema: z.object({
        searchQuery: z.string().optional()
          .describe("An optional name or partial name to search for. Leave empty to get all users.")
      }),
      execute: async ({ searchQuery }) => {
        try {
            const result = await queryUsers(db, searchQuery);
            return { success: true, Users_Found: result.length, users: result };
        } catch (error) {
            return { success: false, error: "Failed to retrieve users from the database." };
        }
      }
    }),

    getBooks: tool({
      description: "Get a list of books from the database. You can optionally search for specific titles, authors, or partial matches.",
      inputSchema: z.object({
        searchQuery: z.string().optional()
          .describe("An optional title, author, or partial match to search for. Leave empty to get all books.")
      }),
      execute: async ({ searchQuery }) => {
        try {
            let foundBooks;
            if (searchQuery) {
                foundBooks = await db.select()
                    .from(bookRegistry)
                    .where(or(
                        like(bookRegistry.title, `%${searchQuery}%`),
                        like(bookRegistry.author, `%${searchQuery}%`)
                    ));
            } else {
                foundBooks = await db.select().from(bookRegistry);
            }
            if (foundBooks.length === 0) {
                return { success: false, error: "No books found matching the search query." };
            }
            return { success: true, Books_Found: foundBooks.length, books: foundBooks };
        } catch (error) {
            return { success: false, error: "Failed to retrieve books from the database." };
        }
      }
    }),

    checkUserBorrowedBooks: tool({
        description: "Check which books a user has borrowed.",
        inputSchema: z.object({
            userName: z.string().describe("The name of the user to check")
        }),
        execute: async ({ userName }) => {
            try {
                const users = await queryUsers(db, userName);
                if (users.length === 0) {
                    return { success: false, error: "No user found with that name." };
                }
                else if (users.length > 1) {
                    return {error: "Multiple users found with that name. Please provide a more specific name.", similarUsers: users};
                }
                const user = users[0];
                const borrowedBooks = await db.select().from(bookRegistry)
                    .innerJoin(requests, and(eq(requests.userID, user.userID), eq(requests.bookID, bookRegistry.bookID)))
                    .where(isNull(requests.returnDate));
                return { success: true, user: user, borrowedBooks: borrowedBooks };
            } catch (error) {
                return { success: false, error: "Failed to retrieve borrowed books for the user." };
            }
        }
    }),

    RequestBook: tool({
        description: "Request to borrow a book from the library.",
        inputSchema: z.object({
            userName: z.string().describe("The name of the user requesting the book"),
            bookTitle: z.string().describe("The title of the book to request")
        }),
        needsApproval:true,
        execute: async ({ userName, bookTitle }) => {
            try {
                const users = await queryUsers(db, userName);
                if (users.length === 0) {
                    return { success: false, error: "No user found with that name." };
                }
                else if (users.length > 1) {
                    return {error: "Multiple users found with that name. Please provide a more specific name.", similarUsers: users};
                }
                const user = users[0];

                const books = await db.select().from(bookRegistry).where(like(bookRegistry.title, `%${bookTitle}%`));
                if (books.length === 0) {
                    return { success: false, error: "No book found with that title." };
                }
                else if (books.length > 1) {
                    return {error: "Multiple books found with that title. Please provide a more specific title.", similarBooks: books};
                }
                const book = books[0];


                if (book.borrowed !== null && book.borrowed >= book.volumes) {
                    return { success: false, error: "All volumes of this book are currently borrowed." };
                }

                const borrowedBooks = await db.select().from(bookRegistry)
                    .innerJoin(requests, and(eq(requests.userID, user.userID), eq(requests.bookID, bookRegistry.bookID)))
                    .where(isNull(requests.returnDate));

                if (borrowedBooks.some(b => b["Requests"].bookID === book.bookID)) {
                    return { success: false, error: "User has already borrowed this book." };
                }

                await db.insert(requests).values({
                    userID: user.userID,
                    bookID: book.bookID,
                    requestDate: new Date().toISOString(),
                    returnDate: null
                });
                await db.update(bookRegistry).set({ borrowed: (book.borrowed || 0) + 1 }).where(eq(bookRegistry.bookID, book.bookID));
                await db.update(libraryUsers).set({ borrowedBooks: (user.borrowedBooks || 0) + 1 }).where(eq(libraryUsers.userID, user.userID));
                return { success: true, message: `Book "${book.title}" requested successfully for user "${user.name}".` };
            } catch (error) {
                return { success: false, error: "Failed to request the book." };
            }
        }
    }),

    ReturnBook: tool({
        description: "Return a borrowed book to the library.",
        inputSchema: z.object({
            userName: z.string().describe("The name of the user returning the book"),
            bookTitle: z.string().describe("The title of the book to return")
        }),
        needsApproval:true,
        execute: async ({ userName, bookTitle }) => {
            try {
                const users = await queryUsers(db, userName);
                if (users.length === 0) {
                    return { success: false, error: "No user found with that name." };
                }
                else if (users.length > 1) {
                    return {error: "Multiple users found with that name. Please provide a more specific name.", similarUsers: users};
                }
                const user = users[0];

                const books = await db.select().from(bookRegistry).where(like(bookRegistry.title, `%${bookTitle}%`));
                if (books.length === 0) {
                    return { success: false, error: "No book found with that title." };
                }
                else if (books.length > 1) {
                    return {error: "Multiple books found with that title. Please provide a more specific title.", similarBooks: books};
                }
                const book = books[0];

                const request = await db.select().from(requests)
                    .where(and(
                        eq(requests.userID, user.userID),
                        eq(requests.bookID, book.bookID),
                        isNull(requests.returnDate)
                    )).then(res => res[0]);

                if (!request) {
                    return { success: false, error: "No active borrow request found for this user and book." };
                }

                await db.update(requests).set({ returnDate: new Date().toISOString() }).where(eq(requests.requestID, request.requestID));
                await db.update(bookRegistry).set({ borrowed: (book.borrowed || 1) - 1 }).where(eq(bookRegistry.bookID, book.bookID));
                await db.update(libraryUsers).set({ borrowedBooks: (user.borrowedBooks || 1) - 1 }).where(eq(libraryUsers.userID, user.userID));    
                return { success: true, message: `Book "${book.title}" returned successfully by user "${user.name}".` };
            } catch (error) {
                return { success: false, error: "Failed to return the book." };
            }
        }
    }),
};

  const adminTools = {
    removeUserByName: tool({
        description: "Remove a user from the database by name.",
        inputSchema: z.object({
            userName: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters")
        }),
        needsApproval:true,
        execute: async ({ userName }) => {
        const users = await queryUsers(db, userName);
        if (users.length === 0) {
            return { success: false, error: "No user found with that name." };
        }
        else if (users.length > 1) {
            return {error: "Multiple users found with that name. Please provide a more specific name.", similarUsers: users};
        }
        
        const activeRequests = await db.select().from(requests).where(and(eq(requests.userID, users[0].userID), isNull(requests.returnDate)));
        for (const request of activeRequests) {
            await db.update(bookRegistry).set({ borrowed: sql`${bookRegistry.borrowed} - 1` }).where(eq(bookRegistry.bookID, request.bookID));
        }
        await db.delete(requests).where(eq(requests.userID, users[0].userID));
        const result = await db.delete(libraryUsers).where(eq(libraryUsers.name, userName)).returning();
        return { success: true, removedUser: result[0] };
        }
    }),

    addBook: tool({
        description: 
        "Add a book to the database with its title, author, and amount of volumes.If the User only provides the Title, search for the author",
        inputSchema: z.object({
        title: z.string()
            .min(2, "Title must be at least 2 characters")
            .max(100, "Title cannot exceed 100 characters")
            .refine((title) => !profanityFilter.isProfane(title), "Title contains inappropriate language")
            .describe("The title of the book to add"),

        author: z.string()
            .min(2, "Author must be at least 2 characters")
            .max(100, "Author cannot exceed 100 characters")
            .describe("The author of the book to add"),

        volumes: z.coerce.number().int().positive().default(1)
            .describe("The number of volumes for the book to add. If the user doesn't specify, it will default to 1."),
        }),
        needsApproval:true,
        execute: async ({ title,author,volumes }) => {
            const result = await db.insert(bookRegistry).values({
                title,
                author,
                volumes
        }).returning();
        return { success: true, Author: author, bookId: result[0].bookID };
        }
    }),

    removeBookByTitle: tool({
        description: "Remove a book from the database by title.",
        inputSchema: z.object({
            title: z.string().min(2, "Title must be at least 2 characters").max(100, "Title cannot exceed 100 characters")
        }),
        needsApproval:true,
        execute: async ({ title }) => {
            const books = await db.select().from(bookRegistry).where(like(bookRegistry.title, `%${title}%`));
            if (books.length === 0) {
                return { success: false, error: "No book found with that title." };
            }
            else if (books.length > 1) {
                return {error: "Multiple books found with that title. Please provide a more specific title.", similarBooks: books};
            }
            const book = books[0];
            const activeRequests = await db.select().from(requests).where(and(eq(requests.bookID, book.bookID), isNull(requests.returnDate)));
            for (const request of activeRequests) {
                await db.update(libraryUsers).set({ borrowedBooks: sql`${libraryUsers.borrowedBooks} - 1` }).where(eq(libraryUsers.userID, request.userID));
            }
            await db.delete(requests).where(eq(requests.bookID, book.bookID));
            try{
                const result = await db.delete(bookRegistry).where(eq(bookRegistry.bookID, book.bookID)).returning();
                return { success: true, removedBook: result[0] };
            } catch (error) {
                return { success: false, error: "Failed to remove the book." };
            }
        }
    }),

    changeStock: tool({
        description: "Increase or decrease the number of volumes of a Book.",
        inputSchema: z.object({
            title: z.string().min(2, "Title must be at least 2 characters").max(100, "Title cannot exceed 100 characters"),
            volumeChange: z.coerce.number().int().describe("The number of volumes to add (positive) or remove (negative) from the stock")
        }),
        needsApproval:true,
        execute: async ({ title, volumeChange }) => {
            const books = await db.select().from(bookRegistry).where(like(bookRegistry.title, `%${title}%`));
            if (books.length === 0) {
                return { success: false, error: "No book found with that title." };
            }
            else if (books.length > 1) {
                return {error: "Multiple books found with that title. Please provide a more specific title.", similarBooks: books};
            }
            const book = books[0];
            const newVolumeCount = book.volumes + volumeChange;
            if (newVolumeCount < 0) {
                return { success: false, error: "Volume change cannot result in negative stock." };
            }
            try{
                const result = await db.update(bookRegistry).set({ volumes: newVolumeCount }).where(eq(bookRegistry.bookID, book.bookID)).returning();
                return { success: true, updatedBook: result[0] };
            } catch (error) {
                return { success: false, error: "Failed to update the book stock." };
            }
        }
    }),

    getAllRequests: tool({
        description: "Get a list of all book requests in the system, including user and book details.",
        inputSchema: z.object({}),
        execute: async () => {
            try {
                const requestsList = await db.select()
                    .from(requests)
                    .innerJoin(libraryUsers, eq(requests.userID, libraryUsers.userID))
                    .innerJoin(bookRegistry, eq(requests.bookID, bookRegistry.bookID))
                    .then(results => results.map(result => ({
                        requestID: result.Requests.requestID,
                        userName: result["Library Users"].name,
                        bookTitle: result["Book Registry"].title,
                        requestDate: result.Requests.requestDate,
                        returnDate: result.Requests.returnDate
                    })));
                return { success: true, requests: requestsList };
            } catch (error) {
                return { success: false, error: "Failed to retrieve requests from the database." };
            }
        }
    }),

    getRequestsByBook: tool({
        description: "Get all requests for a specific book by title.",
        inputSchema: z.object({
            bookTitle: z.string().describe("The title of the book to search requests for")
        }),
        execute: async ({ bookTitle }) => {
            try {
                const books = await db.select().from(bookRegistry).where(like(bookRegistry.title, `%${bookTitle}%`));
                if (books.length === 0) {
                    return { success: false, error: "No book found with that title." };
                } else if (books.length > 1) {
                    return { success: false, error: "Multiple books found with that title. Please provide a more specific title.", similarBooks: books };
                }

                const book = books[0];
                const requestsList = await db.select()
                    .from(requests)
                    .innerJoin(libraryUsers, eq(requests.userID, libraryUsers.userID))
                    .where(eq(requests.bookID, book.bookID))
                    .then(results => results.map(result => ({
                        requestID: result.Requests.requestID,
                        userName: result["Library Users"].name,
                        requestDate: result.Requests.requestDate,
                        returnDate: result.Requests.returnDate
                    })));

                return { success: true, requests: requestsList };
            } catch (error) {
                return { success: false, error: "Failed to retrieve requests for the book." };
            }
        }
    }),

    removeRequest: tool({
        description: "Remove a request by the user's name and book's title",
        inputSchema: z.object({
            userName: z.string().describe("The name of the user whose request you want to remove"),
            bookTitle: z.string().describe("The title of the book for which you want to remove the request")
        }),
        needsApproval:true,
        execute: async ({ userName, bookTitle }) => {
            const users = await queryUsers(db, userName);
            if (users.length === 0) {
                return { success: false, error: "No user found with that name." };
            }
            else if (users.length > 1) {
                return {error: "Multiple users found with that name. Please provide a more specific name.", similarUsers: users};
            }
            const user = users[0];

            const books = await db.select().from(bookRegistry).where(like(bookRegistry.title, `%${bookTitle}%`));
            if (books.length === 0) {
                return { success: false, error: "No book found with that title." };
            }
            else if (books.length > 1) {
                return {error: "Multiple books found with that title. Please provide a more specific title.", similarBooks: books};
            }
            const book = books[0];

            const request = await db.select().from(requests)
                .where(and(
                    eq(requests.userID, user.userID),
                    eq(requests.bookID, book.bookID)
                )).then(res => res[0]);

            try {
                await db.delete(requests).where(eq(requests.requestID, request.requestID));
                if (request.returnDate === null) {
                    await db.update(bookRegistry).set({ borrowed: sql`${bookRegistry.borrowed} - 1` }).where(eq(bookRegistry.bookID, book.bookID));
                    await db.update(libraryUsers).set({ borrowedBooks: sql`${libraryUsers.borrowedBooks} - 1` }).where(eq(libraryUsers.userID, user.userID)); 
                }   
                return { success: true, message: `Request for book "${book.title}" by user "${user.name}" removed successfully.` };
            } catch (error) {
                return { success: false, error: "Failed to remove the request." };
            }
        }
    }),

    createTestDatabase: tool({
        description: "Populate the database with test data, including users, books, and requests.",
        inputSchema: z.object({}),
        needsApproval:true,
        execute: async () => {
            await deleteDatabase(db);
            await createDatabase(db);
            try {
                await db.insert(libraryUsers).values([
                    { name: "Alice" , borrowedBooks: 2},
                    { name: "Bob" , borrowedBooks: 1},
                    { name: "Charlie"},
                    { name: "David" },
                ]);
                await db.insert(bookRegistry).values([
                    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", volumes: 12 , borrowed: 1},
                    { title: "To Kill a Mockingbird", author: "Harper Lee", volumes: 8 , borrowed: 1},
                    { title: "1984", author: "George Orwell", volumes: 4 },
                    { title: "Pride and Prejudice", author: "Jane Austen", volumes: 10 , borrowed: 1},
                ]);
                await db.insert(requests).values([
                    { userID: 1, bookID: 1, requestDate: new Date("2026-02-23T15:30:00Z").toISOString(), returnDate: null },
                    { userID: 2, bookID: 2, requestDate: new Date("2026-02-18T14:00:00Z").toISOString(), returnDate: null },
                    { userID: 1, bookID: 4, requestDate: new Date("2026-02-27T09:30:00Z").toISOString(), returnDate: null },
                ]);
                return { success: true, message: "Test database created successfully." };
            } catch (error) {
                return { success: false, error: "Failed to create test database." };
            }
        }
    })
  };
  return isAdmin ? { ...baseTools, ...adminTools } : baseTools;
}