import csv
import os
import re
import glob

# ================= CONFIG =================
INPUT_DIR = "processed/region_normalized"                 # folder with wide CSV files
OUTPUT_DIR = "processed/wide_to_long_csv"    # folder for long CSV output
ROWS_PER_FILE = 1_000_000                    # split output files safely

REQUIRED_COLUMNS = ["Model", "Scenario", "Region", "Variable", "Unit"]

PROVIDER_BY_FILENAME = [
    (re.compile(r"IPCC_?AR6", re.IGNORECASE), "IPCC AR6 ISO"),
    (re.compile(r"iiasa[_-]?ssp[_-]?2024", re.IGNORECASE), "IIASA SSP 2024"),
    (re.compile(r"NGFS", re.IGNORECASE), "NGFS Phase 5"),
]
# ==========================================


def normalize_year(col):
    match = re.search(r"(19|20)\d{2}", str(col))
    return int(match.group()) if match else None


def ensure_dirs():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def provider_from_filename(path: str) -> str:
    name = os.path.basename(path)
    for pattern, provider in PROVIDER_BY_FILENAME:
        if pattern.search(name):
            return provider
    return ""


def convert_all_files():
    ensure_dirs()

    out_file_index = 1
    out_row_count = 0

    output_file = open_new_output(out_file_index)
    writer = csv.writer(output_file)

    total_rows = 0

    for csv_file in glob.glob(os.path.join(INPUT_DIR, "*.csv")):
        print(f"Processing {csv_file}")

        file_provider_default = provider_from_filename(csv_file)

        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for col in REQUIRED_COLUMNS:
                if col not in reader.fieldnames:
                    raise ValueError(f"Missing column '{col}' in {csv_file}")

            has_provider = "Provider" in reader.fieldnames

            year_columns = {
                col: normalize_year(col)
                for col in reader.fieldnames
                if normalize_year(col)
            }

            if not year_columns:
                raise ValueError(f"No year columns found in {csv_file}")

            for row in reader:
                # Use existing Provider if present & non-empty, else default from filename
                if has_provider and row.get("Provider") not in (None, "", "NA"):
                    provider = row["Provider"]
                else:
                    provider = file_provider_default

                for col, year in year_columns.items():
                    value = row[col]
                    if value in (None, "", "NA"):
                        continue

                    writer.writerow([
                        row["Model"],
                        row["Scenario"],
                        row["Region"],
                        row["Variable"],
                        row["Unit"],
                        provider,
                        year,
                        value
                    ])

                    out_row_count += 1
                    total_rows += 1

                    if out_row_count >= ROWS_PER_FILE:
                        output_file.close()
                        out_file_index += 1
                        out_row_count = 0
                        output_file = open_new_output(out_file_index)
                        writer = csv.writer(output_file)

        print(f"Finished {csv_file}")

    output_file.close()
    print(f"\n✅ DONE: {total_rows:,} long rows written")


def open_new_output(index):
    path = os.path.join(OUTPUT_DIR, f"long_part_{index:03d}.csv")
    f = open(path, "w", newline="", encoding="utf-8")
    writer = csv.writer(f)

    writer.writerow([
        "model",
        "scenario",
        "region",
        "variable",
        "unit",
        "provider",
        "year",
        "value"
    ])

    print(f"Writing → {path}")
    return f


if __name__ == "__main__":
    convert_all_files()
