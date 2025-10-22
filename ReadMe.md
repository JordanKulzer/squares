# 🏈 Squares

A modern, real-time **football squares game** built with **React Native + Expo**, powered by **Supabase** and **live sports APIs**.  
Create, join, and play grid-based score prediction games with friends — complete with live quarter updates, dark mode, push notifications, and smooth UI animations.

---

## 📱 Features

### 🎮 Core Gameplay
- Create or join 10×10 “Square” sessions tied to live NFL or NCAAF games.
- Claim squares before a set deadline — once the game starts, numbers are revealed.
- Winners are determined automatically each quarter based on real score digits.
- Track players, selections, winnings, and payouts in real time.

### ⚙️ Game Modes
- **Max Squares Per Player** – Limit how many squares each player can claim.  
- **Price Per Square** – Set a price per square and auto-calculate winnings.

### 🧾 Game Flow
1. **Create Game** – Choose an NFL or college football game, set deadline & rules.  
2. **Join Game** – Enter the session code or scan a QR code.  
3. **Pick Squares** – Tap squares to claim before the deadline.  
4. **Play & Watch** – Numbers reveal at kickoff and live scores update automatically.  
5. **Win!** – Quarter winners and payouts update as the game progresses.

---

## 🌐 Tech Stack

| Category | Tools |
|-----------|-------|
| Framework | React Native (Expo SDK 54) |
| Backend | Supabase (Auth, Realtime, Storage) |
| UI | React Native Paper, Expo Linear Gradient, Vector Icons |
| Navigation | React Navigation (Stack + Drawer) |
| Notifications | Expo Notifications, AsyncStorage scheduling |
| API | Custom Express backend + API-Sports (NFL/NCAAF data) |
| Error Tracking | Sentry for React Native |
| Fonts | Rubik, Anton, Sora (via Expo Google Fonts) |

---

## 🧩 Architecture Overview

### Main Screens
| Screen | Description |
|--------|-------------|
| **Login / Signup / Forgot / Reset Password** | Supabase email authentication and recovery with deep link support. |
| **HomeScreen** | Displays joined/created games, deadlines, and quick-start options. |
| **CreateSquareScreen** | Set up a game: league, teams, rules, and price per square. |
| **JoinSquareScreen** | Join by code or QR, pick username & color, configure notifications. |
| **SquareScreen** | Full interactive 10×10 grid with player list, live updates, and winners tab. |
| **GamePickerScreen** | Fetch and select upcoming NFL/NCAAF games from API. |
| **HowToScreen** | Tutorial explaining gameplay and rules. |

---

## ⚡ Notifications

- **Deadline Reminders** (30 min, 5 min, final)
- **Quarter End Alerts** (auto-fired when quarters finish)
- **Game Update Alerts** (when session owner updates info)
- **Player Join Alerts** (when new players join)

Push tokens are registered to Supabase via `registerPushToken.ts`.

---

## 🌓 Theming

Full **light/dark mode** support using React Native Paper.  
User preference is stored in AsyncStorage and loaded at startup.

---

## 🗂️ Project Structure

src/
├── screens/
│ ├── HomeScreen.tsx
│ ├── CreateSquareScreen.tsx
│ ├── JoinSquareScreen.tsx
│ ├── SquareScreen.tsx
│ ├── GamePickerScreen.tsx
│ ├── ForgotPassword.tsx
│ ├── ResetPasswordScreen.tsx
│ ├── SignUpScreen.tsx
│ ├── HowToScreen.tsx
│ └── LoginScreen.tsx
│
├── navigation/
│ └── AppDrawer.tsx
│
├── utils/
│ ├── apiConfig.ts
│ ├── gameHelpers.ts
│ ├── notifications.ts
│ ├── registerPushToken.ts
│ ├── types.ts
│ └── supabase.ts
│
├── components/
│ ├── HeaderLogo.tsx
│ ├── HeaderSettingsMenu.tsx
│ ├── ProfileModal.tsx
│ ├── SessionOptionsModal.tsx
│ └── DeadlinePickerModal.tsx
│
└── App.tsx

yaml
Copy code

---

## 🚀 Setup & Run

### 1️⃣ Clone the Repo
```bash
git clone https://github.com/JordanKulzer/squares.git
cd squares
2️⃣ Install Dependencies
bash
Copy code
npm install
# or
yarn install
3️⃣ Add Environment Variables
Create a .env file at the project root:

ini
Copy code
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
4️⃣ Run the App
bash
Copy code
npx expo start
Use a development build (not Expo Go) to enable push notifications and native modules.

🧠 Supabase Schema Overview
Tables

users: id, email, first_name, push_token, total_winnings

squares: id, title, created_by, team1, team2, deadline, price_per_square, players[], selections[], x_axis[], y_axis[], quarter_scores[]

players: user_id, grid_id, username, color, joined_at, notifySettings

selections: x, y, userId, username

Functions (RPC)

add_player_to_square

add_selection

remove_selection

increment_user_winnings

🏈 Live Sports Integration
Data comes from a custom backend connected to API-Sports:

bash
Copy code
GET /apisports/scores?eventId={id}&league={NFL|NCAAF}
Used for:

Quarter-by-quarter scores

Game completion status

Team abbreviations and names

Winner detection per period

🧰 Developer Notes
Expo SDK 54 (JSC engine)

Deep linking enabled: squaresgame://session/:sessionId

Error tracking via Sentry

Tested on Android emulator + iOS TestFlight

💡 Future Enhancements
Add NBA/MLB support

Support for variable payout distributions

Player invite and QR sharing

Historical analytics & stats

📧 Contact
Squares App Support
📩 squaresgameofficial@outlook.com
🔗 Privacy Policy
