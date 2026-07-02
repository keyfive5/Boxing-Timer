# Boxing Rounds — Ship checklist

App is built and verified. Remaining path to the App Store (Claude runs all commands; Hasan only does browser logins):

## 1. Expo account (free) — Hasan, in browser
- Sign up at https://expo.dev/signup
- Go to https://expo.dev/settings/access-tokens → Create token → copy it
- Paste the token to Claude in chat

## 2. App Store Connect API key — Hasan, in browser
- Go to https://appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API
- Click + to generate a key, name it "EAS", role: **Admin** (App Manager works for submit but Admin is safest for cert creation)
- Download the .p8 file (only downloadable once), save it into `D:\Boxing Round App\`
- Tell Claude the **Key ID** and **Issuer ID** shown on that page

## 3. Claude then runs
- `eas init` / `eas build --platform ios --profile production` (cloud build, free tier)
- `eas submit --platform ios` (uploads to App Store Connect)

## 4. App Store listing (browser, together)
- Create the app record in App Store Connect (name "Boxing Rounds", bundle ID com.hasanzafar.boxingrounds)
- Screenshots: Claude generates from the web preview at required resolutions
- Privacy: "Data Not Collected" (nothing leaves the device), no tracking
- Submit for review

## Project facts
- Expo SDK 57, TypeScript, no backend, settings stored on-device only
- Dev preview: launch config "boxing-timer-web" (port 8090) via start-web.cmd
- Sounds synthesized in assets/sounds (bell, triple bell, warning clacks)
- Icon/splash generated from SVG (scripts in Claude scratchpad; re-ask Claude to regenerate)
