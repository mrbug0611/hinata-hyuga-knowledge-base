Hinata Hyuga Knowledge Base

A single-page interactive fan experience dedicated to Hinata Hyuga from the Naruto universe.
This project includes data visualizations of her shinobi growth, a timeline of her major life events,
and a global “Worship Shrine” counter backed by Firebase.

FEATURES
- Responsive Design using Tailwind CSS.
- Shinobi Analytics with Radar and Bar charts via Chart.js.
- Interactive Timeline of key life events.
- Global Worship Counter using Firebase Firestore.
- Modular Architecture with clean file separation.

PROJECT STRUCTURE
index.html – Main page structure.
styles.css – Custom CSS.
firebase-config.js – Firebase connection info.
main.js – Core logic, charts, timeline, Firebase integration.

SETUP & RUNNING LOCALLY
Requires Node.js.
Run locally with:
    npx serve

DEPLOYMENT (Firebase Hosting)
firebase login
firebase init
firebase deploy

FIRESTORE SECURITY RULES
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/worship_data/{documentId} {
      allow read: if true;
      allow write: if request.auth != null &&
                   resource.data.totalCount < request.resource.data.totalCount &&
                   request.resource.data.totalCount is number;
    }
  }
}
