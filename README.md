# Data Extraction and Representation

## Project Structure
Ensure your directory looks like this before running the scripts:

```text
├── Dataset/
│   └── [your_data_file.csv]
├── extract.ipynb
├── represent.ipynb
└── README.md
```
Usage Instructions
Follow these steps sequentially to execute the pipeline:

1. Setup the Data
Place your raw dataset file (e.g., .csv, .json) inside the Dataset folder.

Note: Ensure the filename matches the input path defined in extract.ipynb.

2. Run the Extraction Script
Open and run all cells in extract.ipynb.

This script handles data cleaning and preprocessing.

Output: It will generate processed data files required for the next step.

3. Run the Representation Script
Open and run all cells in represent.ipynb.

This script takes the processed data and generates visual representations/charts.
