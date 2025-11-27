
 Hinata Hyuga Knowledge Base. This is a single-page interactive fan page dedicated to Hinata Hyuga from the Naruto universe. It features data visualizations of her shinobi growth, a chronological timeline of her key life events, and a collaborative "Worship Shrine" with a global, persistent counter backed by Google Firebase.🚀 FeaturesResponsive Design: Fully adaptive layout using Tailwind CSS.Shinobi Analytics: Data visualization (Radar and Bar charts using Chart.js) showing her attribute growth and skill specialization.Interactive Chronicle: A dynamic timeline detailing her journey from Genin to mother and master.Global Worship Counter: A persistent, real-time click counter powered by Firebase Firestore that tracks "Chakra Offered" by all users worldwide.Modular Architecture: Project split into separate HTML, CSS, and JavaScript files for easier maintenance and deployment.🛠️ Project StructureThe application is split into four files:FilePurposeindex.htmlThe main structure of the site, including external library links (Tailwind, Chart.js).styles.cssAll custom CSS for colors, fonts, animations, and non-Tailwind styling.firebase-config.jsContains the hardcoded Firebase configuration necessary for the backend connection.main.jsThe core application logic, including data models, chart initialization, timeline updates, and all Firebase (Auth/Firestore) connection and transaction logic.⚙️ Setup and Running LocallySince this project requires fetching data using modular JavaScript and connecting to a live database, it must be served via a local web server, not opened directly from the file system.PrerequisitesNode.js: Ensure you have Node.js installed (necessary for the local server).File Placement: Ensure all 4 files (index.html, styles.css, main.js, firebase-config.js) and the image asset (Hinata_Uzumaki.png) are in the same folder.Run with a Local Server (Recommended)Open your terminal in the project directory.Run the following command using npx serve (if you have Node.js installed):npx serve
Open your browser and navigate to the local address provided after running npx serve (e.g., http://localhost:3000). The Global Worship Counter should now be fully functional. Deployment: I've hosted this website permanently  using Firebase HostingDeployment Steps (Assuming Firebase CLI is installed): Login to Firebase: firebase login
Initialize Hosting: Run the initialization command in your project root: firebase init
Select Hosting: Set up deployments for static web pages. Select Use an existing project (hinata-hyuga-4e9c2). Set the public directory to:. (a single dot). Crucial: Answer No to overwriting index.html.Deploy the Site: firebase deploy
The terminal will provide your Hosting URL (e.g., https://hinata-hyuga-4e9c2.web.app), which is your permanent, live website.🔒 Important: Firestore Security Rules keep the global counter secure and prevent abuse. Ensure your Firebase Firestore Security Rules are set to allow authenticated users to read and safely increment the counter value using a transaction.The correct rule setup (as detailed in previous steps) must be published in the Firestore Database > Rules tab:rules_version = '2';
Service Cloud.firestore {
  match /databases/{database}/documents {

    // Rule for the public counter collection used by this app
    match /artifacts/{appId}/public/data/worship_data/{documentId} {
      allow read: if true;
      // Allow atomic increment only
      allow write: if request.auth != null && 
                   resource.data.totalCount < request.resource.data.totalCount &&
                   request.resource.data.totalCount is number;
    }
  }
}
(Can also be run locally using npx serve)
