# FairPass — Fair Ticketing Platform

FairPass is a next-generation fair ticketing platform engineered to prevent ticket scalping, bot abuse, fraudulent resale, and duplicate ticket redemption.

---

## 🚀 Key Features & Architectural Highlights

1. **Anti-Scalping Capped Resale (Mandatory 1.1× Price Cap)**:
   - Resale prices are strictly validated on the backend. Any attempt to list or resell a ticket above the event's configured cap (default 110% of face value) is rejected with an HTTP 400 error.
   - Resale is completely transactional: ownership is transferred in SQLite and recorded in `TicketOwnershipHistory`.
   - **QR Revocation & Re-issuance**: When a ticket is resold, the previous owner's QR code token is immediately and permanently invalidated (`TRANSFERRED`). A brand-new unique cryptographic token and high-resolution QR code are generated for the buyer.

2. **Non-Permanent Ticket Sharing (Controlled Guest Passes)**:
   - Separate from resale: sharing does not require payment and does not transfer permanent ownership.
   - Original owner retains ownership and can **revoke** sharing access at any time.
   - Single-redemption rule: prevents double-entry at the venue gate.

3. **Event-Specific Restricted Access & Behavioral Bot Shield**:
   - The queue and restricted access window are strictly event-specific (no global or homepage queues).
   - Multi-signal bot protection:
     - **Interaction Timing Detection**: analyzes time spent on the access form. Rapid submissions (< 300ms) trigger an interactive verification challenge.
     - **Configurable 50-Request Burst Lockout Threshold**: excessive rapid requests (50+ attempts within a 60-second window) automatically enforce a 5-minute temporary lockout with countdown timer.
     - **Admin Security Dashboard**: live view of security audit logs, active bot restrictions, and 1-click manual unblock controls.

4. **Event-Specific Waiting Room Queue (No Deposits)**:
   - Independent queue tracking per event in SQLite (`QueueEntry`).
   - All refundable deposits have been completely removed from the project.

5. **Simulated Demo Payment Gateway**:
   - Integrated into both initial ticket booking and ticket resale.
   - Supports UPI (GPay, PhonePe, Paytm), Credit Card, Debit Card, and Net Banking.
   - Clearly labeled as `DEMO PAYMENT GATEWAY (SIMULATED)`.
   - Includes **Simulate Payment Failure** option to test that failed transactions do not issue tickets or transfer ownership.

6. **Secure Gate Verification & One-Time Atomic Redemption**:
   - Venue turnstile scanner interface.
   - Real-time status reporting:
     - `VALID`: ticket approved and redeemed atomically with gate timestamp.
     - `ALREADY REDEEMED`: duplicate redemption attempt detected and blocked.
     - `TRANSFERRED`: old QR code token scanned after resale.
     - `REVOKED`: guest pass revoked by original owner.
     - `INVALID`: counterfeit / unrecognized token.

7. **Web3 Blockchain Smart Contract Integration**:
   - `FairPass.sol` Solidity contract: enforces on-chain ticket issuance, immutable ownership, 1.1× resale price cap, and redemption.
   - MetaMask wallet connection with chain ID and balance display.
   - Contract ABI (`FairPassABI.json`) and configuration UI.
   - Transparent separation between Web2 SQLite database and Web3 on-chain operations.

8. **Demo Identity Personas (1-Click Switcher)**:
   - 👩 **Alice Sharma** (`alice@example.com` - Fan / Primary Buyer)
   - 👨 **Bob Patel** (`bob@example.com` - Resale Buyer)
   - 👦 **Charlie Rao** (`charlie@example.com` - Shared Guest Attendee)
   - 🛡️ **FairPass Organizer** (`admin@fairpass.io` - Organizer & Gate Officer)
   - ➕ Custom demo user input

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide React, HTML5-QRCode
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, SQLite, Pydantic v2, QRCode (PIL)
- **Blockchain**: Solidity 0.8.20, Ethers.js v6, MetaMask browser extension

---

## ⚡ Quick Start Instructions

### 1. Backend Setup & Run (Windows PowerShell)

```powershell
cd backend

# Create and activate virtual environment (if not already created)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run backend test suite to verify all 18 test cases
python test_fairpass_suite.py

# Start FastAPI server on port 8000
uvicorn app.main:app --reload --port 8000
```
- API Endpoint: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup & Run (Second Terminal)

