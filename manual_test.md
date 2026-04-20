# ⛳ Golff Platform - Comprehensive Manual Testing Guide

Use this guide to verify all PRD requirements for the **Golf Charity Subscription Platform**.

## 🔑 Test Credentials & Environment
| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@golff.in` | `Admin@123456` | Manage draws, users, and charities |
| **Seeded User** | `arjun@test.in` | `Test@123456` | Test existing scores & winner flow |
| **New User** | *(You create)* | *(You create)* | Test full signup & Stripe payment |

> [!IMPORTANT]
> **Stripe Test Card**: `4242 4242 4242 4242` (Any CVV / Future Expiry)
> **Score Range**: 1 – 45 (Stableford)

---

## 🏗️ Phase 1: Authentication & Onboarding
### 1.1 The "New User" Journey
1.  **Landing Page**: Open the app and click **"Get Started"** or **"Join Now"**.
2.  **Sign Up**: Enter a new email and password.
3.  **Plan Selection**: Choose either **Monthly (₹499)** or **Yearly (₹4,999)**.
4.  **Charity Selection**: Select any charity (e.g., CRY India).
5.  **Contribution %**: Use the slider to increase the contribution (verify it doesn't go below 10%).
6.  **Payment**: Complete the Stripe Checkout with the test card.
7.  **Success**: Verify you are redirected to the `/dashboard` with a success toast.

---

## 📊 Phase 2: User Experience (Subscriber)
### 2.1 Rolling 5 Score Logic
1.  Navigate to the **"Scores"** page.
2.  Enter **5 scores** with different dates.
3.  Verify the Dashboard shows exactly these 5 scores in the "My Draw Numbers" section.
4.  **The Test**: Enter a **6th score**.
5.  **Verification**: Confirm the **oldest** score is removed and the new one is added (only 5 remain).
6.  **Validation**: Try entering a score of `50` or a future date; verify that errors are blocked.

### 2.2 Charity & Profile
1.  Go to **"Profile"**.
2.  Change your selected charity and click **"Update Charity"**.
3.  Go back to the **Dashboard** and verify the sidebar "Your Charity" card has updated.
4.  Verify the "Contribution Split" chart reflects your current plan and percentage.

### 2.3 Winner Verification (Using Seeded User)
1.  Log in as **`arjun@test.in`**.
2.  On the Dashboard, find the **"Latest Draw"** card.
3.  Since Arjun is seeded as a winner, click on **"Verify Winnings"** or the link in the notification.
4.  Upload a sample image as "Proof of Score".
5.  Confirm the status changes to **"Pending Verification"**.

---

## 🛠️ Phase 3: Admin Operations
### 3.1 Draw Management & Engine
1.  Log in as **`admin@golff.in`**.
2.  Navigate to **"Run Draw"** (Draw Engine).
3.  **Simulation Mode**:
    - Choose **"Random"** or **"Algorithmic"**.
    - Click **"Run Simulation"**.
    - Review the "Simulation Preview" (it should show potential winners but NOT publish to users yet).
4.  **Publishing**:
    - Click **"Publish Draw"**.
    - Confirm the draw moves into the **Draw History** as "Published".
5.  **Verification**: Log back in as a user and verify the draw results are now live on their dashboard.

### 3.2 Winner Approval & Payouts
1.  In the Admin Panel, go to **"Verify Winners"**.
2.  Find the submission from **Arjun Sharma** (Step 2.3).
3.  Click **"Approve"**.
4.  Mark the record as **"Paid"**.
5.  **Verification**: Switch back to Arjun's account; his winning status should now say **"Paid"**.

---

## 📱 Phase 4: UI/UX & Quality Audit
1.  **Dark Mode Aesthetics**: Verify consistent use of `#0A0A0F` background and emerald/gold accents.
2.  **Responsiveness**: Open the Dashboard on a mobile screen (or use DevTools) and ensure the 4-card grid stacks properly.
3.  **Micro-animations**: Check for smooth page transitions (Framer Motion) when switching between Dashboard and Scores.
4.  **Skeleton States**: Hard-refresh the Dashboard and confirm skeleton loaders appear while data is fetching.
