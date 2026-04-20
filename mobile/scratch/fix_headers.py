import os

root_dir = r"d:\codes\MERN\medico\mobile\app"

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            new_lines = []
            in_header_title = False
            modified = False
            
            for i, line in enumerate(lines):
                if 'headerTitle:' in line:
                    in_header_title = True
                
                if in_header_title and "textAlign: 'center'" in line:
                    new_line = line.replace("textAlign: 'center'", "textAlign: 'left', marginLeft: 12")
                    new_lines.append(new_line)
                    in_header_title = False # Reset after replacement
                    modified = True
                else:
                    new_lines.append(line)
                
                # Safety reset if we hit another style key or end of block without finding center
                if in_header_title and ('},' in line or '} ,' in line) and 'Platform.select' not in line:
                    in_header_title = False

            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                print(f"Updated: {file_path}")
