# FellowSimc

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
* **Windows 64-bit**
* **Python 3.8+** installed ([python.org](https://www.python.org/downloads/)) — *ensure you check **"Add Python to PATH"** during setup.*

---

### Step-by-Step Instructions

1. **Download the Release**:
   * Download the latest **`simc-windows.zip`** from the **[Releases](https://github.com/Toonic/fellowsimc/releases)** page on GitHub.

2. **Extract the Archive**:
   * Extract `simc-windows.zip` into any folder on your computer.

3. **Launch FellowSimc**:
   * Double-click **`start_ui.bat`** in the extracted folder.
   * *(The launcher will automatically verify dependencies and start the local server).*

4. **Access the Web Interface**:
   * Open your web browser and navigate to:
     ```
     http://localhost:5000
     ```

---

### Setting Up FellowshipLogs API Credentials (For Character Importing)

To import characters, loadouts, and custom dungeon routes directly from FellowshipLogs, you will need to generate free API credentials:

1. **Visit the FellowshipLogs API Portal**:
   * Go to [https://www.fellowshiplogs.com/api/clients/](https://www.fellowshiplogs.com/api/clients/) and log into your account.
2. **Create a New Client**:
   * Click **Create Client**.
   * **Name**: Enter a name for the application (e.g. `Fellowship Simcraft Importer`).
   * **Redirect URL**: Enter `http://google.com` or this GitHub repository (`https://github.com/Toonic/fellowsimc`).
   * **Public Client**: Leave this **unchecked**.
   * Click **Create**.
3. **Copy Your Credentials**:
   * Copy the generated **Client ID** and **Client Secret**.
4. **Apply Your API Keys in FellowSimc**:
   * In the FellowSimc web interface (`http://localhost:5000`), click the **⚙ Settings** gear icon (or the **API Status** badge) in the top-right header.
   * Paste your **Client ID** and **Client Secret** into the fields.
   * Click **SAVE CREDENTIALS**.
   * The badge will turn green (**API READY**), and you're all set to import logs!

---

### Basic Usage

1. **Import Character Loadouts**:
   * In **`1. CHARACTER IMPORT`**, enter any FellowshipLogs URL or report code, select a fight, pick your character, and click **`IMPORT CHARACTER LOADOUT`**.
2. **Customize Talents & Gear**:
   * In **`2. HERO & LOADOUT`**, freely tweak talents across all 6 tiers, configure primary & secondary stats, select legendaries, and customize weapon traits and blessing affixes `(0 - 4)`.
3. **Run Simulations & View Reports**:
   * Select your encounter mode (Dungeon Route, Single Target, or AoE), click **`RUN SIMULATION`**, and view the generated DPS breakdowns and HTML reports.

---

## What is This
Fork of the https://github.com/simulationcraft/simc project for the Game Fellowship.
Significant adaptions in progress to adapt the engine to better support Fellowship.

This is a personal project so there will be no support with using the software. There are numerous bugs. Updates will be sporadic as I find and fix things.

Heavy work in progress.

WoW code has yet to be pruned.


## Overview

SimulationCraft is a tool to explore combat mechanics in the popular MMO RPG ~~World of Warcraft~~ Fellowship (tm).

It is a multi-player event driven simulator written in C++ that models player character damage-per-second in various raiding and dungeon scenarios.

Increasing class synergy and the prevalence of proc-based combat modifiers have eroded the accuracy of traditional calculators that rely upon closed-form approximations to model very complex mechanics. The goal of this simulator is to close the accuracy gap while maintaining a performance level high enough to calculate relative stat weights to aid gear selection.

SimulationCraft allows raid/party creation of arbitrary size, generating detailed charts and reports for both individual and raid performance.

Graphical interface is slated for removal to remove dependencies due to it being based on the World of Warcraft code. It will not be supported.

## Original Source
SimulationCraft (https://github.com/simulationcraft/simc). GNU GPL v3 License (see License for more information)

## External Libraries

This program uses the following external libraries.

RapidJSON (http://rapidjson.org)

Copyright (c) 2015 THL A29 Limited, a Tencent company, and Milo Yip. All rights reserved.
MIT License (see LICENSE.MIT for more information).

RapidXML (http://rapidxml.sourceforge.net/index.htm)

Copyright (c) 2006, 2007 Marcin Kalicinski. All rights reserved.
MIT License (see LICENSE.MIT for more information).

The MSInttypes r29 (https://code.google.com/p/msinttypes/)

Copyright (c) Alexander Chemeris. All rights reserved.
BSD 3-Clause License (see LICENSE.BSD for more information).

The Qt Toolkit (https://www.qt.io/)

Copyright (c) 2016 The Qt Company Ltd. and other contributors. All rights reserved.
GNU Lesser General Public License, version 3 (see LICENSE.LGPL for more information).

UTF-8 CPP (https://github.com/nemtrif/utfcpp)

Copyright (c) 2006 Nemanja Trifunovic. All rights reserved.
Boost Software License, Version 1.0 (see LICENSE.BOOST for more information).

{fmt} (https://github.com/fmtlib/fmt)

Copyright (c) 2012 - 2016, Victor Zverovich. All rights reserved.
BSD 2-Clause "Simplified" License (see LICENSE.BSD2 for more information).

cpp-semver (https://github.com/easz/cpp-semver)

Copyright (c) 2018 Cas Perl. All rights reserved.
MIT License (see LICENSE.MIT for more information).

utf8.h (https://github.com/sheredom/utf8.h)

Unlicense License (see LICENSE.UNLICENSE for more information).
