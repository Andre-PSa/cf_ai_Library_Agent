
# Library Manager

**Disclaimer: Proof of Concept**
This project is a Proof of Concept (PoC) built to demonstrate autonomous AI-agent capabilities, function calling, and database management. It is not fully equipped, hardened, or secure enough to be deployed in an actual, production-level library environment. As an experimental PoC, it may contain bugs, unhandled edge cases, or occasional AI hallucinations. Please use it for educational and experimental purposes.

## Overview
The Library Manager is an AI-powered library assistant designed to manage a library's user database, book registry, and borrowing system. It provides tools for both regular users and administrators to interact with the library system efficiently. The AI agent is friendly, conversational, and highly capable of executing tasks such as adding users, managing books, and handling borrowing requests.

### General Purpose of the AI Agent
The AI agent acts as a virtual library assistant. It can:
- Help users find books and manage borrowing.
- Assist administrators in managing the library's database.
- Provide a seamless and interactive experience for library management tasks using natural language.

## Tech Stack
* **Framework:** Vercel AI SDK
* **AI Model:** Llama (via Cloudflare Workers AI)
* **Database:** Cloudflare D1 (Serverless SQLite)
* **ORM:** Drizzle ORM
* **Validation:** Zod

## Live Demo
Want to test the AI agent right now without installing anything? You can chat with the live deployment here:

**[Test the Library Manager Live](https://library-manager.andre-mdpsa.workers.dev/)**

* (Note: This is a shared, live environment. The database is actively modified by anyone using the demo, so you may see books or users added by other testers!)*


## Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- npm (Node Package Manager)
- Cloudflare Wrangler CLI installed globally (`npm install -g wrangler`)

### Configuration
Before running the project, you must configure your database bindings.
1. Create a D1 database in your Cloudflare dashboard or via the Wrangler CLI.
2. Update the `wrangler.jsonc` file in the root directory with your specific D1 database binding:
   ```jsonc
   "d1_databases": [
      {
      binding = "your-database-binding"
      database_name = "your-database-name"
      database_id = "your-database-id-here"
      }
   ]
   ```


### Running Locally

**Note:** Cloudflare Wrangler includes a fully functional local emulator for D1. You can run and test all database-dependent features entirely on your local machine.

1. Clone the repository:
```bash
git clone <repository-url>
cd library-manager

```


2. Install dependencies (including Drizzle ORM and Zod):
```bash
npm install

```


3. **Apply Database Migrations:**
Set up your local SQLite tables:
```bash
npx wrangler d1 migrations apply <your-database-name> --local

```


4. Start the development server:
```bash
npm run dev

```


5. Open your browser and navigate to `http://localhost:3000`.

### Deployment

To push the app and the database to production on Cloudflare:

1. Authenticate Wrangler with your Cloudflare account:
```bash
wrangler login

```


2. Apply the database migrations to your live production database:
```bash
npx wrangler d1 migrations apply <your-database-name> --remote

```


3. Deploy the project:
```bash
npm run deploy

```

## Tools and Example Prompts

**Note**: The AI agent performs better when it has access to the most up-to-date information about users and books. It is recommended to use the `getUsers` and `getBooks` tools first to retrieve the latest lists. This ensures that tools requiring specific names, such as borrowing or returning books, function more effectively.

### User Tools

**`addUser`**
* **Description**: Add a user to the database with their name.
* **Example Prompt**: "Add a user named John Doe to the library."


**`getUsers`**
* **Description**: Retrieve a list of users from the database. Optionally search by name.
* **Example Prompts**: "Show me all registered users." | "Find users with the name 'Jane'."


**`getBooks`**
* **Description**: Retrieve a list of books from the database. Optionally search by title or author.
* **Example Prompts**: "List all books in the library." | "Find books written by J.K. Rowling."


**`checkUserBorrowedBooks`**
* **Description**: Check which books a user has borrowed.
* **Example Prompt**: "What books has John Doe borrowed?"


**`RequestBook`**
* **Description**: Request to borrow a book from the library.
* **Example Prompt**: "John Doe wants to borrow 'The Great Gatsby'."


**`ReturnBook`**
* **Description**: Return a borrowed book to the library.
* **Example Prompt**: "John Doe wants to return 'The Great Gatsby'."



### Admin Tools

**Note**: Admin tools provide advanced capabilities for managing the library system. The application allows you to switch between User Mode and Admin Mode by clicking a toggle button located on the top bar of the interface.

**`removeUserByName`**
* **Description**: Remove a user from the database by name.
* **Example Prompt**: "Remove the user named John Doe."


**`addBook`**
* **Description**: Add a book to the database with its title, author, and number of volumes. Defaults to a single volume.
* **Example Prompts**: "Add '1984' by George Orwell to the library." | "Add 'To Kill a Mockingbird' with 3 volumes."


**`removeBookByTitle`**
* **Description**: Remove a book from the database by title.
* **Example Prompt**: "Remove the book titled '1984'."


**`changeStock`**
* **Description**: Adjust the number of volumes of a book in stock.
* **Example Prompt**: "Increase the stock of '1984' by 5 volumes."


**`getAllRequests`**
* **Description**: Retrieve all book requests in the system.
* **Example Prompt**: "Show me all book requests."


**`getRequestsByBook`**
* **Description**: Retrieve all requests for a specific book by title.
* **Example Prompt**: "Show me all requests for '1984'."


**`removeRequest`**
* **Description**: Remove a request by the user's name and book's title.
* **Example Prompt**: "Remove John Doe's request for '1984'."


**`createTestDatabase`**
* **Description**: Populate the database with test data.
* **Example Prompt**: "Create a test database with sample users, books, and requests."