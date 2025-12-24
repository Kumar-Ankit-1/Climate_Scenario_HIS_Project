import pandas as pd
from pathlib import Path

# Path to your main folder
processed_folder = Path("Datasets/processed/iiasa")
main_folder = Path("Datasets/processed/main")

# Excel file name (adjust if needed)
excel_file = processed_folder / "iiasa_ssp_2024.xlsx"

# Output CSV path
csv_file = main_folder / "iiasa_ssp_2024.csv"

# Read ONLY first sheet
print(f"Reading Excel file: {excel_file}")
df = pd.read_excel(excel_file, sheet_name=0)

# Save as CSV
df.to_csv(csv_file, index=False)

print(f"✅ Converted to CSV: {csv_file}")
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")
