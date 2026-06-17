import zipfile
import os

zip_path = r"C:\Users\Sui\final project\Trip-Planner.zip"
file1 = r"C:\Users\Sui\Downloads\Program Test.mp4"
file2 = r"C:\Users\Sui\Downloads\Trip-Planner-5.mp4"

with zipfile.ZipFile(zip_path, 'a', compression=zipfile.ZIP_DEFLATED) as zf:
    if os.path.exists(file1):
        print(f"Adding {file1}")
        zf.write(file1, arcname="專案報告/Program Test.mp4")
    if os.path.exists(file2):
        print(f"Adding {file2}")
        zf.write(file2, arcname="專案報告/Trip-Planner-5.mp4")
print("Done")
