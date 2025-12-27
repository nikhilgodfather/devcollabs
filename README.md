# DevCollab - Real-time Collaborative Coding Platform

DevCollab is a powerful, real-time collaborative code editor designed for teams to work together seamlessly. Built with scalability and performance in mind, it features a robust backend managed by Redis and an asynchronous worker architecture.


## 🚀 Key Features

-   **Real-Time Collaboration**: Edit files simultaneously with live cursor tracking and multi-user synchronization.
-   **"Super Power" Caching**: Advanced Redis integration for lightning-fast data retrieval and consistent state across refreshes.
-   **Asynchronous Job Processing**: Heavy tasks like code execution and exports are processed in the background via a dedicated worker.
-   **Interactive Workspace**: Files, chats, user management, and AI-powered Copilot all in one place.
-   **API First Design**: Fully documented API with Swagger (OpenAPI 3.0), including procedural guides for integration.
-   **Role-Based Access (RBAC)**: Manage workspace permissions (Owner, Collaborator, Viewer) with clear UI feedback.

## 🛠 Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS, Monaco Editor/CodeMirror.
-   **Backend**: Node.js, Express, Socket.io, PostgreSQL.
-   **Infrastructure**: Redis (Caching & Job Queues), BullMQ (Worker Management).
-   **Documentation**: Swagger (swagger-jsdoc & swagger-ui-express).

---

## ⚙️ Setup and Installation

### Prerequisites

-   **Node.js** (v18+)
-   **PostgreSQL** (Running instance)
-   **Redis** (Running instance)

### 1. Clone the Repository

```bash
git clone https://github.com/nikhilgodfather/DevCollab.git
cd DevCollab
```

### 2. Backend Configuration

Navigate to the `server` directory, install dependencies, and set up your environment:

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/devcollab
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

### 3. Frontend Configuration

Navigate to the `client` directory and install dependencies:

```bash
cd ../client
npm install
```

Create a `.env` file in the `client` directory:

```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## 🏃 Running the Application

You need to run three components simultaneously:

### 1. The API Server
Handles all REST requests, real-time socket connections, and database management.

```bash
cd server
npm run dev
```

### 2. The Background Worker
Processes asynchronous jobs like code execution and notifications. You can see live job processing logs in this terminal.

```bash
cd server
npm run worker:dev
```

### 3. The Frontend Client
The user interface.

```bash
cd client
npm run dev
```

---

## 📖 API Documentation

Once the server is running, you can access the interactive Swagger documentation at:
**[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

This guide includes:
- **Authentication Flow**: Step-by-step registration and login instructions.
- **Project/Workspace Management**: CRUD operations and collaboration setup.
- **Asynchronous Jobs**: How to trigger and track background tasks.

---

## ⚡ Redis "Super Power" Caching

The platform uses a sophisticated Redis layer to ensure speed:
- **List Caching**: Project and Workspace lists are cached per user.
- **Member Caching**: Real-time role and membership data are cached with absolute consistency.
- **Internal Invalidation**: Pattern-based clearing (`devcollab:cache:*`) ensures that any change (Invite/Role update) is reflected instantly globally.

## 🤝 Support

If you encounter any issues, please check the local terminals for logs (Server, Worker, Redis).
"# devcollabs" 
