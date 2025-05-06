# Milk Farm CRM

Milk Farm CRM is a full-stack web application built using the MERN stack (MongoDB, Express.js, React.js, Node.js). This application is designed to manage client and staff information for a milk farm, providing separate panels for Admin and Staff users.

## Features

- **Admin Panel**
  - Dashboard with monthly sales report and calendar view
  - Client management (add, delete clients, generate bills)
  - Staff management (add, edit, delete staff members)

- **Staff Panel**
  - Dashboard displaying assigned clients
  - Client view with editable milk quantity and delivery status

- **Authentication**
  - User registration and login using JWT for secure access

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/milk-farm-crm.git
   ```

2. Navigate to the client directory and install dependencies:
   ```bash
   cd client
   npm install
   ```

3. Navigate to the server directory and install dependencies:
   ```bash
   cd ../server
   npm install
   ```

4. Set up your MongoDB database and update the configuration in `server/src/config.ts`.

5. Start the server:
   ```bash
   npm run start
   ```

6. Start the client:
   ```bash
   cd ../client
   npm start
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.