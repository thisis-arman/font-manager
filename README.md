# Font Group Manager System

A comprehensive font management system built with Express.js, TypeScript, and React.

## Features

- ✅ Font Upload (TTF files only)
- ✅ Font Listing with Preview
- ✅ Font Group Creation and Management
- ✅ SOLID Principles Implementation
- ✅ Zod Validation
- ✅ Proper Error Handling
- ✅ TypeScript Support
- ✅ Modular Architecture

## Installation

```bash
# Install dependencies
yarn install

# Development mode
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## API Endpoints

### Fonts
- `POST /api/fonts/upload` - Upload a font file
- `GET /api/fonts` - Get all fonts
- `GET /api/fonts/:id` - Get font by ID
- `DELETE /api/fonts/:id` - Delete font

### Font Groups
- `POST /api/font-groups` - Create font group
- `GET /api/font-groups` - Get all font groups
- `GET /api/font-groups/:id` - Get font group by ID
- `PUT /api/font-groups/:id` - Update font group
- `DELETE /api/font-groups/:id` - Delete font group

## Project Structure

```
font-group-manager-system/
├── app.ts                 # Express app configuration
├── index.ts              # Server bootstrap file
├── src/
│   ├── middleware/       # Custom middleware
│   ├── modulers/        # Feature modules
│   │   ├── fonts/       # Font management
│   │   └── font-groups/ # Font group management
│   ├── routes/          # Route definitions
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
```

## Technologies Used

- **Backend**: Express.js, TypeScript
- **Validation**: Zod
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting"# font-manager" 
