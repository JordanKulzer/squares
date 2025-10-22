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

