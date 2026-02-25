# Vercel AI SDK Tools Documentation

## addUser

**Description:** Add a user to the database with their name. This tool is triggered when a new user needs to be added to the library system.

**Needs Approval:** Yes

**Input Parameters:**
  * `name` (string): The name of the user to add. Must be between 2 and 100 characters, contain only letters and spaces, and must not include inappropriate language.

**Database Action:** Inserts a new row into the `libraryUsers` table.

**Returns:**
  * Success: `{ success: true, userId: <new_user_id> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## getUsers

**Description:** Retrieve a list of users from the database. Optionally, search for specific names or partial matches.

**Needs Approval:** No

**Input Parameters:**
  * `searchQuery` (string, optional): An optional name or partial name to search for. Leave empty to get all users.

**Database Action:** Queries the `libraryUsers` table to retrieve matching users.

**Returns:**
  * Success: `{ success: true, Users_Found: <number>, users: <array_of_users> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## getBooks

**Description:** Retrieve a list of books from the database. Optionally, search for specific titles, authors, or partial matches.

**Needs Approval:** No

**Input Parameters:**
  * `searchQuery` (string, optional): An optional title, author, or partial match to search for. Leave empty to get all books.

**Database Action:** Queries the `bookRegistry` table to retrieve matching books.

**Returns:**
  * Success: `{ success: true, Books_Found: <number>, books: <array_of_books> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## checkUserBorrowedBooks

**Description:** Check which books a user has borrowed.

**Needs Approval:** No

**Input Parameters:**
  * `userName` (string): The name of the user to check.

**Database Action:** Queries the `libraryUsers` and `bookRegistry` tables to retrieve borrowed books for the specified user.

**Returns:**
  * Success: `{ success: true, user: <user_object>, borrowedBooks: <array_of_books> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## RequestBook

**Description:** Request to borrow a book from the library.

**Needs Approval:** Yes

**Input Parameters:**
  * `userName` (string): The name of the user requesting the book.
  * `bookTitle` (string): The title of the book to request.

**Database Action:**
  * Inserts a new row into the `requests` table.
  * Updates the `bookRegistry` table to increment the borrowed count.
  * Updates the `libraryUsers` table to increment the user's borrowed books count.

**Returns:**
  * Success: `{ success: true, message: "<success_message>" }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## ReturnBook

**Description:** Return a borrowed book to the library.

**Needs Approval:** Yes

**Input Parameters:**
  * `userName` (string): The name of the user returning the book.
  * `bookTitle` (string): The title of the book to return.

**Database Action:**
  * Updates the `requests` table to set the return date.
  * Updates the `bookRegistry` table to decrement the borrowed count.
  * Updates the `libraryUsers` table to decrement the user's borrowed books count.

**Returns:**
  * Success: `{ success: true, message: "<success_message>" }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## removeUserByName

**Description:** Remove a user from the database by name.

**Needs Approval:** Yes

**Input Parameters:**
  * `userName` (string): The name of the user to remove. Must be between 2 and 50 characters.

**Database Action:**
  * Deletes the user from the `libraryUsers` table.
  * Updates the `bookRegistry` and `requests` tables to reflect the removal.

**Returns:**
  * Success: `{ success: true, removedUser: <user_object> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## addBook

**Description:** Add a book to the database with its title, author, and number of volumes.

**Needs Approval:** Yes

**Input Parameters:**
  * `title` (string): The title of the book. Must be between 2 and 100 characters and must not include inappropriate language.
  * `author` (string): The author of the book. Must be between 2 and 100 characters.
  * `volumes` (number): The number of volumes for the book. Defaults to 1.

**Database Action:** Inserts a new row into the `bookRegistry` table.

**Returns:**
  * Success: `{ success: true, Author: <author>, bookId: <new_book_id> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## removeBookByTitle

**Description:** Remove a book from the database by title.

**Needs Approval:** Yes

**Input Parameters:**
  * `title` (string): The title of the book to remove. Must be between 2 and 100 characters.

**Database Action:** Deletes the book from the `bookRegistry` table.

**Returns:**
  * Success: `{ success: true, removedBook: <book_object> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## changeStock

**Description:** Increase or decrease the number of volumes of a book.

**Needs Approval:** Yes

**Input Parameters:**
  * `title` (string): The title of the book. Must be between 2 and 100 characters.
  * `volumeChange` (number): The number of volumes to add (positive) or remove (negative).

**Database Action:** Updates the `bookRegistry` table to modify the volume count.

**Returns:**
  * Success: `{ success: true, updatedBook: <book_object> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## getAllRequests

**Description:** Retrieve a list of all book requests in the system, including user and book details.

**Needs Approval:** No

**Input Parameters:** None

**Database Action:** Queries the `requests`, `libraryUsers`, and `bookRegistry` tables to retrieve all requests.

**Returns:**
  * Success: `{ success: true, requests: <array_of_requests> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## getRequestsByBook

**Description:** Retrieve all requests for a specific book by title.

**Needs Approval:** No

**Input Parameters:**
  * `bookTitle` (string): The title of the book to search requests for.

**Database Action:** Queries the `requests` and `libraryUsers` tables to retrieve requests for the specified book.

**Returns:**
  * Success: `{ success: true, requests: <array_of_requests> }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## removeRequest

**Description:** Remove a request by the user's name and book's title.

**Needs Approval:** Yes

**Input Parameters:**
  * `userName` (string): The name of the user whose request you want to remove.
  * `bookTitle` (string): The title of the book for which you want to remove the request.

**Database Action:** Deletes the request from the `requests` table. Updates the `bookRegistry` and `libraryUsers` tables if the request was active.

**Returns:**
  * Success: `{ success: true, message: "<success_message>" }`
  * Failure: `{ success: false, error: "<error_message>" }`

---

## createTestDatabase

**Description:** Populate the database with test data, including users, books, and requests.

**Needs Approval:** Yes

**Input Parameters:** None

**Database Action:**
  * Clears the database by deleting all rows from `libraryUsers`, `bookRegistry`, and `requests`.
  * Inserts predefined test data into the `libraryUsers`, `bookRegistry`, and `requests` tables.

**Returns:**
  * Success: `{ success: true, message: "Test database created successfully." }`
  * Failure: `{ success: false, error: "<error_message>" }`