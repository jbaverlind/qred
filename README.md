# Qred Task 2

## Overview

This project is a Node.js application that requires Docker to run its test suite.

## Requirements

- Node.js 20+
- Docker (required for testing)

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory with the following content:

```env
PG_USER = ''
PG_PASSWORD=''
PG_HOST = ''
PG_PORT = ''
PG_DATABASE = ''
```

> These variables are used by the app.

## Usage

To start the application:

```bash
npm run dev
```

## Testing

The test suite requires Docker (e.g., for spinning up a test database). Make sure Docker is installed and running:

```bash
npm run test
```