# 🌍 Climate Scenario Data Pipeline

This repository contains an **end-to-end ETL pipeline** for processing and storing  
**IPCC / NGFS / IIASA climate scenario datasets** into a **PostgreSQL database**.

The pipeline includes:
- Region normalization
- Wide → long format conversion
- CSV chunking for large datasets
- Secure database credential handling (encryption)
- Scalable PostgreSQL insertion

---

## 🧱 Prerequisites

- **Python 3.9+**
- **PostgreSQL 15+**
- **pgAdmin**
- **Jupyter Notebook**
- Git

---

## 🔹 Step 1: Install PostgreSQL

Install PostgreSQL from the **official website**:

👉 https://www.postgresql.org/download/

Recommended:
- PostgreSQL **16** (or latest stable)
- Install **pgAdmin** during setup
- Default port: `5432`

After installation:
- Ensure PostgreSQL service is running
- Remember your database **username** and **password**

---

## 🔹 Step 2: Project Structure

Ensure the project structure is **exactly as shown below**:

```text
project-root/
│
├── Datasets/
│   └── processed/
│       └── main/              # ⬅ original CSVs go here
│
├── region_normalized/         # auto-created
├── wide_to_long_csv/          # auto-created
│
├── region_mapping.ipynb
├── wide_to_long_csv.py
├── postgress_insertion.py
│
├── config.ini                 # database credentials (PLAINTEXT)
├── encrypt_config.py
├── config_decryptor.py
│
└── README.md
```
---
## 🔹 Step 3: Copy Input CSV Files (IMPORTANT)

Download the three CSV files from Google Drive:

👉 https://drive.google.com/drive/u/1/folders/1vd1LvgyYfDsh6ToQOfe3mABfNXZOpNiN

Then:

- Copy all three CSV files
- Paste them into the following directory
without renaming files or folders:
```text
Datasets/processed/main/
```
⚠️ File names and directory structure must not change.
---
## 🔹 Step 4: Add Database Credentials (`config.ini`)

Create or edit the file `config.ini` and add your **PostgreSQL database credentials** as shown below:

```ini
[postgresql]
host = localhost
port = 5432
user = postgres
password = your_password
database = climate_db
```
---
## 🔐 Step 5: Encrypt `config.ini` (MANDATORY)

Before running any database insertion, you **must encrypt the database credentials** stored in `config.ini`.

### ▶ Run:
```bash
python encrypt_config.py
```
---
## 🔑 Step 6: Update `config_decryptor.py` (IMPORTANT)

After encrypting `config.ini`, you must update the decryption key manually.

1. Open the generated file:
```text
secret.key
```
2. Copy the full key string from this file.
3. Open the following file:
```text
config_decryptor.py
```
4. Locate the variable:
```python
key = "some text"
```
5. Replace "some text" with the copied key from secret.key.

Example:
```python
key = "PASTE_SECRET_KEY_HERE"
```
## Important Rule
### Every time you modify config.ini, you MUST repeat this step.

That means:
- Re-run encrypt_config.py
- Copy the new key from secret.key
- Paste it again into config_decryptor.py

If this step is skipped, database decryption and connection will fail.

---
## 🔹 Step 7: Run `region_mapping.ipynb`

This notebook performs **region normalization** across all datasets.

It:
- Detects all region variants (ISO codes, abbreviations, UTF-8 issues)
- Maps equivalent regions to **one canonical region name**
- Ensures consistency across IPCC, NGFS, and IIASA datasets
- Writes updated CSV files to a new output directory

### ▶ Run the notebook

```bash
jupyter notebook
```
Open and execute:
```text
region_mapping.ipynb
```
### Output
Normalized CSV files will be written to:
```text
region_normalized/
```
---
## 🔹 Step 8: Run `wide_to_long_csv.py`

This script:
- Converts datasets from **wide format (year columns)** to **long format**
- Splits large datasets into **chunked CSV files (100,000 rows per file)**
- Prepares data for efficient and scalable PostgreSQL insertion

### ▶ Run:
```bash
python wide_to_long_csv.py
```

### Output
```text
wide_to_long_csv/
```
Each output file will be named like:
```text
long_part_001.csv
long_part_002.csv
long_part_003.csv
...
```
---
## 🔹 Step 9: Run `postgress_insertion.py`

This script performs the **final database insertion** step.

It will:
- Decrypt PostgreSQL credentials from the encrypted config
- Create all required database tables automatically (if not exists)
- Insert data using **bulk COPY** for high performance
- Support **resume-on-failure**
- Prevent duplicate inserts
- Log each ETL run in the database

### ▶ Run:
```bash
python postgress_insertion.py
```

