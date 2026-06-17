import zipfile
import os
import re

def create_zip():
    project_dir = r"C:\Users\Sui\final project\Trip-Planner"
    zip_path = r"C:\Users\Sui\final project\Trip-Planner.zip"
    
    # Exclusions
    exclude_dirs = {'.git', 'node_modules', '.next', '__pycache__', '.venv', 'python_backend/venv'}
    
    print(f"Creating zip file at {zip_path}")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_dir):
            # Modify dirs in place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file.endswith('.zip') or file == 'build_zip.py':
                    continue
                
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, start=project_dir)
                
                if file == '.env.local':
                    print("Processing .env.local (stripping keys)")
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Strip keys
                    content = re.sub(r'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=.*', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=', content)
                    content = re.sub(r'NEXT_AUTH_SECRET=.*', 'NEXT_AUTH_SECRET=', content)
                    
                    zf.writestr(arcname, content)
                else:
                    zf.write(file_path, arcname=arcname)
                    
        # Append videos if they exist, similar to zip_script.py
        video1 = r"C:\Users\Sui\Downloads\Program Test.mp4"
        video2 = r"C:\Users\Sui\Downloads\Trip-Planner-5.mp4"
        
        if os.path.exists(video1):
            print(f"Adding {video1}")
            zf.write(video1, arcname="專案報告/Program Test.mp4")
        if os.path.exists(video2):
            print(f"Adding {video2}")
            zf.write(video2, arcname="專案報告/Trip-Planner-5.mp4")
            
    print("Zip creation completed!")

if __name__ == '__main__':
    create_zip()
