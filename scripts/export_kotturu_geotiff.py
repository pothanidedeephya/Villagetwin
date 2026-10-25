"""
Export 30m NASA SRTM Digital Elevation Model (GeoTIFF) for Kotturu, Andhra Pradesh
Coordinates: Latitude 18.70° N, Longitude 83.95° E (Srikakulam / Vamsadhara Basin)
Dataset: 'USGS/SRTMGL1_003' (NASA SRTM 1 Arc-Second Global 30m DEM)
Output: kotturu_30m_dem.tif (GeoTIFF in EPSG:4326 with rasterio compatibility)
"""

import os
import urllib.request
import zipfile
import io
import ee

def export_kotturu_srtm_geotiff(
    target_lat=18.70,
    target_lon=83.95,
    buffer_km=5.0,
    output_filename="kotturu_30m_dem.tif",
    project_id=None
):
    """
    Crops the NASA SRTM 30m DEM around Kotturu coordinates (18.70, 83.95)
    and downloads the georeferenced GeoTIFF directly to the local disk.
    
    Args:
        target_lat (float): Latitude in decimal degrees (default: 18.70)
        target_lon (float): Longitude in decimal degrees (default: 83.95)
        buffer_km (float): Half-width buffer in kilometers around the center (default: 5.0 km)
        output_filename (str): Name of output GeoTIFF file (default: 'kotturu_30m_dem.tif')
        project_id (str, optional): Google Cloud Project ID for Earth Engine authentication
    """
    print("=" * 65)
    print("🌍 GOOGLE EARTH ENGINE: NASA SRTM 30m DEM EXPORTER")
    print(f"   Target Location : Kotturu, Andhra Pradesh ({target_lat}°N, {target_lon}°E)")
    print(f"   Buffer Area     : {buffer_km * 2} km x {buffer_km * 2} km catchment")
    print(f"   Output GeoTIFF  : {output_filename}")
    print("=" * 65)

    # 1. Initialize Google Earth Engine API
    print("\n[Step 1/5] Initializing Earth Engine API...")
    try:
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()
        print("✓ Earth Engine successfully initialized.")
    except Exception as e:
        print(f"✗ Earth Engine Initialization Failed: {e}")
        print("  Tip: Ensure you have run `earthengine authenticate` in your terminal.")
        return False

    # 2. Define the geographic region of interest (ROI)
    # Earth Engine geometries take coordinates as [Longitude, Latitude]
    print("\n[Step 2/5] Defining bounding box around Kotturu...")
    center_point = ee.Geometry.Point([target_lon, target_lat])
    
    # Create a square bounding box centered at (18.70, 83.95)
    buffer_meters = buffer_km * 1000.0
    roi = center_point.buffer(buffer_meters).bounds()
    
    roi_coords = roi.coordinates().getInfo()[0]
    lons = [c[0] for c in roi_coords]
    lats = [c[1] for c in roi_coords]
    print(f"✓ Bounding Box: Lon [{min(lons):.4f}, {max(lons):.4f}], Lat [{min(lats):.4f}, {max(lats):.4f}]")

    # 3. Load and clip the NASA SRTM 1 Arc-Second (30m) Elevation Model
    print("\n[Step 3/5] Loading 'USGS/SRTMGL1_003' DEM collection...")
    srtm_image = ee.Image("USGS/SRTMGL1_003").select("elevation")
    
    # Clip to bounding box and enforce float32 elevation values in meters
    dem_clipped = srtm_image.clip(roi).toFloat()

    # 4. Request direct download URL for the GeoTIFF raster
    print("\n[Step 4/5] Generating direct GeoTIFF raster stream from Earth Engine...")
    download_url = dem_clipped.getDownloadURL({
        "name": "kotturu_30m_dem",
        "scale": 30.0,            # 30-meter spatial resolution (matches Cartosat / SRTM)
        "crs": "EPSG:4326",       # Standard WGS84 geographic projection
        "region": roi,
        "format": "GEO_TIFF"
    })
    print(f"✓ Stream Endpoint Ready.")

    # 5. Download and write the GeoTIFF to local disk
    print(f"\n[Step 5/5] Downloading and saving '{output_filename}'...")
    req = urllib.request.Request(download_url, headers={"User-Agent": "BharatVillageTwin/2.0"})
    
    with urllib.request.urlopen(req) as response:
        content = response.read()

    # If Earth Engine returns a zipped container, extract the .tif
    if content.startswith(b"PK"):
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            tif_files = [f for f in z.namelist() if f.endswith(".tif")]
            if tif_files:
                with open(output_filename, "wb") as out_f:
                    out_f.write(z.read(tif_files[0]))
            else:
                raise RuntimeError("No GeoTIFF found inside downloaded archive.")
    else:
        with open(output_filename, "wb") as out_f:
            out_f.write(content)

    file_size_kb = os.path.getsize(output_filename) / 1024.0
    print(f"\n" + "=" * 65)
    print(f"✓ SUCCESS: Exported GeoTIFF -> {os.path.abspath(output_filename)}")
    print(f"  File Size      : {file_size_kb:.1f} KB")
    print(f"  CRS Projection : EPSG:4326 (WGS84)")
    print(f"  Resolution     : 30.0 meters/pixel")
    print("=" * 65)

    # 6. Verify compatibility with rasterio if installed
    try:
        import rasterio
        with rasterio.open(output_filename) as src:
            data = src.read(1)
            print("\n[Rasterio Verification]")
            print(f"  Rasterio Shape : {src.shape} (rows, cols)")
            print(f"  Bounds         : {src.bounds}")
            print(f"  CRS            : {src.crs}")
            print(f"  Elevation Min  : {data.min():.2f} meters AMSL")
            print(f"  Elevation Max  : {data.max():.2f} meters AMSL")
            print("✓ GeoTIFF is 100% ready for python rasterio hydraulic workflows!")
    except ImportError:
        print("\n(Note: Install `rasterio` via `pip install rasterio` to read in Python)")

    return True


if __name__ == "__main__":
    # Target Kotturu, Andhra Pradesh coordinates
    export_kotturu_srtm_geotiff(
        target_lat=18.70,
        target_lon=83.95,
        buffer_km=5.0,  # 10 km x 10 km spatial catchment
        output_filename="kotturu_30m_dem.tif"
    )