```powershell
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

### Automated Backend Test Suite
The automated test suite verifies 18 critical requirements:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python test_fairpass_suite.py
```
**Test Coverage**:
1. Health check & API availability
2. Demo identities endpoint
3. Event discovery & filtering
4. Organizer event creation with custom resale cap and validations
5. Event editing & persistence
6. Interaction timing bot detection (< 300ms triggers challenge)
7. 50+ request burst lockout enforcement (RESTRICTED state)
8. Administrator manual unblocking
9. Event-specific queue join without deposits
10. Booking with simulated payment failure (verifies zero tickets issued)
11. Booking with successful demo payment (verifies QR token generation)
12. Max tickets per user limit strictly enforced
13. Resale price cap rejection (price > 1.1x rejected with HTTP 400)
14. Resale execution (old token invalidated, new token generated)
15. Gate verification of old resold token (returns TRANSFERRED)
16. Gate verification of new owner's token (returns VALID & marks REDEEMED)
17. Gate verification of duplicate scan (returns ALREADY REDEEMED)
18. Ticket sharing, recipient visibility, and owner revocation (returns REVOKED)

---

## 🎭 Hackathon Demo Walkthrough Scenarios

### Scenario 1 — Event Creation & Organizer Controls
1. Click the top-right persona selector and switch to **FairPass Organizer** (`admin@fairpass.io`).
2. Go to the **Organizer Hub** tab.
3. Click **Create New Event**.
4. Set Title, Venue, Date, Price (e.g. ₹2,000), Quantity, Max/User (e.g. 2), Resale Cap (1.1×), and leave Queue & Bot Shield enabled.
5. Click **Publish Event Live**.
6. Switch to the **Explore Events** tab — your new event is immediately live!

### Scenario 2 — Genuine User Booking Flow
1. Switch persona to **Alice Sharma** (`alice@example.com`).
2. On any event card, click **Enter Booking Portal**.
3. The **Restricted Access Window** opens:
   - Step 1: Security Shield verifies behavioral timing.
   - Step 2: User enters event-specific waiting queue (if enabled) and clicks *Enter Ticket Booking Room*.
   - Step 3: Select ticket quantity (e.g. 2 tickets) and click *Proceed to Demo Payment Gateway*.
4. On the **Demo Payment Gateway**, select UPI, Card, or Net Banking.
5. Click **Simulate Successful Payment**.
6. Tickets are issued and you are redirected to **My Tickets** with full QR codes.

### Scenario 3 — Bot Detection & 50-Request Lockout
1. Open the Restricted Access Window for any event.
2. In the testing box, click **Simulate Rapid Bot (<200ms)**: an interactive verification challenge appears.
3. Click **Simulate 50+ Burst Lockout**: triggers 55 automated requests within seconds.
4. The system immediately locks out the account with a countdown timer, security log, and blocked screen.
5. Switch to **Organizer Hub** -> **Security Shield** tab to view the live lockout log.
6. Click **Lift Restriction** to unblock the user.

### Scenario 4 — Capped Resale (1.1× Limit & New QR Token)
1. As **Alice Sharma**, go to **My Tickets** and click **Resell** on an active ticket.
2. Notice the read-only maximum cap (e.g. ₹2,200 for a ₹2,000 face price ticket).
3. Try typing ₹3,000: the form displays an Anti-Scalping Violation warning and disables submission.
4. Enter an allowed price (e.g. ₹2,100), enter Bob Patel's email (`bob@example.com`), and click *Proceed to Demo Payment*.
5. Complete the simulated payment.
6. Switch persona to **Bob Patel** (`bob@example.com`): Bob now has the ticket with a brand-new QR code!
7. Copy Alice's old token and paste it into the **Gate Scanner**: it displays **INVALIDATED (TRANSFERRED)**!

### Scenario 5 — Non-Permanent Ticket Sharing
1. As **Alice Sharma**, go to **My Tickets** and click **Share** on an active ticket.
2. Enter Charlie Rao's name and email (`charlie@example.com`).
3. Click **Send Shared Guest Pass**. Ownership remains with Alice.
4. Switch persona to **Charlie Rao**: open **My Tickets** -> **Shared With Me** to see the guest pass.
5. Switch back to Alice and click **Revoke**. Charlie's guest pass is immediately canceled.

### Scenario 6 — Gate Scanner & Duplicate Prevention
1. Go to the **Gate Scanner** tab.
2. Click **Paste Valid Pass** (or paste an active ticket token) and click **Verify & Redeem**:
   - Result: **VALID TICKET — ENTRY APPROVED** (Turnstile green).
3. Click **Verify & Redeem** again on the same token:
   - Result: **ENTRY REJECTED — DUPLICATE USAGE DETECTED (ALREADY REDEEMED)**.

### Scenario 7 — Blockchain Smart Contract
1. Go to the **Web3 & Contract** tab.
2. Click **Connect MetaMask** to link your Ethereum / Polygon testnet wallet.
3. View the verified ABI, contract address, and mint / resell / redeem on-chain actions.

---

## 🔒 Security & Architecture Notes
- All payments and KYC identities are simulated for the hackathon MVP prototype.
- No real money or payment provider credentials are required.
- The SQLite database serves as the high-speed Web2 single source of truth for anti-scalping rate limits, while the Solidity contract demonstrates on-chain decentralized ownership.
