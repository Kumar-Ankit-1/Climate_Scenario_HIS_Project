import streamlit as st
import pandas as pd
import numpy as np
import altair as alt

# --- Page Configuration ---
st.set_page_config(
    page_title="Dynamic Dashboard",
    page_icon="📊",
    layout="wide",
)

# --- Helper Functions ---

@st.cache_data
def get_data(dataset_name, filter1, filter2, filter3, filter4):
    """
    Generates a dummy dataset based on the selected options.
    In a real app, this function would load and filter your actual data.
    """
    
    # Use filters to modify data generation (example)
    # This is just to show the filters are connected
    np.random.seed(42)
    num_points = 100 if filter1 == 'A' else (200 if filter1 == 'B' else 50)
    
    # Use dataset_name to switch data source
    if dataset_name == 'Dataset 1 (Sine Wave)':
        # Use another filter to modify the sine wave
        frequency = 5 if filter2 == 'X' else (10 if filter2 == 'Y' else 2)
        x = np.linspace(0, 10, num_points)
        y = np.sin(x * frequency) + np.random.randn(num_points) * 0.5
        df = pd.DataFrame({'x': x, 'y': y, 'category': filter3})
        
    elif dataset_name == 'Dataset 2 (Random Normal)':
        # Use another filter to modify the distribution
        mean = 0 if filter4 == '2023' else (5 if filter4 == '2024' else -5)
        x = np.random.randn(num_points) + mean
        y = np.random.randn(num_points)
        df = pd.DataFrame({'x': x, 'y': y, 'category': filter3})
        
    else:
        # Default empty dataframe
        df = pd.DataFrame(columns=['x', 'y', 'category'])
        
    return df

@st.cache_data
def convert_df_to_csv(df):
    """
    Converts a DataFrame to a CSV string for download.
    """
    # IMPORTANT: Cache the conversion to prevent computation on every rerun
    return df.to_csv().encode('utf-8')

# --- Sidebar ---
st.sidebar.header("📊 Chart Controls")
st.sidebar.markdown("Use the options below to filter the data and update the chart.")

# Four dropdowns in the sidebar
option1 = st.sidebar.selectbox(
    'Select Data Size:',
    ('A', 'B', 'C'),
    help="Placeholder for your first filter. This example changes the number of data points."
)

option2 = st.sidebar.selectbox(
    'Select Frequency/Type:',
    ('X', 'Y', 'Z'),
    help="Placeholder for your second filter. This example changes the sine wave frequency."
)

option3 = st.sidebar.selectbox(
    'Select Category:',
    ('Red', 'Green', 'Blue'),
    help="Placeholder for your third filter. This example changes the (unused) category column."
)

option4 = st.sidebar.selectbox(
    'Select Year/Mean:',
    ('2023', '2024', '2025'),
    help="Placeholder for your fourth filter. This example changes the mean for the 'Random Normal' dataset."
)

st.sidebar.markdown("---")

# Option to select different datasets
dataset_name = st.sidebar.selectbox(
    'Select Dataset:',
    ('Dataset 1 (Sine Wave)', 'Dataset 2 (Random Normal)'),
    help="Select the base dataset to visualize."
)


# --- Main Screen ---
st.title("Dynamic Data Visualization Dashboard")
st.markdown(f"Displaying chart for **{dataset_name}** based on your sidebar selections.")

# Load and filter data
df = get_data(dataset_name, option1, option2, option3, option4)

if df.empty:
    st.warning("No data generated for the selected options.")
else:
    # --- Display Chart ---
    st.subheader("Chart")
    
    if dataset_name == 'Dataset 1 (Sine Wave)':
        # Line chart for Sine Wave
        chart = alt.Chart(df).mark_line(point=True).encode(
            x=alt.X('x', title='X-Axis'),
            y=alt.Y('y', title='Y-Axis'),
            tooltip=['x', 'y', 'category']
        ).interactive()
        st.altair_chart(chart, use_container_width=True)
        
    elif dataset_name == 'Dataset 2 (Random Normal)':
        # Scatter plot for Random Normal
        chart = alt.Chart(df).mark_circle(size=60).encode(
            x=alt.X('x', title='X-Value'),
            y=alt.Y('y', title='Y-Value'),
            tooltip=['x', 'y', 'category']
        ).interactive()
        st.altair_chart(chart, use_container_width=True)
        
    
    # --- Download Button ---
    st.subheader("Download Data")
    st.markdown("Click the button below to download the dataset currently being displayed in the chart.")
    
    # Convert dataframe to CSV
    csv_data = convert_df_to_csv(df)
    
    # Create download button
    st.download_button(
        label="📥 Download data as CSV",
        data=csv_data,
        file_name=f"{dataset_name.lower().replace(' ', '_')}_filtered.csv",
        mime='text/csv',
    )
    
    # --- Show Raw Data (Optional) ---
    with st.expander("Show Raw Data"):
        st.dataframe(df)
