# SP Daily Expense Tracker

A simple mobile-friendly app to track daily expenses with features like split expenses and monthly exports.

## Features

- Google Sign-in authentication
- Add/Edit/Delete expenses and income
- Category-wise expense tracking
- Split expense with friends (track pending/received)
- Month and Year navigation
- Date-wise transaction view
- Download monthly report as CSV
- Real-time sync with Firestore

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Firebase (Auth + Firestore)
- Vercel (Deployment)

## Setup

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Google provider
4. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Add this security rule:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /transactions/{transactionId} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
         allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ```
5. Create Firestore Index:
   - Collection: `transactions`
   - Fields: `userId` (Ascending), `date` (Descending)

6. Get Firebase config:
   - Go to Project Settings > General > Your apps
   - Click "Add app" > Web
   - Copy the config values

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy!

## Usage

1. Sign in with Google
2. Select month/year using the navigation
3. Tap a date to view transactions
4. Add Expense or Income
5. For split expenses, toggle "Split with someone?" and enter details
6. Download monthly CSV using the download button

## License

MIT
