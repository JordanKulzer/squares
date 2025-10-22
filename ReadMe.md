🏈 Squares

A modern, real-time football squares game built with React Native + Expo, powered by Supabase and live sports APIs.
Create, join, and play grid-based score prediction games with friends — complete with live quarter updates, dark mode, push notifications, and sleek animations.

📱 Features
🎮 Core Gameplay

Create or join 10×10 “Square” sessions tied to live NFL or NCAAF games.

Claim squares before a set deadline — once the game starts, numbers are revealed.

Winners are determined automatically at the end of each quarter based on real score digits.

Track player stats, winnings, and square selections in real time.

⚙️ Game Modes

Max Squares Per Player – Limit how many squares each player can claim.

Price Per Square – Charge a set amount per square and auto-calculate payouts.

🧾 Game Flow

Create Game – Choose NFL or College game, set deadline & rules.

Join Game – Enter session code or scan a QR code.

Pick Squares – Tap to claim your squares until the deadline.

Play & Watch – Numbers reveal and live scoring begins.

Win! – Automatic quarter-by-quarter payouts and notifications.

🌐 Tech Stack
Category	Tools & Libraries
Framework	React Native (Expo SDK 54)
Backend	Supabase (Auth, Realtime DB, Storage)
UI Library	React Native Paper, React Native Vector Icons, Expo Linear Gradient
Navigation	React Navigation (Stack + Drawer)
Fonts	Rubik, Anton, Sora via Expo Google Fonts
Notifications	Expo Notifications, local scheduling, Supabase token sync
Error Tracking	Sentry for React Native
API	Custom Express backend + API-Sports (NFL/NCAAF scoreboard data)
🧩 Architecture Overview
Key Screens
Screen	Description
Login / Signup / Forgot / Reset Password	Supabase email authentication with deep link recovery support.
HomeScreen	Dashboard showing user’s active games, deadlines, and quick-start buttons.
CreateSquareScreen	Game setup (league, teams, deadline, price/square).
JoinSquareScreen	Join by code or QR; pick username & color, set notifications.
SquareScreen	Interactive 10×10 grid with live game tracking, player list, winners tab, and payout logic.
GamePickerScreen	Fetch and select upcoming NFL/NCAAF games via custom API.
HowToScreen	Step-by-step tutorial on how to play Squares.
⚡ Notifications

Deadline Reminders – 30 min, 5 min, and final alerts.

Quarter End Alerts – Sent automatically when a quarter finishes.

Game Update Alerts – When a host updates scores or teams.

Player Join Alerts – When new players join your session.

Push tokens are securely registered to Supabase via registerPushToken.ts
.

🌓 Theming

Full light/dark mode support via React Native Paper.
Theme preference persists locally using AsyncStorage.

🗂️ Project Structure
src/
 ├── screens/
 │   ├── HomeScreen.tsx
 │   ├── CreateSquareScreen.tsx
 │   ├── JoinSquareScreen.tsx
 │   ├── SquareScreen.tsx
 │   ├── GamePickerScreen.tsx
 │   ├── ForgotPassword.tsx
 │   ├── ResetPasswordScreen.tsx
 │   ├── SignUpScreen.tsx
 │   ├── HowToScreen.tsx
 │   └── LoginScreen.tsx
 │
 ├── navigation/
 │   └── AppDrawer.tsx
 │
 ├── utils/
 │   ├── supabase.ts
 │   ├── apiConfig.ts
 │   ├── gameHelpers.ts
 │   ├── notifications.ts
 │   ├── registerPushToken.ts
 │   └── types.ts
 │
 ├── components/
 │   ├── HeaderLogo.tsx
 │   ├── HeaderSettingsMenu.tsx
 │   ├── ProfileModal.tsx
 │   ├── SessionOptionsModal.tsx
 │   └── DeadlinePickerModal.tsx
 │
 ├── assets/
 │   └── constants/
 │       ├── colorOptions.ts
 │       ├── theme.ts
 │       └── ...
 └── App.tsx

🚀 Setup & Run
1️⃣ Clone the Repository
git clone https://github.com/JordanKulzer/squares.git
cd squares

2️⃣ Install Dependencies
npm install
# or
yarn install

3️⃣ Configure Environment Variables

Create a .env file at the project root:

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000

4️⃣ Run the App
npx expo start


Use your Expo Dev Build (not Expo Go) for notifications & native modules.

🧠 Supabase Schema Overview

Tables

users: id, email, first_name, push_token, total_winnings

squares: id, title, created_by, team1, team2, deadline, price_per_square, players[], selections[], x_axis[], y_axis[], quarter_scores[]

players: user_id, grid_id, username, color, joined_at, notifySettings

selections: x, y, userId, username

rpc: add_player_to_square, add_selection, remove_selection, increment_user_winnings

🏈 Live Sports Integration

Uses a custom backend (Express + Render) connected to:

/apisports/scores?eventId={id}&league={NFL|NCAAF}


to fetch:

Quarter scores

Completion state

Team names

Current period & winner logic

🧰 Developer Notes

🪶 Expo SDK 54 with JSC engine

🧭 Deep linking enabled via squaresgame://session/:sessionId

🧱 Error monitoring & crash reports via Sentry

📱 Tested on both Android & iOS (TestFlight + local dev builds)

💡 Future Enhancements

🏟️ Add NBA / MLB support

💰 Optional payout distribution settings

📊 Analytics dashboard for user stats

🤝 In-app invites and QR share links

📧 Contact

Squares App Support
📩 squaresgameofficial@outlook.com

🔗 Privacy Policy
