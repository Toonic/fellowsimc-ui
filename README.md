# FellowSimc UI

> [!NOTE]
> **AI-Assisted Development Disclaimer**  
> **The core of the Simulation was not AI Assisted.** AI Was mostly used for the UI portion as I am not web developer, nor a UI expert. All AI touched code for bugs is manually verified by myself and revived. I have caught many wild choices it made.
> While I currently do not have plans to make a PR to the main branch. Please ensure you go support and check them out over at the core [FellowSimC Repo](https://github.com/FellowSimc/fellowsimc).
>
> Generally speaking, I'm not a big fan of AI. However I was given essentially a few tokens to learn, and use agents during my free time. I chose to spend it on creating this application. I do not plan on purchasing any future tokens out-side of what was given to me.

> [!IMPORTANT]
> **No Support Disclaimer**  
> This repository is a personal, experimental hobby project provided strictly **AS-IS**. **No support, troubleshooting, feature guarantees, or bug fixes will be provided.** Updates will be entirely sporadic as time permits.

## Quick Start (Running via Releases)

### Prerequisites
* **Windows 64-bit** OR **Linux (via Wine)**
* **Python 3.8+** installed ([python.org](https://www.python.org/downloads/)) — *ensure you check **"Add Python to PATH"** during setup.*
* **Linux Users**: **Wine** installed (`sudo apt install wine` or `sudo pacman -S wine`).

---

### Step-by-Step Instructions
1. Download the latest **`simc-windows.zip`** from the **[Releases](https://github.com/Toonic/fellowsimc-ui/releases)** page on GitHub.
2. Extract `simc-windows.zip` into any folder on your computer.
3. Launch the application:
   * **Windows**: Double-click **`start_ui.bat`**.
   * **Linux**: Open a terminal in the folder and run **`./start_ui.sh`** (or `bash start_ui.sh`).
4. Open your web browser and navigate to: [http://localhost:5000](http://localhost:5000)

---

### Setting Up FellowshipLogs API Credentials (For Character Importing)

To import characters, loadouts, and custom dungeon routes directly from FellowshipLogs, you will need to generate free API credentials:

1. Go to [https://www.fellowshiplogs.com/api/clients/](https://www.fellowshiplogs.com/api/clients/) and log into your account.
2. **Create a New Client**:
   * Click **Create Client**.
   * **Name**: Enter a name for the application (e.g. `Fellowship Simcraft Importer`).
   * **Redirect URL**: Enter `http://google.com` or this GitHub repository (`https://github.com/Toonic/fellowsimc-ui`).
   * **Public Client**: Leave this **unchecked**.
   * Click **Create**.
3. Copy and save the generated **Client ID** and **Client Secret**.
4. **Apply Your API Keys in FellowSimc**:
   * In the FellowSimc web interface (`http://localhost:5000`), click on the API Keys in the top right.
   * Paste your **Client ID** and **Client Secret** into the fields.
   * Click **SAVE CREDENTIALS**.
   * The badge will turn green (**API READY**), and you're all set to import logs!

---

### Basic Usage
0. **(Optional) Import your Character and Route.**
   * In **`LOG IMPORTER`**, enter any FellowshipLogs URL as described and click Fetch Fights
   * Select the Fight and the Hero/Player and click Import Character Loadout.
   * Click Use Current Log then Import Route to import a close approximation to the route you ran.
1. **Configure your Build.**
   * Select your talents.
   * Modify your GEAR attributes. **NOT Sheet Stats Currently. I'm sorry.**
   * Select your Weapon, Legendary, Gem Powers, Traits, and Blessings.
2. **Select your Route and Mode**
   * Choose between Dungeon Route (Usually not recommended.), Single Target, or AoE Target Test.
3. **Skip Advanced and APL** - Read more below for Advance
4. **Sim Yourself**
   * Click Run Sim. When the Sim is done, view your DPS.
   * You can also view the actual generated report from Simulation Craft by clicking **Open Full HTML Report**.

### Advance Usage
**APL Configuration**
Lets you select which built in APL to run for the current selected hero, or create your own.

**Iterations**
Choose how many iterations you want to run. **More Iterations may take a long time to complete.**
<sub>Don't blame me if your computer blows up.</sub>

**Generated Sim Profile**
This will show you the SimC file that is generated. In this state, you are more than welcome to modify it, and edit it. 
---

## What is This
This is a web UI tool built for the core **[FellowSimc](https://github.com/FellowSimc/fellowsimc)** simulation engine (a fork of SimulationCraft adapted for the game Fellowship).

This is a personal project so there will be no support with using the software. There are numerous bugs. Updates will be sporadic as I find and fix things.

Heavy work in progress.

WoW code has yet to be pruned.